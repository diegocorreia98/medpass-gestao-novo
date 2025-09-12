import { supabase } from '@/integrations/supabase/client';
import type { LogAtividadeInsert } from '@/types/database';

export const logsService = {
  // Registrar atividade com melhor segurança
  async registrar(atividade: Omit<LogAtividadeInsert, 'created_at'>) {
    try {
      // Obter informações do cliente de forma segura
      const userAgent = navigator.userAgent.substring(0, 500); // Limitar tamanho
      const ipAddress = await this.getClientIP();
      
      const { error } = await supabase
        .from('logs_atividades')
        .insert({
          ...atividade,
          user_agent: userAgent,
          ip_address: ipAddress,
        });
      
      if (error) {
        console.error('Erro ao registrar log:', error);
        // Não fazer throw para não quebrar a funcionalidade principal
      }
    } catch (error) {
      console.error('Erro crítico no serviço de logs:', error);
    }
  },

  // Obter IP do cliente de forma segura
  async getClientIP(): Promise<string | null> {
    try {
      const response = await fetch('https://api.ipify.org?format=json', {
        method: 'GET',
        timeout: 3000
      } as RequestInit);
      
      if (response.ok) {
        const data = await response.json();
        return data.ip || null;
      }
    } catch {
      // IP não é crítico, continuar sem ele
    }
    return null;
  },

  // Registrar eventos de segurança específicos
  async registrarEventoSeguranca(evento: string, detalhes: any, userId: string) {
    await this.registrar({
      user_id: userId,
      acao: 'SECURITY_EVENT',
      dados_novos: {
        evento,
        detalhes,
        timestamp: new Date().toISOString()
      },
    });
  },

  // Registrar tentativas de login falharam
  async registrarTentativaLoginFalha(email: string, ip?: string) {
    await this.registrar({
      user_id: '00000000-0000-0000-0000-000000000000', // ID genérico para eventos sem usuário
      acao: 'LOGIN_FAILED',
      dados_novos: {
        email,
        ip,
        timestamp: new Date().toISOString()
      },
    });
  },

  // Registrar criação
  async registrarCriacao(tabela: string, registroId: string, dados: any, userId: string) {
    await this.registrar({
      user_id: userId,
      acao: 'CREATE',
      tabela,
      registro_id: registroId,
      dados_novos: dados,
    });
  },

  // Registrar atualização
  async registrarAtualizacao(tabela: string, registroId: string, dadosAnteriores: any, dadosNovos: any, userId: string) {
    await this.registrar({
      user_id: userId,
      acao: 'UPDATE',
      tabela,
      registro_id: registroId,
      dados_anteriores: dadosAnteriores,
      dados_novos: dadosNovos,
    });
  },

  // Registrar exclusão
  async registrarExclusao(tabela: string, registroId: string, dados: any, userId: string) {
    await this.registrar({
      user_id: userId,
      acao: 'DELETE',
      tabela,
      registro_id: registroId,
      dados_anteriores: dados,
    });
  },

  // Registrar ação customizada
  async registrarAcao(acao: string, userId: string, detalhes?: any) {
    await this.registrar({
      user_id: userId,
      acao,
      dados_novos: detalhes,
    });
  },

  // Buscar logs do usuário
  async getLogs(limit: number = 50) {
    const { data, error } = await supabase
      .from('logs_atividades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  // Buscar logs por tabela
  async getLogsByTabela(tabela: string, registroId?: string) {
    let query = supabase
      .from('logs_atividades')
      .select('*')
      .eq('tabela', tabela);
    
    if (registroId) {
      query = query.eq('registro_id', registroId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  },
};