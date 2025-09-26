export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      api_integrations_log: {
        Row: {
          beneficiario_id: string | null
          created_at: string
          error_message: string | null
          id: string
          operation: string
          request_data: Json | null
          response_data: Json | null
          retry_count: number | null
          status: string
        }
        Insert: {
          beneficiario_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          operation: string
          request_data?: Json | null
          response_data?: Json | null
          retry_count?: number | null
          status?: string
        }
        Update: {
          beneficiario_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          operation?: string
          request_data?: Json | null
          response_data?: Json | null
          retry_count?: number | null
          status?: string
        }
        Relationships: []
      }
      api_settings: {
        Row: {
          created_at: string
          id: string
          masked_value: string | null
          setting_name: string
          setting_value: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          masked_value?: string | null
          setting_name: string
          setting_value: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          id?: string
          masked_value?: string | null
          setting_name?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          record_id: string | null
          sensitive_fields: string[] | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          sensitive_fields?: string[] | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          sensitive_fields?: string[] | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      beneficiarios: {
        Row: {
          cep: string | null
          checkout_link: string | null
          cidade: string | null
          cpf: string
          created_at: string
          data_adesao: string
          data_nascimento: string | null
          email: string | null
          empresa_id: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          payment_status: string | null
          plano_id: string
          status: Database["public"]["Enums"]["status_ativo"]
          telefone: string | null
          unidade_id: string | null
          updated_at: string
          user_id: string
          valor_plano: number
        }
        Insert: {
          cep?: string | null
          checkout_link?: string | null
          cidade?: string | null
          cpf: string
          created_at?: string
          data_adesao?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          payment_status?: string | null
          plano_id: string
          status?: Database["public"]["Enums"]["status_ativo"]
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string
          user_id: string
          valor_plano: number
        }
        Update: {
          cep?: string | null
          checkout_link?: string | null
          cidade?: string | null
          cpf?: string
          created_at?: string
          data_adesao?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          payment_status?: string | null
          plano_id?: string
          status?: Database["public"]["Enums"]["status_ativo"]
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string
          user_id?: string
          valor_plano?: number
        }
        Relationships: [
          {
            foreignKeyName: "beneficiarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiarios_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiarios_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      cancelamentos: {
        Row: {
          beneficiario_id: string
          created_at: string
          data_cancelamento: string
          id: string
          motivo: string
          observacoes: string | null
          user_id: string
        }
        Insert: {
          beneficiario_id: string
          created_at?: string
          data_cancelamento?: string
          id?: string
          motivo: string
          observacoes?: string | null
          user_id: string
        }
        Update: {
          beneficiario_id?: string
          created_at?: string
          data_cancelamento?: string
          id?: string
          motivo?: string
          observacoes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancelamentos_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores_empresa: {
        Row: {
          cargo: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          email: string | null
          empresa_id: string
          id: string
          nome: string
          observacoes: string | null
          status: Database["public"]["Enums"]["status_ativo"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          nome: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_ativo"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_ativo"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes: {
        Row: {
          beneficiario_id: string
          created_at: string
          data_pagamento: string | null
          id: string
          mes_referencia: string
          pago: boolean
          percentual: number
          tipo_comissao: Database["public"]["Enums"]["tipo_comissao"]
          unidade_id: string
          updated_at: string
          user_id: string
          valor_comissao: number
        }
        Insert: {
          beneficiario_id: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes_referencia: string
          pago?: boolean
          percentual: number
          tipo_comissao?: Database["public"]["Enums"]["tipo_comissao"]
          unidade_id: string
          updated_at?: string
          user_id: string
          valor_comissao: number
        }
        Update: {
          beneficiario_id?: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes_referencia?: string
          pago?: boolean
          percentual?: number
          tipo_comissao?: Database["public"]["Enums"]["tipo_comissao"]
          unidade_id?: string
          updated_at?: string
          user_id?: string
          valor_comissao?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      convites_franqueados: {
        Row: {
          aceito: boolean
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          unidade_id: string
          updated_at: string
          user_id_aceito: string | null
        }
        Insert: {
          aceito?: boolean
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          token: string
          unidade_id: string
          updated_at?: string
          user_id_aceito?: string | null
        }
        Update: {
          aceito?: boolean
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          unidade_id?: string
          updated_at?: string
          user_id_aceito?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convites_franqueados_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      convites_matriz: {
        Row: {
          aceito: boolean
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          token: string
          updated_at: string
          user_id_aceito: string | null
        }
        Insert: {
          aceito?: boolean
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          id?: string
          token: string
          updated_at?: string
          user_id_aceito?: string | null
        }
        Update: {
          aceito?: boolean
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          updated_at?: string
          user_id_aceito?: string | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string
          status: Database["public"]["Enums"]["status_ativo"]
          telefone: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social: string
          status?: Database["public"]["Enums"]["status_ativo"]
          telefone?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string
          status?: Database["public"]["Enums"]["status_ativo"]
          telefone?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      franquias: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      logs_atividades: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          ip_address: unknown | null
          registro_id: string | null
          tabela: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: unknown | null
          registro_id?: string | null
          tabela?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: unknown | null
          registro_id?: string | null
          tabela?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      orcamentos: {
        Row: {
          cliente_documento: string
          cliente_email: string | null
          cliente_endereco: string | null
          cliente_nome: string
          cliente_telefone: string | null
          comissao_percentual: number
          comissao_valor: number
          created_at: string
          empresa_id: string | null
          id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["status_orcamento"]
          subtotal: number
          tipo_cliente: string
          total: number
          unidade_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_documento: string
          cliente_email?: string | null
          cliente_endereco?: string | null
          cliente_nome: string
          cliente_telefone?: string | null
          comissao_percentual?: number
          comissao_valor?: number
          created_at?: string
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_orcamento"]
          subtotal?: number
          tipo_cliente?: string
          total?: number
          unidade_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_documento?: string
          cliente_email?: string | null
          cliente_endereco?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          comissao_percentual?: number
          comissao_valor?: number
          created_at?: string
          empresa_id?: string | null
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_orcamento"]
          subtotal?: number
          tipo_cliente?: string
          total?: number
          unidade_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos_itens: {
        Row: {
          created_at: string
          id: string
          orcamento_id: string
          plano_id: string
          plano_nome: string
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          id?: string
          orcamento_id: string
          plano_id: string
          plano_nome: string
          quantidade?: number
          valor_total: number
          valor_unitario: number
        }
        Update: {
          created_at?: string
          id?: string
          orcamento_id?: string
          plano_id?: string
          plano_nome?: string
          quantidade?: number
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_itens_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_adesoes: {
        Row: {
          cep: string | null
          checkout_link: string | null
          cidade: string | null
          cpf: string
          created_at: string
          data_nascimento: string | null
          email: string | null
          empresa_id: string | null
          endereco: string | null
          estado: string | null
          id: string
          last_rms_attempt_at: string | null
          last_rms_error: string | null
          nome: string
          observacoes: string | null
          plano_id: string
          rms_retry_count: number | null
          status: string
          telefone: string | null
          unidade_id: string | null
          updated_at: string
          user_id: string
          valor_plano: number
          vindi_customer_id: number | null
          vindi_subscription_id: number | null
        }
        Insert: {
          cep?: string | null
          checkout_link?: string | null
          cidade?: string | null
          cpf: string
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          last_rms_attempt_at?: string | null
          last_rms_error?: string | null
          nome: string
          observacoes?: string | null
          plano_id: string
          rms_retry_count?: number | null
          status?: string
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string
          user_id: string
          valor_plano: number
          vindi_customer_id?: number | null
          vindi_subscription_id?: number | null
        }
        Update: {
          cep?: string | null
          checkout_link?: string | null
          cidade?: string | null
          cpf?: string
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          last_rms_attempt_at?: string | null
          last_rms_error?: string | null
          nome?: string
          observacoes?: string | null
          plano_id?: string
          rms_retry_count?: number | null
          status?: string
          telefone?: string | null
          unidade_id?: string | null
          updated_at?: string
          user_id?: string
          valor_plano?: number
          vindi_customer_id?: number | null
          vindi_subscription_id?: number | null
        }
        Relationships: []
      }
      planos: {
        Row: {
          ativo: boolean
          comissao_adesao_percentual: number | null
          comissao_percentual: number
          comissao_recorrente_percentual: number | null
          created_at: string
          custo: number
          descricao: string | null
          franquia_id: string | null
          id: string
          nome: string
          updated_at: string
          valor: number
          vindi_plan_id: number | null
          vindi_product_id: string | null
        }
        Insert: {
          ativo?: boolean
          comissao_adesao_percentual?: number | null
          comissao_percentual?: number
          comissao_recorrente_percentual?: number | null
          created_at?: string
          custo?: number
          descricao?: string | null
          franquia_id?: string | null
          id?: string
          nome: string
          updated_at?: string
          valor: number
          vindi_plan_id?: number | null
          vindi_product_id?: string | null
        }
        Update: {
          ativo?: boolean
          comissao_adesao_percentual?: number | null
          comissao_percentual?: number
          comissao_recorrente_percentual?: number | null
          created_at?: string
          custo?: number
          descricao?: string | null
          franquia_id?: string | null
          id?: string
          nome?: string
          updated_at?: string
          valor?: number
          vindi_plan_id?: number | null
          vindi_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planos_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      responsaveis_empresa: {
        Row: {
          cargo: string | null
          created_at: string
          email: string | null
          empresa_id: string
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          tipo_responsabilidade: string
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          tipo_responsabilidade: string
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          tipo_responsabilidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsaveis_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_access_logs: {
        Row: {
          access_type: string
          accessed_by: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          subscription_id: string | null
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_by?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          subscription_id?: string | null
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_by?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          subscription_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_access_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_checkout_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          subscription_id: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          subscription_id: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          subscription_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_checkout_links_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycles: number | null
          checkout_link: string | null
          created_at: string
          customer_document: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          id: string
          installments: number | null
          metadata: Json | null
          next_billing_at: string | null
          payment_method: string
          plan_id: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string | null
          vindi_plan_id: number | null
          vindi_subscription_id: number | null
        }
        Insert: {
          billing_cycles?: number | null
          checkout_link?: string | null
          created_at?: string
          customer_document: string
          customer_email: string
          customer_id?: string | null
          customer_name: string
          id?: string
          installments?: number | null
          metadata?: Json | null
          next_billing_at?: string | null
          payment_method: string
          plan_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vindi_plan_id?: number | null
          vindi_subscription_id?: number | null
        }
        Update: {
          billing_cycles?: number | null
          checkout_link?: string | null
          created_at?: string
          customer_document?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          installments?: number | null
          metadata?: Json | null
          next_billing_at?: string | null
          payment_method?: string
          plan_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vindi_plan_id?: number | null
          vindi_subscription_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "vindi_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          beneficiario_id: string | null
          created_at: string
          customer_document: string
          customer_email: string
          customer_name: string
          id: string
          installments: number | null
          payment_method: string
          plan_id: string
          plan_name: string
          plan_price: number
          status: string
          subscription_id: string | null
          transaction_type: string | null
          updated_at: string
          user_id: string | null
          vindi_charge_id: string | null
          vindi_response: Json | null
          vindi_subscription_id: number | null
        }
        Insert: {
          beneficiario_id?: string | null
          created_at?: string
          customer_document: string
          customer_email: string
          customer_name: string
          id?: string
          installments?: number | null
          payment_method: string
          plan_id: string
          plan_name: string
          plan_price: number
          status?: string
          subscription_id?: string | null
          transaction_type?: string | null
          updated_at?: string
          user_id?: string | null
          vindi_charge_id?: string | null
          vindi_response?: Json | null
          vindi_subscription_id?: number | null
        }
        Update: {
          beneficiario_id?: string | null
          created_at?: string
          customer_document?: string
          customer_email?: string
          customer_name?: string
          id?: string
          installments?: number | null
          payment_method?: string
          plan_id?: string
          plan_name?: string
          plan_price?: number
          status?: string
          subscription_id?: string | null
          transaction_type?: string | null
          updated_at?: string
          user_id?: string | null
          vindi_charge_id?: string | null
          vindi_response?: Json | null
          vindi_subscription_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "beneficiarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          franquia_id: string | null
          id: string
          nome: string
          responsavel: string | null
          status: Database["public"]["Enums"]["status_ativo"]
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          franquia_id?: string | null
          id?: string
          nome: string
          responsavel?: string | null
          status?: Database["public"]["Enums"]["status_ativo"]
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          franquia_id?: string | null
          id?: string
          nome?: string
          responsavel?: string | null
          status?: Database["public"]["Enums"]["status_ativo"]
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unidades_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          language: string
          marketing_emails: boolean
          push_notifications: boolean
          session_timeout: number
          sms_notifications: boolean
          theme: string
          timezone: string
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          language?: string
          marketing_emails?: boolean
          push_notifications?: boolean
          session_timeout?: number
          sms_notifications?: boolean
          theme?: string
          timezone?: string
          two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          language?: string
          marketing_emails?: boolean
          push_notifications?: boolean
          session_timeout?: number
          sms_notifications?: boolean
          theme?: string
          timezone?: string
          two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vindi_customers: {
        Row: {
          created_at: string
          customer_document: string
          customer_email: string
          id: string
          updated_at: string
          user_id: string | null
          vindi_customer_id: number
        }
        Insert: {
          created_at?: string
          customer_document: string
          customer_email: string
          id?: string
          updated_at?: string
          user_id?: string | null
          vindi_customer_id: number
        }
        Update: {
          created_at?: string
          customer_document?: string
          customer_email?: string
          id?: string
          updated_at?: string
          user_id?: string | null
          vindi_customer_id?: number
        }
        Relationships: []
      }
      vindi_webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_data: Json
          event_id: string
          event_type: string
          id: string
          processed: boolean
          processed_at: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_data: Json
          event_id: string
          event_type: string
          id?: string
          processed?: boolean
          processed_at?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_data?: Json
          event_id?: string
          event_type?: string
          id?: string
          processed?: boolean
          processed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_beneficiario_data: {
        Args: { beneficiario_user_id: string }
        Returns: boolean
      }
      cleanup_expired_checkout_links: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      decrypt_sensitive_data: {
        Args: { encrypted_text: string }
        Returns: string
      }
      encrypt_sensitive_data: {
        Args: { input_text: string }
        Returns: string
      }
      get_beneficiarios_secure: {
        Args: { limit_count?: number; offset_count?: number }
        Returns: {
          cep: string
          cidade: string
          cpf: string
          created_at: string
          data_adesao: string
          data_nascimento: string
          email: string
          endereco: string
          estado: string
          id: string
          is_sensitive_data_masked: boolean
          nome: string
          observacoes: string
          plano_id: string
          status: Database["public"]["Enums"]["status_ativo"]
          telefone: string
          unidade_id: string
          updated_at: string
          user_id: string
          valor_plano: number
        }[]
      }
      get_checkout_subscription: {
        Args: { checkout_token: string }
        Returns: {
          customer_email_masked: string
          customer_name_masked: string
          id: string
          payment_method: string
          plan_name: string
          plan_price: number
          status: string
          vindi_customer_id: number
          vindi_plan_id: number
          vindi_product_id: string
        }[]
      }
      get_convite_by_token: {
        Args: { invitation_token: string }
        Returns: {
          aceito: boolean
          created_at: string
          email: string
          expires_at: string
          id: string
          unidade_id: string
        }[]
      }
      get_convite_matriz_by_token: {
        Args: { invitation_token: string }
        Returns: {
          aceito: boolean
          created_at: string
          email: string
          expires_at: string
          id: string
        }[]
      }
      get_or_create_user_settings: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email_notifications: boolean
          id: string
          language: string
          marketing_emails: boolean
          push_notifications: boolean
          session_timeout: number
          sms_notifications: boolean
          theme: string
          timezone: string
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
        }[]
      }
      insert_beneficiario_secure: {
        Args: { beneficiario_data: Json }
        Returns: string
      }
      log_sensitive_access: {
        Args: {
          action_type: string
          fields: string[]
          record_id: string
          table_name: string
        }
        Returns: undefined
      }
      mask_cpf: {
        Args: { cpf_input: string }
        Returns: string
      }
      mask_email: {
        Args: { email_input: string }
        Returns: string
      }
      mask_phone: {
        Args: { phone_input: string }
        Returns: string
      }
    }
    Enums: {
      status_ativo:
        | "ativo"
        | "inativo"
        | "pendente"
        | "pending_payment"
        | "payment_confirmed"
        | "rms_sent"
        | "rms_failed"
      status_orcamento: "pendente" | "aprovado" | "rejeitado" | "convertido"
      tipo_comissao: "adesao" | "recorrente"
      user_type: "matriz" | "unidade"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      status_ativo: [
        "ativo",
        "inativo",
        "pendente",
        "pending_payment",
        "payment_confirmed",
        "rms_sent",
        "rms_failed",
      ],
      status_orcamento: ["pendente", "aprovado", "rejeitado", "convertido"],
      tipo_comissao: ["adesao", "recorrente"],
      user_type: ["matriz", "unidade"],
    },
  },
} as const
