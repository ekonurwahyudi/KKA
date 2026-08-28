import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json()

  const budget = await prisma.$transaction(async (tx) => {
    const existing = await tx.budget.findUnique({
      where: { id: params.id },
      include: { allocations: true },
    })
    if (!existing) throw new Error('Anggaran tidak ditemukan')

    const updated = await tx.budget.update({
      where: { id: params.id },
      data: {
      rkap: data.rkap,
      releasePercent: data.releasePercent,
      totalAmount: data.totalAmount,
      q1Amount: data.q1Amount,
      q2Amount: data.q2Amount,
      q3Amount: data.q3Amount,
      q4Amount: data.q4Amount,
      janAmount: data.janAmount ?? undefined,
      febAmount: data.febAmount ?? undefined,
      marAmount: data.marAmount ?? undefined,
      aprAmount: data.aprAmount ?? undefined,
      mayAmount: data.mayAmount ?? undefined,
      junAmount: data.junAmount ?? undefined,
      julAmount: data.julAmount ?? undefined,
      augAmount: data.augAmount ?? undefined,
      sepAmount: data.sepAmount ?? undefined,
      octAmount: data.octAmount ?? undefined,
      novAmount: data.novAmount ?? undefined,
      decAmount: data.decAmount ?? undefined,
      },
    })

    // Alokasi adalah pembagian dari anggaran dasar kuartal. Ketika nilai kuartal
    // berubah, pertahankan proporsinya tetapi sesuaikan nominal agar totalnya
    // selalu sama dengan nilai kuartal yang baru. rraDelta tidak disentuh.
    for (const quarter of [1, 2, 3, 4]) {
      const rows = existing.allocations.filter((allocation) => allocation.quarter === quarter)
      if (rows.length === 0) continue

      const newQuarterAmount = Number(data[`q${quarter}Amount`] ?? 0)
      const oldTotal = rows.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0)
      const percentageTotal = rows.reduce((sum, allocation) => sum + Number(allocation.percentage || 0), 0)
      let allocated = 0

      for (let index = 0; index < rows.length; index++) {
        const allocation = rows[index]
        const isLast = index === rows.length - 1
        const weight = oldTotal > 0
          ? Number(allocation.amount || 0) / oldTotal
          : percentageTotal > 0
            ? Number(allocation.percentage || 0) / percentageTotal
            : index === 0 ? 1 : 0
        const amount = isLast ? newQuarterAmount - allocated : Math.floor(newQuarterAmount * weight)
        allocated += amount

        await tx.regionalAllocation.update({
          where: { id: allocation.id },
          data: {
            amount,
            percentage: newQuarterAmount > 0 ? (amount / newQuarterAmount) * 100 : 0,
          },
        })
      }
    }

    return updated
  })

  return NextResponse.json(budget)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // Delete allocations first
  await prisma.regionalAllocation.deleteMany({
    where: { budgetId: params.id },
  })
  
  await prisma.budget.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
