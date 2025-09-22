 Plano: Sistema de Múltiplos Usuários por Unidade                                              │
     │                                                                                               │
     │ Análise do Sistema Atual                                                                      │
     │                                                                                               │
     │ - Limitação identificada: Tabela unidades tem um campo user_id único, permitindo apenas 1     │
     │ usuário por unidade                                                                           │
     │ - Estrutura atual: Relacionamento 1:1 entre auth.users e unidades                             │
     │ - Campo user_id: Já foi alterado para nullable, permitindo unidades sem usuário               │
     │                                                                                               │
     │ Solução Proposta                                                                              │
     │                                                                                               │
     │ 1. Nova Tabela de Relacionamento (unidade_usuarios)                                           │
     │                                                                                               │
     │ CREATE TABLE public.unidade_usuarios (                                                        │
     │   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,                                              │
     │   unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,                  │
     │   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,                          │
     │   role VARCHAR(50) NOT NULL DEFAULT 'funcionario', -- 'admin', 'funcionario', 'visualizador'  │
     │   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),                                          │
     │   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),                                          │
     │   UNIQUE(unidade_id, user_id) -- Previne duplicatas                                           │
     │ );                                                                                            │
     │                                                                                               │
     │ 2. Migração de Dados Existentes                                                               │
     │                                                                                               │
     │ - Migrar relacionamentos existentes da tabela unidades.user_id para unidade_usuarios          │
     │ - Manter unidades.user_id temporariamente para compatibilidade                                │
     │ - Marcar usuários migrados como role 'admin'                                                  │
     │                                                                                               │
     │ 3. Hooks e Serviços Atualizados                                                               │
     │                                                                                               │
     │ useUnidadeUsuarios.ts (Novo)                                                                  │
     │                                                                                               │
     │ - addUserToUnidade(unidadeId, userId, role)                                                   │
     │ - removeUserFromUnidade(unidadeId, userId)                                                    │
     │ - updateUserRole(unidadeId, userId, newRole)                                                  │
     │ - getUsersByUnidade(unidadeId)                                                                │
     │ - getUnidadesByUser(userId)                                                                   │
     │                                                                                               │
     │ Atualização useUnidades.ts                                                                    │
     │                                                                                               │
     │ - Modificar consultas para incluir múltiplos usuários                                         │
     │ - Atualizar políticas RLS para considerar nova tabela                                         │
     │                                                                                               │
     │ 4. Componentes de Interface                                                                   │
     │                                                                                               │
     │ UnidadeUsersManager.tsx (Novo)                                                                │
     │                                                                                               │
     │ - Lista de usuários da unidade                                                                │
     │ - Formulário para adicionar usuários                                                          │
     │ - Seletor de roles/permissões                                                                 │
     │ - Ações de remoção e edição                                                                   │
     │                                                                                               │
     │ UserUnidadeSelector.tsx (Novo)                                                                │
     │                                                                                               │
     │ - Busca de usuários por email                                                                 │
     │ - Seleção de role ao adicionar                                                                │
     │ - Validação de duplicatas                                                                     │
     │                                                                                               │
     │ 5. Políticas RLS                                                                              │
     │                                                                                               │
     │ -- Usuários podem ver unidades onde têm acesso                                                │
     │ CREATE POLICY "Users can view their assigned unidades" ON public.unidade_usuarios             │
     │   FOR SELECT USING (auth.uid() = user_id);                                                    │
     │                                                                                               │
     │ -- Admins da unidade podem gerenciar usuários                                                 │
     │ CREATE POLICY "Unidade admins can manage users" ON public.unidade_usuarios                    │
     │   FOR ALL USING (                                                                             │
     │     EXISTS (                                                                                  │
     │       SELECT 1 FROM public.unidade_usuarios uu                                                │
     │       WHERE uu.unidade_id = unidade_usuarios.unidade_id                                       │
     │       AND uu.user_id = auth.uid()                                                             │
     │       AND uu.role = 'admin'                                                                   │
     │     )                                                                                         │
     │   );                                                                                          │
     │                                                                                               │
     │ 6. Funcionalidades do Sistema                                                                 │
     │                                                                                               │
     │ Permissões por Role                                                                           │
     │                                                                                               │
     │ - admin: Gerenciar usuários, editar unidade, ver todos dados                                  │
     │ - funcionario: Ver e editar beneficiários, gerar relatórios                                   │
     │ - visualizador: Apenas leitura                                                                │
     │                                                                                               │
     │ Interface de Gerenciamento                                                                    │
     │                                                                                               │
     │ - Tela dedicada para gestão de usuários da unidade                                            │
     │ - Convites por email para novos usuários                                                      │
     │ - Sistema de notificações para alterações de acesso                                           │
     │                                                                                               │
     │ 7. Migração Gradual                                                                           │
     │                                                                                               │
     │ 1. Fase 1: Criar nova estrutura mantendo compatibilidade                                      │
     │ 2. Fase 2: Migrar dados existentes                                                            │
     │ 3. Fase 3: Atualizar interfaces para usar novo sistema                                        │
     │ 4. Fase 4: Remover dependências do user_id antigo                                             │
     │                                                                                               │
     │ Benefícios                                                                                    │
     │                                                                                               │
     │ - ✅ Múltiplos usuários por unidade                                                            │
     │ - ✅ Sistema de permissões granular                                                            │
     │ - ✅ Escalabilidade para equipes maiores                                                       │
     │ - ✅ Manutenção da compatibilidade durante migração                                            │
     │ - ✅ Auditoria e controle de acesso aprimorados                                                │
     │                                                                                               │
     │ Arquivos a serem criados/modificados                                                          │
     │                                                                                               │
     │ - Nova migração SQL: Criar tabela unidade_usuarios                                            │
     │ - Hook: src/hooks/useUnidadeUsuarios.ts                                                       │
     │ - Componentes: src/components/unidades/UnidadeUsersManager.tsx                                │
     │ - Tipos: Atualizar src/integrations/supabase/types.ts                                         │
     │ - Políticas RLS: Novas políticas de segurança                                                 │
     │ - Atualização: src/hooks/useUnidades.ts e queries relacionadas