import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, TrendingUp, Target } from "lucide-react"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, Area, AreaChart } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useDashboard } from "@/hooks/useDashboard"
import { useUnidades } from "@/hooks/useUnidades"
import { useBeneficiarios } from "@/hooks/useBeneficiarios"
import BrazilMap from "@/components/maps/BrazilMap"
import { useMapData } from "@/hooks/useMapData"

export default function Dashboard() {
  const { metrics, adesoesPorMesPorPlano, comissoesPorMes, isLoading } = useDashboard()
  const { unidades } = useUnidades()
  const { beneficiarios } = useBeneficiarios()
  const { stateData, isLoading: mapLoading } = useMapData()

  // Últimas unidades cadastradas
  const latestUnidades = unidades
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)
    .map(unidade => ({
      id: unidade.id,
      name: unidade.nome,
      registeredAt: unidade.created_at.split('T')[0],
      responsavel: unidade.responsavel || 'Não informado'
    }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Visão geral do sistema</p>
      </div>

      {/* Cards de Estatísticas */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-2/3 mt-2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Beneficiários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{metrics?.totalBeneficiarios || 0}</div>
              <p className="text-xs text-muted-foreground">Beneficiários cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Beneficiários Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics?.beneficiariosAtivos || 0}</div>
              <p className="text-xs text-muted-foreground">Ativos no sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unidades</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{unidades.length}</div>
              <p className="text-xs text-muted-foreground">Unidades cadastradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Comissões</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {(metrics?.totalComissoes || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Valor total de comissões</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras Empilhadas - Adesões por mês por plano */}
        <Card>
          <CardHeader>
            <CardTitle>Adesões por Mês por Plano</CardTitle>
            <CardDescription>Distribuição de adesões por plano nos últimos meses</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {adesoesPorMesPorPlano && adesoesPorMesPorPlano.data.length > 0 ? (
              <ChartContainer config={adesoesPorMesPorPlano.config} className="h-[350px]">
                <BarChart 
                  accessibilityLayer 
                  data={adesoesPorMesPorPlano.data}
                  margin={{ top: 20, left: 12, right: 12, bottom: 8 }}
                >
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis
                    dataKey="mesFormatado"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <ChartLegend content={<ChartLegendContent />} />
                   {adesoesPorMesPorPlano.planos.map((plano, index) => (
                     <Bar
                       key={plano}
                       dataKey={plano}
                       stackId="a"
                       fill={adesoesPorMesPorPlano.config[plano]?.color}
                       radius={index === 0 ? [0, 0, 4, 4] : index === adesoesPorMesPorPlano.planos.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                     />
                   ))}
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mapa do Brasil - Distribuição por Estado */}
        <BrazilMap data={stateData} isLoading={mapLoading} />

        {/* Gráfico de Área - Comissões por mês por plano */}
        <Card>
          <CardHeader>
            <CardTitle>Comissões por Mês por Plano</CardTitle>
            <CardDescription>Evolução das comissões separadas por plano nos últimos meses</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {comissoesPorMes && comissoesPorMes.data.length > 0 ? (
              <ChartContainer config={comissoesPorMes.config} className="h-[350px]">
                <AreaChart 
                  accessibilityLayer 
                  data={comissoesPorMes.data}
                  margin={{ top: 20, left: 12, right: 12, bottom: 8 }}
                >
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis
                    dataKey="mesFormatado"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ChartTooltip 
                    cursor={false} 
                    content={<ChartTooltipContent 
                      formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, '']} 
                    />} 
                  />
                  <defs>
                    {comissoesPorMes.planos.map((plano) => (
                      <linearGradient key={`fill${plano}`} id={`fill${plano.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={comissoesPorMes.config[plano]?.color}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={comissoesPorMes.config[plano]?.color}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  {comissoesPorMes.planos.map((plano, index) => (
                    <Area
                      key={plano}
                      dataKey={plano}
                      type="natural"
                      fill={`url(#fill${plano.replace(/\s+/g, '')})`}
                      fillOpacity={0.4}
                      stroke={comissoesPorMes.config[plano]?.color}
                      stackId="a"
                    />
                  ))}
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gauge - Meta de unidades */}
        <Card>
          <CardHeader>
            <CardTitle>Meta de Unidades Cadastradas</CardTitle>
            <CardDescription>Progresso da meta mensal</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-[326px]">
              <div className="relative w-40 h-40">
                {(() => {
                  const meta = 10
                  const atual = unidades.length
                  const percentual = Math.min((atual / meta) * 100, 100)
                  
                  return (
                    <>
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="hsl(var(--muted))"
                          strokeWidth="8"
                          fill="none"
                          opacity="0.2"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#60D5FE"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${percentual * 2.51} ${(100 - percentual) * 2.51}`}
                          strokeLinecap="round"
                          style={{ filter: 'drop-shadow(0 0 8px rgba(96, 213, 254, 0.4))' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold" style={{ color: '#60D5FE' }}>{Math.round(percentual)}%</div>
                          <div className="text-sm text-muted-foreground">{atual}/{meta}</div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Repetir cards de estatísticas na parte inferior */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Cadastradas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">8</div>
            <p className="text-xs text-muted-foreground">Empresas registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funcionários Cadastrados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">4</div>
            <p className="text-xs text-muted-foreground">Funcionários registrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Últimas unidades cadastradas */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Unidades Cadastradas</CardTitle>
          <CardDescription>Unidades registradas recentemente no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {latestUnidades.length > 0 ? (
              latestUnidades.map((unidade) => (
                <div key={unidade.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Building2 className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{unidade.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Responsável: {unidade.responsavel} • Cadastrada em {new Date(unidade.registeredAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma unidade cadastrada ainda
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
