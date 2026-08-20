import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function findMinimalRegionals() {
  const regionals = await prisma.regional.findMany({
    select: {
      id: true,
      code: true,
      name: true,
    },
    orderBy: { code: 'asc' },
  })

  return regionals.map((regional) => ({
    ...regional,
    costCenter: null,
    isActive: true,
  }))
}

export async function GET(req: NextRequest) {
  const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true'

  try {
    const regionals = await prisma.regional.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { code: 'asc' },
    })
    if (regionals.length > 0 || includeInactive) return NextResponse.json(regionals)

    console.warn('No active regionals found; returning minimal regional data without isActive filter.')
    return NextResponse.json(await findMinimalRegionals())
  } catch (error: any) {
    const message = String(error?.message || '')
    const isMissingCostCenter = error?.code === 'P2022' && message.includes('costCenter')

    if (!isMissingCostCenter) {
      console.warn('Regional query failed; returning minimal regional data.', error)
      try {
        return NextResponse.json(await findMinimalRegionals())
      } catch (fallbackError) {
        console.error('Error fetching regionals:', fallbackError)
        return NextResponse.json({ error: 'Failed to fetch regionals' }, { status: 500 })
      }
    }

    console.warn('Regional.costCenter column is missing; returning regionals with costCenter=null fallback.')
    return NextResponse.json(await findMinimalRegionals())
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
