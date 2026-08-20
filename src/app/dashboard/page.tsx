'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Wallet, TrendingDown, FileText, Clock, BookOpen, Hourglass, CheckCircle, ClipboardList } from 'lucide-react'
import { ChartRadial } from '@/components/ui/chart-radial'
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Bar, BarChart, Cell, LabelList, PieChart, Pie } from 'recharts'
import { ChartContainer, ChartTooltip, type ChartConfig, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { DashboardSkeleton } from '@/components/loading'
import { useDashboardBudgets, useDashboardTransactions, useDashboardGlAccounts } from '@/lib/hooks/useDashboard'
import { useRegionals } from '@/lib/hooks/useMaster'
import { useCash } from '@/lib/hooks/useCash'

interface GlAccount {
  id: string
  code: string
  description: string
}

interface Budget {
  id: string
  glAccountId: string
  totalAmount: number
  q1Amount: number
  q2Amount: number
  q3Amount: number
  q4Amount: number
  janAmount: number
  febAmount: number
  marAmount: number
  aprAmount: number
  mayAmount: number
  junAmount: number
  julAmount: number
  augAmount: number
  sepAmount: number
  octAmount: number
  novAmount: number
  decAmount: number
  glAccount: GlAccount
  allocations?: { regionalCode: string; quarter: number; amount: number; rraDelta?: number }[]
  rraLines?: RraLine[]
}

interface RraLine {
  id: string
  rraLogId: string
  side: string
  budgetId: string
  regionalCode: string
  regionalName?: string | null
  costCenter?: string | null
  amount: number
  rraAmount: number
  rraLog?: { month: number; lines: RraLine[] }
}

interface Transaction {
  id: string
  glAccountId: string
  quarter: number
  nilaiKwitansi: number
  nilaiTanpaPPN: number
  tanggalKwitansi: string | null
  tglSerahFinance: string | null
  glAccount?: GlAccount
  jenisPengadaan?: string
  regionalPengguna?: string
  regionalCode?: string
  status?: string
  year?: number
}

export default function DashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedGlAccount, setSelectedGlAccount] = useState<string>('all')
  const [selectedAreaGlAccount, setSelectedAreaGlAccount] = useState<string>('all')
  const [periodType, setPeriodType] = useState<'quarter' | 'month'>('quarter')
  const currentMonth = new Date().getMonth()
  const currentQuarter = Math.ceil((currentMonth + 1) / 3)
  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des']
  const [activeTab, setActiveTab] = useState<string>(`q${currentQuarter}`)

  // TanStack Query hooks
  const { data: glAccounts = [], isLoading: loadingGl } = useDashboardGlAccounts()
  const { data: budgets = [], isLoading: loadingBudgets } = useDashboardBudgets(year)
  const { data: rawTransactions = [], isLoading: loadingTransactions } = useDashboardTransactions(year)
  const { data: regionals = [] } = useRegionals()
  const { data: cashData = [] } = useCash()

  // Calculate total cash
  const cashRecords = Array.isArray(cashData) ? cashData : []
  const totalCashMasuk = cashRecords.filter((c: any) => c.tipe === 'masuk').reduce((sum: number, c: any) => sum + c.jumlah, 0)
  const totalCashKeluar = cashRecords.filter((c: any) => c.tipe === 'keluar').reduce((sum: number, c: any) => sum + c.jumlah, 0)
  const totalCash = totalCashMasuk - totalCashKeluar

  // Filter transactions by year from tanggalKwitansi
  const transactions = rawTransactions.filter((t: Transaction) => {
    if (!t.tanggalKwitansi) return false
    const txYear = new Date(t.tanggalKwitansi).getFullYear()
    return txYear === year
  })

  const isLoading = loadingGl || loadingBudgets || loadingTransactions

  const getEffectiveQuarterBudget = (budget: Budget, quarter: number) => {
    const qKey = `q${quarter}Amount` as 'q1Amount' | 'q2Amount' | 'q3Amount' | 'q4Amount'
    const rraDelta = (budget.rraLines || [])
      .filter(line => Math.ceil((line.rraLog?.month || 1) / 3) === quarter && !isAbsorbedRraLine(line))
      .reduce((sum, line) => sum + Number(line.rraAmount || 0), 0)
    return Number(budget[qKey] || 0) + rraDelta
  }

  const isHoLine = (line?: Pick<RraLine, 'regionalCode' | 'regionalName' | 'costCenter'> | null) => {
    const marker = `${line?.regionalCode || ''} ${line?.regionalName || ''} ${line?.costCenter || ''}`.toUpperCase()
    return marker.includes('HO')
  }

  const isAbsorbedRraLine = (line: RraLine) => {
    if (line.side !== 'DONOR' || !isHoLine(line)) return false
    return (line.rraLog?.lines || []).some(peer => peer.side === 'PENERIMA' && !isHoLine(peer))
  }

  const getRraAbsorption = (budget: Budget, quarter?: number) => {
    return (budget.rraLines || [])
      .filter(line => isAbsorbedRraLine(line))
      .filter(line => quarter ? Math.ceil((line.rraLog?.month || 1) / 3) === quarter : true)
      .reduce((sum, line) => sum + Number(line.amount || 0), 0)
  }

  const getRraLineMonth = (line: RraLine) => Number(line.rraLog?.month || 1) - 1

  const getRraAbsorptionByMonth = (budget: Budget, month: number) => {
    return (budget.rraLines || [])
      .filter(line => isAbsorbedRraLine(line))
      .filter(line => getRraLineMonth(line) === month)
      .reduce((sum, line) => sum + Number(line.amount || 0), 0)
  }

  const getRraMovementByMonth = (budget: Budget, month: number) => {
    return (budget.rraLines || [])
      .filter(line => !isAbsorbedRraLine(line))
      .filter(line => getRraLineMonth(line) === month)
      .reduce((sum, line) => sum + Number(line.rraAmount || 0), 0)
  }

  const getEffectiveTotalBudget = (budget: Budget) => {
    return [1, 2, 3, 4].reduce((sum, quarter) => sum + getEffectiveQuarterBudget(budget, quarter), 0)
  }

  const totalBudget = budgets.reduce((sum, b) => sum + getEffectiveTotalBudget(b), 0)
  const totalRraAbsorption = budgets.reduce((sum, b) => sum + getRraAbsorption(b), 0)
  const totalUsed = transactions.reduce((sum: number, t: Transaction) => sum + t.nilaiTanpaPPN, 0) + totalRraAbsorption

  // Status counts from rawTransactions (already filtered by year from API)
  const openCount = rawTransactions.filter((t: Transaction) => t.status === 'Open').length
  const prosesCount = rawTransactions.filter((t: Transaction) => t.status === 'Proses').length
  const closeCount = rawTransactions.filter((t: Transaction) => t.status === 'Close').length
  const totalPencatatan = rawTransactions.length

  // Helper to get quarter from tanggalKwitansi
  const getQuarterFromDate = (dateStr: string | null): number | null => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const month = date.getMonth() // 0-11
    return Math.ceil((month + 1) / 3) // 1-4
  }

  const getQuarterData = (quarter: number) => {
    const qBudget = budgets.reduce((sum, b) => sum + getEffectiveQuarterBudget(b, quarter), 0)
    const qTransactionUsed = transactions
      .filter(t => getQuarterFromDate(t.tanggalKwitansi) === quarter)
      .reduce((sum, t) => sum + t.nilaiTanpaPPN, 0)
    const qUsed = qTransactionUsed + budgets.reduce((sum, b) => sum + getRraAbsorption(b, quarter), 0)
    return { budget: qBudget, used: qUsed, remaining: qBudget - qUsed }
  }

  const getBudgetByQuarter = (budget: Budget, quarter: number) => {
    const qBudget = getEffectiveQuarterBudget(budget, quarter)
    const qTransactionUsed = transactions
      .filter(t => t.glAccountId === budget.glAccountId && getQuarterFromDate(t.tanggalKwitansi) === quarter)
      .reduce((sum, t) => sum + t.nilaiTanpaPPN, 0)
    const qUsed = qTransactionUsed + getRraAbsorption(budget, quarter)
    return { budget: qBudget, used: qUsed, remaining: qBudget - qUsed }
  }

  const getBudgetByMonth = (budget: Budget, month: number) => {
    // Get monthly budget from database field
    const monthKeys = ['janAmount', 'febAmount', 'marAmount', 'aprAmount', 'mayAmount', 'junAmount', 'julAmount', 'augAmount', 'sepAmount', 'octAmount', 'novAmount', 'decAmount'] as const
    const monthlyBudget = budget[monthKeys[month]] || 0
    
    // If no monthly budget set, fallback to quarter divided by 3
    const quarter = Math.ceil((month + 1) / 3)
    const baseBudget = monthlyBudget > 0 ? monthlyBudget : getEffectiveQuarterBudget(budget, quarter) / 3
    const effectiveBudget = baseBudget + getRraMovementByMonth(budget, month)
    
    // Hitung penggunaan per bulan - use tanggalKwitansi to determine the month
    const monthUsed = transactions
      .filter(t => {
        if (t.glAccountId !== budget.glAccountId) return false
        if (!t.tanggalKwitansi) return false
        const txDate = new Date(t.tanggalKwitansi)
        return txDate.getMonth() === month
      })
      .reduce((sum, t) => sum + t.nilaiTanpaPPN, 0)
    const rraUsed = getRraAbsorptionByMonth(budget, month)
    
    return { budget: effectiveBudget, used: monthUsed + rraUsed, remaining: effectiveBudget - monthUsed - rraUsed }
  }

  // Data untuk monitoring chart
  const getMonthlyData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const monthlyData = monthNames.map((name) => ({
      month: name,
      jumlahPencatatan: 0,
      totalNilai: 0
    }))

    const filteredTransactions = selectedGlAccount === 'all' 
      ? transactions 
      : transactions.filter(t => t.glAccountId === selectedGlAccount)

    filteredTransactions.forEach(t => {
      if (t.tanggalKwitansi) {
        const date = new Date(t.tanggalKwitansi)
        const month = date.getMonth()
        monthlyData[month].jumlahPencatatan += 1
        monthlyData[month].totalNilai += t.nilaiTanpaPPN
      }
    })

    const filteredBudgets: Budget[] = selectedGlAccount === 'all'
      ? budgets
      : budgets.filter((budget: Budget) => budget.glAccountId === selectedGlAccount)

    filteredBudgets.forEach((budget) => {
      ;(budget.rraLines || [])
        .filter(line => isAbsorbedRraLine(line))
        .forEach(line => {
          monthlyData[getRraLineMonth(line)].totalNilai += Number(line.amount || 0)
        })
    })

    return monthlyData
  }

  const chartConfig = {
    jumlahPencatatan: {
      label: "Jumlah Pencatatan",
      color: "#ef4444",
    },
    totalNilai: {
      label: "Total Pengeluaran",
      color: "#22c55e",
    },
  } satisfies ChartConfig

  // Helper function untuk format angka Indonesia
  const formatCurrency = (value: number): string => {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + 'M' // Miliar
    } else if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'Jt' // Juta
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K' // Ribu
    }
    return value.toString()
  }

  // Data untuk monitoring SPPD per Regional Pengguna
  const getSPPDData = () => {
    const sppdTransactions = transactions.filter(t => t.jenisPengadaan === 'SPPD')
    console.log('SPPD Transactions:', sppdTransactions.length)
    
    // Group by regionalPengguna
    const regionalData: Record<string, number> = {}
    
    sppdTransactions.forEach(t => {
      const regional = t.regionalPengguna || 'Tidak Diketahui'
      if (!regionalData[regional]) {
        regionalData[regional] = 0
      }
      regionalData[regional] += t.nilaiTanpaPPN
    })
    
    // Convert to array format for chart
    const result = Object.entries(regionalData).map(([regional, total]) => ({
      regional,
      total
    })).sort((a, b) => b.total - a.total) // Sort by total descending
    
    console.log('SPPD Data:', result)
    return result
  }

  // Data untuk penggunaan anggaran per Area (Regional Pengguna)
  const getAreaUsageData = (glFilter: string = 'all') => {
    // Initialize all regionals with 0 so we can see which ones have no usage
    const areaData: Record<string, number> = {}
    const regionalNames = regionals.map((r: any) => r.name)
    const normalizeArea = (value?: string | null) => String(value || '').trim().toUpperCase()
    const isKnownArea = (value?: string | null) => {
      const area = normalizeArea(value)
      if (!area) return false
      if (regionalNames.includes(value || '')) return true
      return area.startsWith('AREA ') || area.startsWith('AREA-') || area.includes(' DEFA HO') || area === 'DEFA HO TIF' || area === 'A-DEFA-HO' || area.startsWith('EVP')
    }
    
    regionals.forEach((r: any) => {
      areaData[r.name] = 0
    })
    
    // Sum up transactions by regionalPengguna - only with tanggalKwitansi in selected year
    // Only include transactions where regionalPengguna is a valid regional name (not a person's name)
    transactions.forEach(t => {
      if (!t.tanggalKwitansi) return
      const txYear = new Date(t.tanggalKwitansi).getFullYear()
      if (txYear !== year) return
      
      // Filter by GL Account if specified
      if (glFilter !== 'all' && t.glAccountId !== glFilter) return
      
      const area = t.regionalPengguna || 'Tidak Diketahui'
      
      // Include valid regional names and recognizable area labels even when master regional fails to load.
      if (!isKnownArea(area)) return
      
      if (!areaData[area]) {
        areaData[area] = 0
      }
      areaData[area] += t.nilaiTanpaPPN
    })

    const filteredBudgets: Budget[] = glFilter === 'all'
      ? budgets
      : budgets.filter((budget: Budget) => budget.glAccountId === glFilter)

    filteredBudgets.forEach((budget) => {
      ;(budget.rraLines || [])
        .filter(line => line.side === 'PENERIMA' && !isHoLine(line))
        .filter(line => (line.rraLog?.lines || []).some(peer => peer.side === 'DONOR' && isHoLine(peer)))
        .forEach(line => {
          const area = line.regionalName || regionals.find((r: any) => r.code === line.regionalCode)?.name
          if (!isKnownArea(area)) return
          areaData[area] = (areaData[area] || 0) + Number(line.amount || 0)
        })
    })
    
    // Convert to array format for chart
    const result = Object.entries(areaData).map(([area, total]) => ({
      area,
      total
    })).sort((a, b) => b.total - a.total) // Sort by total descending
    
    return result
  }

  // Colors for bar chart
  const AREA_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Lacak anggaran dan pantau penggunaan penting</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Tahun:</Label>
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Pencatatan Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border">
          <CardContent className="p-3 md:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">OPEN</p>
                <p className="text-lg md:text-2xl font-bold text-blue-600">{openCount}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 md:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">PROSES</p>
                <p className="text-lg md:text-2xl font-bold text-yellow-600">{prosesCount}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-yellow-50 flex items-center justify-center flex-shrink-0">
                <Hourglass className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 md:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">SELESAI</p>
                <p className="text-lg md:text-2xl font-bold text-green-600">{closeCount}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 md:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">TOTAL PENCATATAN</p>
                <p className="text-lg md:text-2xl font-bold">{totalPencatatan}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="h-4 w-4 md:h-5 md:w-5 text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Budget Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border">
          <CardContent className="p-3 md:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">TOTAL ANGGARAN</p>
                <p className="text-sm md:text-2xl font-bold truncate">{totalBudget.toLocaleString('id-ID')}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 md:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">TOTAL TERPAKAI</p>
                <p className="text-sm md:text-2xl font-bold truncate">{totalUsed.toLocaleString('id-ID')}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 md:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">SISA ANGGARAN</p>
                <p className="text-sm md:text-2xl font-bold truncate">{(totalBudget - totalUsed).toLocaleString('id-ID')}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 md:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">UANG CASH</p>
                <p className="text-sm md:text-2xl font-bold truncate text-green-600">{totalCash.toLocaleString('id-ID')}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ringkasan per Kuartal dengan Radial Chart */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[1, 2, 3, 4].map((q) => {
          const data = getQuarterData(q)
          const penyerapan = data.budget > 0 ? (data.used / data.budget) * 100 : 0
          return (
            <ChartRadial
              key={q}
              quarter={q}
              percentage={penyerapan}
              anggaran={data.budget}
              terpakai={data.used}
              sisa={data.remaining}
            />
          )
        })}
      </div>

      <Card className="border">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <CardTitle className="text-base md:text-lg">Ringkasan Anggaran per GL Account</CardTitle>
              <CardDescription className="text-xs md:text-sm">Detail penggunaan anggaran per {periodType === 'quarter' ? 'kuartal' : 'bulan'} tahun {year}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs md:text-sm text-muted-foreground">Filter:</Label>
              <Select value={periodType} onValueChange={(v: 'quarter' | 'month') => {
                setPeriodType(v)
                // Set active tab to current month or quarter
                if (v === 'quarter') {
                  setActiveTab(`q${currentQuarter}`)
                } else {
                  setActiveTab(monthKeys[currentMonth])
                }
              }}>
                <SelectTrigger className="w-[130px] md:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarter">Kuartal</SelectItem>
                  <SelectItem value="month">Bulan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {periodType === 'quarter' ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="q1">Q1</TabsTrigger>
                <TabsTrigger value="q2">Q2</TabsTrigger>
                <TabsTrigger value="q3">Q3</TabsTrigger>
                <TabsTrigger value="q4">Q4</TabsTrigger>
              </TabsList>
              {[1, 2, 3, 4].map((q) => (
                <TabsContent key={q} value={`q${q}`}>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>GL Account</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead className="text-right">Anggaran Q{q} (Rp)</TableHead>
                        <TableHead className="text-right">Terpakai (Rp)</TableHead>
                        <TableHead className="text-right">Sisa (Rp)</TableHead>
                        <TableHead className="text-center">Outlook</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...budgets]
                        .sort((a, b) => {
                          return getEffectiveQuarterBudget(b, q) - getEffectiveQuarterBudget(a, q)
                        })
                        .map((budget) => {
                          const data = getBudgetByQuarter(budget, q)
                          const outlook = data.budget > 0 ? (data.used / data.budget) * 100 : 0
                          return (
                            <TableRow key={budget.id}>
                              <TableCell className="font-medium">{budget.glAccount.code}</TableCell>
                              <TableCell>{budget.glAccount.description}</TableCell>
                              <TableCell className="text-right">{data.budget.toLocaleString('id-ID')}</TableCell>
                              <TableCell className="text-right text-red-600">{data.used.toLocaleString('id-ID')}</TableCell>
                              <TableCell className={`text-right font-semibold ${data.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {data.remaining.toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                  outlook >= 80 ? 'bg-green-100 text-green-600' : 
                                  outlook >= 40 ? 'bg-yellow-100 text-yellow-600' : 
                                  'bg-red-100 text-red-600'
                                }`}>
                                  {outlook.toFixed(1)}%
                                </span>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      {budgets.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Belum ada data anggaran. Silakan input anggaran terlebih dahulu.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="overflow-x-auto pb-2">
                <TabsList className="grid w-max grid-cols-12 h-auto">
                  <TabsTrigger value="jan" className="text-xs px-2 md:px-3">Jan</TabsTrigger>
                  <TabsTrigger value="feb" className="text-xs px-2 md:px-3">Feb</TabsTrigger>
                  <TabsTrigger value="mar" className="text-xs px-2 md:px-3">Mar</TabsTrigger>
                  <TabsTrigger value="apr" className="text-xs px-2 md:px-3">Apr</TabsTrigger>
                  <TabsTrigger value="mei" className="text-xs px-2 md:px-3">Mei</TabsTrigger>
                  <TabsTrigger value="jun" className="text-xs px-2 md:px-3">Jun</TabsTrigger>
                  <TabsTrigger value="jul" className="text-xs px-2 md:px-3">Jul</TabsTrigger>
                  <TabsTrigger value="agu" className="text-xs px-2 md:px-3">Agu</TabsTrigger>
                  <TabsTrigger value="sep" className="text-xs px-2 md:px-3">Sep</TabsTrigger>
                  <TabsTrigger value="okt" className="text-xs px-2 md:px-3">Okt</TabsTrigger>
                  <TabsTrigger value="nov" className="text-xs px-2 md:px-3">Nov</TabsTrigger>
                  <TabsTrigger value="des" className="text-xs px-2 md:px-3">Des</TabsTrigger>
                </TabsList>
              </div>
              {['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'].map((monthKey, monthIndex) => {
                const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
                return (
                  <TabsContent key={monthKey} value={monthKey}>
                    <div className="overflow-x-auto">
                      <Table className="min-w-[700px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>GL Account</TableHead>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead className="text-right">Anggaran {monthNames[monthIndex]} (Rp)</TableHead>
                          <TableHead className="text-right">Terpakai (Rp)</TableHead>
                          <TableHead className="text-right">Sisa (Rp)</TableHead>
                          <TableHead className="text-center">Outlook</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...budgets]
                          .sort((a, b) => {
                            return getBudgetByMonth(b, monthIndex).budget - getBudgetByMonth(a, monthIndex).budget
                          })
                          .map((budget) => {
                            const data = getBudgetByMonth(budget, monthIndex)
                            const outlook = data.budget > 0 ? (data.used / data.budget) * 100 : 0
                            return (
                              <TableRow key={budget.id}>
                                <TableCell className="font-medium">{budget.glAccount.code}</TableCell>
                                <TableCell>{budget.glAccount.description}</TableCell>
                                <TableCell className="text-right">{data.budget.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-right text-red-600">{data.used.toLocaleString('id-ID')}</TableCell>
                                <TableCell className={`text-right font-semibold ${data.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {data.remaining.toLocaleString('id-ID')}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                    outlook >= 80 ? 'bg-green-100 text-green-600' : 
                                    outlook >= 40 ? 'bg-yellow-100 text-yellow-600' : 
                                    'bg-red-100 text-red-600'
                                  }`}>
                                    {outlook.toFixed(1)}%
                                  </span>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        {budgets.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              Belum ada data anggaran. Silakan input anggaran terlebih dahulu.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    </div>
                  </TabsContent>
                )
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Monitoring Penggunaan Anggaran */}
      <Card className="border">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <CardTitle className="text-base md:text-lg">Monitoring Penggunaan Anggaran</CardTitle>
              <CardDescription className="text-xs md:text-sm">Tren penggunaan anggaran per bulan tahun {year}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs md:text-sm text-muted-foreground">GL Account:</Label>
              <Select value={selectedGlAccount} onValueChange={setSelectedGlAccount}>
                <SelectTrigger className="w-full sm:w-[250px] md:w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {glAccounts.map((gl) => (
                    <SelectItem key={gl.id} value={gl.id}>
                      {gl.code} - {gl.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          <ChartContainer config={chartConfig} className="h-[300px] md:h-[400px] w-full">
            <LineChart
              accessibilityLayer
              data={getMonthlyData()}
              margin={{
                top: 20,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={false}
              />
              <ChartTooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload || !payload.length) return null
                  
                  const monthMap: Record<string, string> = {
                    'Jan': 'Januari',
                    'Feb': 'Februari',
                    'Mar': 'Maret',
                    'Apr': 'April',
                    'Mei': 'Mei',
                    'Jun': 'Juni',
                    'Jul': 'Juli',
                    'Agu': 'Agustus',
                    'Sep': 'September',
                    'Okt': 'Oktober',
                    'Nov': 'November',
                    'Des': 'Desember'
                  }
                  
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="font-medium mb-1">{monthMap[label] || label}</div>
                      {payload.map((item: any, index: number) => {
                        const isJumlah = item.dataKey === 'jumlahPencatatan'
                        const displayValue = isJumlah 
                          ? `(${item.value})`
                          : `(Rp. ${formatCurrency(item.value)})`
                        const displayName = isJumlah ? 'Jumlah Pencatatan' : 'Total Pengeluaran'
                        
                        return (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div 
                              className="h-2 w-2 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-muted-foreground">
                              {displayValue} - {displayName}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                }}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                yAxisId="left"
                dataKey="jumlahPencatatan"
                type="natural"
                stroke="var(--color-jumlahPencatatan)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-jumlahPencatatan)",
                }}
                activeDot={{
                  r: 6,
                }}
                label={{
                  position: 'top',
                  fill: '#ef4444',
                  fontSize: 11,
                  formatter: (value: any) => value > 0 ? value : ''
                }}
              />
              <Line
                yAxisId="right"
                dataKey="totalNilai"
                type="natural"
                stroke="var(--color-totalNilai)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-totalNilai)",
                }}
                activeDot={{
                  r: 6,
                }}
                label={{
                  position: 'top',
                  fill: '#22c55e',
                  fontSize: 11,
                  formatter: (value: any) => value > 0 ? formatCurrency(value) : ''
                }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Penggunaan Anggaran per Area */}
      <Card className="border">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <CardTitle className="text-base md:text-lg">Penggunaan Anggaran Area</CardTitle>
              <CardDescription className="text-xs md:text-sm">Total penggunaan anggaran berdasarkan alokasi tahun {year}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs md:text-sm text-muted-foreground">GL Account:</Label>
              <Select value={selectedAreaGlAccount} onValueChange={setSelectedAreaGlAccount}>
                <SelectTrigger className="w-full sm:w-[250px] md:w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {glAccounts.map((gl) => (
                    <SelectItem key={gl.id} value={gl.id}>
                      {gl.code} - {gl.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {getAreaUsageData(selectedAreaGlAccount).length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Bar Chart - 8 columns on desktop */}
              <div className="lg:col-span-8">
                <ChartContainer config={{
                  total: { label: "Total Penggunaan", color: "#3b82f6" }
                }} className="h-[300px] md:h-[350px] w-full">
                  <BarChart
                    data={getAreaUsageData(selectedAreaGlAccount)}
                    layout="vertical"
                    margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="area" 
                      tickLine={false} 
                      axisLine={false}
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload || !payload.length) return null
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="font-medium mb-1">{payload[0].payload.area}</div>
                            <div className="text-sm text-muted-foreground">
                              Rp {payload[0].value.toLocaleString('id-ID')}
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {getAreaUsageData(selectedAreaGlAccount).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={AREA_COLORS[index % AREA_COLORS.length]} />
                      ))}
                      <LabelList 
                        dataKey="total" 
                        position="right" 
                        formatter={(value: any) => formatCurrency(Number(value))}
                        style={{ fontSize: 11, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
              
              {/* Pie Chart - 4 columns on desktop */}
              <div className="lg:col-span-4">
                <div className="h-[300px] md:h-[350px] flex flex-col">
                  <ChartContainer config={{
                    total: { label: "Total Penggunaan", color: "#3b82f6" }
                  }} className="flex-1 w-full">
                    <PieChart>
                      <ChartTooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload || !payload.length) return null
                          const total = getAreaUsageData(selectedAreaGlAccount).reduce((sum, d) => sum + d.total, 0)
                          const percent = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="font-medium mb-1">{payload[0].payload.area}</div>
                              <div className="text-sm text-muted-foreground">
                                Rp {payload[0].value.toLocaleString('id-ID')} ({percent}%)
                              </div>
                            </div>
                          )
                        }}
                      />
                      <Pie
                        data={getAreaUsageData(selectedAreaGlAccount).filter(d => d.total > 0)}
                        dataKey="total"
                        nameKey="area"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        strokeWidth={2}
                        stroke="#fff"
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                          if (percent < 0.05) return null // Hide label if less than 5%
                          const RADIAN = Math.PI / 180
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5
                          const x = cx + radius * Math.cos(-midAngle * RADIAN)
                          const y = cy + radius * Math.sin(-midAngle * RADIAN)
                          return (
                            <text
                              x={x}
                              y={y}
                              fill="#fff"
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={12}
                              fontWeight={600}
                            >
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          )
                        }}
                        labelLine={false}
                      >
                        {getAreaUsageData(selectedAreaGlAccount).filter(d => d.total > 0).map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={AREA_COLORS[index % AREA_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {getAreaUsageData(selectedAreaGlAccount).filter(d => d.total > 0).map((entry, index) => (
                      <div key={`legend-${index}`} className="flex items-center gap-1.5 text-xs">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: AREA_COLORS[index % AREA_COLORS.length] }}
                        />
                        <span className="text-muted-foreground truncate max-w-[80px]" title={entry.area}>
                          {entry.area.length > 12 ? entry.area.substring(0, 12) + '...' : entry.area}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Tidak ada data penggunaan anggaran untuk tahun {year}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monitoring SPPD per Regional Pengguna */}
      <Card className="border">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Monitoring SPPD HO TIF DEFA</CardTitle>
          <CardDescription className="text-xs md:text-sm">Total penggunaan SPPD berdasarkan Anggaran DEFA {year}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {getSPPDData().length > 0 ? (
            <div className="space-y-3">
              {getSPPDData().map((item, index) => {
                const maxValue = Math.max(...getSPPDData().map(d => d.total))
                const percentage = (item.total / maxValue) * 100
                
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <div 
                        className="bg-blue-500 text-white px-4 py-3 rounded-lg flex items-center justify-between"
                        style={{ width: `${Math.max(percentage, 20)}%` }}
                      >
                        <span className="font-medium text-sm">{item.regional}</span>
                      </div>
                    </div>
                    <div className="text-gray-700 font-semibold text-sm min-w-[60px] text-right">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Tidak ada data SPPD untuk tahun {year}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
