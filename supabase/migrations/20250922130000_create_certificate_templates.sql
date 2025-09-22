-- Sistema de Templates de Certificados Customizáveis
-- Migração para criar estrutura de templates e campos dinâmicos

-- ==================== TEMPLATES DE CERTIFICADOS ====================
CREATE TABLE certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  template_image_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Dimensões da imagem template
  image_width INTEGER NOT NULL DEFAULT 800,
  image_height INTEGER NOT NULL DEFAULT 600,

  -- Configurações gerais
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- Metadados
  category VARCHAR(50) DEFAULT 'general',
  tags JSONB DEFAULT '[]'::jsonb,

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ==================== CAMPOS DOS TEMPLATES ====================
CREATE TABLE template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES certificate_templates(id) ON DELETE CASCADE,

  -- Identificação do campo
  field_key VARCHAR(100) NOT NULL, -- ex: 'student_name', 'course_name', 'completion_date'
  field_label VARCHAR(200) NOT NULL, -- ex: 'Nome do Aluno', 'Nome do Curso'
  field_type VARCHAR(50) NOT NULL DEFAULT 'text', -- 'text', 'date', 'number', 'qr_code'

  -- Posicionamento
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  width INTEGER DEFAULT 200,
  height INTEGER DEFAULT 30,

  -- Estilo do texto
  font_family VARCHAR(100) DEFAULT 'Arial',
  font_size INTEGER DEFAULT 16,
  font_weight VARCHAR(20) DEFAULT 'normal', -- 'normal', 'bold', '100', '200', etc.
  font_style VARCHAR(20) DEFAULT 'normal', -- 'normal', 'italic'
  text_color VARCHAR(20) DEFAULT '#000000',
  text_align VARCHAR(20) DEFAULT 'center', -- 'left', 'center', 'right'

  -- Configurações especiais
  is_required BOOLEAN DEFAULT true,
  max_length INTEGER,
  default_value TEXT,
  format_mask VARCHAR(100), -- ex: 'DD/MM/YYYY' para datas

  -- Ordem de exibição
  display_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint para evitar campos duplicados no mesmo template
  CONSTRAINT unique_template_field_key UNIQUE(template_id, field_key)
);

-- ==================== GERAÇÕES DE CERTIFICADOS ====================
CREATE TABLE certificate_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES certificate_templates(id),
  user_id UUID REFERENCES auth.users(id),
  course_id UUID, -- Removendo referência por enquanto, pode ser adicionada depois se necessário

  -- Dados dinâmicos utilizados na geração
  field_values JSONB NOT NULL, -- Ex: {"student_name": "João Silva", "course_name": "React Avançado"}

  -- URLs dos arquivos gerados
  pdf_url TEXT,
  image_url TEXT,

  -- Metadados
  certificate_number VARCHAR(50) UNIQUE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_type VARCHAR(20) DEFAULT 'individual', -- 'individual', 'batch'
  batch_id UUID, -- Para agrupar gerações em lote

  -- Status
  status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== ÍNDICES ====================
CREATE INDEX idx_certificate_templates_active ON certificate_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_certificate_templates_default ON certificate_templates(is_default) WHERE is_default = true;
CREATE INDEX idx_certificate_templates_category ON certificate_templates(category);
CREATE INDEX idx_certificate_templates_created_by ON certificate_templates(created_by);

CREATE INDEX idx_template_fields_template_id ON template_fields(template_id);
CREATE INDEX idx_template_fields_display_order ON template_fields(template_id, display_order);
CREATE INDEX idx_template_fields_field_key ON template_fields(field_key);

CREATE INDEX idx_certificate_generations_template_id ON certificate_generations(template_id);
CREATE INDEX idx_certificate_generations_user_id ON certificate_generations(user_id);
CREATE INDEX idx_certificate_generations_course_id ON certificate_generations(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX idx_certificate_generations_batch_id ON certificate_generations(batch_id);
CREATE INDEX idx_certificate_generations_generated_at ON certificate_generations(generated_at DESC);
CREATE INDEX idx_certificate_generations_certificate_number ON certificate_generations(certificate_number);

-- ==================== RLS (Row Level Security) ====================
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies para certificate_templates
-- Matriz users podem gerenciar templates
CREATE POLICY "Matriz users can manage templates" ON certificate_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND user_type = 'matriz'
    )
  );

-- Todos podem visualizar templates ativos (para seleção na geração)
CREATE POLICY "Anyone can view active templates" ON certificate_templates
  FOR SELECT USING (is_active = true);

-- RLS Policies para template_fields
-- Matriz users podem gerenciar campos de template
CREATE POLICY "Matriz users can manage template fields" ON template_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND user_type = 'matriz'
    )
  );

-- Todos podem visualizar campos de templates ativos
CREATE POLICY "Anyone can view template fields" ON template_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM certificate_templates ct
      WHERE ct.id = template_fields.template_id AND ct.is_active = true
    )
  );

