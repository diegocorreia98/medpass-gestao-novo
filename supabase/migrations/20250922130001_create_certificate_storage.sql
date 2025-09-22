-- Criar bucket para armazenar templates de certificados
-- Esta migração cria o bucket e configura as políticas de acesso

-- ==================== CRIAR BUCKET ====================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificate-templates',
  'certificate-templates',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
);

-- ==================== POLÍTICAS DE STORAGE ====================

-- Política para permitir que usuários matriz façam upload
CREATE POLICY "Matriz users can upload certificate templates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'certificate-templates' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND user_type = 'matriz'
    )
  );

-- Política para permitir que todos vejam os templates (são públicos mesmo)
CREATE POLICY "Anyone can view certificate templates" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificate-templates');

-- Política para permitir que usuários matriz atualizem templates
CREATE POLICY "Matriz users can update certificate templates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'certificate-templates' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND user_type = 'matriz'
    )
  );

-- Política para permitir que usuários matriz excluam templates
CREATE POLICY "Matriz users can delete certificate templates" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'certificate-templates' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND user_type = 'matriz'
    )
  );

-- ==================== BUCKET PARA CERTIFICADOS GERADOS ====================

-- Bucket para armazenar certificados gerados
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-certificates',
  'generated-certificates',
  false, -- Certificados não são públicos por padrão
  20971520, -- 20MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']::text[]
);

-- Política para permitir que usuários vejam seus próprios certificados
CREATE POLICY "Users can view own certificates" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'generated-certificates' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política para permitir que usuários façam upload de seus certificados
CREATE POLICY "Users can upload own certificates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'generated-certificates' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política para permitir que usuários matriz vejam todos os certificados
CREATE POLICY "Matriz users can view all certificates" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'generated-certificates' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND user_type = 'matriz'
    )
  );

-- ==================== COMENTÁRIOS ====================
COMMENT ON POLICY "Matriz users can upload certificate templates" ON storage.objects
IS 'Permite que usuários matriz façam upload de templates de certificados';

COMMENT ON POLICY "Anyone can view certificate templates" ON storage.objects
IS 'Permite que qualquer usuário visualize templates (necessário para geração de certificados)';

COMMENT ON POLICY "Users can view own certificates" ON storage.objects
IS 'Permite que usuários visualizem apenas seus próprios certificados gerados';

COMMENT ON POLICY "Matriz users can view all certificates" ON storage.objects
IS 'Permite que usuários matriz visualizem todos os certificados gerados no sistema';