import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const data = await req.json()
  const input = Array.isArray(data.allocations) ? data.allocations : []
  if (input.length === 0) return NextResponse.json({ error: 'Data alokasi wajib diisi' }, { status: 400 })

  const budgetIds = Array.from(new Set(input.map((allocation: { budgetId: string }) => allocation.budgetId))) as string[]
  const budgets = await prisma.budget.findMany({ where: { id: { in: budgetIds } } })
  const budgetById = new Map(budgets.map((budget) => [budget.id, budget]))
  const groups = new Map<string, number>()

  for (const allocation of input) {
    const amount = Number(allocation.amount)
    const quarter = Number(allocation.quarter)
    if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
      return NextResponse.json({ error: 'Nilai atau kuartal alokasi tidak valid' }, { status: 400 })
    }
    const key = `${allocation.budgetId}:${quarter}`
    groups.set(key, (groups.get(key) || 0) + amount)
  }

  for (const [key, total] of Array.from(groups.entries())) {
    const separator = key.lastIndexOf(':')
    const budgetId = key.slice(0, separator)
    const quarter = Number(key.slice(separator + 1))
    const budget = budgetById.get(budgetId)
    if (!budget) return NextResponse.json({ error: 'Anggaran tidak ditemukan' }, { status: 404 })
    const expected = Number(budget[`q${quarter}Amount` as 'q1Amount' | 'q2Amount' | 'q3Amount' | 'q4Amount'] || 0)
    if (total !== expected) {
      return NextResponse.json({ error: `Total alokasi Q${quarter} harus Rp ${expected.toLocaleString('id-ID')}` }, { status: 400 })
    }
  }

  // Upsert allocations for each regional
  const allocations = await Promise.all(
    input.map((alloc: { budgetId: string; regionalCode: string; quarter: number; amount: number; percentage: number }) =>
      prisma.regionalAllocation.upsert({
        where: {
          budgetId_regionalCode_quarter: {
            budgetId: alloc.budgetId,
            regionalCode: alloc.regionalCode,
            quarter: alloc.quarter,
          },
        },
        update: { amount: alloc.amount, percentage: alloc.percentage || 0 },
        create: {
          budgetId: alloc.budgetId,
          regionalCode: alloc.regionalCode,
          quarter: alloc.quarter,
          amount: alloc.amount,
          percentage: alloc.percentage || 0,
        },
      })
    )
  )

  return NextResponse.json(allocations)
}

export async function GET(req: NextRequest) {
  const budgetId = req.nextUrl.searchParams.get('budgetId')
  
  if (!budgetId) {
    return NextResponse.json({ error: 'budgetId required' }, { status: 400 })
  }

  const allocations = await prisma.regionalAllocation.findMany({
    where: { budgetId },
  })

  return NextResponse.json(allocations)
}
