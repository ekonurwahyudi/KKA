import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get('year') || new Date().getFullYear().toString())
  
  const budgets = await prisma.budget.findMany({
    where: { year },
    include: {
      glAccount: true,
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
  
  return NextResponse.json(budgets)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  
  const budgetData = {
    rkap: data.rkap || data.totalAmount,
    releasePercent: data.releasePercent || 100,
    totalAmount: data.totalAmount,
    q1Amount: data.q1Amount,
    q2Amount: data.q2Amount,
    q3Amount: data.q3Amount,
    q4Amount: data.q4Amount,
    janAmount: data.janAmount || 0,
    febAmount: data.febAmount || 0,
    marAmount: data.marAmount || 0,
    aprAmount: data.aprAmount || 0,
    mayAmount: data.mayAmount || 0,
    junAmount: data.junAmount || 0,
    julAmount: data.julAmount || 0,
    augAmount: data.augAmount || 0,
    sepAmount: data.sepAmount || 0,
    octAmount: data.octAmount || 0,
    novAmount: data.novAmount || 0,
    decAmount: data.decAmount || 0,
  }
  
  const budget = await prisma.budget.upsert({
    where: {
      glAccountId_year: { glAccountId: data.glAccountId, year: data.year },
    },
    update: budgetData,
    create: {
      glAccountId: data.glAccountId,
      year: data.year,
      ...budgetData,
    },
  })

  return NextResponse.json(budget)
}
