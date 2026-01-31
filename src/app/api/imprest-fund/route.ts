import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all imprest funds
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    const where = status ? { status } : {}
    
    const imprestFunds = await prisma.imprestFund.findMany({
      where,
      include: {
        items: {
          include: {
            glAccount: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(imprestFunds)
  } catch (error) {
    console.error('Error fetching imprest funds:', error)
    return NextResponse.json({ error: 'Failed to fetch imprest funds' }, { status: 500 })
  }
}

// POST - Create new imprest fund
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { kelompokKegiatan, items, status = 'draft' } = body

    if (!kelompokKegiatan || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Kelompok kegiatan and items are required' }, { status: 400 })
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.jumlah || 0), 0)

    // Create imprest fund with items
    const imprestFund = await prisma.imprestFund.create({
      data: {
        kelompokKegiatan,
        status,
        totalAmount,
        items: {
          create: items.map((item: any) => ({
            tanggal: new Date(item.tanggal),
            uraian: item.uraian,
            glAccountId: item.glAccountId,
            jumlah: item.jumlah
          }))
        }
      },
      include: {
        items: {
          include: {
            glAccount: true
          }
        }
      }
    })

    return NextResponse.json(imprestFund)
  } catch (error) {
    console.error('Error creating imprest fund:', error)
    return NextResponse.json({ error: 'Failed to create imprest fund' }, { status: 500 })
  }
}