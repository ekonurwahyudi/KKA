import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const glAccountId = req.nextUrl.searchParams.get('glAccountId')
    const quarter = parseInt(req.nextUrl.searchParams.get('quarter') || '1')
    const regionalCode = req.nextUrl.searchParams.get('regionalCode') || ''
    const year = parseInt(req.nextUrl.searchParams.get('year') || new Date().getFullYear().toString())

    if (!glAccountId || !regionalCode) {
      return NextResponse.json({ allocated: 0, used: 0, remaining: 0 })
    }

    // Get budget allocation for this regional and quarter
    const budget = await prisma.budget.findFirst({
      where: { glAccountId, year },
      include: {
        allocations: true,
        rraLines: {
          include: {
            rraLog: {
              include: { lines: true },
            },
          },
        },
      },
    })

    if (!budget) {
      return NextResponse.json({ allocated: 0, used: 0, remaining: 0 })
    }

    const allocation = budget.allocations.find(
      (a) => a.regionalCode === regionalCode && a.quarter === quarter
    )

    const rraDelta = Number(allocation?.rraDelta || 0)
    const rraUsed = Math.max(-rraDelta, 0)
    const allocated = Number(allocation?.amount || 0) + Math.max(rraDelta, 0)

    // Calculate date range for the quarter
    const quarterStartMonth = (quarter - 1) * 3 // 0, 3, 6, 9
    const quarterEndMonth = quarterStartMonth + 2 // 2, 5, 8, 11
    
    const startDate = new Date(year, quarterStartMonth, 1)
    const endDate = new Date(year, quarterEndMonth + 1, 0, 23, 59, 59, 999) // Last day of quarter

    // Get total used for this regional based on tanggalKwitansi within the quarter
    // Using nilaiTanpaPPN (Nilai Sebelum PPN) for budget calculation
    const transactions = await prisma.transaction.aggregate({
      where: { 
        glAccountId, 
        regionalCode, 
        year,
        tanggalKwitansi: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: { nilaiTanpaPPN: true },
    })

    const used = Number(transactions._sum.nilaiTanpaPPN || 0) + rraUsed
    const remaining = allocated - used

    return NextResponse.json({ allocated, used, remaining })
  } catch (error) {
    console.error('Error fetching remaining budget:', error)
    return NextResponse.json({ allocated: 0, used: 0, remaining: 0 })
  }
}
