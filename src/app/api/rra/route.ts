import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type MonthKey = 'janAmount' | 'febAmount' | 'marAmount' | 'aprAmount' | 'mayAmount' | 'junAmount' | 'julAmount' | 'augAmount' | 'sepAmount' | 'octAmount' | 'novAmount' | 'decAmount'
type QuarterKey = 'q1Amount' | 'q2Amount' | 'q3Amount' | 'q4Amount'
type RraLineInput = { budgetId: string; regionalCode: string; amount: number }

const monthKeys: MonthKey[] = ['janAmount', 'febAmount', 'marAmount', 'aprAmount', 'mayAmount', 'junAmount', 'julAmount', 'augAmount', 'sepAmount', 'octAmount', 'novAmount', 'decAmount']
const validTypes = ['realokasi', 'rescheduling', 'redistribusi']

const quarterFromMonth = (month: number) => Math.ceil(month / 3)
const monthKey = (month: number) => monthKeys[month - 1]
const quarterKey = (quarter: number): QuarterKey => `q${quarter}Amount` as QuarterKey
const lineKey = (budgetId: string, regionalCode: string) => `${budgetId}::${regionalCode}`

function normalizeLines(lines: any): RraLineInput[] {
  if (!Array.isArray(lines)) return []
  return lines
    .map((line) => ({
      budgetId: String(line.budgetId || ''),
      regionalCode: String(line.regionalCode || ''),
      amount: Number(line.amount || 0),
    }))
    .filter((line) => line.budgetId && line.regionalCode && line.amount > 0)
}

function legacyLines(data: any, side: 'source' | 'target') {
  const budgetId = String(data[`${side}BudgetId`] || '')
  const regionalCode = String(data[`${side}RegionalCode`] || '')
  const amount = Number(data.amount || 0)
  return budgetId && regionalCode && amount > 0 ? [{ budgetId, regionalCode, amount }] : []
}

function budgetSnapshot(budget: any) {
  return {
    id: budget.id,
    glAccountId: budget.glAccountId,
    glAccount: budget.glAccount,
    year: budget.year,
    totalAmount: budget.totalAmount,
    q1Amount: budget.q1Amount,
    q2Amount: budget.q2Amount,
    q3Amount: budget.q3Amount,
    q4Amount: budget.q4Amount,
    janAmount: budget.janAmount,
    febAmount: budget.febAmount,
    marAmount: budget.marAmount,
    aprAmount: budget.aprAmount,
    mayAmount: budget.mayAmount,
    junAmount: budget.junAmount,
    julAmount: budget.julAmount,
    augAmount: budget.augAmount,
    sepAmount: budget.sepAmount,
    octAmount: budget.octAmount,
    novAmount: budget.novAmount,
    decAmount: budget.decAmount,
    allocations: budget.allocations,
  }
}

async function getBudget(tx: any, id: string) {
  return tx.budget.findUnique({
    where: { id },
    include: { glAccount: true, allocations: true },
  })
}

async function getRegional(tx: any, regionalCode: string) {
  return tx.regional.findUnique({
    where: { code: regionalCode },
    select: { code: true, name: true, costCenter: true },
  })
}

function allocationAmount(budget: any, quarter: number, regionalCode: string) {
  return budget.allocations.find((a: any) => a.quarter === quarter && a.regionalCode === regionalCode)?.amount || 0
}

