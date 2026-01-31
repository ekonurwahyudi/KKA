'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Wallet, TrendingDown, FileText, Clock } from 'lucide-react'
import { ChartRadial } from '@/components/ui/chart-radial'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, type ChartConfig, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { DashboardSkeleton } from '@/components/loading'

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
  glAccount: GlAccount
}

interface Transaction {
  id: string
  glAccountId: string
  quarter: number
  nilaiKwitansi: number
  tglSerahFinance: string | null
  glAccount?: GlAccount
  jenisPengadaan?: string
  regionalPengguna?: string
}

export default function DashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [glAccountsCount, setGlAccountsCount] = useState(0)
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([])
  const [selectedGlAccount, setSelectedGlAccount] = useState<string>('all')
  const [periodType, setPeriodType] = useState<'quarter' | 'month'>('quarter')
  const [activeTab, setActiveTab] = useState<string>('q1')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/gl-account').then((r) => r.json()).then((data) => {
      setGlAccountsCount(data.length)
      setGlAccounts(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/budget?year=${year}`).then((r) => r.json()),
      fetch(`/api/transaction?year=${year}`).then((r) => r.json())
    ]).then(([budgetData, transactionData]) => {
      setBudgets(budgetData)
      setTransactions(transactionData)
      setLoading(false)
    })
  }, [year])

  const totalBudget = budgets.reduce((sum, b) => sum + b.totalAmount, 0)
  const totalUsed = transactions.reduce((sum, t) => sum + t.nilaiKwitansi, 0)

  const getQuarterData = (quarter: number) => {
    const qKey = `q${quarter}Amount` as 'q1Amount' | 'q2Amount' | 'q3Amount' | 'q4Amount'
    const qBudget = budgets.reduce((sum, b) => sum + b[qKey], 0)
    const qUsed = transactions.filter(t => t.quarter === quarter).reduce((sum, t) => sum + t.nilaiKwitansi, 0)
    return { budget: qBudget, used: qUsed, remaining: qBudget - qUsed }
  }

  const getBudgetByQuarter = (budget: Budget, quarter: number) => {
    const qKey = `q${quarter}Amount` as 'q1Amount' | 'q2Amount' | 'q3Amount' | 'q4Amount'
    const qBudget = budget[qKey]
    const qUsed = transactions
      .filter(t => t.glAccountId === budget.glAccountId && t.quarter === quarter)
      .reduce((sum, t) => sum + t.nilaiKwitansi, 0)
    return { budget: qBudget, used: qUsed, remaining: qBudget - qUsed }
  }

  const getBudgetByMonth = (budget: Budget, month: number) => {
    // Hitung anggaran per bulan (anggaran kuartal dibagi 3)
    const quarter = Math.ceil((month + 1) / 3)
    const qKey = `q${quarter}Amount` as 'q1Amount' | 'q2Amount' | 'q3Amount' | 'q4Amount'
    const monthlyBudget = budget[qKey] / 3
    
    // Hitung penggunaan per bulan
    const monthUsed = transactions
      .filter(t => {
        if (t.glAccountId !== budget.glAccountId || !t.tglSerahFinance) return false
        const txDate = new Date(t.tglSerahFinance)
        return txDate.getMonth() === month
      })
      .reduce((sum, t) => sum + t.nilaiKwitansi, 0)
    
    return { budget: monthlyBudget, used: monthUsed, remaining: monthlyBudget - monthUsed }
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
      if (t.tglSerahFinance) {
        const date = new Date(t.tglSerahFinance)
        const month = date.getMonth()
        monthlyData[month].jumlahPencatatan += 1
        monthlyData[month].totalNilai += t.nilaiKwitansi
      }
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
      regionalData[regional] += t.nilaiKwitansi
    })
    
    // Convert to array format for chart
    const result = Object.entries(regionalData).map(([regional, total]) => ({
      regional,
      total
    })).sort((a, b) => b.total - a.total) // Sort by total descending
    
    console.log('SPPD Data:', result)
    return result
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Lacak anggaran dan pantau penggunaan penting</p>
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
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">TOTAL GL ACCOUNT</p>
                <p className="text-2xl font-bold">{glAccountsCount}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">TOTAL ANGGARAN (Rp)</p>
                <p className="text-2xl font-bold">{totalBudget.toLocaleString('id-ID')}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">TOTAL TERPAKAI (Rp)</p>
                <p className="text-2xl font-bold">{totalUsed.toLocaleString('id-ID')}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SISA ANGGARAN (Rp)</p>
                <p className="text-2xl font-bold">{(totalBudget - totalUsed).toLocaleString('id-ID')}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ringkasan per Kuartal dengan Radial Chart */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Ringkasan Anggaran per GL Account</CardTitle>
              <CardDescription>Detail penggunaan anggaran per {periodType === 'quarter' ? 'kuartal' : 'bulan'} tahun {year}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Filter:</Label>
              <Select value={periodType} onValueChange={(v: 'quarter' | 'month') => {
                setPeriodType(v)
                setActiveTab(v === 'quarter' ? 'q1' : 'jan')
              }}>
                <SelectTrigger className="w-[150px]">
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
        <CardContent>
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
                  <Table>
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
                      {budgets.map((budget) => {
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
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-12 h-auto">
                <TabsTrigger value="jan" className="text-xs">Jan</TabsTrigger>
                <TabsTrigger value="feb" className="text-xs">Feb</TabsTrigger>
                <TabsTrigger value="mar" className="text-xs">Mar</TabsTrigger>
                <TabsTrigger value="apr" className="text-xs">Apr</TabsTrigger>
                <TabsTrigger value="mei" className="text-xs">Mei</TabsTrigger>
                <TabsTrigger value="jun" className="text-xs">Jun</TabsTrigger>
                <TabsTrigger value="jul" className="text-xs">Jul</TabsTrigger>
                <TabsTrigger value="agu" className="text-xs">Agu</TabsTrigger>
                <TabsTrigger value="sep" className="text-xs">Sep</TabsTrigger>
                <TabsTrigger value="okt" className="text-xs">Okt</TabsTrigger>
                <TabsTrigger value="nov" className="text-xs">Nov</TabsTrigger>
                <TabsTrigger value="des" className="text-xs">Des</TabsTrigger>
              </TabsList>
              {['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'].map((monthKey, monthIndex) => {
                const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
                return (
                  <TabsContent key={monthKey} value={monthKey}>
                    <Table>
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
                        {budgets.map((budget) => {
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
                  </TabsContent>
                )
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Monitoring Penggunaan Anggaran */}
      <Card className="border">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Monitoring Penggunaan Anggaran</CardTitle>
              <CardDescription>Tren penggunaan anggaran per bulan tahun {year}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">GL Account:</Label>
              <Select value={selectedGlAccount} onValueChange={setSelectedGlAccount}>
                <SelectTrigger className="w-[300px]">
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
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
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

      {/* Monitoring SPPD per Regional Pengguna */}
      <Card className="border">
        <CardHeader>
          <CardTitle>Monitoring SPPD HO TIF DEFA</CardTitle>
          <CardDescription>Total penggunaan SPPD berdasarkan Anggaran DEFA {year}</CardDescription>
        </CardHeader>
        <CardContent>
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
