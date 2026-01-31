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
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, CheckCircle, Eye, Save, FileText, Calendar, CreditCard } from 'lucide-react'
import { CurrencyInput } from '@/components/ui/currency-input'
import { TableSkeleton } from '@/components/loading'

interface GlAccount {
  id: string
  code: string
  description: string
}

interface ImprestItem {
  id: string
  tanggal: Date
  uraian: string
  glAccountId: string
  glAccount?: GlAccount
  jumlah: number
}

interface ImprestFund {
  id: string
  kelompokKegiatan: string
  items: ImprestItem[]
  status: 'draft' | 'proses' | 'close'
  totalAmount: number
  createdAt: Date
  updatedAt: Date
}

export default function ImprestFundPage() {
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [imprestFunds, setImprestFunds] = useState<ImprestFund[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [autoSaving, setAutoSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  
  // Form states
  const [kelompokKegiatan, setKelompokKegiatan] = useState('')
  const [items, setItems] = useState<ImprestItem[]>([])
  
  // Dialog states
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [viewingImprest, setViewingImprest] = useState<ImprestFund | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  // Auto-save functionality
  useEffect(() => {
    if (!kelompokKegiatan || items.length === 0) return

    const autoSaveTimer = setTimeout(() => {
      if (validateItems()) {
        autoSaveDraft()
      }
    }, 5000) // Auto-save after 5 seconds of inactivity

    return () => clearTimeout(autoSaveTimer)
  }, [kelompokKegiatan, items])

  const autoSaveDraft = async () => {
    setAutoSaving(true)
    try {
      const response = await fetch('/api/imprest-fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelompokKegiatan,
          items: items.map(item => ({
            tanggal: item.tanggal,
            uraian: item.uraian,
            glAccountId: item.glAccountId,
            jumlah: item.jumlah
          })),
          status: 'draft'
        })
      })

      if (response.ok) {
        setMessage('Draft tersimpan otomatis')
        setTimeout(() => setMessage(''), 2000)
      }
    } catch (error) {
      console.error('Auto-save error:', error)
    }
    setAutoSaving(false)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // Load GL Accounts
      const glResponse = await fetch('/api/gl-account')
      const glData = await glResponse.json()
      setGlAccounts(glData)
      
      // Load Imprest Funds
      const imprestResponse = await fetch('/api/imprest-fund')
      const imprestData = await imprestResponse.json()
      setImprestFunds(imprestData)
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const addItem = () => {
    const newItem: ImprestItem = {
      id: Date.now().toString(),
      tanggal: new Date(),
      uraian: '',
      glAccountId: '',
      glAccount: undefined,
      jumlah: 0
    }

    setItems([...items, newItem])
    setMessage('Baris baru ditambahkan!')
    setTimeout(() => setMessage(''), 3000)
  }

  const updateItem = (itemId: string, field: keyof ImprestItem, value: any) => {
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value }
        
        // Update glAccount object when glAccountId changes
        if (field === 'glAccountId') {
          updatedItem.glAccount = glAccounts.find(gl => gl.id === value)
        }
        
        return updatedItem
      }
      return item
    })

    setItems(updatedItems)
  }

  const deleteItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId))
    setDeleteItemId(null)
    setShowDeleteDialog(false)
    setMessage('Item berhasil dihapus!')
    setTimeout(() => setMessage(''), 3000)
  }

  const saveDraft = async () => {
    if (!kelompokKegiatan || items.length === 0) {
      setMessage('Kelompok kegiatan dan minimal 1 item harus diisi!')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    if (!validateItems()) {
      setMessage('Semua field pada uraian harus diisi dengan benar!')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    try {
      const response = await fetch('/api/imprest-fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelompokKegiatan,
          items: items.map(item => ({
            tanggal: item.tanggal,
            uraian: item.uraian,
            glAccountId: item.glAccountId,
            jumlah: item.jumlah
          })),
          status: 'draft'
        })
      })

      if (response.ok) {
        setMessage('Draft berhasil disimpan!')
        // Reset form
        setKelompokKegiatan('')
        setItems([])
        // Reload data
        loadData()
      } else {
        setMessage('Gagal menyimpan draft!')
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      setMessage('Gagal menyimpan draft!')
    }
    
    setTimeout(() => setMessage(''), 3000)
  }

  const submitImprest = async () => {
    if (!kelompokKegiatan || items.length === 0) {
      setMessage('Kelompok kegiatan dan minimal 1 item harus diisi!')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    if (!validateItems()) {
      setMessage('Semua field pada uraian harus diisi dengan benar!')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    try {
      const response = await fetch('/api/imprest-fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelompokKegiatan,
          items: items.map(item => ({
            tanggal: item.tanggal,
            uraian: item.uraian,
            glAccountId: item.glAccountId,
            jumlah: item.jumlah
          })),
          status: 'proses'
        })
      })

      if (response.ok) {
        setMessage('Imprest Fund berhasil disubmit!')
        // Reset form
        setKelompokKegiatan('')
        setItems([])
        // Reload data
        loadData()
      } else {
        setMessage('Gagal submit Imprest Fund!')
      }
    } catch (error) {
      console.error('Error submitting imprest fund:', error)
      setMessage('Gagal submit Imprest Fund!')
    }
    
    setTimeout(() => setMessage(''), 3000)
  }

  const totalAmount = items.reduce((sum, item) => sum + item.jumlah, 0)

  const validateItems = () => {
    return items.every(item => 
      item.tanggal && 
      item.uraian.trim() !== '' && 
      item.glAccountId !== '' && 
      item.jumlah > 0
    )
  }

  // Filter and count by status
  const filteredImprestFunds = activeTab === 'all' 
    ? imprestFunds 
    : imprestFunds.filter(imprest => imprest.status === activeTab)

  const draftCount = imprestFunds.filter(t => t.status === 'draft').length
  const prosesCount = imprestFunds.filter(t => t.status === 'proses').length
  const closeCount = imprestFunds.filter(t => t.status === 'close').length

  const historyColumns: ColumnDef<ImprestFund>[] = [
    { 
      accessorKey: 'kelompokKegiatan', 
      header: 'Kelompok Kegiatan',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.original.kelompokKegiatan}>
          {row.original.kelompokKegiatan}
        </div>
      )
    },
    { 
      accessorKey: 'items', 
      header: 'Jumlah Item', 
      cell: ({ row }) => `${row.original.items.length} item`
    },
    { 
      accessorKey: 'totalAmount', 
      header: () => <div className="text-right">Total Amount (Rp)</div>, 
      cell: ({ row }) => <div className="text-right font-medium">{row.original.totalAmount.toLocaleString('id-ID')}</div>
    },
    { 
      accessorKey: 'status', 
      header: 'Status', 
      cell: ({ row }) => {
        const status = row.original.status
        const variant = status === 'close' ? 'default' : status === 'proses' ? 'secondary' : 'outline'
        const label = status === 'close' ? 'Close' : status === 'proses' ? 'Proses' : 'Draft'
        return <Badge variant={variant}>{label}</Badge>
      }
    },
    { 
      accessorKey: 'createdAt', 
      header: 'Tanggal Dibuat', 
      cell: ({ row }) => format(row.original.createdAt, 'dd MMM yyyy HH:mm', { locale: idLocale })
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { setViewingImprest(row.original); setShowViewDialog(true) }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  if (loading) {
    return <TableSkeleton title="Imprest Fund" showFilters={false} showActions={true} rows={5} columns={5} />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Imprest Fund</h1>
          <p className="text-muted-foreground text-sm">Kelola dana imprest dan pencatatan penggunaan</p>
        </div>
      </div>

      {message && (
        <div className={`border px-4 py-3 rounded-xl flex items-center gap-2 ${
          message.includes('otomatis') 
            ? 'bg-blue-50 border-blue-200 text-blue-700' 
            : message.includes('berhasil') || message.includes('ditambahkan')
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <CheckCircle className="h-4 w-4" />
          {message}
        </div>
      )}

      {autoSaving && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
          Menyimpan draft...
        </div>
      )}

      {/* Input Form */}
      <Card className="border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Input Imprest Fund
          </CardTitle>
          <CardDescription>Buat pencatatan imprest fund baru</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Kelompok Kegiatan */}
          <div className="space-y-2">
            <Label>Kelompok Kegiatan</Label>
            <Input 
              value={kelompokKegiatan}
              onChange={(e) => setKelompokKegiatan(e.target.value)}
              placeholder="Masukkan kelompok kegiatan"
              required
            />
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={addItem} className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Uraian
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">Belum ada uraian penggunaan</p>
                  <p className="text-xs text-muted-foreground">Klik "Tambah Uraian" untuk menambah item</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 rounded-lg font-medium text-sm text-gray-700">
                  <div className="col-span-2">Tanggal</div>
                  <div className="col-span-4">Uraian</div>
                  <div className="col-span-3">GL Account</div>
                  <div className="col-span-2">Jumlah (Rp)</div>
                  <div className="col-span-1">Aksi</div>
                </div>
                
                {/* Editable Rows */}
                {items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 p-3 border rounded-lg bg-white border-gray-200">
                    {/* Tanggal */}
                    <div className="col-span-2">
                      <DatePicker 
                        date={item.tanggal} 
                        onSelect={(date) => date && updateItem(item.id, 'tanggal', date)}
                        placeholder="Pilih tanggal"
                      />
                    </div>
                    
                    {/* Uraian */}
                    <div className="col-span-4">
                      <Textarea 
                        value={item.uraian}
                        onChange={(e) => updateItem(item.id, 'uraian', e.target.value)}
                        placeholder="Masukkan uraian penggunaan"
                        className="min-h-[40px] resize-none"
                      />
                    </div>
                    
                    {/* GL Account */}
                    <div className="col-span-3">
                      <Select 
                        value={item.glAccountId} 
                        onValueChange={(value) => updateItem(item.id, 'glAccountId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih GL Account" />
                        </SelectTrigger>
                        <SelectContent>
                          {glAccounts.map(gl => (
                            <SelectItem key={gl.id} value={gl.id}>
                              {gl.code} - {gl.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Jumlah */}
                    <div className="col-span-2">
                      <CurrencyInput 
                        value={item.jumlah}
                        onChange={(value) => updateItem(item.id, 'jumlah', value)}
                      />
                    </div>
                    
                    {/* Delete Button */}
                    <div className="col-span-1 flex justify-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => { setDeleteItemId(item.id); setShowDeleteDialog(true) }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {/* Total */}
                <div className="flex justify-end">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-blue-700">Total Amount:</span>
                      <span className="text-lg font-bold text-blue-800">
                        Rp {totalAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={saveDraft} disabled={!kelompokKegiatan || items.length === 0 || !validateItems()}>
              <Save className="h-4 w-4 mr-2" />
              Simpan Draft
            </Button>
            <Button onClick={submitImprest} disabled={!kelompokKegiatan || items.length === 0 || !validateItems()}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Section with Status Tabs */}
      <Card className="border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Riwayat Pencatatan Imprest Fund
          </CardTitle>
          <CardDescription>Data imprest fund yang telah dibuat</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all">Semua ({imprestFunds.length})</TabsTrigger>
                <TabsTrigger value="draft">Draft ({draftCount})</TabsTrigger>
                <TabsTrigger value="proses">Proses ({prosesCount})</TabsTrigger>
                <TabsTrigger value="close">Close ({closeCount})</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all">
              {filteredImprestFunds.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Belum ada data imprest fund</p>
                </div>
              ) : (
                <DataTable columns={historyColumns} data={filteredImprestFunds} />
              )}
            </TabsContent>

            <TabsContent value="draft">
              {filteredImprestFunds.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Belum ada data draft</p>
                </div>
              ) : (
                <DataTable columns={historyColumns} data={filteredImprestFunds} />
              )}
            </TabsContent>

            <TabsContent value="proses">
              {filteredImprestFunds.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Belum ada data proses</p>
                </div>
              ) : (
                <DataTable columns={historyColumns} data={filteredImprestFunds} />
              )}
            </TabsContent>

            <TabsContent value="close">
              {filteredImprestFunds.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Belum ada data close</p>
                </div>
              ) : (
                <DataTable columns={historyColumns} data={filteredImprestFunds} />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Uraian?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Uraian akan dihapus dari daftar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteItemId && deleteItem(deleteItemId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Imprest Fund Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Imprest Fund</DialogTitle>
          </DialogHeader>
          {viewingImprest && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Kelompok Kegiatan</Label>
                  <p className="text-sm font-semibold">{viewingImprest.kelompokKegiatan}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <div className="mt-1">
                    <Badge variant={viewingImprest.status === 'close' ? 'default' : viewingImprest.status === 'proses' ? 'secondary' : 'outline'}>
                      {viewingImprest.status === 'close' ? 'Close' : viewingImprest.status === 'proses' ? 'Proses' : 'Draft'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Total Amount</Label>
                  <p className="text-sm font-semibold">Rp {viewingImprest.totalAmount.toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Tanggal Dibuat</Label>
                  <p className="text-sm">{format(viewingImprest.createdAt, 'dd MMM yyyy HH:mm', { locale: idLocale })}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Detail Uraian Penggunaan</Label>
                <div className="border rounded-lg">
                  {/* Header */}
                  <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 font-medium text-sm text-gray-700 border-b">
                    <div>Tanggal</div>
                    <div>Uraian</div>
                    <div>GL Account</div>
                    <div className="text-right">Jumlah (Rp)</div>
                  </div>
                  
                  {/* Items */}
                  {viewingImprest.items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-4 gap-4 p-3 border-b last:border-b-0">
                      <div className="text-sm">{format(item.tanggal, 'dd MMM yyyy', { locale: idLocale })}</div>
                      <div className="text-sm">{item.uraian}</div>
                      <div className="text-sm">{item.glAccount?.code} - {item.glAccount?.description}</div>
                      <div className="text-sm text-right">{item.jumlah.toLocaleString('id-ID')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}