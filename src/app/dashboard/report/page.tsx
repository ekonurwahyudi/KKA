'use client'
import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { TableSkeleton } from '@/components/loading'
import { useGlAccounts, useRegionals } from '@/lib/hooks/useMaster'
import { useBudgets } from '@/lib/hooks/useBudget'
import { useTransactions } from '@/lib/hooks/useTransaction'

interface GlAccount { id: string; code: string; description: string }
interface Regional { id: string; code: string; name: string }
interface Transaction {
  id: string; glAccountId: string; glAccount: GlAccount; quarter: number; regionalCode: string
  kegiatan: string; regionalPengguna: string; tanggalKwitansi?: string; nilaiKwitansi: number; year: number; status: string
}
interface Budget {
  id: string; glAccountId: string; glAccount: GlAccount; totalAmount: number
  q1Amount: number; q2Amount: number; q3Amount: number; q4Amount: number
  allocations: { regionalCode: string; quarter: number; amount: number; rraDelta?: number }[]
  rraLines?: RraLine[]
}
interface RraLine {
  id: string; rraLogId: string; side: string; budgetId: string; regionalCode: string
  regionalName?: string | null; costCenter?: string | null; amount: number; rraAmount: number
  rraLog?: { month: number; lines: RraLine[] }
}
interface SummaryRow { key: string; glCode: string; quarter: number; regionalCode: string; regionalName: string; allocated: number; used: number; remaining: number }

