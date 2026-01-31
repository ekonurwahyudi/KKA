import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch single imprest fund
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imprestFund = await prisma.imprestFund.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            glAccount: true
          }
        }
      }
    })

    if (!imprestFund) {
      return NextResponse.json({ error: 'Imprest fund not found' }, { status: 404 })
    }

    return NextResponse.json(imprestFund)
  } catch (error) {
    console.error('Error fetching imprest fund:', error)
    return NextResponse.json({ error: 'Failed to fetch imprest fund' }, { status: 500 })
  }
}

// PUT - Update imprest fund
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { kelompokKegiatan, items, status } = body

    if (!kelompokKegiatan || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Kelompok kegiatan and items are required' }, { status: 400 })
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.jumlah || 0), 0)

    // Delete existing items and create new ones
    await prisma.imprestItem.deleteMany({
      where: { imprestFundId: params.id }
    })

    const imprestFund = await prisma.imprestFund.update({
      where: { id: params.id },
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
    console.error('Error updating imprest fund:', error)
    return NextResponse.json({ error: 'Failed to update imprest fund' }, { status: 500 })
  }
}

// DELETE - Delete imprest fund
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.imprestFund.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Imprest fund deleted successfully' })
  } catch (error) {
    console.error('Error deleting imprest fund:', error)
    return NextResponse.json({ error: 'Failed to delete imprest fund' }, { status: 500 })
  }
}