'use client'
import { useState, useEffect, useRef } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Calculator, Settings, Pencil, Trash2, CheckCircle, Percent, RotateCcw, Upload, Download, X } from 'lucide-react'
import { FormSkeleton } from '@/components/loading'
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget, useSaveAllocations, useImportBudget } from '@/lib/hooks/useBudget'
import { useGlAccounts, useRegionals } from '@/lib/hooks/useMaster'

interface GlAccount { id: string; code: string; description: string; keterangan: string }
interface Regional { id: string; code: string; name: string }
interface Budget {
  id: string; glAccountId: string; year: number; rkap: number; releasePercent: number; totalAmount: number
  q1Amount: number; q2Amount: number; q3Amount: number; q4Amount: number
  janAmount: number; febAmount: number; marAmount: number; aprAmount: number
  mayAmount: number; junAmount: number; julAmount: number; augAmount: number
  sepAmount: number; octAmount: number; novAmount: number; decAmount: number
  glAccount: GlAccount; allocations: { regionalCode: string; quarter: number; amount: number; rraDelta?: number; percentage: number }[]
}

type InputMode = 'quarter' | 'month'
type MonthKey = 'jan' | 'feb' | 'mar' | 'apr' | 'may' | 'jun' | 'jul' | 'aug' | 'sep' | 'oct' | 'nov' | 'dec'
type QuarterKey = 'q1' | 'q2' | 'q3' | 'q4'

const monthLabels: Record<MonthKey, string> = {
  jan: 'Januari', feb: 'Februari', mar: 'Maret', apr: 'April',
  may: 'Mei', jun: 'Juni', jul: 'Juli', aug: 'Agustus',
  sep: 'September', oct: 'Oktober', nov: 'November', dec: 'Desember'
}

const monthKeys: MonthKey[] = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const quarterMonths: Record<QuarterKey, MonthKey[]> = {
  q1: ['jan', 'feb', 'mar'], q2: ['apr', 'may', 'jun'], q3: ['jul', 'aug', 'sep'], q4: ['oct', 'nov', 'dec']
}

const defaultRegionals: Regional[] = [
  { id: 'A-DEFA-HO', code: 'A-DEFA-HO', name: 'A-DEFA-HO' },
  { id: 'AREA-1', code: 'AREA-1', name: 'AREA-1' },
  { id: 'AREA-2a', code: 'AREA-2a', name: 'AREA-2a' },
  { id: 'AREA-2b', code: 'AREA-2b', name: 'AREA-2b' },
  { id: 'AREA-3a', code: 'AREA-3a', name: 'AREA-3a' },
  { id: 'AREA-3b', code: 'AREA-3b', name: 'AREA-3b' },
  { id: 'AREA-4a', code: 'AREA-4a', name: 'AREA-4a' },
  { id: 'AREA-4b', code: 'AREA-4b', name: 'AREA-4b' },
  { id: 'EVP', code: 'EVP', name: 'EVP' },
]

