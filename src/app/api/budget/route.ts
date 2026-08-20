import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function findBudgets(year: number, withRraDelta = true) {
  return prisma.budget.findMany({
    where: { year },
    include: {
      glAccount: true,
      allocations: withRraDelta
        ? true
        : {
            select: {
              id: true,
              budgetId: true,
              regionalCode: true,
              quarter: true,
              amount: true,
              percentage: true,
              createdAt: true,
              updatedAt: true,
            },
          },
      rraLines: {
        include: {
          rraLog: {
            include: { lines: true },
          },
        },
      },
    },
  })
}

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get('year') || new Date().getFullYear().toString())

  try {
    const budgets = await findBudgets(year)
    return NextResponse.json(budgets)
  } catch (error: any) {
    const message = String(error?.message || '')
    const isMissingRraDelta = error?.code === 'P2022' && message.includes('rraDelta')

    if (!isMissingRraDelta) {
      console.error('Error fetching budgets:', error)
      return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
    }

    console.warn('RegionalAllocation.rraDelta column is missing; returning budgets with rraDelta=0 fallback.')
    const budgets = await findBudgets(year, false)
    return NextResponse.json(
      budgets.map((budget) => ({
        ...budget,
        allocations: budget.allocations.map((allocation) => ({ ...allocation, rraDelta: 0 })),
      }))
    )
  }
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
