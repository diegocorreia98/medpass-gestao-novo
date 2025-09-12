// Secure beneficiarios service with encryption and data masking
import { supabase } from '@/integrations/supabase/client';
import type { BeneficiarioInsert, BeneficiarioUpdate } from '@/types/database';
import { logsService } from './logs';

export interface SecureBeneficiario {
  id: string;
  user_id: string;
  unidade_id?: string;
  plano_id: string;
  data_nascimento?: string;
  status: 'ativo' | 'inativo' | 'pendente' | 'pending_payment' | 'payment_confirmed' | 'rms_sent' | 'rms_failed';
  data_adesao: string;
  valor_plano: number;
  created_at: string;
  updated_at: string;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
  is_sensitive_data_masked: boolean;
}

export const beneficiariosSecureService = {
  // Get beneficiarios using secure function with automatic data masking
  async getAll(limit: number = 100, offset: number = 0): Promise<SecureBeneficiario[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_beneficiarios_secure', {
          limit_count: limit,
          offset_count: offset
        });

      if (error) {
        console.error('Erro ao buscar beneficiários seguros:', error);
        throw error;
      }

      // Log security access
      await logsService.registrarEventoSeguranca(
        'SECURE_BENEFICIARIOS_ACCESS',
        { action: 'getAll', limit, offset },
        (await supabase.auth.getUser()).data.user?.id || ''
      );

      return data || [];
    } catch (error) {
      console.error('Erro no serviço seguro de beneficiários:', error);
      throw error;
    }
  },

  // Get single beneficiario with security checks
  async getById(id: string): Promise<SecureBeneficiario | null> {
    try {
      // Use the secure function to get all beneficiarios and filter by ID
      // This ensures security policies are applied
      const allBeneficiarios = await this.getAll(1000, 0);
      const beneficiario = allBeneficiarios.find(b => b.id === id);

      if (beneficiario) {
        // Log access to specific beneficiario
        await logsService.registrarEventoSeguranca(
          'SECURE_BENEFICIARIO_VIEW',
          { 
            beneficiario_id: id, 
            is_masked: beneficiario.is_sensitive_data_masked 
          },
          (await supabase.auth.getUser()).data.user?.id || ''
        );
      }

      return beneficiario || null;
    } catch (error) {
      console.error('Erro ao buscar beneficiário por ID:', error);
      throw error;
    }
  },

  // Create beneficiario using secure function with encryption
  async create(beneficiario: BeneficiarioInsert): Promise<string> {
    try {
      // Validate CPF before encryption
      const { validateCPF } = await import('@/utils/apiSecurity');
      if (beneficiario.cpf && !validateCPF(beneficiario.cpf)) {
        throw new Error('CPF inválido');
      }

      const { data: newId, error } = await supabase
        .rpc('insert_beneficiario_secure', {
          beneficiario_data: {
            unidade_id: beneficiario.unidade_id,
            plano_id: beneficiario.plano_id,
            nome: beneficiario.nome,
            cpf: beneficiario.cpf,
            email: beneficiario.email,
            telefone: beneficiario.telefone,
            data_nascimento: beneficiario.data_nascimento,
            endereco: beneficiario.endereco,
            cidade: beneficiario.cidade,
            estado: beneficiario.estado,
            cep: beneficiario.cep,
            valor_plano: beneficiario.valor_plano,
            observacoes: beneficiario.observacoes
          }
        });

      if (error) {
        console.error('Erro ao criar beneficiário seguro:', error);
        throw error;
      }

      // Log creation with security event
      await logsService.registrarEventoSeguranca(
        'SECURE_BENEFICIARIO_CREATED',
        { 
          beneficiario_id: newId,
          encrypted_fields: ['cpf', 'email', 'telefone']
        },
        (await supabase.auth.getUser()).data.user?.id || ''
      );

      return newId;
    } catch (error) {
      console.error('Erro no serviço de criação segura:', error);
      throw error;
    }
  },

  // Update beneficiario with security logging
  async update(id: string, updates: BeneficiarioUpdate): Promise<void> {
    try {
      // Validate CPF if being updated
      if (updates.cpf) {
        const { validateCPF } = await import('@/utils/apiSecurity');
        if (!validateCPF(updates.cpf)) {
          throw new Error('CPF inválido');
        }
      }

      // Encrypt sensitive fields before update
      const encryptedUpdates: any = { ...updates };
      
      if (updates.cpf) {
        const { data, error } = await supabase
          .rpc('encrypt_sensitive_data', { input_text: updates.cpf });
        if (!error) encryptedUpdates.cpf = data;
      }
      
      if (updates.email) {
        const { data, error } = await supabase
          .rpc('encrypt_sensitive_data', { input_text: updates.email });
        if (!error) encryptedUpdates.email = data;
      }
      
      if (updates.telefone) {
        const { data, error } = await supabase
          .rpc('encrypt_sensitive_data', { input_text: updates.telefone });
        if (!error) encryptedUpdates.telefone = data;
      }

      const { error } = await supabase
        .from('beneficiarios')
        .update(encryptedUpdates)
        .eq('id', id);

      if (error) throw error;

      // Log the update with security information
      await logsService.registrarEventoSeguranca(
        'SECURE_BENEFICIARIO_UPDATED',
        { 
          beneficiario_id: id,
          updated_fields: Object.keys(updates),
          sensitive_fields_updated: [
            updates.cpf ? 'cpf' : null,
            updates.email ? 'email' : null,
            updates.telefone ? 'telefone' : null
          ].filter(Boolean)
        },
        (await supabase.auth.getUser()).data.user?.id || ''
      );

    } catch (error) {
      console.error('Erro na atualização segura:', error);
      throw error;
    }
  },

  // Delete with security logging
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('beneficiarios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log deletion for security audit
      await logsService.registrarEventoSeguranca(
        'SECURE_BENEFICIARIO_DELETED',
        { beneficiario_id: id },
        (await supabase.auth.getUser()).data.user?.id || ''
      );

    } catch (error) {
      console.error('Erro na exclusão segura:', error);
      throw error;
    }
  },

  // Check if current user can access full data (for UI purposes)
  async canAccessFullData(beneficiarioUserId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('can_access_beneficiario_data', {
          beneficiario_user_id: beneficiarioUserId
        });

      return !error && data === true;
    } catch (error) {
      console.error('Erro ao verificar acesso aos dados:', error);
      return false;
    }
  },

  // Get audit logs for matriz users
  async getAuditLogs(limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      throw error;
    }
  }
};