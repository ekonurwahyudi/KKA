import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
  const glAccountId = searchParams.get('glAccountId')

  const where: any = { year }
  if (glAccountId) {
    where.glAccountId = glAccountId
  }

  const monthlyAllocations = await prisma.monthlyAllocation.findMany({
    where,
    include: {
      glAccount: true
    }
  })

  return NextResponse.json(monthlyAllocations)
}

export async function POST(req: NextRequest) {
  const data = await req.json()

  const monthlyAllocation = await prisma.monthlyAllocation.upsert({
    where: {
      glAccountId_year: { glAccountId: data.glAccountId, year: data.year },
    },
    update: {
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
    },
    create: {
      glAccountId: data.glAccountId,
      year: data.year,
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
    },
    include: {
      glAccount: true
    }
  })

  return NextResponse.json(monthlyAllocation)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  await prisma.monthlyAllocation.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}