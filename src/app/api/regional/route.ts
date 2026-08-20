import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true'

  try {
    const regionals = await prisma.regional.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { code: 'asc' },
    })
    return NextResponse.json(regionals)
  } catch (error: any) {
    const message = String(error?.message || '')
    const isMissingCostCenter = error?.code === 'P2022' && message.includes('costCenter')

    if (!isMissingCostCenter) {
      console.error('Error fetching regionals:', error)
      return NextResponse.json({ error: 'Failed to fetch regionals' }, { status: 500 })
    }

    console.warn('Regional.costCenter column is missing; returning regionals with costCenter=null fallback.')
    const regionals = await prisma.regional.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { code: 'asc' },
    })
    return NextResponse.json(regionals.map((regional) => ({ ...regional, costCenter: null })))
  }
}

export async function POST(req: NextRequest) {
  const data = await req.json()

  const regional = await prisma.regional.create({
    data: {
      code: data.code,
      name: data.name,
      costCenter: data.costCenter || null,
    },
  })

  return NextResponse.json(regional)
}