export default function BudgetPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  
  // TanStack Query hooks
  const { data: glAccounts = [], isLoading: loadingGl } = useGlAccounts()
  const { data: regionals = [], isLoading: loadingRegionals } = useRegionals()
  const { data: budgets = [], isLoading: loadingBudgets } = useBudgets(year)
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const deleteBudget = useDeleteBudget()
  const saveAllocations = useSaveAllocations()
  const importBudget = useImportBudget()

  // Form states
  const [selectedGl, setSelectedGl] = useState('')
  const [rkap, setRkap] = useState(0)
  const [releasePercent, setReleasePercent] = useState(100)
  const [totalAmount, setTotalAmount] = useState(0)
  const [inputMode, setInputMode] = useState<InputMode>('quarter')
  const [quarters, setQuarters] = useState<Record<QuarterKey, number>>({ q1: 0, q2: 0, q3: 0, q4: 0 })
  const [months, setMonths] = useState<Record<MonthKey, number>>({ jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 })
  
  // Allocation states
  const [allocations, setAllocations] = useState<Record<string, number>>({})
  const [percentages, setPercentages] = useState<Record<string, number>>({})
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [showAllocation, setShowAllocation] = useState(false)
  
  // UI states
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [tableViewMode, setTableViewMode] = useState<'quarter' | 'month'>('quarter')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Edit states
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editRkap, setEditRkap] = useState(0)
  const [editReleasePercent, setEditReleasePercent] = useState(100)
  const [editTotal, setEditTotal] = useState(0)
  const [editInputMode, setEditInputMode] = useState<InputMode>('quarter')
  const [editQuarters, setEditQuarters] = useState<Record<QuarterKey, number>>({ q1: 0, q2: 0, q3: 0, q4: 0 })
  const [editMonths, setEditMonths] = useState<Record<MonthKey, number>>({ jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 })
  
  // Delete states
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const isLoading = loadingGl || loadingRegionals || loadingBudgets

  const getAllocationRegionals = (budget: Budget | null = selectedBudget): Regional[] => {
    if ((regionals as Regional[]).length > 0) return regionals as Regional[]
    if (!budget) return []

    const codes = Array.from(new Set((budget.allocations || []).map((allocation) => allocation.regionalCode)))
    if (codes.length === 0) return defaultRegionals

    const allocationRegionals = codes.map((code) => ({ id: code, code, name: code }))
    const missingDefaults = defaultRegionals.filter((regional) => !codes.includes(regional.code))
    return [...allocationRegionals, ...missingDefaults]
  }

  // Calculate quarters from months
  const calcQuartersFromMonths = (m: Record<MonthKey, number>): Record<QuarterKey, number> => ({
    q1: m.jan + m.feb + m.mar, q2: m.apr + m.may + m.jun, q3: m.jul + m.aug + m.sep, q4: m.oct + m.nov + m.dec
  })

  // Calculate months from quarters (divide equally)
  const calcMonthsFromQuarters = (q: Record<QuarterKey, number>): Record<MonthKey, number> => {
    const result: Record<MonthKey, number> = { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 }
    ;(['q1', 'q2', 'q3', 'q4'] as QuarterKey[]).forEach((qKey) => {
      const qMonths = quarterMonths[qKey]
      const perMonth = Math.floor(q[qKey] / 3)
      const remainder = q[qKey] - perMonth * 3
      qMonths.forEach((mKey, idx) => { result[mKey] = idx === 2 ? perMonth + remainder : perMonth })
    })
    return result
  }

  // Auto calculate totalAmount from rkap and releasePercent
  const handleRkapChange = (value: number) => {
    setRkap(value)
    setTotalAmount(Math.floor(value * releasePercent / 100))
  }

  const handleReleasePercentChange = (value: number) => {
    setReleasePercent(value)
    setTotalAmount(Math.floor(rkap * value / 100))
  }

  const handleTotalAmountChange = (value: number) => {
    setTotalAmount(value)
    if (rkap > 0) {
      setReleasePercent(parseFloat(((value / rkap) * 100).toFixed(2)))
    }
  }

  // Edit form handlers
  const handleEditRkapChange = (value: number) => {
    setEditRkap(value)
    setEditTotal(Math.floor(value * editReleasePercent / 100))
  }

  const handleEditReleasePercentChange = (value: number) => {
    setEditReleasePercent(value)
    setEditTotal(Math.floor(editRkap * value / 100))
  }

  const handleEditTotalAmountChange = (value: number) => {
    setEditTotal(value)
    if (editRkap > 0) {
      setEditReleasePercent(parseFloat(((value / editRkap) * 100).toFixed(2)))
    }
  }

  useEffect(() => { if (inputMode === 'month') setQuarters(calcQuartersFromMonths(months)) }, [months, inputMode])
  useEffect(() => { if (editInputMode === 'month') setEditQuarters(calcQuartersFromMonths(editMonths)) }, [editMonths, editInputMode])

  const showMessage = (type: 'success' | 'error', msg: string) => {
    setMessageType(type); setMessage(msg); setTimeout(() => setMessage(''), 3000)
  }

  const autoSplitQuarters = () => {
    const perQuarter = Math.floor(totalAmount / 4)
    const newQuarters = { q1: perQuarter, q2: perQuarter, q3: perQuarter, q4: totalAmount - perQuarter * 3 }
    setQuarters(newQuarters)
    if (inputMode === 'month') setMonths(calcMonthsFromQuarters(newQuarters))
  }

  const autoSplitMonths = () => {
    const perMonth = Math.floor(totalAmount / 12)
    const newMonths: Record<MonthKey, number> = { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 }
    monthKeys.forEach((key, idx) => { newMonths[key] = idx === 11 ? totalAmount - perMonth * 11 : perMonth })
    setMonths(newMonths)
  }

  const autoSplitEditQuarters = () => {
    const perQuarter = Math.floor(editTotal / 4)
    const newQuarters = { q1: perQuarter, q2: perQuarter, q3: perQuarter, q4: editTotal - perQuarter * 3 }
    setEditQuarters(newQuarters)
    if (editInputMode === 'month') setEditMonths(calcMonthsFromQuarters(newQuarters))
  }

  const autoSplitEditMonths = () => {
    const perMonth = Math.floor(editTotal / 12)
    const newMonths: Record<MonthKey, number> = { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 }
    monthKeys.forEach((key, idx) => { newMonths[key] = idx === 11 ? editTotal - perMonth * 11 : perMonth })
    setEditMonths(newMonths)
  }

  const downloadTemplate = () => { window.location.href = '/api/budget/template' }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await importBudget.mutateAsync({ file, year })
      if (result.error) { showMessage('error', result.error) }
      else { showMessage('success', `Import selesai: ${result.success} berhasil, ${result.failed} gagal`) }
    } catch { showMessage('error', 'Gagal mengimport file') }
    finally { if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const saveBudgetHandler = async () => {
    const finalQuarters = inputMode === 'month' ? calcQuartersFromMonths(months) : quarters
    const finalMonths = inputMode === 'quarter' ? calcMonthsFromQuarters(quarters) : months
    try {
      await createBudget.mutateAsync({ 
        glAccountId: selectedGl, year, rkap, releasePercent, totalAmount, 
        q1Amount: finalQuarters.q1, q2Amount: finalQuarters.q2, q3Amount: finalQuarters.q3, q4Amount: finalQuarters.q4,
        janAmount: finalMonths.jan, febAmount: finalMonths.feb, marAmount: finalMonths.mar, aprAmount: finalMonths.apr,
        mayAmount: finalMonths.may, junAmount: finalMonths.jun, julAmount: finalMonths.jul, augAmount: finalMonths.aug,
        sepAmount: finalMonths.sep, octAmount: finalMonths.oct, novAmount: finalMonths.nov, decAmount: finalMonths.dec
      })
      setSelectedGl(''); setRkap(0); setReleasePercent(100); setTotalAmount(0)
      setQuarters({ q1: 0, q2: 0, q3: 0, q4: 0 })
      setMonths({ jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 })
      showMessage('success', 'Anggaran berhasil disimpan!')
    } catch { showMessage('error', 'Gagal menyimpan anggaran') }
  }

  const openAllocation = (budget: Budget) => {
    setSelectedBudget(budget); setShowAllocation(true)
    const allocs: Record<string, number> = {}
    const pcts: Record<string, number> = {}
    const allocationRegionals = getAllocationRegionals(budget)
    for (let q = 1; q <= 4; q++) {
      allocationRegionals.forEach((reg: Regional) => {
        const existing = budget.allocations.find(a => a.quarter === q && a.regionalCode === reg.code)
        allocs[`q${q}_${reg.code}`] = existing?.amount || 0
        pcts[`q${q}_${reg.code}`] = existing?.percentage || 0
      })
    }
    setAllocations(allocs); setPercentages(pcts)
  }

  const getRraDelta = (quarter: number, regionalCode: string) => {
    const allocation = selectedBudget?.allocations.find(a => a.quarter === quarter && a.regionalCode === regionalCode)
    return Number(allocation?.rraDelta || 0)
  }

  const getEffectiveAllocation = (quarter: number, regionalCode: string) => {
    return Number(allocations[`q${quarter}_${regionalCode}`] || 0) + getRraDelta(quarter, regionalCode)
  }

  const autoSplitRegional = (quarter: number) => {
    const qAmount = selectedBudget?.[`q${quarter}Amount` as keyof Budget] as number || 0
    const allocationRegionals = getAllocationRegionals()
    const count = allocationRegionals.length
    if (count === 0) return
    const perRegional = Math.floor(qAmount / count)
    const newAllocs = { ...allocations }
    const newPcts = { ...percentages }
    allocationRegionals.forEach((reg: Regional, idx: number) => {
      newAllocs[`q${quarter}_${reg.code}`] = idx === count - 1 ? qAmount - perRegional * (count - 1) : perRegional
      newPcts[`q${quarter}_${reg.code}`] = parseFloat((100 / count).toFixed(2))
    })
    setAllocations(newAllocs); setPercentages(newPcts)
  }

  const applyPercentages = (quarter: number) => {
    const qAmount = selectedBudget?.[`q${quarter}Amount` as keyof Budget] as number || 0
    const allocationRegionals = getAllocationRegionals()
    const newPcts = { ...percentages }
    let filledPct = 0
    const emptyRegionals: Regional[] = []
    allocationRegionals.forEach((reg: Regional) => {
      const pct = newPcts[`q${quarter}_${reg.code}`] || 0
      if (pct > 0) { filledPct += pct } else { emptyRegionals.push(reg) }
    })
    const remainingPct = 100 - filledPct
    if (emptyRegionals.length > 0 && remainingPct > 0) {
      const pctPerEmpty = remainingPct / emptyRegionals.length
      emptyRegionals.forEach((reg: Regional) => { newPcts[`q${quarter}_${reg.code}`] = parseFloat(pctPerEmpty.toFixed(2)) })
    }
    setPercentages(newPcts)
    const newAllocs = { ...allocations }
    let totalAllocated = 0
    const lastRegional = allocationRegionals[allocationRegionals.length - 1]
    if (!lastRegional) return
    allocationRegionals.forEach((reg: Regional, idx: number) => {
      const pct = newPcts[`q${quarter}_${reg.code}`] || 0
      if (idx < allocationRegionals.length - 1) {
        const amount = Math.floor(qAmount * pct / 100)
        newAllocs[`q${quarter}_${reg.code}`] = amount
        totalAllocated += amount
      }
    })
    newAllocs[`q${quarter}_${lastRegional.code}`] = qAmount - totalAllocated
    setAllocations(newAllocs)
  }

  const resetQuarter = (quarter: number) => {
    const newAllocs = { ...allocations }
    const newPcts = { ...percentages }
    getAllocationRegionals().forEach((reg: Regional) => { newAllocs[`q${quarter}_${reg.code}`] = 0; newPcts[`q${quarter}_${reg.code}`] = 0 })
    setAllocations(newAllocs); setPercentages(newPcts)
  }

  const saveAllocationsHandler = async () => {
    if (!selectedBudget) return
    const allocs: { budgetId: string; quarter: number; regionalCode: string; amount: number; percentage: number }[] = []
    const allocationRegionals = getAllocationRegionals()
    for (let q = 1; q <= 4; q++) {
      allocationRegionals.forEach((reg: Regional) => {
        allocs.push({ budgetId: selectedBudget.id, quarter: q, regionalCode: reg.code, amount: allocations[`q${q}_${reg.code}`] || 0, percentage: percentages[`q${q}_${reg.code}`] || 0 })
      })
    }
    try {
      await saveAllocations.mutateAsync(allocs)
      setShowAllocation(false)
      showMessage('success', 'Alokasi regional berhasil disimpan!')
    } catch { showMessage('error', 'Gagal menyimpan alokasi') }
  }

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget)
    setEditRkap(budget.rkap || budget.totalAmount)
    setEditReleasePercent(budget.releasePercent || 100)
    setEditTotal(budget.totalAmount)
    setEditQuarters({ q1: budget.q1Amount, q2: budget.q2Amount, q3: budget.q3Amount, q4: budget.q4Amount })
    setEditMonths({
      jan: budget.janAmount || 0, feb: budget.febAmount || 0, mar: budget.marAmount || 0, apr: budget.aprAmount || 0,
      may: budget.mayAmount || 0, jun: budget.junAmount || 0, jul: budget.julAmount || 0, aug: budget.augAmount || 0,
      sep: budget.sepAmount || 0, oct: budget.octAmount || 0, nov: budget.novAmount || 0, dec: budget.decAmount || 0
    })
    const hasMonthlyData = budget.janAmount > 0 || budget.febAmount > 0 || budget.marAmount > 0
    setEditInputMode(hasMonthlyData ? 'month' : 'quarter')
    setShowEditDialog(true)
  }

  const handleEdit = async () => {
    if (!editingBudget) return
    const finalQuarters = editInputMode === 'month' ? calcQuartersFromMonths(editMonths) : editQuarters
    const finalMonths = editInputMode === 'quarter' ? calcMonthsFromQuarters(editQuarters) : editMonths
    try {
      await updateBudget.mutateAsync({ id: editingBudget.id, data: { 
        rkap: editRkap, releasePercent: editReleasePercent, totalAmount: editTotal, 
        q1Amount: finalQuarters.q1, q2Amount: finalQuarters.q2, q3Amount: finalQuarters.q3, q4Amount: finalQuarters.q4,
        janAmount: finalMonths.jan, febAmount: finalMonths.feb, marAmount: finalMonths.mar, aprAmount: finalMonths.apr,
        mayAmount: finalMonths.may, junAmount: finalMonths.jun, julAmount: finalMonths.jul, augAmount: finalMonths.aug,
        sepAmount: finalMonths.sep, octAmount: finalMonths.oct, novAmount: finalMonths.nov, decAmount: finalMonths.dec
      }})
      setShowEditDialog(false); setEditingBudget(null)
      showMessage('success', 'Anggaran berhasil diupdate!')
    } catch { showMessage('error', 'Gagal mengupdate anggaran') }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteBudget.mutateAsync(deleteId)
      setShowDeleteDialog(false); setDeleteId(null)
      showMessage('success', 'Anggaran berhasil dihapus!')
    } catch { showMessage('error', 'Gagal menghapus anggaran') }
  }

  const quarterColumns: ColumnDef<Budget>[] = [
    { accessorKey: 'glAccount.code', header: 'GL Account', cell: ({ row }) => `${row.original.glAccount.code} - ${row.original.glAccount.description}` },
    { accessorKey: 'rkap', header: () => <div className="text-right">RKAP (Rp)</div>, cell: ({ row }) => <div className="text-right">{(row.original.rkap || 0).toLocaleString('id-ID')}</div> },
    { accessorKey: 'releasePercent', header: () => <div className="text-right">Release</div>, cell: ({ row }) => <div className="text-right">{row.original.releasePercent || 100}%</div> },
    { accessorKey: 'totalAmount', header: () => <div className="text-right">Release (Rp)</div>, cell: ({ row }) => <div className="text-right">{(row.getValue('totalAmount') as number).toLocaleString('id-ID')}</div> },
    { accessorKey: 'q1Amount', header: () => <div className="text-right">Q1 (Rp)</div>, cell: ({ row }) => <div className="text-right">{(row.getValue('q1Amount') as number).toLocaleString('id-ID')}</div> },
    { accessorKey: 'q2Amount', header: () => <div className="text-right">Q2 (Rp)</div>, cell: ({ row }) => <div className="text-right">{(row.getValue('q2Amount') as number).toLocaleString('id-ID')}</div> },
    { accessorKey: 'q3Amount', header: () => <div className="text-right">Q3 (Rp)</div>, cell: ({ row }) => <div className="text-right">{(row.getValue('q3Amount') as number).toLocaleString('id-ID')}</div> },
    { accessorKey: 'q4Amount', header: () => <div className="text-right">Q4 (Rp)</div>, cell: ({ row }) => <div className="text-right">{(row.getValue('q4Amount') as number).toLocaleString('id-ID')}</div> },
    { id: 'actions', header: 'Aksi', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => openAllocation(row.original)}><Settings className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => openEditDialog(row.original)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => { setDeleteId(row.original.id); setShowDeleteDialog(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
    )},
  ]

  const monthColumns: ColumnDef<Budget>[] = [
    { accessorKey: 'glAccount.code', header: 'GL Account', cell: ({ row }) => <div className="min-w-[150px]">{row.original.glAccount.code} - {row.original.glAccount.description}</div> },
    { accessorKey: 'totalAmount', header: () => <div className="text-right">Total (Rp)</div>, cell: ({ row }) => <div className="text-right">{(row.getValue('totalAmount') as number).toLocaleString('id-ID')}</div> },
    { accessorKey: 'janAmount', header: () => <div className="text-right">Jan</div>, cell: ({ row }) => <div className="text-right">{(row.original.janAmount || 0).toLocaleString('id-ID')}</div> },
    { accessorKey: 'febAmount', header: () => <div className="text-right">Feb</div>, cell: ({ row }) => <div className="text-right">{(row.original.febAmount || 0).toLocaleString('id-ID')}</div> },
    { accessorKey: 'marAmount', header: () => <div className="text-right">Mar</div>, cell: ({ row }) => <div className="text-right">{(row.original.marAmount || 0).toLocaleString('id-ID')}</div> },
    { accessorKey: 'aprAmount', header: () => <div className="text-right">Apr</div>, cell: ({ row }) => <div className="text-right">{(row.original.aprAmount || 0).toLocaleString('id-ID')}</div> },
    { accessorKey: 'mayAmount', header: () => <div className="text-right">Mei</div>, cell: ({ row }) => <div className="text-right">{(row.original.mayAmount || 0).toLocaleString('id-ID')}</div> },
    { accessorKey: 'junAmount', header: () => <div className="text-right">Jun</div>, cell: ({ row }) => <div className="text-right">{(row.original.junAmount || 0).toLocaleString('id-ID')}</div> },
    { accessorKey: 'julAmount', header: () => <div className="text-right">Jul</div>, cell: ({ row }) => <div className="text-right">{(row.original.julAmount || 0).toLocaleString('id-ID')}</div> },
    { accessorKey: 'augAmount', header: () => <div className="text-right">Agu</div>, cell: ({ row }) => <div className="text-right">{(row.original.augAmount || 0).toLocaleString('id-ID')}</div> },
    { accessorKey: 'sepAmount', header: () => <div className="text-right">Sep</div>, cell: ({ row }) => <div className="text-right">{(row.original.sepAmount || 0).toLocaleString('id-ID')}</div> },
    { accessorKey: 'octAmount', header: () => <div className="text-right">Okt</div>, cell: ({ row }) => <div className="text-right">{(row.original.octAmount || 0).toLocaleString('id-ID')}</div> },
    { accessorKey: 'novAmount', header: () => <div className="text-right">Nov</div>, cell: ({ row }) => <div className="text-right">{(row.original.novAmount || 0).toLocaleString('id-ID')}</div> },
    { accessorKey: 'decAmount', header: () => <div className="text-right">Des</div>, cell: ({ row }) => <div className="text-right">{(row.original.decAmount || 0).toLocaleString('id-ID')}</div> },
    { id: 'actions', header: 'Aksi', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => openAllocation(row.original)}><Settings className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => openEditDialog(row.original)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => { setDeleteId(row.original.id); setShowDeleteDialog(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
    )},
  ]

  const columns = tableViewMode === 'quarter' ? quarterColumns : monthColumns

  if (isLoading) return <FormSkeleton title="Input Anggaran Tahunan" fields={8} showTabs={true} tabCount={4} />

  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode)
    if (mode === 'month' && quarters.q1 + quarters.q2 + quarters.q3 + quarters.q4 > 0) setMonths(calcMonthsFromQuarters(quarters))
    else if (mode === 'quarter' && Object.values(months).some(v => v > 0)) setQuarters(calcQuartersFromMonths(months))
  }

  const handleEditInputModeChange = (mode: InputMode) => {
    setEditInputMode(mode)
    if (mode === 'month' && editQuarters.q1 + editQuarters.q2 + editQuarters.q3 + editQuarters.q4 > 0) setEditMonths(calcMonthsFromQuarters(editQuarters))
    else if (mode === 'quarter' && Object.values(editMonths).some(v => v > 0)) setEditQuarters(calcQuartersFromMonths(editMonths))
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div><h1 className="text-xl md:text-2xl font-bold">Input Anggaran Tahunan</h1><p className="text-muted-foreground text-xs md:text-sm">Kelola anggaran per GL Account dan alokasi regional</p></div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="flex-1 sm:flex-none"><Download className="h-4 w-4 mr-2" />Template</Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={importBudget.isPending} className="bg-green-500 hover:bg-green-600 text-white hover:text-white border-0 flex-1 sm:flex-none">
              <Upload className="h-4 w-4 mr-2" />{importBudget.isPending ? 'Importing...' : 'Import'}
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Tahun:</Label>
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>{[2024, 2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl flex items-center gap-2 ${messageType === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          <CheckCircle className="h-4 w-4" />{message}
        </div>
      )}

      <Card className="border">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <CardTitle className="text-base md:text-lg">Form Input Anggaran</CardTitle>
              <CardDescription className="text-xs md:text-sm">Masukkan anggaran per GL Account dan pembagian {inputMode === 'quarter' ? 'kuartal' : 'bulan'}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs md:text-sm text-muted-foreground">Input berdasarkan:</Label>
              <Select value={inputMode} onValueChange={(v: InputMode) => handleInputModeChange(v)}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarter">Kuartal</SelectItem>
                  <SelectItem value="month">Bulan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6 pt-0 md:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">GL Account</Label>
              <Select value={selectedGl} onValueChange={setSelectedGl}>
                <SelectTrigger><SelectValue placeholder="Pilih GL Account" /></SelectTrigger>
                <SelectContent>{glAccounts.map((gl: GlAccount) => <SelectItem key={gl.id} value={gl.id}>{gl.code} - {gl.description}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-xs md:text-sm">Nilai RKAP</Label><CurrencyInput value={rkap} onChange={handleRkapChange} /></div>
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Release</Label>
              <div className="flex h-10 w-20 rounded-md border border-input bg-background text-sm ring-offset-background overflow-hidden">
                <input type="number" min={0} max={100} value={releasePercent} onChange={(e) => handleReleasePercentChange(parseFloat(e.target.value) || 0)} className="w-12 px-2 py-2 text-right bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <span className="flex items-center justify-center w-8 bg-muted text-muted-foreground border-l text-sm">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Anggaran Release</Label>
              <CurrencyInput value={totalAmount} onChange={handleTotalAmountChange} />
            </div>
          </div>

          {inputMode === 'quarter' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {(['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => (
                <div key={q} className="space-y-2"><Label className="text-xs md:text-sm">Kuartal (Q{i + 1})</Label><CurrencyInput value={quarters[q]} onChange={(v) => setQuarters({ ...quarters, [q]: v })} /></div>
              ))}
              <div className="flex items-end col-span-2 sm:col-span-1"><Button onClick={autoSplitQuarters} className="w-full" size="sm"><Calculator className="h-4 w-4 mr-2" />Bagi Otomatis</Button></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                {monthKeys.slice(0, 4).map((m) => (<div key={m} className="space-y-2"><Label className="text-xs md:text-sm">{monthLabels[m]}</Label><CurrencyInput value={months[m]} onChange={(v) => setMonths({ ...months, [m]: v })} /></div>))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                {monthKeys.slice(4, 8).map((m) => (<div key={m} className="space-y-2"><Label className="text-xs md:text-sm">{monthLabels[m]}</Label><CurrencyInput value={months[m]} onChange={(v) => setMonths({ ...months, [m]: v })} /></div>))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                {monthKeys.slice(8, 12).map((m) => (<div key={m} className="space-y-2"><Label className="text-xs md:text-sm">{monthLabels[m]}</Label><CurrencyInput value={months[m]} onChange={(v) => setMonths({ ...months, [m]: v })} /></div>))}
                <div className="flex items-end col-span-2 sm:col-span-1"><Button onClick={autoSplitMonths} className="w-full" size="sm"><Calculator className="h-4 w-4 mr-2" />Bagi Otomatis</Button></div>
              </div>
              <div className="pt-4 border-t">
                <Label className="text-xs md:text-sm text-muted-foreground mb-2 block">Hasil Perhitungan Kuartal:</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                  {(['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => (<div key={q} className="p-2 md:p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Q{i + 1}</p><p className="font-semibold">Rp {quarters[q].toLocaleString('id-ID')}</p></div>))}
                </div>
              </div>
            </div>
          )}
          <Button onClick={saveBudgetHandler} disabled={!selectedGl || createBudget.isPending}>{createBudget.isPending ? 'Menyimpan...' : 'Simpan Anggaran'}</Button>
        </CardContent>
      </Card>

      <Card className="border">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Daftar Anggaran Tahun {year}</CardTitle>
              <CardDescription>Kelola anggaran dan alokasi regional per GL Account</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Tampilkan:</Label>
              <Select value={tableViewMode} onValueChange={(v: 'quarter' | 'month') => setTableViewMode(v)}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarter">Kuartal</SelectItem>
                  <SelectItem value="month">Bulan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent><DataTable columns={columns} data={budgets} searchKey="glAccount.code" searchPlaceholder="Cari GL Account..." /></CardContent>
      </Card>

      {/* Allocation Modal */}
      {showAllocation && selectedBudget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-auto border relative">
            <button onClick={() => setShowAllocation(false)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 z-10"><X className="h-4 w-4" /></button>
            <CardHeader className="border-b">
              <CardTitle>Alokasi Regional</CardTitle>
              <p className="text-sm text-muted-foreground">{selectedBudget.glAccount.code} - {selectedBudget.glAccount.description}</p>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="q1" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b h-auto p-0 bg-transparent">
                  {[1, 2, 3, 4].map(q => (<TabsTrigger key={q} value={`q${q}`} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">Q{q}</TabsTrigger>))}
                </TabsList>
                {[1, 2, 3, 4].map(q => (
                  <TabsContent key={q} value={`q${q}`} className="p-6 space-y-6 mt-0">
                    {(() => {
                      const allocationRegionals = getAllocationRegionals()
                      const totalPercentage = allocationRegionals.reduce((sum: number, reg: Regional) => sum + (percentages[`q${q}_${reg.code}`] || 0), 0)
                      const totalAllocation = allocationRegionals.reduce((sum: number, reg: Regional) => sum + getEffectiveAllocation(q, reg.code), 0)
                      const remaining = (selectedBudget[`q${q}Amount` as keyof Budget] as number) - totalAllocation

                      return (
                      <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Anggaran Q{q}</p>
                        <p className="text-2xl font-bold">Rp {(selectedBudget[`q${q}Amount` as keyof Budget] as number).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => resetQuarter(q)}><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
                        <Button variant="outline" size="sm" onClick={() => applyPercentages(q)}><Percent className="h-4 w-4 mr-2" />Terapkan %</Button>
                        <Button variant="outline" size="sm" onClick={() => autoSplitRegional(q)}><Calculator className="h-4 w-4 mr-2" />Bagi Rata</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {allocationRegionals.map((reg: Regional) => {
                        const rraDelta = getRraDelta(q, reg.code)
                        const effectiveAllocation = getEffectiveAllocation(q, reg.code)
                        return (
                        <div key={reg.id} className="p-3 border rounded-lg bg-gray-50/50 space-y-2">
                          <Label className="text-sm font-medium">{reg.name}</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2"><CurrencyInput value={allocations[`q${q}_${reg.code}`] || 0} onChange={(v) => setAllocations({ ...allocations, [`q${q}_${reg.code}`]: v })} /></div>
                            <div className="relative">
                              <Input type="number" min={0} max={100} step={0.1} value={percentages[`q${q}_${reg.code}`] || ''} onChange={(e) => setPercentages({ ...percentages, [`q${q}_${reg.code}`]: parseFloat(e.target.value) || 0 })} className="pr-7 text-right" placeholder="0" />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">RRA</span>
                              <p className={`font-semibold ${rraDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>Rp {rraDelta.toLocaleString('id-ID')}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-muted-foreground">Berjalan</span>
                              <p className="font-semibold">Rp {effectiveAllocation.toLocaleString('id-ID')}</p>
                            </div>
                          </div>
                        </div>
                      )})}
                    </div>
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Persentase</span>
                        <span className={`font-semibold ${Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-600' : 'text-amber-600'}`}>
                          {totalPercentage.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Alokasi</span>
                        <span className="font-semibold">Rp {totalAllocation.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sisa</span>
                        <span className={`font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Rp {remaining.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                      </>
                    )})()}
                  </TabsContent>
                ))}
              </Tabs>
              <div className="flex gap-2 p-6 pt-0 border-t">
                <Button onClick={saveAllocationsHandler} disabled={saveAllocations.isPending}>{saveAllocations.isPending ? 'Menyimpan...' : 'Simpan Alokasi'}</Button>
                <Button variant="outline" onClick={() => setShowAllocation(false)}>Tutup</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle>Edit Anggaran</DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Ubah total anggaran dan pembagian per {editInputMode === 'quarter' ? 'kuartal' : 'bulan'}</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">GL Account</Label>
              <Input value={editingBudget ? `${editingBudget.glAccount.code} - ${editingBudget.glAccount.description}` : ''} disabled className="bg-muted/50 font-medium" />
            </div>
            <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">Nilai RKAP</Label><CurrencyInput value={editRkap} onChange={handleEditRkapChange} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Release</Label>
                <div className="flex h-10 w-full rounded-md border border-input bg-background text-sm ring-offset-background overflow-hidden">
                  <input type="number" min={0} max={100} value={editReleasePercent} onChange={(e) => handleEditReleasePercentChange(parseFloat(e.target.value) || 0)} className="flex-1 px-3 py-2 text-right bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <span className="flex items-center justify-center px-3 bg-muted text-muted-foreground border-l">%</span>
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">Anggaran Release</Label><CurrencyInput value={editTotal} onChange={handleEditTotalAmountChange} /></div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Label className="text-sm text-muted-foreground">Input berdasarkan:</Label>
              <Select value={editInputMode} onValueChange={(v: InputMode) => handleEditInputModeChange(v)}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="quarter">Kuartal</SelectItem><SelectItem value="month">Bulan</SelectItem></SelectContent>
              </Select>
            </div>
            {editInputMode === 'quarter' ? (
              <>
                <Button onClick={autoSplitEditQuarters} className="w-full"><Calculator className="h-4 w-4 mr-2" />Bagi Otomatis</Button>
                <div className="grid grid-cols-2 gap-4">
                  {(['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => (<div key={q} className="space-y-1.5"><Label className="text-sm text-muted-foreground">Kuartal (Q{i + 1})</Label><CurrencyInput value={editQuarters[q]} onChange={(v) => setEditQuarters({ ...editQuarters, [q]: v })} /></div>))}
                </div>
              </>
            ) : (
              <>
                <Button onClick={autoSplitEditMonths} className="w-full"><Calculator className="h-4 w-4 mr-2" />Bagi Otomatis</Button>
                <div className="grid grid-cols-3 gap-3">
                  {monthKeys.map((m) => (<div key={m} className="space-y-1"><Label className="text-xs text-muted-foreground">{monthLabels[m]}</Label><CurrencyInput value={editMonths[m]} onChange={(v) => setEditMonths({ ...editMonths, [m]: v })} /></div>))}
                </div>
                <div className="pt-3 border-t">
                  <Label className="text-sm text-muted-foreground mb-2 block">Hasil Perhitungan Kuartal:</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => (<div key={q} className="p-2 bg-muted/50 rounded-lg text-center"><p className="text-xs text-muted-foreground">Q{i + 1}</p><p className="font-semibold text-sm">Rp {editQuarters[q].toLocaleString('id-ID')}</p></div>))}
                  </div>
                </div>
              </>
            )}
            <div className="pt-3 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total {editInputMode === 'quarter' ? 'Kuartal' : 'Bulan'}</span>
                <span className={`font-semibold ${(editInputMode === 'quarter' ? editQuarters.q1 + editQuarters.q2 + editQuarters.q3 + editQuarters.q4 : Object.values(editMonths).reduce((a, b) => a + b, 0)) === editTotal ? 'text-green-600' : 'text-amber-600'}`}>
                  Rp {(editInputMode === 'quarter' ? editQuarters.q1 + editQuarters.q2 + editQuarters.q3 + editQuarters.q4 : Object.values(editMonths).reduce((a, b) => a + b, 0)).toLocaleString('id-ID')}
                </span>
              </div>
              {(editInputMode === 'quarter' ? editQuarters.q1 + editQuarters.q2 + editQuarters.q3 + editQuarters.q4 : Object.values(editMonths).reduce((a, b) => a + b, 0)) !== editTotal && (
                <p className="text-xs text-amber-600 mt-1">Selisih: Rp {Math.abs(editTotal - (editInputMode === 'quarter' ? editQuarters.q1 + editQuarters.q2 + editQuarters.q3 + editQuarters.q4 : Object.values(editMonths).reduce((a, b) => a + b, 0))).toLocaleString('id-ID')}</p>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-3 border-t">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
              <Button onClick={handleEdit} disabled={updateBudget.isPending}>{updateBudget.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Anggaran?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={deleteBudget.isPending} className="bg-red-500 hover:bg-red-600">{deleteBudget.isPending ? 'Menghapus...' : 'Hapus'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
