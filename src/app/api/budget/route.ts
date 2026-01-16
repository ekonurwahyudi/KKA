import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get('year') || new Date().getFullYear().toString())
  
  const budgets = await prisma.budget.findMany({
    where: { year },
    include: { glAccount: true, allocations: true },
  })
  
  return NextResponse.json(budgets)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  
  const budget = await prisma.budget.upsert({
    where: {
      glAccountId_year: { glAccountId: data.glAccountId, year: data.year },
    },
    update: {
      rkap: data.rkap || data.totalAmount,
      releasePercent: data.releasePercent || 100,
      totalAmount: data.totalAmount,
      q1Amount: data.q1Amount,
      q2Amount: data.q2Amount,
      q3Amount: data.q3Amount,
      q4Amount: data.q4Amount,
    },
    create: {
      glAccountId: data.glAccountId,
      year: data.year,
      rkap: data.rkap || data.totalAmount,
      releasePercent: data.releasePercent || 100,
      totalAmount: data.totalAmount,
      q1Amount: data.q1Amount,
      q2Amount: data.q2Amount,
      q3Amount: data.q3Amount,
      q4Amount: data.q4Amount,
    },
  })

  return NextResponse.json(budget)
}
