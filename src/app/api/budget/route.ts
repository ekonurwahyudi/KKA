import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type BudgetQueryOptions = {
  withRraDelta?: boolean
  withRraLines?: boolean
}

async function findBudgets(year: number, options: BudgetQueryOptions = {}) {
  const { withRraDelta = true, withRraLines = true } = options
  const include: any = {
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
  }

  if (withRraLines) {
    include.rraLines = {
      include: {
        rraLog: {
          include: { lines: true },
        },
      },
    }
  }

  const budgets = await prisma.budget.findMany({
    where: { year },
    include,
  })

  return budgets.map((budget: any) => ({
    ...budget,
    allocations: budget.allocations.map((allocation: any) => ({
      ...allocation,
      rraDelta: Number(allocation.rraDelta || 0),
    })),
    rraLines: budget.rraLines || [],
  }))
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
      console.warn('Budget RRA include failed; retrying without RRA lines.', error)
      try {
        const budgets = await findBudgets(year, { withRraLines: false })
        return NextResponse.json(budgets)
      } catch (fallbackError: any) {
        const fallbackMessage = String(fallbackError?.message || '')
        const fallbackMissingRraDelta = fallbackError?.code === 'P2022' && fallbackMessage.includes('rraDelta')

        if (!fallbackMissingRraDelta) {
          console.error('Error fetching budgets:', fallbackError)
          return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
        }

        console.warn('RegionalAllocation.rraDelta column is missing; returning base budgets without RRA lines.')
        const budgets = await findBudgets(year, { withRraDelta: false, withRraLines: false })
        return NextResponse.json(budgets)
      }
    }

    console.warn('RegionalAllocation.rraDelta column is missing; retrying budget query with rraDelta=0 fallback.')
    try {
      const budgets = await findBudgets(year, { withRraDelta: false })
      return NextResponse.json(budgets)
    } catch (fallbackError) {
      console.warn('Budget RRA include also failed; returning base budgets without RRA lines.', fallbackError)
      const budgets = await findBudgets(year, { withRraDelta: false, withRraLines: false })
      return NextResponse.json(budgets)
    }
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