-- RLS Policies para certificate_generations
-- Users podem ver suas próprias gerações
CREATE POLICY "Users can view own generations" ON certificate_generations
  FOR SELECT USING (auth.uid() = user_id);

-- Users podem criar gerações para si mesmos
CREATE POLICY "Users can create own generations" ON certificate_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Matriz users podem ver todas as gerações
CREATE POLICY "Matriz users can view all generations" ON certificate_generations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND user_type = 'matriz'
    )
  );

-- ==================== FUNÇÕES AUXILIARES ====================

-- Função para gerar número único do certificado
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Gera número no formato: CERT-YYYYMMDD-XXXX
    new_number := 'CERT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                  LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    -- Verifica se já existe
    SELECT EXISTS(SELECT 1 FROM certificate_generations WHERE certificate_number = new_number)
    INTO exists_check;

    -- Se não existe, retorna o número
    IF NOT exists_check THEN
      RETURN new_number;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-gerar número do certificado
CREATE OR REPLACE FUNCTION set_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_number IS NULL OR NEW.certificate_number = '' THEN
    NEW.certificate_number := generate_certificate_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_certificate_number
  BEFORE INSERT ON certificate_generations
  FOR EACH ROW
  EXECUTE FUNCTION set_certificate_number();

-- Trigger para atualizar updated_at nos templates
CREATE OR REPLACE FUNCTION update_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_updated_at
  BEFORE UPDATE ON certificate_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_updated_at();

CREATE TRIGGER trigger_update_template_field_updated_at
  BEFORE UPDATE ON template_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_template_updated_at();

-- ==================== FUNÇÃO PARA BUSCAR TEMPLATES COM CAMPOS ====================
CREATE OR REPLACE FUNCTION get_template_with_fields(p_template_id UUID)
RETURNS TABLE (
  template_id UUID,
  template_name VARCHAR(200),
  template_description TEXT,
  template_image_url TEXT,
  thumbnail_url TEXT,
  image_width INTEGER,
  image_height INTEGER,
  is_active BOOLEAN,
  is_default BOOLEAN,
  category VARCHAR(50),
  tags JSONB,
  created_at TIMESTAMPTZ,
  field_id UUID,
  field_key VARCHAR(100),
  field_label VARCHAR(200),
  field_type VARCHAR(50),
  position_x INTEGER,
  position_y INTEGER,
  width INTEGER,
  height INTEGER,
  font_family VARCHAR(100),
  font_size INTEGER,
  font_weight VARCHAR(20),
  font_style VARCHAR(20),
  text_color VARCHAR(20),
  text_align VARCHAR(20),
  is_required BOOLEAN,
  max_length INTEGER,
  default_value TEXT,
  format_mask VARCHAR(100),
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.id, ct.name, ct.description, ct.template_image_url, ct.thumbnail_url,
    ct.image_width, ct.image_height, ct.is_active, ct.is_default,
    ct.category, ct.tags, ct.created_at,
    tf.id, tf.field_key, tf.field_label, tf.field_type,
    tf.position_x, tf.position_y, tf.width, tf.height,
    tf.font_family, tf.font_size, tf.font_weight, tf.font_style,
    tf.text_color, tf.text_align, tf.is_required, tf.max_length,
    tf.default_value, tf.format_mask, tf.display_order
  FROM certificate_templates ct
  LEFT JOIN template_fields tf ON ct.id = tf.template_id
  WHERE ct.id = p_template_id
  ORDER BY tf.display_order ASC, tf.field_key ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== GRANTS ====================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON certificate_templates TO authenticated;
GRANT ALL ON template_fields TO authenticated;
GRANT ALL ON certificate_generations TO authenticated;
GRANT EXECUTE ON FUNCTION generate_certificate_number TO authenticated;
GRANT EXECUTE ON FUNCTION get_template_with_fields TO authenticated;

-- ==================== COMENTÁRIOS ====================
COMMENT ON TABLE certificate_templates IS 'Templates de certificados customizáveis com imagens de fundo';
COMMENT ON TABLE template_fields IS 'Campos dinâmicos dos templates com posicionamento e estilo';
COMMENT ON TABLE certificate_generations IS 'Histórico de certificados gerados a partir dos templates';

COMMENT ON COLUMN template_fields.field_key IS 'Chave única do campo (ex: student_name, course_name)';
COMMENT ON COLUMN template_fields.position_x IS 'Posição horizontal do campo na imagem (pixels)';
COMMENT ON COLUMN template_fields.position_y IS 'Posição vertical do campo na imagem (pixels)';
COMMENT ON COLUMN template_fields.field_type IS 'Tipo do campo: text, date, number, qr_code';
COMMENT ON COLUMN certificate_generations.field_values IS 'Valores dos campos utilizados na geração (JSON)';