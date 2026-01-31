'use client'
import { useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { TableSkeleton } from '@/components/loading'

interface GlAccount { id: string; code: string; description: string }
interface Regional { id: string; code: string; name: string }
interface Transaction {
  id: string; glAccountId: string; glAccount: GlAccount; quarter: number; regionalCode: string
  kegiatan: string; regionalPengguna: string; tanggalKwitansi?: string; nilaiKwitansi: number; year: number; status: string
}
interface Budget {
  id: string; glAccountId: string; glAccount: GlAccount; totalAmount: number
  q1Amount: number; q2Amount: number; q3Amount: number; q4Amount: number
  allocations: { regionalCode: string; quarter: number; amount: number }[]
}
interface SummaryRow { key: string; glCode: string; quarter: number; regionalCode: string; regionalName: string; allocated: number; used: number; remaining: number }

export default function ReportPage() {
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [regionals, setRegionals] = useState<Regional[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [filterGl, setFilterGl] = useState('all')
  const [filterQuarter, setFilterQuarter] = useState('all')
  const [filterRegional, setFilterRegional] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/gl-account').then(r => r.json()),
      fetch('/api/regional').then(r => r.json()),
      fetch(`/api/budget?year=${year}`).then(r => r.json())
    ]).then(([glData, regionalData, budgetData]) => {
      setGlAccounts(glData)
      setRegionals(regionalData)
      setBudgets(budgetData)
      setLoading(false)
    })
  }, [year])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ year: year.toString() })
    if (filterGl !== 'all') params.append('glAccountId', filterGl)
    if (filterQuarter !== 'all') params.append('quarter', filterQuarter)
    if (filterRegional !== 'all') params.append('regionalCode', filterRegional)
    fetch(`/api/transaction?${params}`)
      .then(r => r.json())
      .then(data => {
        setTransactions(data)
        setLoading(false)
      })
  }, [year, filterGl, filterQuarter, filterRegional])

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
    { accessorKey: 'regionalCode', header: 'Regional', cell: ({ row }) => regionals.find(r => r.code === row.original.regionalCode)?.name || row.original.regionalCode },
    { accessorKey: 'kegiatan', header: 'Kegiatan' },
    { accessorKey: 'regionalPengguna', header: 'Regional Pengguna' },
    { accessorKey: 'nilaiKwitansi', header: () => <div className="text-right">Nilai (Rp)</div>,
      cell: ({ row }) => <div className="text-right">{(row.getValue('nilaiKwitansi') as number).toLocaleString('id-ID')}</div> },
    { accessorKey: 'status', header: 'Status' },
  ]

  const summaryData = (): SummaryRow[] => {
    const summary: SummaryRow[] = []
    budgets.forEach((budget) => {
      budget.allocations.forEach((alloc) => {
        const used = transactions
          .filter(t => t.glAccountId === budget.glAccountId && t.quarter === alloc.quarter && t.regionalCode === alloc.regionalCode)
          .reduce((sum, t) => sum + t.nilaiKwitansi, 0)
        const reg = regionals.find(r => r.code === alloc.regionalCode)
        const row: SummaryRow = {
          key: `${budget.glAccount.code}-Q${alloc.quarter}-${alloc.regionalCode}`,
          glCode: budget.glAccount.code, quarter: alloc.quarter, regionalCode: alloc.regionalCode,
          regionalName: reg?.name || alloc.regionalCode, allocated: alloc.amount, used, remaining: alloc.amount - used,
        }
        if (filterGl !== 'all') { const gl = glAccounts.find(g => g.id === filterGl); if (gl && row.glCode !== gl.code) return }
        if (filterQuarter !== 'all' && row.quarter !== parseInt(filterQuarter)) return
        if (filterRegional !== 'all' && row.regionalCode !== filterRegional) return
        summary.push(row)
      })
    })
    return summary
  }

  if (loading) {
    return <TableSkeleton title="Laporan Anggaran" showFilters={true} showActions={false} rows={10} columns={8} />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Laporan Anggaran</h1><p className="text-muted-foreground text-sm">Tahun {year}</p></div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Tahun:</Label>
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024, 2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border">
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Pilih kriteria untuk menampilkan laporan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>GL Account</Label>
              <Select value={filterGl} onValueChange={setFilterGl}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua GL Account</SelectItem>
                  {glAccounts.map(gl => <SelectItem key={gl.id} value={gl.id}>{gl.code} - {gl.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kuartal</Label>
              <Select value={filterQuarter} onValueChange={setFilterQuarter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kuartal</SelectItem>
                  {[1,2,3,4].map(q => <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Regional</Label>
              <Select value={filterRegional} onValueChange={setFilterRegional}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Regional</SelectItem>
                  {regionals.map(r => <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border">
        <CardHeader>
          <CardTitle>Ringkasan Sisa Anggaran</CardTitle>
          <CardDescription>Rekapitulasi alokasi dan penggunaan anggaran per GL Account</CardDescription>
        </CardHeader>
        <CardContent><DataTable columns={summaryColumns} data={summaryData()} searchKey="glCode" searchPlaceholder="Cari GL Account..." /></CardContent>
      </Card>

      <Card className="border">
        <CardHeader>
          <CardTitle>Daftar Transaksi</CardTitle>
          <CardDescription>Riwayat pencatatan anggaran berdasarkan filter</CardDescription>
        </CardHeader>
        <CardContent><DataTable columns={transactionColumns} data={transactions} searchKey="kegiatan" searchPlaceholder="Cari kegiatan..." /></CardContent>
      </Card>
    </div>
  )
}
