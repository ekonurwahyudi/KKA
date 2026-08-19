import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true'
  
  const regionals = await prisma.regional.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { code: 'asc' },
  })
  return NextResponse.json(regionals)
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