export default function ReportPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [filterGl, setFilterGl] = useState('all')
  const [filterQuarter, setFilterQuarter] = useState('all')
  const [filterRegional, setFilterRegional] = useState('all')

  // TanStack Query hooks
  const { data: glAccounts = [], isLoading: loadingGl } = useGlAccounts()
  const { data: regionals = [], isLoading: loadingRegionals } = useRegionals()
  const { data: budgets = [], isLoading: loadingBudgets } = useBudgets(year)
  const { data: transactions = [], isLoading: loadingTransactions } = useTransactions(year)

  const isLoading = loadingGl || loadingRegionals || loadingBudgets || loadingTransactions

  // Filter transactions based on selected filters
  const filteredTransactions = (transactions as Transaction[]).filter(t => {
    if (filterGl !== 'all' && t.glAccountId !== filterGl) return false
    if (filterQuarter !== 'all' && t.quarter !== parseInt(filterQuarter)) return false
    if (filterRegional !== 'all' && t.regionalCode !== filterRegional) return false
    return true
  })

  const summaryColumns: ColumnDef<SummaryRow>[] = [
    { accessorKey: 'glCode', header: 'GL Account' },
    { accessorKey: 'quarter', header: 'Kuartal', cell: ({ row }) => `Q${row.getValue('quarter')}` },
    { accessorKey: 'regionalName', header: 'Regional' },
    { accessorKey: 'allocated', header: () => <div className="text-right">Alokasi (Rp)</div>,
      cell: ({ row }) => <div className="text-right">{(row.getValue('allocated') as number).toLocaleString('id-ID')}</div> },
    { accessorKey: 'used', header: () => <div className="text-right">Terpakai (Rp)</div>,
      cell: ({ row }) => <div className="text-right text-red-600">{(row.getValue('used') as number).toLocaleString('id-ID')}</div> },
    { accessorKey: 'remaining', header: () => <div className="text-right">Sisa (Rp)</div>,
      cell: ({ row }) => {
        const remaining = row.getValue('remaining') as number
        return <div className={`text-right font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>{remaining.toLocaleString('id-ID')}</div>
      }},
  ]

  const transactionColumns: ColumnDef<Transaction>[] = [
    { accessorKey: 'tanggalKwitansi', header: 'Tanggal',
      cell: ({ row }) => row.original.tanggalKwitansi ? format(new Date(row.original.tanggalKwitansi), 'dd MMM yyyy', { locale: id }) : '-' },
    { accessorKey: 'glAccount.code', header: 'GL Account', cell: ({ row }) => row.original.glAccount.code },
    { accessorKey: 'quarter', header: 'Kuartal', cell: ({ row }) => `Q${row.getValue('quarter')}` },
    { accessorKey: 'regionalCode', header: 'Regional', cell: ({ row }) => (regionals as Regional[]).find(r => r.code === row.original.regionalCode)?.name || row.original.regionalCode },
    { accessorKey: 'kegiatan', header: 'Kegiatan' },
    { accessorKey: 'regionalPengguna', header: 'Regional Pengguna' },
    { accessorKey: 'nilaiKwitansi', header: () => <div className="text-right">Nilai (Rp)</div>,
      cell: ({ row }) => <div className="text-right">{(row.getValue('nilaiKwitansi') as number).toLocaleString('id-ID')}</div> },
    { accessorKey: 'status', header: 'Status' },
  ]

  const summaryData = (): SummaryRow[] => {
    const summary: SummaryRow[] = []
    ;(budgets as Budget[]).forEach((budget) => {
      budget.allocations.forEach((alloc) => {
        const used = (transactions as Transaction[])
          .filter(t => t.glAccountId === budget.glAccountId && t.quarter === alloc.quarter && t.regionalCode === alloc.regionalCode)
          .reduce((sum, t) => sum + t.nilaiKwitansi, 0)
        const rraLines = (budget.rraLines || []).filter(line => (
          line.regionalCode === alloc.regionalCode
          && Math.ceil((line.rraLog?.month || 1) / 3) === alloc.quarter
        ))
        const rraIncoming = rraLines
          .filter(line => line.side === 'PENERIMA')
          .reduce((sum, line) => sum + Number(line.amount || 0), 0)
        const rraUsed = rraLines
          .filter(line => line.side === 'DONOR')
          .reduce((sum, line) => sum + Number(line.amount || 0), 0)
        const reg = (regionals as Regional[]).find(r => r.code === alloc.regionalCode)
        const allocated = Number(alloc.amount || 0) + rraIncoming
        const row: SummaryRow = {
          key: `${budget.glAccount.code}-Q${alloc.quarter}-${alloc.regionalCode}`,
          glCode: budget.glAccount.code, quarter: alloc.quarter, regionalCode: alloc.regionalCode,
          regionalName: reg?.name || alloc.regionalCode, allocated, used: used + rraUsed, remaining: allocated - used - rraUsed,
        }
        if (filterGl !== 'all') { const gl = (glAccounts as GlAccount[]).find(g => g.id === filterGl); if (gl && row.glCode !== gl.code) return }
        if (filterQuarter !== 'all' && row.quarter !== parseInt(filterQuarter)) return
        if (filterRegional !== 'all' && row.regionalCode !== filterRegional) return
        summary.push(row)
      })
    })
    return summary
  }

  if (isLoading) return <TableSkeleton title="Laporan Anggaran" showFilters={true} showActions={false} rows={10} columns={8} />

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div><h1 className="text-xl md:text-2xl font-bold">Laporan Anggaran</h1><p className="text-muted-foreground text-xs md:text-sm">Tahun {year}</p></div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Tahun:</Label>
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024, 2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Card className="border">
        <CardHeader className="p-4 md:p-6"><CardTitle className="text-base md:text-lg">Filter</CardTitle><CardDescription className="text-xs md:text-sm">Pilih kriteria untuk menampilkan laporan</CardDescription></CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">GL Account</Label>
              <Select value={filterGl} onValueChange={setFilterGl}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua GL Account</SelectItem>
                  {(glAccounts as GlAccount[]).map(gl => <SelectItem key={gl.id} value={gl.id}>{gl.code} - {gl.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Kuartal</Label>
              <Select value={filterQuarter} onValueChange={setFilterQuarter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kuartal</SelectItem>
                  {[1,2,3,4].map(q => <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Regional</Label>
              <Select value={filterRegional} onValueChange={setFilterRegional}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Regional</SelectItem>
                  {(regionals as Regional[]).map(r => <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border">
        <CardHeader className="p-4 md:p-6"><CardTitle className="text-base md:text-lg">Ringkasan Sisa Anggaran</CardTitle><CardDescription className="text-xs md:text-sm">Rekapitulasi alokasi dan penggunaan anggaran per GL Account</CardDescription></CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0"><DataTable columns={summaryColumns} data={summaryData()} searchKey="glCode" searchPlaceholder="Cari GL Account..." /></CardContent>
      </Card>
      <Card className="border">
        <CardHeader className="p-4 md:p-6"><CardTitle className="text-base md:text-lg">Daftar Transaksi</CardTitle><CardDescription className="text-xs md:text-sm">Riwayat pencatatan anggaran berdasarkan filter</CardDescription></CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0"><DataTable columns={transactionColumns} data={filteredTransactions} searchKey="kegiatan" searchPlaceholder="Cari kegiatan..." /></CardContent>
      </Card>
    </div>
  )
}
