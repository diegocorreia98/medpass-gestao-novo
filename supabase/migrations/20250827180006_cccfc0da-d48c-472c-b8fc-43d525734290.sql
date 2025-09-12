-- COMPREHENSIVE SECURITY FIX - Phase 2 (Corrected): Secure functions and audit logging

-- Create audit log table for sensitive data access
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  sensitive_fields text[],
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for audit logs - only matriz can view, all authenticated users can insert
CREATE POLICY "Matriz can view audit logs" ON public.audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND user_type = 'matriz'
  )
);

CREATE POLICY "Users can create audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  action_type text,
  table_name text,
  record_id uuid,
  fields text[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id, 
    action, 
    table_name, 
    record_id, 
    sensitive_fields
  ) VALUES (
    auth.uid(), 
    action_type, 
    table_name, 
    record_id, 
    fields
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the main operation if logging fails
    NULL;
END;
$$;

-- Create secure function to get beneficiarios with automatic data masking
CREATE OR REPLACE FUNCTION public.get_beneficiarios_secure(
  limit_count integer DEFAULT 100,
  offset_count integer DEFAULT 0
) RETURNS TABLE (
  id uuid,
  user_id uuid,
  unidade_id uuid,
  plano_id uuid,
  data_nascimento date,
  status status_ativo,
  data_adesao date,
  valor_plano numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  nome text,
  cpf text,
  email text,
  telefone text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  observacoes text,
  is_sensitive_data_masked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  current_user_type user_type;
  has_full_access boolean := false;
BEGIN
  -- Get current user type
  SELECT p.user_type INTO current_user_type
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
  
  -- Determine access level
  has_full_access := (current_user_type = 'matriz');
  
  -- Log the access attempt
  PERFORM public.log_sensitive_access(
    'SELECT_BENEFICIARIOS', 
    'beneficiarios', 
    NULL, 
    ARRAY['cpf', 'email', 'telefone', 'endereco']
  );
  
  RETURN QUERY
  SELECT 
    b.id,
    b.user_id,
    b.unidade_id,
    b.plano_id,
    b.data_nascimento,
    b.status,
    b.data_adesao,
    b.valor_plano,
    b.created_at,
    b.updated_at,
    b.nome,
    -- Conditionally decrypt/mask sensitive fields
    CASE 
      WHEN has_full_access OR public.can_access_beneficiario_data(b.user_id) THEN 
        public.decrypt_sensitive_data(b.cpf)
      ELSE 
        public.mask_cpf(public.decrypt_sensitive_data(b.cpf))
    END as cpf,
    CASE 
      WHEN has_full_access OR public.can_access_beneficiario_data(b.user_id) THEN 
        public.decrypt_sensitive_data(b.email)
      ELSE 
        public.mask_email(public.decrypt_sensitive_data(b.email))
    END as email,
    CASE 
      WHEN has_full_access OR public.can_access_beneficiario_data(b.user_id) THEN 
        public.decrypt_sensitive_data(b.telefone)
      ELSE 
        public.mask_phone(public.decrypt_sensitive_data(b.telefone))
    END as telefone,
    -- Address fields
    CASE 
      WHEN has_full_access OR public.can_access_beneficiario_data(b.user_id) THEN b.endereco
      ELSE '[DADOS PROTEGIDOS]'
    END as endereco,
    CASE 
      WHEN has_full_access OR public.can_access_beneficiario_data(b.user_id) THEN b.cidade
      ELSE '[PROTEGIDO]'
    END as cidade,
    CASE 
      WHEN has_full_access OR public.can_access_beneficiario_data(b.user_id) THEN b.estado
      ELSE '[**]'
    END as estado,
    CASE 
      WHEN has_full_access OR public.can_access_beneficiario_data(b.user_id) THEN b.cep
      ELSE '[*****-***]'
    END as cep,
    b.observacoes,
    NOT (has_full_access OR public.can_access_beneficiario_data(b.user_id)) as is_sensitive_data_masked
  FROM public.beneficiarios b
  WHERE (
    current_user_type = 'matriz' OR 
    (current_user_type = 'unidade' AND b.user_id = auth.uid())
  )
  ORDER BY b.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Create function to safely insert beneficiario with encryption
CREATE OR REPLACE FUNCTION public.insert_beneficiario_secure(
  beneficiario_data jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  new_id uuid;
  encrypted_cpf text;
  encrypted_email text;
  encrypted_telefone text;
BEGIN
  -- Validate input
  IF beneficiario_data->>'cpf' IS NULL OR beneficiario_data->>'nome' IS NULL THEN
    RAISE EXCEPTION 'CPF and nome are required';
  END IF;
  
  -- Encrypt sensitive fields
  encrypted_cpf := public.encrypt_sensitive_data(beneficiario_data->>'cpf');
  encrypted_email := CASE 
    WHEN beneficiario_data->>'email' IS NOT NULL THEN 
      public.encrypt_sensitive_data(beneficiario_data->>'email')
    ELSE NULL
  END;
  encrypted_telefone := CASE 
    WHEN beneficiario_data->>'telefone' IS NOT NULL THEN 
      public.encrypt_sensitive_data(beneficiario_data->>'telefone')
    ELSE NULL
  END;
  
  -- Insert with encrypted data
  INSERT INTO public.beneficiarios (
    user_id, unidade_id, plano_id, nome, cpf, email, telefone,
    data_nascimento, endereco, cidade, estado, cep, valor_plano, observacoes
  ) VALUES (
    auth.uid(),
    (beneficiario_data->>'unidade_id')::uuid,
    (beneficiario_data->>'plano_id')::uuid,
    beneficiario_data->>'nome',
    encrypted_cpf,
    encrypted_email,
    encrypted_telefone,
    (beneficiario_data->>'data_nascimento')::date,
    beneficiario_data->>'endereco',
    beneficiario_data->>'cidade',
    beneficiario_data->>'estado',
    beneficiario_data->>'cep',
    (beneficiario_data->>'valor_plano')::numeric,
    beneficiario_data->>'observacoes'
  ) RETURNING id INTO new_id;
  
  -- Log the creation
  PERFORM public.log_sensitive_access(
    'INSERT_BENEFICIARIO', 
    'beneficiarios', 
    new_id, 
    ARRAY['cpf', 'email', 'telefone']
  );
  
  RETURN new_id;
END;
$$;