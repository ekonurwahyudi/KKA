import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const year = parseInt(formData.get('year') as string) || new Date().getFullYear()

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as Array<{
      'Kode GL': string
      'Nilai RKAP': number
      'Release (%)': number
      'Q1': number
      'Q2': number
      'Q3': number
      'Q4': number
    }>

    const results = { success: 0, failed: 0, errors: [] as string[] }

    for (const row of data) {
      try {
        const glCode = String(row['Kode GL']).trim()
        const rkap = Number(row['Nilai RKAP']) || 0
        const releasePercent = Number(row['Release (%)']) || 100
        const totalAmount = Math.floor(rkap * releasePercent / 100)
        const q1 = Number(row['Q1']) || 0
        const q2 = Number(row['Q2']) || 0
        const q3 = Number(row['Q3']) || 0
        const q4 = Number(row['Q4']) || 0

        // Find GL Account by code
        const glAccount = await prisma.glAccount.findUnique({
          where: { code: glCode }
        })

        if (!glAccount) {
          results.failed++
          results.errors.push(`GL Account ${glCode} tidak ditemukan`)
          continue
        }

        // Upsert budget
        await prisma.budget.upsert({
          where: {
            glAccountId_year: { glAccountId: glAccount.id, year }
          },
          update: {
            rkap,
            releasePercent,
            totalAmount,
            q1Amount: q1,
            q2Amount: q2,
            q3Amount: q3,
            q4Amount: q4,
          },
          create: {
            glAccountId: glAccount.id,
            year,
            rkap,
            releasePercent,
            totalAmount,
            q1Amount: q1,
            q2Amount: q2,
            q3Amount: q3,
            q4Amount: q4,
          },
        })

        results.success++
      } catch (err) {
        results.failed++
        results.errors.push(`Error pada baris: ${JSON.stringify(row)}`)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Gagal mengimport file' }, { status: 500 })
  }
}
