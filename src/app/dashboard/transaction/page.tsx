'use client'
import { useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Wallet, TrendingUp, TrendingDown, CheckCircle, Pencil, Trash2, AlertTriangle, Eye } from 'lucide-react'
import { CurrencyInput } from '@/components/ui/currency-input'

interface GlAccount { id: string; code: string; description: string }
interface Regional { id: string; code: string; name: string }
interface Vendor { id: string; name: string; alamat?: string; pic?: string; phone?: string; email?: string }
interface RemainingInfo { allocated: number; used: number; remaining: number }

interface Transaction {
  id: string; glAccountId: string; glAccount: GlAccount; quarter: number; regionalCode: string
  kegiatan: string; regionalPengguna: string; year: number
  tanggalKwitansi?: string; nilaiKwitansi: number; jenisPajak?: string
  nilaiTanpaPPN: number; nilaiPPN: number; keterangan?: string; jenisPengadaan?: string
  vendorId?: string; vendor?: Vendor; tanggalEntry: string; noTiketMydx?: string
  tglSerahFinance?: string; picFinance?: string; noHpFinance?: string
  tglTransferVendor?: string; nilaiTransfer?: number
  taskPengajuan: boolean; taskTransferVendor: boolean; taskTerimaBerkas: boolean
  taskUploadMydx: boolean; taskSerahFinance: boolean; taskVendorDibayar: boolean; status: string
}

const JENIS_PAJAK = [
  { value: 'TanpaPPN', label: 'Tanpa PPN' }, { value: 'PPN11', label: 'PPN 11%' },
  { value: 'PPNJasa2', label: 'PPN Jasa 2%' }, { value: 'PPNInklaring1.1', label: 'PPN Inklaring 1.1%' },
]
const JENIS_PENGADAAN = [
  { value: 'PadiUMKM', label: 'PadiUMKM' }, { value: 'InpresFund', label: 'Inpres Fund' },
  { value: 'Nopes', label: 'Nopes' }, { value: 'Lainnya', label: 'Lainnya' },
]

function calculatePPN(nilaiKwitansi: number, jenisPajak: string) {
  let nilaiTanpaPPN = nilaiKwitansi, nilaiPPN = 0
  if (jenisPajak === 'PPN11') { nilaiTanpaPPN = nilaiKwitansi / 1.11; nilaiPPN = nilaiKwitansi - nilaiTanpaPPN }
  else if (jenisPajak === 'PPNJasa2') { nilaiPPN = nilaiKwitansi * 0.02; nilaiTanpaPPN = nilaiKwitansi - nilaiPPN }
  else if (jenisPajak === 'PPNInklaring1.1') { nilaiPPN = nilaiKwitansi * 0.011; nilaiTanpaPPN = nilaiKwitansi - nilaiPPN }
  return { nilaiTanpaPPN, nilaiPPN }
}

function StatusBadge({ status }: { status: string }) {
  return <Badge className={status === 'Close' ? 'bg-green-500' : status === 'Proses' ? 'bg-yellow-500 text-black' : 'bg-gray-300 text-black'}>{status}</Badge>
}

