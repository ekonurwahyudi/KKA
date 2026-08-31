'use client'

import { useMemo, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { ArrowRightLeft, CheckCircle, Download, Filter, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DataTable } from '@/components/ui/data-table'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { TableSkeleton } from '@/components/loading'
import { useBudgets } from '@/lib/hooks/useBudget'
import { useRegionals } from '@/lib/hooks/useMaster'
import { useCreateRra, useRraLogs, useUpdateRra } from '@/lib/hooks/useRra'

interface GlAccount { id: string; code: string; description: string }
interface Regional { id: string; code: string; name: string; costCenter?: string; isActive: boolean }
interface Allocation { regionalCode: string; quarter: number; amount: number; rraDelta?: number; percentage: number }
interface Budget {
  id: string; glAccountId: string; year: number; totalAmount: number
  q1Amount: number; q2Amount: number; q3Amount: number; q4Amount: number
  janAmount: number; febAmount: number; marAmount: number; aprAmount: number
  mayAmount: number; junAmount: number; julAmount: number; augAmount: number
  sepAmount: number; octAmount: number; novAmount: number; decAmount: number
  glAccount: GlAccount; allocations: Allocation[]
}
interface RraInputLine { id: string; budgetId: string; regionalCode: string; amount: number }
interface RraLine {
  id: string; side: 'DONOR' | 'PENERIMA'; budgetId: string; regionalCode: string
  costCenter?: string; regionalName?: string; accountCode: string; accountName: string; amount: number
}
interface RraLog {
  id: string; type: string; year: number; month: number; amount: number; createdAt: string; description?: string
  sourceRegionalCode?: string; sourceCostCenter?: string; targetRegionalCode?: string; targetCostCenter?: string
  sourceBudget: Budget; targetBudget: Budget; lines?: RraLine[]
}

const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const rraLabels: Record<string, string> = { realokasi: 'Realokasi', rescheduling: 'Rescheduling', redistribusi: 'Redistribusi' }
const formatCurrency = (value: number) => `Rp ${(value || 0).toLocaleString('id-ID')}`
const quarterFromMonth = (month: number) => Math.ceil(month / 3)
const budgetLabel = (budget?: Budget) => budget ? `${budget.glAccount.code} - ${budget.glAccount.description}` : ''
const regionalLabel = (regional?: Regional) => regional ? `${regional.costCenter || regional.code} - ${regional.name}` : ''
const newLine = (): RraInputLine => ({ id: `${Date.now()}-${Math.random()}`, budgetId: '', regionalCode: '', amount: 0 })
const isHoRegional = (regional?: Regional) => `${regional?.code || ''} ${regional?.name || ''}`.toUpperCase().includes('HO')

export default function RraPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [type, setType] = useState('realokasi')
  const [month, setMonth] = useState('8')
  const [sourceLines, setSourceLines] = useState<RraInputLine[]>([newLine()])
  const [targetLines, setTargetLines] = useState<RraInputLine[]>([newLine()])
  const [description, setDescription] = useState('')
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [historyYear, setHistoryYear] = useState('all')
  const [historyQuarter, setHistoryQuarter] = useState('all')
  const [historyMonth, setHistoryMonth] = useState('all')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const { data: budgets = [], isLoading: loadingBudgets } = useBudgets(year)
  const { data: regionals = [], isLoading: loadingRegionals } = useRegionals()
  const { data: rraLogs = [], isLoading: loadingRra } = useRraLogs('all')
  const createRra = useCreateRra()
  const updateRra = useUpdateRra()

  const activeRegionals = useMemo(() => (regionals as Regional[]).filter(r => r.isActive !== false).sort((a, b) => (a.costCenter || a.code).localeCompare(b.costCenter || b.code)), [regionals])
  const selectedMonth = parseInt(month)
  const selectedQuarter = quarterFromMonth(selectedMonth)
  const totalSource = sourceLines.reduce((sum, line) => sum + (line.amount || 0), 0)
  const totalTarget = targetLines.reduce((sum, line) => sum + (line.amount || 0), 0)
  const selisih = totalSource - totalTarget
  const historyYears = useMemo(() => Array.from(new Set((rraLogs as RraLog[]).map(log => log.year))).sort((a, b) => b - a), [rraLogs])
  const filteredRraLogs = useMemo(() => (rraLogs as RraLog[]).filter(log => {
    if (historyYear !== 'all' && log.year !== Number(historyYear)) return false
    if (historyQuarter !== 'all' && quarterFromMonth(log.month) !== Number(historyQuarter)) return false
    if (historyMonth !== 'all' && log.month !== Number(historyMonth)) return false
    return true
  }), [rraLogs, historyYear, historyQuarter, historyMonth])
  const historyMonthOptions = historyQuarter === 'all'
    ? monthNames.map((name, index) => ({ name, month: index + 1 }))
    : monthNames.slice((Number(historyQuarter) - 1) * 3, Number(historyQuarter) * 3)
      .map((name, index) => ({ name, month: (Number(historyQuarter) - 1) * 3 + index + 1 }))
  const activeHistoryFilterCount = [historyYear, historyQuarter, historyMonth].filter(value => value !== 'all').length

  const showMessage = (newType: 'success' | 'error', text: string) => {
    setMessageType(newType); setMessage(text); setTimeout(() => setMessage(''), 3500)
  }

  const getBudget = (budgetId: string) => (budgets as Budget[]).find(b => b.id === budgetId)
  const getAllocation = (line: RraInputLine) => {
    const budget = getBudget(line.budgetId)
    const allocation = budget?.allocations.find(a => a.quarter === selectedQuarter && a.regionalCode === line.regionalCode)
    return Number(allocation?.amount || 0) + Number(allocation?.rraDelta || 0)
  }

  const updateLine = (side: 'source' | 'target', id: string, patch: Partial<RraInputLine>) => {
    const setter = side === 'source' ? setSourceLines : setTargetLines
    setter(prev => prev.map(line => line.id === id ? { ...line, ...patch } : line))
  }

  const removeLine = (side: 'source' | 'target', id: string) => {
    const setter = side === 'source' ? setSourceLines : setTargetLines
    setter(prev => prev.length === 1 ? prev : prev.filter(line => line.id !== id))
  }

  const resetForm = () => {
    setSourceLines([newLine()])
    setTargetLines([newLine()])
    setDescription('')
    setEditingLogId(null)
  }

  const validateLines = (lines: RraInputLine[]) => lines.every(line => line.budgetId && line.regionalCode && line.amount > 0)
  const hasAreaDonorToHo = () => {
    const regionalList = regionals as Regional[]
    const hasAreaDonor = sourceLines.some(line => !isHoRegional(regionalList.find(regional => regional.code === line.regionalCode)))
    const hasHoReceiver = targetLines.some(line => isHoRegional(regionalList.find(regional => regional.code === line.regionalCode)))
    return hasAreaDonor && hasHoReceiver
  }

  const fallbackLine = (log: RraLog, side: 'DONOR' | 'PENERIMA'): RraLine => {
    const isDonor = side === 'DONOR'
    const budget = isDonor ? log.sourceBudget : log.targetBudget
    return {
      id: `${log.id}-${side}`,
      side,
      budgetId: budget.id,
      regionalCode: isDonor ? (log.sourceRegionalCode || '') : (log.targetRegionalCode || ''),
      costCenter: isDonor ? log.sourceCostCenter : log.targetCostCenter,
      accountCode: budget.glAccount.code,
      accountName: budget.glAccount.description,
      amount: log.amount,
    }
  }

  const formatHistoryLines = (log: RraLog, side: 'DONOR' | 'PENERIMA') => {
    const lines = (log.lines || []).filter(line => line.side === side)
    const data = lines.length > 0 ? lines : [fallbackLine(log, side)]

    return (
      <div className="min-w-[260px] space-y-1 text-xs">
        {data.map((line, index) => (
          <div key={line.id || `${side}-${index}`} className="text-muted-foreground">
            <span className="font-medium text-foreground">{line.regionalName || line.regionalCode || line.costCenter}</span>
            <span> - {line.accountCode}</span>
            {line.accountName && <span> {line.accountName}</span>}
          </div>
        ))}
      </div>
    )
  }

  const historyInputLines = (log: RraLog, side: 'DONOR' | 'PENERIMA'): RraInputLine[] => {
    const lines = (log.lines || []).filter(line => line.side === side)
    const data = lines.length > 0 ? lines : [fallbackLine(log, side)]
    return data
      .filter(line => line.budgetId && line.regionalCode && line.amount > 0)
      .map(line => ({ id: newLine().id, budgetId: line.budgetId, regionalCode: line.regionalCode, amount: Number(line.amount || 0) }))
  }

  const startEdit = (log: RraLog) => {
    const donors = historyInputLines(log, 'DONOR')
    const receivers = historyInputLines(log, 'PENERIMA')
    setEditingLogId(log.id)
    setYear(log.year)
    setType(log.type)
    setMonth(String(log.month))
    setSourceLines(donors.length > 0 ? donors : [newLine()])
    setTargetLines(receivers.length > 0 ? receivers : [newLine()])
    setDescription(log.description || '')
    showMessage('success', 'Mode edit aktif. Ubah data lalu klik Update Batch RRA.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitRra = async () => {
    if (!validateLines(sourceLines) || !validateLines(targetLines)) {
      showMessage('error', 'Semua baris donor dan penerima wajib lengkap')
      return
    }
    if (Math.abs(selisih) > 0.01) {
      showMessage('error', 'Total donor harus sama dengan total penerima')
      return
    }
    if (hasAreaDonorToHo()) {
      showMessage('error', 'RRA dari Area ke HO tidak diperbolehkan')
      return
    }
    for (const line of sourceLines) {
      if (getAllocation(line) < line.amount) {
        showMessage('error', 'Ada baris donor yang nilainya melebihi saldo cost center')
        return
      }
    }
    try {
      const payload = {
        year,
        type,
        month: selectedMonth,
        sourceLines: sourceLines.map(({ budgetId, regionalCode, amount }) => ({ budgetId, regionalCode, amount })),
        targetLines: targetLines.map(({ budgetId, regionalCode, amount }) => ({ budgetId, regionalCode, amount })),
        description,
      }

      if (editingLogId) {
        await updateRra.mutateAsync({ id: editingLogId, data: payload })
      } else {
        await createRra.mutateAsync(payload)
      }
      resetForm()
      showMessage('success', editingLogId ? 'Batch RRA berhasil diubah dan anggaran diperbarui' : 'Batch RRA berhasil dicatat dan anggaran diperbarui')
    } catch (error: any) {
      showMessage('error', error?.response?.data?.error || (editingLogId ? 'Gagal mengubah RRA' : 'Gagal menyimpan RRA'))
    }
  }

  const renderInputTable = (side: 'source' | 'target', lines: RraInputLine[]) => {
    const isSource = side === 'source'
    return (
      <div className="rounded-md border">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[42px]">No</TableHead>
              <TableHead>GL Account</TableHead>
              <TableHead>Cost Center</TableHead>
              <TableHead className="text-right">Saldo Q{selectedQuarter}</TableHead>
              <TableHead className="text-right">Nilai RRA</TableHead>
              <TableHead className="text-right">Sesudah</TableHead>
              <TableHead className="w-[52px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => {
              const allocation = getAllocation(line)
              const after = isSource ? allocation - line.amount : allocation + line.amount
              return (
                <TableRow key={line.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Select value={line.budgetId} onValueChange={(value) => updateLine(side, line.id, { budgetId: value })}>
                      <SelectTrigger><SelectValue placeholder="Pilih GL Account" /></SelectTrigger>
                      <SelectContent>{(budgets as Budget[]).map(b => <SelectItem key={b.id} value={b.id}>{budgetLabel(b)}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={line.regionalCode} onValueChange={(value) => updateLine(side, line.id, { regionalCode: value })}>
                      <SelectTrigger><SelectValue placeholder="Pilih cost center" /></SelectTrigger>
                      <SelectContent>{activeRegionals.map(r => <SelectItem key={r.id} value={r.code}>{regionalLabel(r)}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(allocation)}</TableCell>
                  <TableCell><CurrencyInput value={line.amount} onChange={(value) => updateLine(side, line.id, { amount: value })} /></TableCell>
                  <TableCell className={`text-right font-semibold whitespace-nowrap ${after < 0 ? 'text-red-600' : ''}`}>{formatCurrency(after)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => removeLine(side, line.id)} disabled={lines.length === 1}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  const columns: ColumnDef<RraLog>[] = [
    { accessorKey: 'createdAt', header: 'Tanggal', cell: ({ row }) => format(new Date(row.original.createdAt), 'dd MMM yyyy HH:mm', { locale: idLocale }) },
    { accessorKey: 'year', header: 'Tahun' },
    { accessorKey: 'type', header: 'Jenis', cell: ({ row }) => <Badge variant="secondary">{rraLabels[row.original.type] || row.original.type}</Badge> },
    { accessorKey: 'month', header: 'Bulan', cell: ({ row }) => monthNames[row.original.month - 1] || row.original.month },
    { id: 'donor', header: 'Donor', cell: ({ row }) => formatHistoryLines(row.original, 'DONOR') },
    { id: 'receiver', header: 'Penerima', cell: ({ row }) => formatHistoryLines(row.original, 'PENERIMA') },
    { accessorKey: 'amount', header: () => <div className="text-right">Total RRA</div>, cell: ({ row }) => <div className="text-right font-semibold">{formatCurrency(row.original.amount)}</div> },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => startEdit(row.original)} title="Edit RRA">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { window.location.href = `/api/rra/${row.original.id}/excel` }} title="Unduh Excel">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  if (loadingBudgets || loadingRegionals || loadingRra) {
    return <TableSkeleton title="RRA Anggaran" showFilters={false} showActions rows={5} columns={7} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">RRA Anggaran</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Catat realokasi, rescheduling, dan redistribusi anggaran secara batch</p>
        </div>
        <div className="flex items-center gap-2">
          <Label>Tahun</Label>
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024, 2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {message && <div className={`px-4 py-3 rounded-lg flex items-center gap-2 ${messageType === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}><CheckCircle className="h-4 w-4" />{message}</div>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg"><ArrowRightLeft className="h-5 w-5" />{editingLogId ? 'Edit Batch RRA' : 'Form Batch RRA'}</CardTitle>
          <CardDescription>Total donor dan penerima harus sama sebelum batch RRA dapat disimpan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Jenis RRA</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="realokasi">Realokasi</SelectItem>
                  <SelectItem value="rescheduling">Rescheduling</SelectItem>
                  <SelectItem value="redistribusi">Redistribusi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bulan RRA</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{monthNames.map((name, index) => <SelectItem key={name} value={(index + 1).toString()}>{index + 1} - {name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total Donor</p>
              <p className="font-semibold">{formatCurrency(totalSource)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total Penerima</p>
              <p className="font-semibold">{formatCurrency(totalTarget)}</p>
              <p className={`text-xs ${Math.abs(selisih) <= 0.01 ? 'text-green-600' : 'text-red-600'}`}>Selisih {formatCurrency(selisih)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Akun Donor</h2>
                <p className="text-xs text-muted-foreground">Tambah baris jika RRA memakai beberapa donor</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setSourceLines(prev => [...prev, newLine()])}><Plus className="h-4 w-4" />Tambah Donor</Button>
            </div>
            {renderInputTable('source', sourceLines)}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Akun Penerima</h2>
                <p className="text-xs text-muted-foreground">Tambah baris jika RRA didistribusikan ke beberapa penerima</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setTargetLines(prev => [...prev, newLine()])}><Plus className="h-4 w-4" />Tambah Penerima</Button>
            </div>
            {renderInputTable('target', targetLines)}
          </div>

          <div className="space-y-2">
            <Label>Keterangan</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Nomor dokumen, alasan RRA, atau catatan tambahan" />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={resetForm}>Reset</Button>
            {editingLogId && <Button variant="outline" onClick={resetForm} className="gap-2"><X className="h-4 w-4" />Batal Edit</Button>}
            <Button onClick={submitRra} disabled={createRra.isPending || updateRra.isPending || Math.abs(selisih) > 0.01} className="gap-2">
              <Save className="h-4 w-4" />
              {createRra.isPending || updateRra.isPending ? 'Menyimpan...' : editingLogId ? 'Update Batch RRA' : 'Simpan Batch RRA'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Histori RRA</CardTitle>
          <CardDescription>Histori lintas tahun. Gunakan filter periode atau tombol Excel untuk mengunduh dokumen RRA.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredRraLogs}
            searchKey="type"
            searchPlaceholder="Cari jenis RRA..."
            toolbarActions={(
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-9">
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                  {activeHistoryFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeHistoryFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="font-medium text-sm">Filter Histori RRA</div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Tahun</Label>
                      <Select value={historyYear} onValueChange={setHistoryYear}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Semua Tahun" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Tahun</SelectItem>
                          {historyYears.map(historyItemYear => <SelectItem key={historyItemYear} value={String(historyItemYear)}>{historyItemYear}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Kuartal</Label>
                      <Select value={historyQuarter} onValueChange={(value) => { setHistoryQuarter(value); setHistoryMonth('all') }}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Semua Kuartal" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Kuartal</SelectItem>
                          {[1, 2, 3, 4].map(quarter => <SelectItem key={quarter} value={String(quarter)}>Q{quarter}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Bulan</Label>
                      <Select value={historyMonth} onValueChange={setHistoryMonth}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Bulan</SelectItem>
                          {historyMonthOptions.map(item => <SelectItem key={item.month} value={String(item.month)}>{item.month} - {item.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {activeHistoryFilterCount > 0 && (
                    <Button size="sm" className="w-full" onClick={() => { setHistoryYear('all'); setHistoryQuarter('all'); setHistoryMonth('all') }}>
                      Reset Filter
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
