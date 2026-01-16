import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  try {
    // Get all active GL Accounts
    const glAccounts = await prisma.glAccount.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' }
    })

    // Create template data with GL codes
    const templateData = glAccounts.map(gl => ({
      'Kode GL': gl.code,
      'Deskripsi': gl.description,
      'Nilai RKAP': 0,
      'Release (%)': 100,
      'Q1': 0,
      'Q2': 0,
      'Q3': 0,
      'Q4': 0,
    }))

    // Create workbook
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(templateData)

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 },  // Kode GL
      { wch: 40 },  // Deskripsi
      { wch: 15 },  // Nilai RKAP
      { wch: 12 },  // Release (%)
      { wch: 15 },  // Q1
      { wch: 15 },  // Q2
      { wch: 15 },  // Q3
      { wch: 15 },  // Q4
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Anggaran')

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_anggaran.xlsx"',
      },
    })
  } catch (error) {
    console.error('Template error:', error)
    return NextResponse.json({ error: 'Gagal membuat template' }, { status: 500 })
  }
}
