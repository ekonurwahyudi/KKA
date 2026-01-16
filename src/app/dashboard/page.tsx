'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Wallet, TrendingUp, TrendingDown, FileText, Clock } from 'lucide-react'

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
}

export default function DashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [glAccountsCount, setGlAccountsCount] = useState(0)

  useEffect(() => {
    fetch('/api/gl-account').then((r) => r.json()).then((data) => setGlAccountsCount(data.length))
  }, [])

  useEffect(() => {
    fetch(`/api/budget?year=${year}`).then((r) => r.json()).then(setBudgets)
    fetch(`/api/transaction?year=${year}`).then((r) => r.json()).then(setTransactions)
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

      {/* Ringkasan per Kuartal */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((q) => {
          const data = getQuarterData(q)
          const penyerapan = data.budget > 0 ? (data.used / data.budget) * 100 : 0
          return (
            <Card key={q} className="border">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-medium">Kuartal {q}</CardTitle>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    penyerapan >= 80 ? 'bg-green-100 text-green-600' : 
                    penyerapan >= 40 ? 'bg-yellow-100 text-yellow-600' : 
                    'bg-red-100 text-red-600'
                  }`}>
                    {penyerapan.toFixed(1)}%
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Anggaran (Rp)</span>
                  <span className="text-blue-600 font-medium">{data.budget.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Terpakai (Rp)</span>
                  <span className="text-red-600 font-medium">{data.used.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1">
                  <span className="font-medium">Sisa (Rp)</span>
                  <span className={`font-bold ${data.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.remaining.toLocaleString('id-ID')}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border">
        <CardHeader>
          <CardTitle>Ringkasan Anggaran per GL Account</CardTitle>
          <CardDescription>Detail penggunaan anggaran per kuartal tahun {year}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="q1">
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
        </CardContent>
      </Card>
    </div>
  )
}
