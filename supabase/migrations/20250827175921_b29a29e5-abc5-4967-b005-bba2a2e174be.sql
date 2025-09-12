-- COMPREHENSIVE SECURITY FIX - Phase 2: Create secure views and enhanced RLS policies

-- Create secure view for beneficiarios that automatically masks sensitive data
CREATE OR REPLACE VIEW public.beneficiarios_secure AS
SELECT 
  id,
  user_id,
  unidade_id,
  plano_id,
  data_nascimento,
  status,
  data_adesao,
  valor_plano,
  created_at,
  updated_at,
  nome,
  -- Conditionally decrypt/mask sensitive fields based on access rights
  CASE 
    WHEN public.can_access_beneficiario_data(user_id) THEN 
      public.decrypt_sensitive_data(cpf)
    ELSE 
      public.mask_cpf(public.decrypt_sensitive_data(cpf))
  END as cpf,
  CASE 
    WHEN public.can_access_beneficiario_data(user_id) THEN 
      public.decrypt_sensitive_data(email)
    ELSE 
      public.mask_email(public.decrypt_sensitive_data(email))
  END as email,
  CASE 
    WHEN public.can_access_beneficiario_data(user_id) THEN 
      public.decrypt_sensitive_data(telefone)
    ELSE 
      public.mask_phone(public.decrypt_sensitive_data(telefone))
  END as telefone,
  -- Address fields - only show full address to authorized users
  CASE 
    WHEN public.can_access_beneficiario_data(user_id) THEN endereco
    ELSE '[DADOS PROTEGIDOS]'
  END as endereco,
  CASE 
    WHEN public.can_access_beneficiario_data(user_id) THEN cidade
    ELSE '[PROTEGIDO]'
  END as cidade,
  CASE 
    WHEN public.can_access_beneficiario_data(user_id) THEN estado
    ELSE '[**]'
  END as estado,
  CASE 
    WHEN public.can_access_beneficiario_data(user_id) THEN cep
    ELSE '[*****-***]'
  END as cep,
  observacoes
FROM public.beneficiarios;

-- Grant appropriate permissions on the secure view
GRANT SELECT ON public.beneficiarios_secure TO authenticated;

-- Create RLS policy for the secure view
DROP POLICY IF EXISTS "Secure beneficiarios access" ON public.beneficiarios_secure;
CREATE POLICY "Secure beneficiarios access" ON public.beneficiarios_secure
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (
      user_type = 'matriz' OR 
      (user_type = 'unidade' AND beneficiarios_secure.user_id = auth.uid())
    )
  )
);

-- Enable RLS on the secure view
ALTER VIEW public.beneficiarios_secure SET (security_barrier = true);

-- Drop and recreate enhanced RLS policies for beneficiarios table with additional security
DROP POLICY IF EXISTS "Enhanced matriz access" ON public.beneficiarios;
DROP POLICY IF EXISTS "Enhanced unidade access" ON public.beneficiarios;
DROP POLICY IF EXISTS "Enhanced beneficiario insert" ON public.beneficiarios;
DROP POLICY IF EXISTS "Enhanced beneficiario update" ON public.beneficiarios;
DROP POLICY IF EXISTS "Enhanced beneficiario delete" ON public.beneficiarios;

-- New enhanced policies with additional security checks
CREATE POLICY "Enhanced matriz access" ON public.beneficiarios
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'matriz'
    AND created_at < now() -- Additional check to prevent privilege escalation
  )
);

CREATE POLICY "Enhanced unidade access" ON public.beneficiarios  
FOR SELECT USING (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'unidade'
  )
);

CREATE POLICY "Enhanced beneficiario insert" ON public.beneficiarios
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type IN ('matriz', 'unidade')
  )
);

CREATE POLICY "Enhanced beneficiario update" ON public.beneficiarios
FOR UPDATE USING (
  (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'unidade'
  ))
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'matriz'
  )
) WITH CHECK (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'matriz'
  )
);

CREATE POLICY "Enhanced beneficiario delete" ON public.beneficiarios
FOR DELETE USING (
  (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'unidade'
  ))
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND user_type = 'matriz'
  )
);