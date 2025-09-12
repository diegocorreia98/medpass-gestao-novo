
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { DashboardMetrics } from '@/types/database';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export const useDashboard = () => {
  const { user, profile } = useAuth();

  // Query para buscar métricas do dashboard
  const {
    data: metrics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['dashboard', 'metrics', user?.id],
    queryFn: async (): Promise<DashboardMetrics> => {
      const currentDate = new Date();
      const startMonth = startOfMonth(currentDate).toISOString().split('T')[0];
      const endMonth = endOfMonth(currentDate).toISOString().split('T')[0];

      // Buscar beneficiários
      const { data: beneficiarios, error: beneficiariosError } = await supabase
        .from('beneficiarios')
        .select('status, data_adesao');

      if (beneficiariosError) throw beneficiariosError;

      // Buscar cancelamentos do mês
      const { data: cancelamentos, error: cancelamentosError } = await supabase
        .from('cancelamentos')
        .select('id')
        .gte('data_cancelamento', startMonth)
        .lte('data_cancelamento', endMonth);

      if (cancelamentosError) throw cancelamentosError;

      // Buscar comissões
      const { data: comissoes, error: comissoesError } = await supabase
        .from('comissoes')
        .select('valor_comissao, pago');

      if (comissoesError) throw comissoesError;

      // Calcular métricas
      const totalBeneficiarios = beneficiarios?.length || 0;
      const beneficiariosAtivos = beneficiarios?.filter(b => b.status === 'ativo').length || 0;
      const cancelamentosMes = cancelamentos?.length || 0;
      
      const totalComissoes = comissoes?.length || 0;
      const valorTotalComissoes = comissoes?.reduce((acc, c) => acc + Number(c.valor_comissao), 0) || 0;
      const comissoesPendentes = comissoes?.filter(c => !c.pago).length || 0;

      return {
        totalBeneficiarios,
        totalComissoes,
        beneficiariosAtivos,
        cancelamentosMes,
        comissoesPendentes,
        valorTotalComissoes,
      };
    },
    enabled: !!user,
    // Removed auto-refresh to prevent notification spam
  });

  // Query para buscar dados do gráfico de adesões por mês por plano
  const {
    data: adesoesPorMesPorPlano,
    isLoading: isLoadingAdesoes
  } = useQuery({
    queryKey: ['dashboard', 'adesoes-mes-plano', user?.id],
    queryFn: async () => {
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 11, 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Buscar beneficiários com informações do plano
      const { data, error } = await supabase
        .from('beneficiarios')
        .select(`
          data_adesao,
          plano:planos(nome)
        `)
        .gte('data_adesao', startDate.toISOString().split('T')[0])
        .lte('data_adesao', endDate.toISOString().split('T')[0]);

      if (error) throw error;

      // Buscar todos os planos disponíveis para gerar a configuração
      const { data: planosData, error: planosError } = await supabase
        .from('planos')
        .select('nome')
        .eq('ativo', true);

      if (planosError) throw planosError;

      // Criar mapa de adesões por mês e plano
      const adesoesPorMes = new Map<string, Record<string, number>>();
      
      // Inicializar todos os meses com 0 para todos os planos
      for (let i = 0; i < 12; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const key = format(date, 'yyyy-MM');
        const planosObj: Record<string, number> = {};
        
        planosData?.forEach(plano => {
          planosObj[plano.nome] = 0;
        });
        
        adesoesPorMes.set(key, planosObj);
      }

      // Contar adesões por mês e plano
      data?.forEach(beneficiario => {
        const month = beneficiario.data_adesao.substring(0, 7); // YYYY-MM
        const planoNome = beneficiario.plano?.nome;
        
        if (planoNome && adesoesPorMes.has(month)) {
          const mesData = adesoesPorMes.get(month)!;
          mesData[planoNome] = (mesData[planoNome] || 0) + 1;
        }
      });

      // Converter para array ordenado
      const chartData = Array.from(adesoesPorMes.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, planos]) => ({
          mes,
          mesFormatado: format(new Date(mes + '-01'), 'MMM/yy'),
          ...planos
        }));

      // Mapeamento específico de cores por plano
      const planColorMap: Record<string, string> = {
        'Plano Familiar': '#FF7E15',
        'Plano Individual': '#46ECFE',
        'Plano Individual ': '#46ECFE', // Caso tenha espaço extra
      };

      // Cores de fallback para outros planos
      const fallbackColors = [
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))',
      ];

      // Gerar configuração dinâmica para o gráfico
      const chartConfig: Record<string, { label: string; color: string }> = {};

      planosData?.forEach((plano, index) => {
        const planName = plano.nome;
        chartConfig[planName] = {
          label: planName.trim(), // Remove espaços extras no label
          color: planColorMap[planName] || fallbackColors[index % fallbackColors.length]
        };
      });

      return {
        data: chartData,
        config: chartConfig,
        planos: planosData?.map(p => p.nome) || []
      };
    },
    enabled: !!user,
  });

  // Query para buscar dados do gráfico de comissões por mês por plano
  const {
    data: comissoesPorMes,
    isLoading: isLoadingComissoes
  } = useQuery({
    queryKey: ['dashboard', 'comissoes-mes-plano', user?.id],
    queryFn: async () => {
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 11, 1);

      // Buscar comissões com informações do plano
      const { data, error } = await supabase
        .from('comissoes')
        .select(`
          valor_comissao,
          mes_referencia,
          pago,
          beneficiario_id,
          beneficiarios(plano:planos(nome))
        `)
        .gte('mes_referencia', startDate.toISOString().split('T')[0]);

      if (error) throw error;

      // Buscar todos os planos disponíveis
      const { data: planosData, error: planosError } = await supabase
        .from('planos')
        .select('nome')
        .eq('ativo', true);

      if (planosError) throw planosError;

      // Criar mapa de comissões por mês e plano
      const comissoesPorMes = new Map<string, Record<string, number>>();
      
      // Inicializar todos os meses com 0 para todos os planos
      for (let i = 0; i < 12; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const key = format(date, 'yyyy-MM');
        const planosObj: Record<string, number> = {};
        
        planosData?.forEach(plano => {
          planosObj[plano.nome.trim()] = 0;
        });
        
        comissoesPorMes.set(key, planosObj);
      }

      // Somar comissões por mês e plano
      data?.forEach(comissao => {
        const month = comissao.mes_referencia.substring(0, 7); // YYYY-MM
        const planoNome = comissao.beneficiarios?.plano?.nome?.trim();
        const valor = Number(comissao.valor_comissao);
        
        if (planoNome && comissoesPorMes.has(month)) {
          const mesData = comissoesPorMes.get(month)!;
          mesData[planoNome] = (mesData[planoNome] || 0) + valor;
        }
      });

      // Converter para array ordenado
      const chartData = Array.from(comissoesPorMes.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, planos]) => ({
          mes,
          mesFormatado: format(new Date(mes + '-01'), 'MMM/yy'),
          ...planos
        }));

      // Mapeamento específico de cores por plano (mesmo usado em adesões)
      const planColorMap: Record<string, string> = {
        'Plano Familiar': '#FF7E15',
        'Plano Individual': '#46ECFE',
      };

      // Cores de fallback para outros planos
      const fallbackColors = [
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))',
      ];

      // Gerar configuração dinâmica para o gráfico
      const chartConfig: Record<string, { label: string; color: string }> = {};

      planosData?.forEach((plano, index) => {
        const planName = plano.nome.trim();
        chartConfig[planName] = {
          label: planName,
          color: planColorMap[planName] || fallbackColors[index % fallbackColors.length]
        };
      });

      return {
        data: chartData,
        config: chartConfig,
        planos: planosData?.map(p => p.nome.trim()) || []
      };
    },
    enabled: !!user,
  });

  return {
    metrics,
    adesoesPorMesPorPlano,
    comissoesPorMes,
    isLoading,
    isLoadingAdesoes,
    isLoadingComissoes,
    error,
    refetch,
  };
};
