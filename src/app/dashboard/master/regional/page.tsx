'use client'
import { useState } from 'react'
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
import { useRegionals, useCreateRegional, useUpdateRegional, useDeleteRegional } from '@/lib/hooks/useMaster'

interface Regional { id: string; code: string; name: string; costCenter?: string; isActive: boolean }

export default function RegionalPage() {
  const { data: regionals = [], isLoading } = useRegionals()
  const createRegional = useCreateRegional()
  const updateRegional = useUpdateRegional()
  const deleteRegional = useDeleteRegional()

  const [message, setMessage] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Regional | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [costCenter, setCostCenter] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const showMessage = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000) }

  const openDialog = (item?: Regional) => {
    if (item) { setEditing(item); setCode(item.code); setName(item.name); setCostCenter(item.costCenter || ''); setIsActive(item.isActive) }
    else { setEditing(null); setCode(''); setName(''); setCostCenter(''); setIsActive(true) }
    setShowDialog(true)
  }

  const handleSave = async () => {
    const data = { code, name, costCenter, isActive }
    try {
      if (editing) { await updateRegional.mutateAsync({ id: editing.id, data }); showMessage('Regional berhasil diupdate!') }
      else { await createRegional.mutateAsync(data); showMessage('Regional berhasil ditambahkan!') }
      setShowDialog(false)
    } catch { showMessage('Gagal menyimpan Regional') }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try { await deleteRegional.mutateAsync(deleteId); setDeleteId(null); showMessage('Regional berhasil dihapus!') }
    catch { showMessage('Gagal menghapus Regional') }
  }

  const columns: ColumnDef<Regional>[] = [
    { accessorKey: 'code', header: 'Kode' },
    { accessorKey: 'name', header: 'Nama Regional' },
    { accessorKey: 'costCenter', header: 'Cost Center', cell: ({ row }) => row.original.costCenter || '-' },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => (<Badge variant={row.getValue('isActive') ? 'default' : 'secondary'}>{row.getValue('isActive') ? 'Aktif' : 'Nonaktif'}</Badge>) },
    { id: 'actions', header: 'Aksi', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => openDialog(row.original)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
    )},
  ]

  if (isLoading) return <TableSkeleton title="Master Regional" showFilters={false} showActions={true} rows={6} columns={4} />

  return (
    <div className="space-y-4 md:space-y-6">
      <div><h1 className="text-xl md:text-3xl font-bold">Regional</h1><p className="text-muted-foreground text-xs md:text-sm">Kelola data Regional</p></div>
      {message && (<div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 md:px-4 md:py-3 rounded-md flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4" />{message}</div>)}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:p-6">
          <div><CardTitle className="text-base md:text-lg">Daftar Regional</CardTitle><CardDescription className="text-xs md:text-sm">Kelola data regional untuk alokasi anggaran</CardDescription></div>
          <Button onClick={() => openDialog()} size="sm" className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Tambah Regional</Button>
        </CardHeader>
        <CardContent><DataTable columns={columns} data={regionals as Regional[]} searchKey="code" searchPlaceholder="Cari kode Regional..." /></CardContent>
      </Card>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Regional' : 'Tambah Regional'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Kode</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="TREG-1" /></div>
            <div className="space-y-2"><Label>Nama Regional</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Regional 1" /></div>
            <div className="space-y-2"><Label>Cost Center</Label><Input value={costCenter} onChange={(e) => setCostCenter(e.target.value)} placeholder="123456" /></div>
            {editing && (<div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Aktif</Label></div>)}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={!code || !name || createRegional.isPending || updateRegional.isPending}>{(createRegional.isPending || updateRegional.isPending) ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Regional?</AlertDialogTitle><AlertDialogDescription>Regional akan dihapus permanen dari database.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteRegional.isPending} className="bg-red-500 hover:bg-red-600">{deleteRegional.isPending ? 'Menghapus...' : 'Hapus'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
