import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function formatType(type: string) {
  if (type === 'realokasi') return 'Realokasi'
  if (type === 'rescheduling') return 'Rescheduling'
  if (type === 'redistribusi') return 'Redistribusi'
  return type
}

function addSection(ws: ExcelJS.Worksheet, title: string, month: number, rows: any[], startRow: number) {
  ws.getRow(startRow).values = ['No', 'Cost Center', 'Akun', 'Nama Akun', title, 'Jumlah']
  ws.getRow(startRow + 1).getCell(5).value = month
  rows.forEach((row, idx) => {
    ws.getRow(startRow + 2 + idx).values = [idx + 1, row.costCenter, row.account, row.accountName, row.amount, row.amount]
  })
  const totalRow = startRow + 2 + rows.length
  ws.getRow(totalRow).values = ['total', '', '', '', '', rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)]

  for (let r = startRow; r <= totalRow; r++) {
    ws.getRow(r).eachCell((cell) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    })
  }
  ws.getRow(startRow).font = { bold: true }
  ws.getRow(totalRow).font = { bold: true }
  return totalRow + 3
}

function sectionRows(lines: any[], field: 'beforeAmount' | 'rraAmount' | 'afterAmount') {
  return lines.map((line) => ({
    costCenter: line.costCenter || line.regionalCode,
    account: line.accountCode,
    accountName: line.accountName,
    amount: Number(line[field] || 0),
  }))
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const log = await (prisma as any).budgetRraLog.findUnique({
    where: { id: params.id },
    include: {
      sourceBudget: { include: { glAccount: true } },
      targetBudget: { include: { glAccount: true } },
      lines: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!log) return NextResponse.json({ error: 'RRA tidak ditemukan' }, { status: 404 })

  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet('PDRK-3')
  ws.columns = [
    { width: 8 },
    { width: 18 },
    { width: 14 },
    { width: 28 },
    { width: 18 },
    { width: 18 },
  ]

  ws.getCell('A1').value = 'PDRK-3'
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A2').value = `${formatType(log.type)} RRA - Tahun ${log.year}`

  const lines = Array.isArray(log.lines) && log.lines.length > 0
    ? log.lines
    : [
      {
        costCenter: log.sourceCostCenter || log.sourceRegionalCode,
        regionalCode: log.sourceRegionalCode,
        accountCode: log.sourceBudget.glAccount.code,
        accountName: log.sourceBudget.glAccount.description,
        beforeAmount: log.sourceBeforeAmount,
        rraAmount: log.sourceRraAmount,
        afterAmount: log.sourceAfterAmount,
      },
      {
        costCenter: log.targetCostCenter || log.targetRegionalCode,
        regionalCode: log.targetRegionalCode,
        accountCode: log.targetBudget.glAccount.code,
        accountName: log.targetBudget.glAccount.description,
        beforeAmount: log.targetBeforeAmount,
        rraAmount: log.targetRraAmount,
        afterAmount: log.targetAfterAmount,
      },
    ]

  const rraStartRow = addSection(ws, 'Sebelum', log.month, sectionRows(lines, 'beforeAmount'), 3)
  const afterStartRow = addSection(ws, 'RRA', log.month, sectionRows(lines, 'rraAmount'), rraStartRow)
  addSection(ws, 'Sesudah', log.month, sectionRows(lines, 'afterAmount'), afterStartRow)

  ws.getColumn(5).numFmt = '#,##0'
  ws.getColumn(6).numFmt = '#,##0'

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `RRA-${log.year}-bulan-${log.month}-${log.id}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=\"${filename}\"`,
    },
  })
}
