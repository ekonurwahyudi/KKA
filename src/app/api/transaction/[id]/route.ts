import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json()

  // Calculate PPN values
  const nilaiKwitansi = data.nilaiKwitansi || 0
  let nilaiTanpaPPN = nilaiKwitansi
  let nilaiPPN = 0

  if (data.jenisPajak === 'PPN11') {
    nilaiTanpaPPN = nilaiKwitansi / 1.11
    nilaiPPN = nilaiKwitansi - nilaiTanpaPPN
  } else if (data.jenisPajak === 'PPNJasa2') {
    nilaiPPN = nilaiKwitansi * 0.02
    nilaiTanpaPPN = nilaiKwitansi - nilaiPPN
  } else if (data.jenisPajak === 'PPNInklaring1.1') {
    nilaiPPN = nilaiKwitansi * 0.011
    nilaiTanpaPPN = nilaiKwitansi - nilaiPPN
  }

  // Task values
  const taskTransferVendor = data.taskTransferVendor || false
  const taskTerimaBerkas = data.taskTerimaBerkas || false
  const taskUploadMydx = !!data.noTiketMydx
  const taskSerahFinance = !!data.tglSerahFinance
  const taskVendorDibayar = !!data.tglTransferVendor

  // Determine status automatically based on fields and tasks
  // Close: semua field dan task terisi (kecuali keterangan)
  // Proses: ada perubahan/update dari Open
  // Open: baru dibuat
  
  let status = 'Proses' // Default saat edit adalah Proses
  
  // Check if all required fields are filled for Close status
  const allFieldsFilled = 
    data.glAccountId &&
    data.quarter &&
    data.regionalCode &&
    data.kegiatan &&
    data.regionalPengguna &&
    data.tanggalKwitansi &&
    nilaiKwitansi > 0 &&
    data.jenisPajak &&
    data.jenisPengadaan &&
    data.vendorId &&
    data.noTiketMydx &&
    data.tglSerahFinance &&
    data.picFinance &&
    data.noHpFinance &&
    data.tglTransferVendor &&
    data.nilaiTransfer

  // Check if all tasks are completed
  const allTasksCompleted = 
    taskTransferVendor &&
    taskTerimaBerkas &&
    taskUploadMydx &&
    taskSerahFinance &&
    taskVendorDibayar

  if (allFieldsFilled && allTasksCompleted) {
    status = 'Close'
  }

  const transaction = await prisma.transaction.update({
    where: { id: params.id },
    data: {
      glAccountId: data.glAccountId,
      quarter: data.quarter,
      regionalCode: data.regionalCode,
      kegiatan: data.kegiatan,
      regionalPengguna: data.regionalPengguna,
      tanggalKwitansi: data.tanggalKwitansi ? new Date(data.tanggalKwitansi) : null,
      nilaiKwitansi,
      jenisPajak: data.jenisPajak,
      nilaiTanpaPPN,
      nilaiPPN,
      keterangan: data.keterangan,
      jenisPengadaan: data.jenisPengadaan,
      vendorId: data.vendorId || null,
      noTiketMydx: data.noTiketMydx,
      tglSerahFinance: data.tglSerahFinance ? new Date(data.tglSerahFinance) : null,
      picFinance: data.picFinance,
      noHpFinance: data.noHpFinance,
      tglTransferVendor: data.tglTransferVendor ? new Date(data.tglTransferVendor) : null,
      nilaiTransfer: data.nilaiTransfer,
      taskTransferVendor,
      taskTerimaBerkas,
      taskUploadMydx,
      taskSerahFinance,
      taskVendorDibayar,
      status,
    },
  })

  return NextResponse.json(transaction)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.transaction.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