export default function TransactionPage() {
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [regionals, setRegionals] = useState<Regional[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [remaining, setRemaining] = useState<RemainingInfo | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Form states
  const [selectedGl, setSelectedGl] = useState('')
  const [quarter, setQuarter] = useState('1')
  const [regional, setRegional] = useState('')
  const [kegiatan, setKegiatan] = useState('')
  const [regionalPengguna, setRegionalPengguna] = useState('')
  const [tanggalKwitansi, setTanggalKwitansi] = useState<Date | undefined>()
  const [nilaiKwitansi, setNilaiKwitansi] = useState(0)

  // Dialog states
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Edit form states
  const [editGl, setEditGl] = useState('')
  const [editQuarter, setEditQuarter] = useState('1')
  const [editRegional, setEditRegional] = useState('')
  const [editKegiatan, setEditKegiatan] = useState('')
  const [editRegionalPengguna, setEditRegionalPengguna] = useState('')
  const [editTanggalKwitansi, setEditTanggalKwitansi] = useState<Date | undefined>()
  const [editNilaiKwitansi, setEditNilaiKwitansi] = useState(0)
  const [editJenisPajak, setEditJenisPajak] = useState('TanpaPPN')
  const [editKeterangan, setEditKeterangan] = useState('')
  const [editJenisPengadaan, setEditJenisPengadaan] = useState('')
  const [editVendorId, setEditVendorId] = useState('')
  const [editNoTiketMydx, setEditNoTiketMydx] = useState('')
  const [editTglSerahFinance, setEditTglSerahFinance] = useState<Date | undefined>()
  const [editPicFinance, setEditPicFinance] = useState('')
  const [editNoHpFinance, setEditNoHpFinance] = useState('')
  const [editTglTransferVendor, setEditTglTransferVendor] = useState<Date | undefined>()
  const [editNilaiTransfer, setEditNilaiTransfer] = useState<number | undefined>()
  const [editTaskTransferVendor, setEditTaskTransferVendor] = useState(false)
  const [editTaskTerimaBerkas, setEditTaskTerimaBerkas] = useState(false)
  const [editStatus, setEditStatus] = useState('Open')

  useEffect(() => {
    fetch('/api/gl-account').then(r => r.json()).then(setGlAccounts)
    fetch('/api/regional').then(r => r.json()).then(data => { setRegionals(data); if (data.length > 0) setRegional(data[0].code) })
    fetch('/api/vendor').then(r => r.json()).then(setVendors)
  }, [])

  useEffect(() => { loadTransactions() }, [year])
  const loadTransactions = () => { fetch(`/api/transaction?year=${year}`).then(r => r.json()).then(setTransactions) }

  useEffect(() => {
    if (selectedGl && regional) {
      fetch(`/api/transaction/remaining?glAccountId=${selectedGl}&quarter=${quarter}&regionalCode=${regional}&year=${year}`)
        .then(r => { if (!r.ok) return { allocated: 0, used: 0, remaining: 0 }; return r.json() })
        .then(setRemaining).catch(() => setRemaining({ allocated: 0, used: 0, remaining: 0 }))
    }
  }, [selectedGl, quarter, regional, year])

  // Status counts
  const openCount = transactions.filter(t => t.status === 'Open').length
  const prosesCount = transactions.filter(t => t.status === 'Proses').length
  const closeCount = transactions.filter(t => t.status === 'Close').length

  // Filtered transactions by tab
  const filteredTransactions = activeTab === 'all' ? transactions : transactions.filter(t => t.status === activeTab)

  const editPpnCalc = calculatePPN(editNilaiKwitansi, editJenisPajak)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!remaining || remaining.remaining <= 0) return
    await fetch('/api/transaction', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ glAccountId: selectedGl, quarter: parseInt(quarter), regionalCode: regional, kegiatan, regionalPengguna, year, tanggalKwitansi: tanggalKwitansi?.toISOString(), nilaiKwitansi }),
    })
    setMessage('Transaksi berhasil disimpan!')
    setKegiatan(''); setRegionalPengguna(''); setTanggalKwitansi(undefined); setNilaiKwitansi(0)
    fetch(`/api/transaction/remaining?glAccountId=${selectedGl}&quarter=${quarter}&regionalCode=${regional}&year=${year}`).then(r => r.json()).then(setRemaining).catch(() => {})
    loadTransactions(); setTimeout(() => setMessage(''), 3000)
  }

  const openViewDialog = (t: Transaction) => { setViewingTransaction(t); setShowViewDialog(true) }

  const openEditDialog = (t: Transaction) => {
    setEditingTransaction(t)
    setEditGl(t.glAccountId); setEditQuarter(t.quarter.toString()); setEditRegional(t.regionalCode)
    setEditKegiatan(t.kegiatan); setEditRegionalPengguna(t.regionalPengguna)
    setEditTanggalKwitansi(t.tanggalKwitansi ? new Date(t.tanggalKwitansi) : undefined)
    setEditNilaiKwitansi(t.nilaiKwitansi); setEditJenisPajak(t.jenisPajak || 'TanpaPPN')
    setEditKeterangan(t.keterangan || ''); setEditJenisPengadaan(t.jenisPengadaan || '')
    setEditVendorId(t.vendorId || ''); setEditNoTiketMydx(t.noTiketMydx || '')
    setEditTglSerahFinance(t.tglSerahFinance ? new Date(t.tglSerahFinance) : undefined)
    setEditPicFinance(t.picFinance || ''); setEditNoHpFinance(t.noHpFinance || '')
    setEditTglTransferVendor(t.tglTransferVendor ? new Date(t.tglTransferVendor) : undefined)
    setEditNilaiTransfer(t.nilaiTransfer); setEditTaskTransferVendor(t.taskTransferVendor); setEditTaskTerimaBerkas(t.taskTerimaBerkas)
    setEditStatus(t.status)
    setShowEditDialog(true)
  }

  const handleEdit = async () => {
    if (!editingTransaction) return
    await fetch(`/api/transaction/${editingTransaction.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        glAccountId: editGl, quarter: parseInt(editQuarter), regionalCode: editRegional, kegiatan: editKegiatan, regionalPengguna: editRegionalPengguna,
        tanggalKwitansi: editTanggalKwitansi?.toISOString(), nilaiKwitansi: editNilaiKwitansi, jenisPajak: editJenisPajak, keterangan: editKeterangan,
        jenisPengadaan: editJenisPengadaan, vendorId: editVendorId || null, noTiketMydx: editNoTiketMydx, tglSerahFinance: editTglSerahFinance?.toISOString(),
        picFinance: editPicFinance, noHpFinance: editNoHpFinance, tglTransferVendor: editTglTransferVendor?.toISOString(),
        nilaiTransfer: editNilaiTransfer, taskTransferVendor: editTaskTransferVendor, taskTerimaBerkas: editTaskTerimaBerkas, status: 'Proses',
      }),
    })
    setShowEditDialog(false); setEditingTransaction(null); loadTransactions()
    setMessage('Transaksi berhasil diupdate!'); setTimeout(() => setMessage(''), 3000)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/transaction/${deleteId}`, { method: 'DELETE' })
    setShowDeleteDialog(false); setDeleteId(null); loadTransactions()
    if (selectedGl && regional) { fetch(`/api/transaction/remaining?glAccountId=${selectedGl}&quarter=${quarter}&regionalCode=${regional}&year=${year}`).then(r => r.json()).then(setRemaining).catch(() => {}) }
    setMessage('Transaksi berhasil dihapus!'); setTimeout(() => setMessage(''), 3000)
  }

  const columns: ColumnDef<Transaction>[] = [
    { accessorKey: 'tanggalKwitansi', header: 'Tgl Kwitansi', cell: ({ row }) => row.original.tanggalKwitansi ? format(new Date(row.original.tanggalKwitansi), 'dd MMM yy', { locale: idLocale }) : '-' },
    { accessorKey: 'glAccount.code', header: 'GL', cell: ({ row }) => row.original.glAccount.code },
    { accessorKey: 'quarter', header: 'Q', cell: ({ row }) => `Q${row.getValue('quarter')}` },
    { accessorKey: 'regionalCode', header: 'Regional', cell: ({ row }) => regionals.find(r => r.code === row.original.regionalCode)?.name || row.original.regionalCode },
    { accessorKey: 'kegiatan', header: 'Kegiatan' },
    { accessorKey: 'nilaiKwitansi', header: () => <div className="text-right">Nilai (Rp)</div>, cell: ({ row }) => <div className="text-right">{row.original.nilaiKwitansi.toLocaleString('id-ID')}</div> },
    { accessorKey: 'jenisPengadaan', header: 'Pengadaan', cell: ({ row }) => JENIS_PENGADAAN.find(p => p.value === row.original.jenisPengadaan)?.label || '-' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'actions', header: 'Aksi', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => openViewDialog(row.original)}><Eye className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => openEditDialog(row.original)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => { setDeleteId(row.original.id); setShowDeleteDialog(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
    )},
  ]

  const isSubmitDisabled = !selectedGl || !regional || (remaining !== null && remaining.remaining <= 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Input Pencatatan Anggaran</h1><p className="text-muted-foreground text-sm">Catat penggunaan anggaran per kegiatan</p></div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Tahun:</Label>
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024, 2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2"><CheckCircle className="h-4 w-4" />{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="border">
            <CardHeader>
              <CardTitle>Form Pencatatan</CardTitle>
              <CardDescription>Isi detail kegiatan dan nilai anggaran</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>GL Account</Label>
                    <Select value={selectedGl} onValueChange={setSelectedGl}>
                      <SelectTrigger><SelectValue placeholder="Pilih GL Account" /></SelectTrigger>
                      <SelectContent>{glAccounts.map(gl => <SelectItem key={gl.id} value={gl.id}>{gl.code} - {gl.description}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kuartal</Label>
                    <Select value={quarter} onValueChange={setQuarter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{[1,2,3,4].map(q => <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Regional</Label>
                    <Select value={regional} onValueChange={setRegional}>
                      <SelectTrigger><SelectValue placeholder="Pilih Regional" /></SelectTrigger>
                      <SelectContent>{regionals.map(r => <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Kegiatan</Label><Input value={kegiatan} onChange={e => setKegiatan(e.target.value)} placeholder="Deskripsi kegiatan" required /></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Regional Pengguna</Label><Input value={regionalPengguna} onChange={e => setRegionalPengguna(e.target.value)} placeholder="Regional pengguna" required /></div>
                  <div className="space-y-2"><Label>Tanggal Kwitansi</Label><DatePicker date={tanggalKwitansi} onSelect={setTanggalKwitansi} placeholder="Pilih tanggal" /></div>
                  <div className="space-y-2"><Label>Nilai Kwitansi (Rp)</Label><CurrencyInput value={nilaiKwitansi} onChange={setNilaiKwitansi} /></div>
                </div>
                <Button type="submit" disabled={isSubmitDisabled}>Simpan</Button>
                {remaining !== null && remaining.remaining <= 0 && <p className="text-sm text-red-500 flex items-center gap-1"><AlertTriangle className="h-4 w-4" />Sisa anggaran 0</p>}
              </form>
            </CardContent>
          </Card>
        </div>
        <Card className="border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Info Sisa Anggaran</CardTitle>
            <CardDescription>{regionals.find(r => r.code === regional)?.name || regional} - Q{quarter}</CardDescription>
          </CardHeader>
          <CardContent>
            {remaining ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Alokasi (Rp)</span><span className="text-lg font-semibold text-blue-600 flex items-center gap-1"><TrendingUp className="h-4 w-4" />{remaining.allocated.toLocaleString('id-ID')}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Terpakai (Rp)</span><span className="text-lg font-semibold text-red-600 flex items-center gap-1"><TrendingDown className="h-4 w-4" />{remaining.used.toLocaleString('id-ID')}</span></div>
                <div className="border-t pt-4"><div className="flex items-center justify-between"><span className="text-sm font-medium">Sisa (Rp)</span><span className={`text-xl font-bold ${remaining.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>{remaining.remaining.toLocaleString('id-ID')}</span></div></div>
              </div>
            ) : <p className="text-muted-foreground text-sm">Pilih GL Account untuk melihat sisa anggaran</p>}
          </CardContent>
        </Card>
      </div>

      {/* Transaction List with Tabs */}
      <Card className="border">
        <CardHeader>
          <CardTitle>Daftar Transaksi</CardTitle>
          <CardDescription>Riwayat pencatatan anggaran tahun {year}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Semua ({transactions.length})</TabsTrigger>
              <TabsTrigger value="Open">Open ({openCount})</TabsTrigger>
              <TabsTrigger value="Proses">Proses ({prosesCount})</TabsTrigger>
              <TabsTrigger value="Close">Selesai ({closeCount})</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab}>
              <DataTable columns={columns} data={filteredTransactions} searchKey="kegiatan" searchPlaceholder="Cari kegiatan..." />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Detail Transaksi</DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Informasi lengkap transaksi pencatatan anggaran</p>
          </DialogHeader>
          {viewingTransaction && (
            <div className="grid grid-cols-3 gap-0">
              {/* Left Side - Details */}
              <div className="col-span-2 px-6 pb-6 space-y-4 border-r">
                {/* GL Account */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">GL Account</Label>
                  <Input value={`${viewingTransaction.glAccount.code} - ${viewingTransaction.glAccount.description}`} disabled className="bg-muted/50 font-medium" />
                </div>

                {/* Basic Info Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Kuartal</Label>
                    <Input value={`Q${viewingTransaction.quarter}`} disabled className="bg-muted/50 font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Regional</Label>
                    <Input value={regionals.find(r => r.code === viewingTransaction.regionalCode)?.name || '-'} disabled className="bg-muted/50 font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Regional Pengguna</Label>
                    <Input value={viewingTransaction.regionalPengguna} disabled className="bg-muted/50 font-medium" />
                  </div>
                </div>

                {/* Kegiatan */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Kegiatan</Label>
                  <Input value={viewingTransaction.kegiatan} disabled className="bg-muted/50 font-medium" />
                </div>

                {/* Kwitansi Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Tanggal Kwitansi</Label>
                    <Input value={viewingTransaction.tanggalKwitansi ? format(new Date(viewingTransaction.tanggalKwitansi), 'dd MMMM yyyy', { locale: idLocale }) : '-'} disabled className="bg-muted/50 font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Nilai Kwitansi (Rp)</Label>
                    <Input value={viewingTransaction.nilaiKwitansi.toLocaleString('id-ID')} disabled className="bg-muted/50 font-medium text-blue-600" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Jenis Pajak</Label>
                    <Input value={JENIS_PAJAK.find(p => p.value === viewingTransaction.jenisPajak)?.label || 'Tanpa PPN'} disabled className="bg-muted/50 font-medium" />
                  </div>
                </div>

                {/* PPN Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Nilai Tanpa PPN (Rp)</Label>
                    <Input value={viewingTransaction.nilaiTanpaPPN.toLocaleString('id-ID', { maximumFractionDigits: 0 })} disabled className="bg-muted/50 font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Nilai PPN (Rp)</Label>
                    <Input value={viewingTransaction.nilaiPPN.toLocaleString('id-ID', { maximumFractionDigits: 0 })} disabled className="bg-muted/50 font-medium" />
                  </div>
                </div>

                {/* Pengadaan Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Jenis Pengadaan</Label>
                    <Input value={JENIS_PENGADAAN.find(p => p.value === viewingTransaction.jenisPengadaan)?.label || '-'} disabled className="bg-muted/50 font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Vendor</Label>
                    <Input value={viewingTransaction.vendor?.name || '-'} disabled className="bg-muted/50 font-medium" />
                  </div>
                </div>

                {/* Keterangan */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Keterangan</Label>
                  <Textarea value={viewingTransaction.keterangan || '-'} disabled className="bg-muted/50 font-medium min-h-[60px] resize-none" />
                </div>

                {/* Finance Info Section */}
                <div className="pt-4 border-t space-y-4">
                  <p className="text-sm font-semibold text-muted-foreground">Informasi Finance</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">No. Tiket Mydx</Label>
                      <Input value={viewingTransaction.noTiketMydx || '-'} disabled className="bg-muted/50 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Tgl Serah Finance</Label>
                      <Input value={viewingTransaction.tglSerahFinance ? format(new Date(viewingTransaction.tglSerahFinance), 'dd MMMM yyyy', { locale: idLocale }) : '-'} disabled className="bg-muted/50 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">PIC Finance</Label>
                      <Input value={viewingTransaction.picFinance || '-'} disabled className="bg-muted/50 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">No HP Finance</Label>
                      <Input value={viewingTransaction.noHpFinance || '-'} disabled className="bg-muted/50 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Tgl Transfer Vendor</Label>
                      <Input value={viewingTransaction.tglTransferVendor ? format(new Date(viewingTransaction.tglTransferVendor), 'dd MMMM yyyy', { locale: idLocale }) : '-'} disabled className="bg-muted/50 font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Nilai Transfer (Rp)</Label>
                      <Input value={viewingTransaction.nilaiTransfer ? viewingTransaction.nilaiTransfer.toLocaleString('id-ID') : '-'} disabled className="bg-muted/50 font-medium" />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowViewDialog(false)}>Tutup</Button>
                  <Button onClick={() => { setShowViewDialog(false); openEditDialog(viewingTransaction) }}>Edit</Button>
                </div>
              </div>

              {/* Right Side - Status & Task Checklist */}
              <div className="col-span-1 px-5 py-6 bg-muted/30">
                {/* Status */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b">
                  <span className="text-sm font-semibold">Status</span>
                  <StatusBadge status={viewingTransaction.status} />
                </div>

                {/* Task Checklist */}
                <div className="space-y-4">
                  <p className="text-sm font-semibold">Task Checklist</p>
                  <div className="space-y-3">
                    <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${viewingTransaction.taskPengajuan ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                      <Checkbox checked={viewingTransaction.taskPengajuan} disabled className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                      <span className={`text-sm ${viewingTransaction.taskPengajuan ? 'text-green-700' : ''}`}>Pengajuan Pengadaan</span>
                    </div>
                    <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${viewingTransaction.taskTransferVendor ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                      <Checkbox checked={viewingTransaction.taskTransferVendor} disabled className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                      <span className={`text-sm ${viewingTransaction.taskTransferVendor ? 'text-green-700' : ''}`}>Transfer dari Vendor</span>
                    </div>
                    <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${viewingTransaction.taskTerimaBerkas ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                      <Checkbox checked={viewingTransaction.taskTerimaBerkas} disabled className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                      <span className={`text-sm ${viewingTransaction.taskTerimaBerkas ? 'text-green-700' : ''}`}>Terima berkas pengadaan</span>
                    </div>
                    <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${viewingTransaction.taskUploadMydx ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                      <Checkbox checked={viewingTransaction.taskUploadMydx} disabled className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                      <span className={`text-sm ${viewingTransaction.taskUploadMydx ? 'text-green-700' : ''}`}>Upload ke Mydx</span>
                    </div>
                    <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${viewingTransaction.taskSerahFinance ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                      <Checkbox checked={viewingTransaction.taskSerahFinance} disabled className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                      <span className={`text-sm ${viewingTransaction.taskSerahFinance ? 'text-green-700' : ''}`}>Serahkan berkas ke Finance</span>
                    </div>
                    <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${viewingTransaction.taskVendorDibayar ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                      <Checkbox checked={viewingTransaction.taskVendorDibayar} disabled className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                      <span className={`text-sm ${viewingTransaction.taskVendorDibayar ? 'text-green-700' : ''}`}>Vendor sudah dibayar</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Edit Transaksi</DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Ubah data transaksi dan lengkapi informasi yang diperlukan</p>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-0">
            {/* Left Side - Form */}
            <div className="col-span-2 px-6 pb-6 space-y-4 border-r">
              {/* GL Account */}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">GL Account</Label>
                <Select value={editGl} onValueChange={setEditGl}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{glAccounts.map(gl => <SelectItem key={gl.id} value={gl.id}>{gl.code} - {gl.description}</SelectItem>)}</SelectContent></Select>
              </div>

              {/* Basic Info Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Kuartal</Label>
                  <Select value={editQuarter} onValueChange={setEditQuarter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4].map(q => <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Regional</Label>
                  <Select value={editRegional} onValueChange={setEditRegional}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{regionals.map(r => <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Regional Pengguna</Label>
                  <Input value={editRegionalPengguna} onChange={e => setEditRegionalPengguna(e.target.value)} />
                </div>
              </div>

              {/* Kegiatan */}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Kegiatan</Label>
                <Input value={editKegiatan} onChange={e => setEditKegiatan(e.target.value)} />
              </div>

              {/* Kwitansi Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Tanggal Kwitansi</Label>
                  <DatePicker date={editTanggalKwitansi} onSelect={setEditTanggalKwitansi} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Nilai Kwitansi (Rp)</Label>
                  <CurrencyInput value={editNilaiKwitansi} onChange={setEditNilaiKwitansi} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Jenis Pajak</Label>
                  <Select value={editJenisPajak} onValueChange={setEditJenisPajak}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{JENIS_PAJAK.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>

              {/* PPN Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Nilai Tanpa PPN (Rp)</Label>
                  <Input value={editPpnCalc.nilaiTanpaPPN.toLocaleString('id-ID', { maximumFractionDigits: 0 })} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Nilai PPN (Rp)</Label>
                  <Input value={editPpnCalc.nilaiPPN.toLocaleString('id-ID', { maximumFractionDigits: 0 })} disabled className="bg-muted/50" />
                </div>
              </div>

              {/* Pengadaan Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Jenis Pengadaan</Label>
                  <Select value={editJenisPengadaan} onValueChange={setEditJenisPengadaan}><SelectTrigger><SelectValue placeholder="Pilih jenis pengadaan" /></SelectTrigger><SelectContent>{JENIS_PENGADAAN.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Vendor</Label>
                  <Select value={editVendorId} onValueChange={setEditVendorId}><SelectTrigger><SelectValue placeholder="Pilih vendor" /></SelectTrigger><SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Keterangan</Label>
                <Textarea value={editKeterangan} onChange={e => setEditKeterangan(e.target.value)} className="min-h-[60px]" />
              </div>

              {/* Finance Info */}
              <div className="pt-4 border-t space-y-4">
                <p className="text-sm font-semibold text-muted-foreground">Informasi Finance</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">No. Tiket Mydx</Label>
                    <Input value={editNoTiketMydx} onChange={e => setEditNoTiketMydx(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Tgl Serah Finance</Label>
                    <DatePicker date={editTglSerahFinance} onSelect={setEditTglSerahFinance} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">PIC Finance</Label>
                    <Input value={editPicFinance} onChange={e => setEditPicFinance(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">No HP Finance</Label>
                    <Input value={editNoHpFinance} onChange={e => setEditNoHpFinance(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Tgl Transfer ke Vendor</Label>
                    <DatePicker date={editTglTransferVendor} onSelect={setEditTglTransferVendor} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Nilai Transfer (Rp)</Label>
                    <CurrencyInput value={editNilaiTransfer || 0} onChange={v => setEditNilaiTransfer(v || undefined)} />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
                <Button onClick={handleEdit}>Simpan Perubahan</Button>
              </div>
            </div>

            {/* Right Side - Status & Task Checklist */}
            <div className="col-span-1 px-5 py-6 bg-muted/30">
              {/* Status */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b">
                <span className="text-sm font-semibold">Status</span>
                <Badge className="bg-yellow-500 text-black">Proses</Badge>
              </div>

              {/* Task Checklist */}
              <div className="space-y-4">
                <p className="text-sm font-semibold">Task Checklist</p>
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${true ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                    <Checkbox checked disabled className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                    <span className={`text-sm ${true ? 'text-green-700' : ''}`}>Pengajuan Pengadaan</span>
                  </div>
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${editTaskTransferVendor ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                    <Checkbox id="editTaskTransferVendor" checked={editTaskTransferVendor} onCheckedChange={c => setEditTaskTransferVendor(!!c)} className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                    <label htmlFor="editTaskTransferVendor" className={`text-sm cursor-pointer ${editTaskTransferVendor ? 'text-green-700' : ''}`}>Transfer dari Vendor</label>
                  </div>
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${editTaskTerimaBerkas ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                    <Checkbox id="editTaskTerimaBerkas" checked={editTaskTerimaBerkas} onCheckedChange={c => setEditTaskTerimaBerkas(!!c)} className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                    <label htmlFor="editTaskTerimaBerkas" className={`text-sm cursor-pointer ${editTaskTerimaBerkas ? 'text-green-700' : ''}`}>Terima berkas pengadaan</label>
                  </div>
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${!!editNoTiketMydx ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                    <Checkbox checked={!!editNoTiketMydx} disabled className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                    <span className={`text-sm ${!!editNoTiketMydx ? 'text-green-700' : 'text-muted-foreground'}`}>Upload ke Mydx</span>
                  </div>
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${!!editTglSerahFinance ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                    <Checkbox checked={!!editTglSerahFinance} disabled className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                    <span className={`text-sm ${!!editTglSerahFinance ? 'text-green-700' : 'text-muted-foreground'}`}>Serahkan berkas ke Finance</span>
                  </div>
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${!!editTglTransferVendor ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                    <Checkbox checked={!!editTglTransferVendor} disabled className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                    <span className={`text-sm ${!!editTglTransferVendor ? 'text-green-700' : 'text-muted-foreground'}`}>Vendor sudah dibayar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
