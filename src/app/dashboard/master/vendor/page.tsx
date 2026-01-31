'use client'
import { useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, CheckCircle } from 'lucide-react'
import { TableSkeleton } from '@/components/loading'

interface Vendor {
  id: string
  name: string
  alamat: string | null
  pic: string | null
  phone: string | null
  email: string | null
  isActive: boolean
}

export default function VendorPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [message, setMessage] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [name, setName] = useState('')
  const [alamat, setAlamat] = useState('')
  const [pic, setPic] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setLoading(true)
    fetch('/api/vendor?includeInactive=true')
      .then((r) => r.json())
      .then(data => {
        setVendors(data)
        setLoading(false)
      })
  }

  const openDialog = (item?: Vendor) => {
    if (item) {
      setEditing(item)
      setName(item.name)
      setAlamat(item.alamat || '')
      setPic(item.pic || '')
      setPhone(item.phone || '')
      setEmail(item.email || '')
      setIsActive(item.isActive)
    } else {
      setEditing(null)
      setName('')
      setAlamat('')
      setPic('')
      setPhone('')
      setEmail('')
      setIsActive(true)
    }
    setShowDialog(true)
  }

  const handleSave = async () => {
    const data = { name, alamat, pic, phone, email, isActive }
    
    if (editing) {
      await fetch(`/api/vendor/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setMessage('Vendor berhasil diupdate!')
    } else {
      await fetch('/api/vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setMessage('Vendor berhasil ditambahkan!')
    }

    setShowDialog(false)
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/vendor/${deleteId}`, { method: 'DELETE' })
    setDeleteId(null)
    loadData()
    setMessage('Vendor berhasil dinonaktifkan!')
    setTimeout(() => setMessage(''), 3000)
  }

  const columns: ColumnDef<Vendor>[] = [
    { accessorKey: 'name', header: 'Nama Vendor' },
    { accessorKey: 'alamat', header: 'Alamat' },
    { accessorKey: 'pic', header: 'PIC' },
    { accessorKey: 'phone', header: 'No. HP' },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.getValue('isActive') ? 'default' : 'secondary'}>
          {row.getValue('isActive') ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => openDialog(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteId(row.original.id)} disabled={!row.original.isActive}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return <TableSkeleton title="Master Vendor" showFilters={false} showActions={true} rows={6} columns={6} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vendor</h1>
        <p className="text-muted-foreground">Kelola data Vendor</p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {message}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daftar Vendor</CardTitle>
            <CardDescription>Kelola data vendor untuk transaksi pengadaan</CardDescription>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Vendor
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={vendors}
            searchKey="name"
            searchPlaceholder="Cari nama vendor..."
          />
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Vendor' : 'Tambah Vendor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Vendor *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="PT. Contoh Vendor" />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Jl. Contoh No. 123" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PIC</Label>
                <Input value={pic} onChange={(e) => setPic(e.target.value)} placeholder="Nama PIC" />
              </div>
              <div className="space-y-2">
                <Label>No. HP</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08123456789" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vendor@email.com" />
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Aktif</Label>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={!name}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              Vendor akan dinonaktifkan dan tidak akan muncul di pilihan input.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Nonaktifkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
