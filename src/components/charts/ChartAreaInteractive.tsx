"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAdesoesCancelamentos } from "@/hooks/useAdesoesCancelamentos"

const chartConfig = {
  adesoes: {
    label: "Adesões",
    color: "hsl(var(--chart-2))",
  },
  cancelamentos: {
    label: "Cancelamentos",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig

interface ChartAreaInteractiveProps {
  unidadeId?: string
}

export function ChartAreaInteractive({ unidadeId }: ChartAreaInteractiveProps) {
  const [timeRange, setTimeRange] = React.useState("90d")
  const { data: chartData, isLoading, error } = useAdesoesCancelamentos(timeRange, unidadeId)

  if (isLoading) {
    return (
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[250px] bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="pt-0">
        <CardHeader>
          <CardTitle>Adesões e Cancelamentos</CardTitle>
          <CardDescription>Erro ao carregar dados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Erro ao carregar dados do gráfico
          </div>
        </CardContent>
      </Card>
    )
  }

  const filteredData = chartData || []

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Adesões e Cancelamentos</CardTitle>
          <CardDescription>
            Comparativo de adesões e cancelamentos ao longo do tempo
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Selecionar período"
          >
            <SelectValue placeholder="Últimos 3 meses" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Últimos 3 meses
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Últimos 30 dias
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Últimos 7 dias
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {filteredData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillAdesoes" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-adesoes)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-adesoes)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillCancelamentos" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-cancelamentos)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-cancelamentos)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return format(date, "dd/MM", { locale: ptBR })
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return format(new Date(value), "dd/MM/yyyy", { locale: ptBR })
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="cancelamentos"
                type="natural"
                fill="url(#fillCancelamentos)"
                stroke="var(--color-cancelamentos)"
                stackId="a"
              />
              <Area
                dataKey="adesoes"
                type="natural"
                fill="url(#fillAdesoes)"
                stroke="var(--color-adesoes)"
                stackId="a"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Nenhum dado disponível para o período selecionado
          </div>
        )}
      </CardContent>
    </Card>
  )
}