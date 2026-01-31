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

interface Regional {
  id: string
  code: string
  name: string
  isActive: boolean
}

export default function RegionalPage() {
  const [regionals, setRegionals] = useState<Regional[]>([])
  const [message, setMessage] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Regional | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setLoading(true)
    fetch('/api/regional?includeInactive=true')
      .then((r) => r.json())
      .then(data => {
        setRegionals(data)
        setLoading(false)
      })
  }

  const openDialog = (item?: Regional) => {
    if (item) {
      setEditing(item)
      setCode(item.code)
      setName(item.name)
      setIsActive(item.isActive)
    } else {
      setEditing(null)
      setCode('')
      setName('')
      setIsActive(true)
    }
    setShowDialog(true)
  }

  const handleSave = async () => {
    const data = { code, name, isActive }
    
    if (editing) {
      await fetch(`/api/regional/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setMessage('Regional berhasil diupdate!')
    } else {
      await fetch('/api/regional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setMessage('Regional berhasil ditambahkan!')
    }

    setShowDialog(false)
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/regional/${deleteId}`, { method: 'DELETE' })
    setDeleteId(null)
    loadData()
    setMessage('Regional berhasil dinonaktifkan!')
    setTimeout(() => setMessage(''), 3000)
  }

  const columns: ColumnDef<Regional>[] = [
    { accessorKey: 'code', header: 'Kode' },
    { accessorKey: 'name', header: 'Nama Regional' },
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
    return <TableSkeleton title="Master Regional" showFilters={false} showActions={true} rows={6} columns={4} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Regional</h1>
        <p className="text-muted-foreground">Kelola data Regional</p>
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
            <CardTitle>Daftar Regional</CardTitle>
            <CardDescription>Kelola data regional untuk alokasi anggaran</CardDescription>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Regional
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={regionals}
            searchKey="code"
            searchPlaceholder="Cari kode Regional..."
          />
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Regional' : 'Tambah Regional'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kode</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="TREG-1" />
            </div>
            <div className="space-y-2">
              <Label>Nama Regional</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Regional 1" />
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Aktif</Label>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={!code || !name}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan Regional?</AlertDialogTitle>
            <AlertDialogDescription>
              Regional akan dinonaktifkan dan tidak akan muncul di pilihan input.
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
