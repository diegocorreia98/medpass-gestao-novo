-- Criar tabela de notificações
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('info', 'success', 'warning', 'error')),
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  action_url TEXT,
  action_label TEXT
);

-- Enable RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver suas próprias notificações" 
ON public.notificacoes 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas próprias notificações" 
ON public.notificacoes 
FOR UPDATE 
USING (user_id = auth.uid());

-- Matriz pode inserir notificações para qualquer usuário
CREATE POLICY "Matriz pode inserir notificações" 
ON public.notificacoes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'matriz'
  )
);

-- Usuários podem inserir suas próprias notificações
CREATE POLICY "Usuários podem inserir suas próprias notificações" 
ON public.notificacoes 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Criar índices para performance
CREATE INDEX idx_notificacoes_user_id ON public.notificacoes(user_id);
CREATE INDEX idx_notificacoes_created_at ON public.notificacoes(created_at DESC);
CREATE INDEX idx_notificacoes_lida ON public.notificacoes(lida);