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

  // Use provided status or determine automatically
  let status = data.status
  if (!status) {
    if (data.tglTransferVendor) {
      status = 'Close'
    } else if (data.noTiketMydx || data.tglSerahFinance) {
      status = 'Proses'
    } else {
      status = 'Open'
    }
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
      taskTransferVendor: data.taskTransferVendor || false,
      taskTerimaBerkas: data.taskTerimaBerkas || false,
      taskUploadMydx: !!data.noTiketMydx,
      taskSerahFinance: !!data.tglSerahFinance,
      taskVendorDibayar: !!data.tglTransferVendor,
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