async function adjustAllocation(tx: any, budgetId: string, quarter: number, regionalCode: string, delta: number) {
  const allocation = await tx.regionalAllocation.findUnique({
    where: { budgetId_regionalCode_quarter: { budgetId, regionalCode, quarter } },
  })
  const nextAmount = (allocation?.amount || 0) + delta
  if (nextAmount < 0) throw new Error('Nilai RRA melebihi alokasi cost center donor')

  return tx.regionalAllocation.upsert({
    where: { budgetId_regionalCode_quarter: { budgetId, regionalCode, quarter } },
    update: { amount: nextAmount },
    create: { budgetId, regionalCode, quarter, amount: nextAmount, percentage: 0 },
  })
}

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get('year') || new Date().getFullYear().toString())
  const logs = await (prisma as any).budgetRraLog.findMany({
    where: { year },
    include: {
      sourceBudget: { include: { glAccount: true } },
      targetBudget: { include: { glAccount: true } },
      lines: { include: { budget: { include: { glAccount: true } } }, orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(logs)
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const type = String(data.type || '')
    const month = Number(data.month)
    const sourceLines = normalizeLines(data.sourceLines).length > 0 ? normalizeLines(data.sourceLines) : legacyLines(data, 'source')
    const targetLines = normalizeLines(data.targetLines).length > 0 ? normalizeLines(data.targetLines) : legacyLines(data, 'target')
    const sourceTotal = sourceLines.reduce((sum, line) => sum + line.amount, 0)
    const targetTotal = targetLines.reduce((sum, line) => sum + line.amount, 0)

    if (!validTypes.includes(type)) return NextResponse.json({ error: 'Jenis RRA tidak valid' }, { status: 400 })
    if (!Number.isInteger(month) || month < 1 || month > 12) return NextResponse.json({ error: 'Bulan RRA tidak valid' }, { status: 400 })
    if (sourceLines.length === 0 || targetLines.length === 0) return NextResponse.json({ error: 'Minimal 1 donor dan 1 penerima wajib diisi' }, { status: 400 })
    if (sourceTotal <= 0 || targetTotal <= 0) return NextResponse.json({ error: 'Nilai donor dan penerima wajib lebih dari 0' }, { status: 400 })
    if (Math.abs(sourceTotal - targetTotal) > 0.01) return NextResponse.json({ error: 'Total donor harus sama dengan total penerima' }, { status: 400 })

    const result = await prisma.$transaction(async (tx: any) => {
      const quarter = quarterFromMonth(month)
      const mKey = monthKey(month)
      const qKey = quarterKey(quarter)
      const budgetIds = Array.from(new Set([...sourceLines, ...targetLines].map((line) => line.budgetId)))
      const regionalCodes = Array.from(new Set([...sourceLines, ...targetLines].map((line) => line.regionalCode)))

      const budgets = new Map<string, any>()
      for (const budgetId of budgetIds) {
        const budget = await getBudget(tx, budgetId)
        if (!budget) throw new Error('Budget donor atau penerima tidak ditemukan')
        budgets.set(budgetId, budget)
      }

      const years = Array.from(new Set(Array.from(budgets.values()).map((budget: any) => budget.year)))
      if (years.length !== 1) throw new Error('Semua budget donor dan penerima harus berada di tahun yang sama')

      const regionals = new Map<string, any>()
      for (const regionalCode of regionalCodes) {
        const regional = await getRegional(tx, regionalCode)
        if (!regional) throw new Error('Regional donor atau penerima tidak ditemukan')
        regionals.set(regionalCode, regional)
      }

      const beforeSnapshot = Object.fromEntries(
        Array.from(budgets.entries()).map(([id, budget]) => [id, budgetSnapshot(budget)])
      )

      const donorGroups = new Map<string, number>()
      for (const line of sourceLines) {
        const key = lineKey(line.budgetId, line.regionalCode)
        donorGroups.set(key, (donorGroups.get(key) || 0) + line.amount)
      }

      for (const [key, amount] of Array.from(donorGroups.entries())) {
        const [budgetId, regionalCode] = key.split('::')
        const budget = budgets.get(budgetId)
        if (allocationAmount(budget, quarter, regionalCode) < amount) {
          throw new Error('Nilai RRA melebihi saldo salah satu donor')
        }
      }

      const buildLines = (lines: RraLineInput[], side: 'DONOR' | 'PENERIMA') => lines.map((line) => {
        const budget = budgets.get(line.budgetId)
        const regional = regionals.get(line.regionalCode)
        const beforeAmount = allocationAmount(budget, quarter, line.regionalCode)
        const rraAmount = side === 'DONOR' ? -line.amount : line.amount
        return {
          side,
          budgetId: line.budgetId,
          regionalCode: line.regionalCode,
          costCenter: regional.costCenter || regional.code,
          regionalName: regional.name,
          accountCode: budget.glAccount.code,
          accountName: budget.glAccount.description,
          amount: line.amount,
          beforeAmount,
          rraAmount,
          afterAmount: beforeAmount + rraAmount,
        }
      })

      const sourceLineSnapshots = buildLines(sourceLines, 'DONOR')
      const targetLineSnapshots = buildLines(targetLines, 'PENERIMA')

      for (const line of sourceLines) await adjustAllocation(tx, line.budgetId, quarter, line.regionalCode, -line.amount)
      for (const line of targetLines) await adjustAllocation(tx, line.budgetId, quarter, line.regionalCode, line.amount)

      const budgetDeltas = new Map<string, number>()
      for (const line of sourceLines) budgetDeltas.set(line.budgetId, (budgetDeltas.get(line.budgetId) || 0) - line.amount)
      for (const line of targetLines) budgetDeltas.set(line.budgetId, (budgetDeltas.get(line.budgetId) || 0) + line.amount)

      for (const [budgetId, delta] of Array.from(budgetDeltas.entries())) {
        if (Math.abs(delta) <= 0.01) continue
        const budget = budgets.get(budgetId)
        await tx.budget.update({
          where: { id: budgetId },
          data: {
            totalAmount: Number(budget.totalAmount || 0) + delta,
            [qKey]: Number(budget[qKey] || 0) + delta,
            [mKey]: Number(budget[mKey] || 0) + delta,
          },
        })
      }

      const afterBudgets = new Map<string, any>()
      for (const budgetId of budgetIds) afterBudgets.set(budgetId, await getBudget(tx, budgetId))
      const afterSnapshot = Object.fromEntries(
        Array.from(afterBudgets.entries()).map(([id, budget]) => [id, budgetSnapshot(budget)])
      )

      const firstSource = sourceLineSnapshots[0]
      const firstTarget = targetLineSnapshots[0]

      return (tx as any).budgetRraLog.create({
        data: {
          type,
          year: years[0],
          month,
          sourceBudgetId: firstSource.budgetId,
          sourceRegionalCode: firstSource.regionalCode,
          sourceCostCenter: firstSource.costCenter,
          targetBudgetId: firstTarget.budgetId,
          targetRegionalCode: firstTarget.regionalCode,
          targetCostCenter: firstTarget.costCenter,
          amount: sourceTotal,
          sourceBeforeAmount: sourceLineSnapshots.reduce((sum, line) => sum + line.beforeAmount, 0),
          targetBeforeAmount: targetLineSnapshots.reduce((sum, line) => sum + line.beforeAmount, 0),
          sourceRraAmount: -sourceTotal,
          targetRraAmount: targetTotal,
          sourceAfterAmount: sourceLineSnapshots.reduce((sum, line) => sum + line.afterAmount, 0),
          targetAfterAmount: targetLineSnapshots.reduce((sum, line) => sum + line.afterAmount, 0),
          description: data.description || null,
          beforeSnapshot,
          afterSnapshot,
          lines: {
            create: [...sourceLineSnapshots, ...targetLineSnapshots],
          },
        },
        include: {
          sourceBudget: { include: { glAccount: true } },
          targetBudget: { include: { glAccount: true } },
          lines: { include: { budget: { include: { glAccount: true } } }, orderBy: { createdAt: 'asc' } },
        },
      })
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error creating RRA:', error)
    return NextResponse.json({ error: error?.message || 'Gagal menyimpan RRA' }, { status: 500 })
  }
}
