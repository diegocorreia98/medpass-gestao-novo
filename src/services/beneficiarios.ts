import { supabase } from '@/integrations/supabase/client';
import type { 
  BeneficiarioInsert, 
  BeneficiarioUpdate, 
  BeneficiarioCompleto,
  CancelamentoInsert
} from '@/types/database';

export const beneficiariosService = {
  // Criar beneficiário
  async create(beneficiario: BeneficiarioInsert) {
    const { data, error } = await supabase
      .from('beneficiarios')
      .insert(beneficiario)
      .select(`
        *,
        plano:planos(*),
        unidade:unidades(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Buscar todos os beneficiários
  async getAll() {
    const { data, error } = await supabase
      .from('beneficiarios')
      .select(`
        *,
        plano:planos(*),
        unidade:unidades(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Buscar beneficiário por ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('beneficiarios')
      .select(`
        *,
        plano:planos(*),
        unidade:unidades(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Buscar beneficiário por CPF
  async getByCpf(cpf: string) {
    const { data, error } = await supabase
      .from('beneficiarios')
      .select('*')
      .eq('cpf', cpf.replace(/\D/g, ''))
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  // Atualizar beneficiário
  async update(id: string, updates: BeneficiarioUpdate) {
    const { data, error } = await supabase
      .from('beneficiarios')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        plano:planos(*),
        unidade:unidades(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Deletar beneficiário
  async delete(id: string) {
    const { error } = await supabase
      .from('beneficiarios')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Cancelar beneficiário
  async cancel(beneficiarioId: string, cancelamento: Omit<CancelamentoInsert, 'beneficiario_id'>) {
    // Primeiro, inserir o registro de cancelamento
    const { error: cancelError } = await supabase
      .from('cancelamentos')
      .insert({
        beneficiario_id: beneficiarioId,
        ...cancelamento,
      });
    
    if (cancelError) throw cancelError;

    // Depois, atualizar o status do beneficiário
    const { data, error } = await supabase
      .from('beneficiarios')
      .update({ status: 'inativo' as const })
      .eq('id', beneficiarioId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Buscar beneficiários por filtros
  async getByFilters(filters: {
    status?: string;
    planoId?: string;
    dataInicio?: string;
    dataFim?: string;
    cidade?: string;
    estado?: string;
  }) {
    let query = supabase
      .from('beneficiarios')
      .select(`
        *,
        plano:planos(*),
        unidade:unidades(*)
      `);

    if (filters.status) {
      query = query.eq('status', filters.status as any);
    }
    if (filters.planoId) {
      query = query.eq('plano_id', filters.planoId);
    }
    if (filters.cidade) {
      query = query.ilike('cidade', `%${filters.cidade}%`);
    }
    if (filters.estado) {
      query = query.eq('estado', filters.estado);
    }
    if (filters.dataInicio) {
      query = query.gte('data_adesao', filters.dataInicio);
    }
    if (filters.dataFim) {
      query = query.lte('data_adesao', filters.dataFim);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  },

  // Validar CPF único
  async validateUniqueCpf(cpf: string, excludeId?: string) {
    let query = supabase
      .from('beneficiarios')
      .select('id')
      .eq('cpf', cpf.replace(/\D/g, ''));
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();
    
    if (error) throw error;
    return !data; // Retorna true se CPF é único
  },
};