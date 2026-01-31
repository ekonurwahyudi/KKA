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
import { Plus, Pencil, Trash2, CheckCircle } from 'lucide-react'
import { TableSkeleton } from '@/components/loading'

interface PicAnggaran {
  id: string
  unit: string
  namaPemegangImprest: string
  nikPemegangImprest: string
  namaPenanggungJawab: string
  nikPenanggungJawab: string
  year: number
  isActive: boolean
}

export default function PicAnggaranPage() {
  const [data, setData] = useState<PicAnggaran[]>([])
  const [message, setMessage] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<PicAnggaran | null>(null)
  const [unit, setUnit] = useState('')
  const [namaPemegangImprest, setNamaPemegangImprest] = useState('')
  const [nikPemegangImprest, setNikPemegangImprest] = useState('')
  const [namaPenanggungJawab, setNamaPenanggungJawab] = useState('')
  const [nikPenanggungJawab, setNikPenanggungJawab] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setLoading(true)
    fetch('/api/pic-anggaran')
      .then((r) => r.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
  }

  const openDialog = (item?: PicAnggaran) => {
    if (item) {
      setEditing(item)
      setUnit(item.unit)
      setNamaPemegangImprest(item.namaPemegangImprest)
      setNikPemegangImprest(item.nikPemegangImprest)
      setNamaPenanggungJawab(item.namaPenanggungJawab)
      setNikPenanggungJawab(item.nikPenanggungJawab)
      setYear(item.year)
    } else {
      setEditing(null)
      setUnit('')
      setNamaPemegangImprest('')
      setNikPemegangImprest('')
      setNamaPenanggungJawab('')
      setNikPenanggungJawab('')
      setYear(new Date().getFullYear())
    }
    setShowDialog(true)
  }

  const handleSave = async () => {
    const payload = {
      unit,
      namaPemegangImprest,
      nikPemegangImprest,
      namaPenanggungJawab,
      nikPenanggungJawab,
      year,
    }
    
    if (editing) {
      await fetch(`/api/pic-anggaran/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, isActive: true }),
      })
      setMessage('PIC Anggaran berhasil diupdate!')
    } else {
      await fetch('/api/pic-anggaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setMessage('PIC Anggaran berhasil ditambahkan!')
    }

    setShowDialog(false)
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/pic-anggaran/${deleteId}`, { method: 'DELETE' })
    setDeleteId(null)
    loadData()
    setMessage('PIC Anggaran berhasil dihapus!')
    setTimeout(() => setMessage(''), 3000)
  }

  const columns: ColumnDef<PicAnggaran>[] = [
    {
      accessorKey: 'unit',
      header: 'Unit',
    },
    {
      accessorKey: 'pemegangImprest',
      header: 'Pemegang Impresfund',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.namaPemegangImprest}</div>
          <div className="text-sm text-muted-foreground">{row.original.nikPemegangImprest}</div>
        </div>
      ),
    },
    {
      accessorKey: 'penanggungJawab',
      header: 'Penanggung Jawab',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.namaPenanggungJawab}</div>
          <div className="text-sm text-muted-foreground">{row.original.nikPenanggungJawab}</div>
        </div>
      ),
    },
    {
      accessorKey: 'year',
      header: 'Tahun',
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openDialog(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.original.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return <TableSkeleton title="Master PIC Anggaran" showFilters={false} showActions={true} rows={6} columns={7} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PIC Anggaran</h1>
        <p className="text-muted-foreground text-sm">Kelola data PIC Anggaran</p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Daftar PIC Anggaran</CardTitle>
              <CardDescription>Data PIC Anggaran per unit dan tahun</CardDescription>
            </div>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah PIC Anggaran
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit PIC Anggaran' : 'Tambah PIC Anggaran'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Nama Unit" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nama Pemegang Impresfund</Label>
                <Input 
                  value={namaPemegangImprest} 
                  onChange={(e) => setNamaPemegangImprest(e.target.value)} 
                  placeholder="Nama Pemegang" 
                />
              </div>
              <div>
                <Label>NIK Pemegang Impresfund</Label>
                <Input 
                  value={nikPemegangImprest} 
                  onChange={(e) => setNikPemegangImprest(e.target.value)} 
                  placeholder="NIK Pemegang" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nama Penanggung Jawab</Label>
                <Input 
                  value={namaPenanggungJawab} 
                  onChange={(e) => setNamaPenanggungJawab(e.target.value)} 
                  placeholder="Nama Penanggung Jawab" 
                />
              </div>
              <div>
                <Label>NIK Penanggung Jawab</Label>
                <Input 
                  value={nikPenanggungJawab} 
                  onChange={(e) => setNikPenanggungJawab(e.target.value)} 
                  placeholder="NIK Penanggung Jawab" 
                />
              </div>
            </div>

            <div>
              <Label>Tahun</Label>
              <Input 
                type="number" 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value))} 
                placeholder="Tahun" 
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleSave}>
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus PIC Anggaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Data PIC Anggaran akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
