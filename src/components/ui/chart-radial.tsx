"use client"

import {
  Cell,
  Label,
  Pie,
  PieChart,
} from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface ChartRadialProps {
  quarter: number
  percentage: number
  anggaran: number
  rra: number
  terpakai: number
  sisa: number
}

export function ChartRadial({ quarter, percentage, anggaran, rra, terpakai, sisa }: ChartRadialProps) {
  const safeRra = Math.max(rra, 0)
  const safeTerpakai = Math.max(terpakai, 0)
  const safeSisa = Math.max(sisa, 0)
  const hasData = safeRra + safeTerpakai + safeSisa > 0
  const chartData = [
    { name: "RRA", key: "rra", value: safeRra, fill: "hsl(38, 92%, 50%)" },
    { name: "Terpakai", key: "terpakai", value: safeTerpakai, fill: "hsl(0, 72%, 51%)" },
    { name: "Sisa", key: "sisa", value: safeSisa, fill: "hsl(215, 16%, 82%)" },
  ]

  // Recharts membutuhkan nilai positif untuk menggambar lingkaran kosong.
  const displayedData = hasData
    ? chartData
    : [{ name: "Belum ada anggaran", key: "kosong", value: 1, fill: "hsl(215, 16%, 82%)" }]

  const chartConfig = {
    rra: { label: "RRA", color: "hsl(38, 92%, 50%)" },
    terpakai: { label: "Terpakai", color: "hsl(0, 72%, 51%)" },
    sisa: { label: "Sisa", color: "hsl(215, 16%, 82%)" },
    kosong: { label: "Belum ada anggaran", color: "hsl(215, 16%, 82%)" },
  } satisfies ChartConfig

  return (
    <Card className="flex flex-col border">
      <CardHeader className="items-center pb-0 p-2 md:p-6 md:pb-0">
        <CardTitle className="text-xs md:text-sm font-medium">Kuartal {quarter}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-2 md:pb-4 p-2 md:p-6 pt-0 md:pt-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[200px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  nameKey="key"
                  formatter={(
                    value: number | string,
                    _name: string,
                    item: { payload: { name: string } }
                  ) => (
                    <div className="flex min-w-[150px] items-center justify-between gap-4">
                      <span className="text-muted-foreground">{item.payload.name}</span>
                      <span className="font-mono font-medium tabular-nums">
                        Rp {Number(value).toLocaleString("id-ID")}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={displayedData}
              dataKey="value"
              nameKey="key"
              startAngle={90}
              endAngle={-270}
              innerRadius="58%"
              outerRadius="88%"
              strokeWidth={2}
              paddingAngle={hasData ? 1 : 0}
            >
              {displayedData.map((item) => (
                <Cell key={item.key} fill={item.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-xl md:text-3xl font-bold"
                        >
                          {percentage.toFixed(1)}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 16}
                          className="fill-muted-foreground text-[8px] md:text-xs"
                        >
                          Outlook
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-1 md:mt-2 space-y-0.5 md:space-y-1">
          <div className="flex justify-between text-[12px] md:text-sm gap-1">
            <span className="text-muted-foreground shrink-0">Anggaran</span>
            <span className="text-blue-600 font-medium truncate">{anggaran.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-[12px] md:text-sm gap-1">
            <span className="text-muted-foreground shrink-0">RRA</span>
            <span className="text-amber-600 font-medium truncate">{rra.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-[12px] md:text-sm gap-1">
            <span className="text-muted-foreground shrink-0">Terpakai</span>
            <span className="text-red-600 font-medium truncate">{terpakai.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-[12px] md:text-sm border-t pt-0.5 md:pt-1 gap-1">
            <span className="font-medium shrink-0">Sisa</span>
            <span className={`font-bold truncate ${sisa >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {sisa.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
