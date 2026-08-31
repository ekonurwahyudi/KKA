import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type RraLineInput = { budgetId: string; regionalCode: string; amount: number }

const validTypes = ['realokasi', 'rescheduling', 'redistribusi']
const quarterFromMonth = (month: number) => Math.ceil(month / 3)
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

function isHoRegional(regional: any) {
  const marker = `${regional?.code || ''} ${regional?.name || ''}`.toUpperCase()
  return marker.includes('HO')
}

function hasAreaDonorToHo(
  sourceLines: RraLineInput[],
  targetLines: RraLineInput[],
  regionals: Map<string, any>,
) {
  const hasAreaDonor = sourceLines.some((line) => !isHoRegional(regionals.get(line.regionalCode)))
  const hasHoReceiver = targetLines.some((line) => isHoRegional(regionals.get(line.regionalCode)))
  return hasAreaDonor && hasHoReceiver
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
  try {
    return await tx.budget.findUnique({
      where: { id },
      include: { glAccount: true, allocations: true },
    })
  } catch (error: any) {
    const message = String(error?.message || '')
    if (error?.code !== 'P2022' || !message.includes('rraDelta')) throw error

    return tx.budget.findUnique({
      where: { id },
      include: {
        glAccount: true,
        allocations: {
          select: {
            id: true,
            budgetId: true,
            regionalCode: true,
            quarter: true,
            amount: true,
            percentage: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })
  }
}

async function getRegional(tx: any, regionalCode: string) {
  try {
    return await tx.regional.findUnique({
      where: { code: regionalCode },
      select: { code: true, name: true, costCenter: true },
    })
  } catch (error: any) {
    const message = String(error?.message || '')
    if (error?.code !== 'P2022' || !message.includes('costCenter')) throw error

    const regional = await tx.regional.findUnique({
      where: { code: regionalCode },
      select: { code: true, name: true },
    })
    return regional ? { ...regional, costCenter: null } : null
  }
}

function allocationAmount(budget: any, quarter: number, regionalCode: string) {
  const allocation = budget.allocations.find((a: any) => a.quarter === quarter && a.regionalCode === regionalCode)
  return Number(allocation?.amount || 0) + Number(allocation?.rraDelta || 0)
}

async function adjustAllocation(tx: any, budgetId: string, quarter: number, regionalCode: string, delta: number) {
  let allocation: any = null
  try {
    allocation = await tx.regionalAllocation.findUnique({
      where: { budgetId_regionalCode_quarter: { budgetId, regionalCode, quarter } },
    })
  } catch (error: any) {
    const message = String(error?.message || '')
    if (error?.code !== 'P2022' || !message.includes('rraDelta')) throw error

    allocation = await tx.regionalAllocation.findUnique({
      where: { budgetId_regionalCode_quarter: { budgetId, regionalCode, quarter } },
      select: { amount: true },
    })
  }

  const nextDelta = Number(allocation?.rraDelta || 0) + delta
  const nextEffectiveAmount = Number(allocation?.amount || 0) + nextDelta
  if (nextEffectiveAmount < 0) throw new Error('Nilai RRA melebihi alokasi cost center donor')

  return tx.regionalAllocation.upsert({
    where: { budgetId_regionalCode_quarter: { budgetId, regionalCode, quarter } },
    update: { rraDelta: nextDelta },
    create: { budgetId, regionalCode, quarter, amount: 0, rraDelta: delta, percentage: 0 },
  })
}

function existingLines(log: any): RraLineInput[] {
  if (Array.isArray(log.lines) && log.lines.length > 0) {
    return log.lines.map((line: any) => ({
      budgetId: line.budgetId,
      regionalCode: line.regionalCode,
      amount: Number(line.amount || 0),
      side: line.side,
    }))
  }

  return [
    { budgetId: log.sourceBudgetId, regionalCode: log.sourceRegionalCode, amount: Number(log.amount || 0), side: 'DONOR' },
    { budgetId: log.targetBudgetId, regionalCode: log.targetRegionalCode, amount: Number(log.amount || 0), side: 'PENERIMA' },
  ].filter((line: any) => line.budgetId && line.regionalCode && line.amount > 0) as any
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await req.json()
    const type = String(data.type || '')
    const month = Number(data.month)
    const sourceLines = normalizeLines(data.sourceLines)
    const targetLines = normalizeLines(data.targetLines)
    const sourceTotal = sourceLines.reduce((sum, line) => sum + line.amount, 0)
    const targetTotal = targetLines.reduce((sum, line) => sum + line.amount, 0)

    if (!validTypes.includes(type)) return NextResponse.json({ error: 'Jenis RRA tidak valid' }, { status: 400 })
    if (!Number.isInteger(month) || month < 1 || month > 12) return NextResponse.json({ error: 'Bulan RRA tidak valid' }, { status: 400 })
    if (sourceLines.length === 0 || targetLines.length === 0) return NextResponse.json({ error: 'Minimal 1 donor dan 1 penerima wajib diisi' }, { status: 400 })
    if (sourceTotal <= 0 || targetTotal <= 0) return NextResponse.json({ error: 'Nilai donor dan penerima wajib lebih dari 0' }, { status: 400 })
    if (Math.abs(sourceTotal - targetTotal) > 0.01) return NextResponse.json({ error: 'Total donor harus sama dengan total penerima' }, { status: 400 })

    const result = await prisma.$transaction(async (tx: any) => {
      const existingLog = await (tx as any).budgetRraLog.findUnique({
        where: { id: params.id },
        include: { lines: true },
      })
      if (!existingLog) throw new Error('Histori RRA tidak ditemukan')

      const oldQuarter = quarterFromMonth(existingLog.month)
      for (const line of existingLines(existingLog) as any[]) {
        const reverseDelta = line.side === 'DONOR' ? line.amount : -line.amount
        await adjustAllocation(tx, line.budgetId, oldQuarter, line.regionalCode, reverseDelta)
      }

      const quarter = quarterFromMonth(month)
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

      if (hasAreaDonorToHo(sourceLines, targetLines, regionals)) {
        throw new Error('RRA dari Area ke HO tidak diperbolehkan')
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

      const afterBudgets = new Map<string, any>()
      for (const budgetId of budgetIds) afterBudgets.set(budgetId, await getBudget(tx, budgetId))
      const afterSnapshot = Object.fromEntries(
        Array.from(afterBudgets.entries()).map(([id, budget]) => [id, budgetSnapshot(budget)])
      )

      const firstSource = sourceLineSnapshots[0]
      const firstTarget = targetLineSnapshots[0]

      await (tx as any).budgetRraLine.deleteMany({ where: { rraLogId: params.id } })

      return (tx as any).budgetRraLog.update({
        where: { id: params.id },
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
    console.error('Error updating RRA:', error)
    if (error?.code === 'P2021') {
      return NextResponse.json({
        error: 'Tabel RRA belum tersedia di database production. Jalankan migrasi BudgetRraLog dan BudgetRraLine terlebih dahulu.',
      }, { status: 400 })
    }
    if (error?.code === 'P2022') {
      return NextResponse.json({
        error: `Kolom database belum lengkap untuk RRA: ${error?.meta?.column || error?.message || 'unknown'}`,
      }, { status: 400 })
    }
    return NextResponse.json({ error: error?.message || 'Gagal mengubah RRA' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const deleted = await prisma.$transaction(async (tx: any) => {
      const log = await tx.budgetRraLog.findUnique({
        where: { id: params.id },
        include: { lines: true },
      })
      if (!log) throw new Error('Histori RRA tidak ditemukan')

      const quarter = quarterFromMonth(log.month)
      const reverseDeltas = new Map<string, { budgetId: string; regionalCode: string; delta: number }>()
      for (const line of existingLines(log) as any[]) {
        const key = lineKey(line.budgetId, line.regionalCode)
        const current = reverseDeltas.get(key) || { budgetId: line.budgetId, regionalCode: line.regionalCode, delta: 0 }
        current.delta += line.side === 'DONOR' ? Number(line.amount || 0) : -Number(line.amount || 0)
        reverseDeltas.set(key, current)
      }

      for (const reversal of Array.from(reverseDeltas.values())) {
        await adjustAllocation(tx, reversal.budgetId, quarter, reversal.regionalCode, reversal.delta)
      }

      await tx.budgetRraLog.delete({ where: { id: params.id } })
      return { id: log.id, year: log.year }
    })

    return NextResponse.json({ success: true, ...deleted })
  } catch (error: any) {
    console.error('Error deleting RRA:', error)
    if (error?.code === 'P2021') {
      return NextResponse.json({ error: 'Tabel RRA belum tersedia di database' }, { status: 400 })
    }
    if (error?.code === 'P2022') {
      return NextResponse.json({ error: `Kolom database belum lengkap untuk RRA: ${error?.meta?.column || error?.message || 'unknown'}` }, { status: 400 })
    }
    const message = error?.message === 'Nilai RRA melebihi alokasi cost center donor'
      ? 'RRA tidak dapat dibatalkan karena sebagian anggaran penerima sudah digunakan atau dialihkan'
      : error?.message || 'Gagal membatalkan RRA'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
