-- Criar tabela para convites de usuários matriz
CREATE TABLE public.convites_matriz (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  aceito BOOLEAN NOT NULL DEFAULT false,
  user_id_aceito UUID NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.convites_matriz ENABLE ROW LEVEL SECURITY;

-- Política para usuários matriz poderem gerenciar convites
CREATE POLICY "Matriz pode gerenciar todos convites matriz" 
ON public.convites_matriz 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'matriz'
));

-- Política para aceitar convite com token válido
CREATE POLICY "Convites matriz podem ser aceitos com token válido" 
ON public.convites_matriz 
FOR UPDATE 
USING (
  (token IS NOT NULL AND expires_at > now() AND aceito = false)
  OR 
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'matriz'
  ))
);

-- Função para buscar convite por token
CREATE OR REPLACE FUNCTION public.get_convite_matriz_by_token(invitation_token text)
RETURNS TABLE(
  id uuid,
  email text,
  expires_at timestamp with time zone,
  aceito boolean,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.email,
    c.expires_at,
    c.aceito,
    c.created_at
  FROM public.convites_matriz c
  WHERE c.token = invitation_token
    AND c.expires_at > NOW()
    AND c.aceito = false;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_convites_matriz_updated_at
  BEFORE UPDATE ON public.convites_matriz
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();