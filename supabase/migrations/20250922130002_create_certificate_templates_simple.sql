-- Sistema de Templates de Certificados - Versão Simplificada
-- Esta migração cria apenas as tabelas essenciais para o funcionamento básico

-- ==================== TEMPLATES DE CERTIFICADOS ====================
CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  template_image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  image_width INTEGER NOT NULL DEFAULT 800,
  image_height INTEGER NOT NULL DEFAULT 600,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  category VARCHAR(50) DEFAULT 'general',
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- ==================== CAMPOS DOS TEMPLATES ====================
CREATE TABLE IF NOT EXISTS template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES certificate_templates(id) ON DELETE CASCADE,
  field_key VARCHAR(100) NOT NULL,
  field_label VARCHAR(200) NOT NULL,
  field_type VARCHAR(50) NOT NULL DEFAULT 'text',
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  width INTEGER DEFAULT 200,
  height INTEGER DEFAULT 30,
  font_family VARCHAR(100) DEFAULT 'Arial',
  font_size INTEGER DEFAULT 16,
  font_weight VARCHAR(20) DEFAULT 'normal',
  font_style VARCHAR(20) DEFAULT 'normal',
  text_color VARCHAR(20) DEFAULT '#000000',
  text_align VARCHAR(20) DEFAULT 'center',
  is_required BOOLEAN DEFAULT true,
  max_length INTEGER,
  default_value TEXT,
  format_mask VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== GERAÇÕES DE CERTIFICADOS ====================
CREATE TABLE IF NOT EXISTS certificate_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES certificate_templates(id),
  user_id UUID,
  course_id UUID,
  field_values JSONB NOT NULL,
  pdf_url TEXT,
  image_url TEXT,
  certificate_number VARCHAR(50) UNIQUE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_type VARCHAR(20) DEFAULT 'individual',
  batch_id UUID,
  status VARCHAR(20) DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== ÍNDICES BÁSICOS ====================
CREATE INDEX IF NOT EXISTS idx_certificate_templates_active ON certificate_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_category ON certificate_templates(category);
CREATE INDEX IF NOT EXISTS idx_template_fields_template_id ON template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_certificate_generations_template_id ON certificate_generations(template_id);
CREATE INDEX IF NOT EXISTS idx_certificate_generations_user_id ON certificate_generations(user_id);

-- ==================== FUNÇÃO PARA GERAR NÚMERO DO CERTIFICADO ====================
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    new_number := 'CERT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                  LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    SELECT EXISTS(SELECT 1 FROM certificate_generations WHERE certificate_number = new_number)
    INTO exists_check;

    IF NOT exists_check THEN
      RETURN new_number;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==================== TRIGGER PARA AUTO-GERAR NÚMERO ====================
CREATE OR REPLACE FUNCTION set_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_number IS NULL OR NEW.certificate_number = '' THEN
    NEW.certificate_number := generate_certificate_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_certificate_number ON certificate_generations;
CREATE TRIGGER trigger_set_certificate_number
  BEFORE INSERT ON certificate_generations
  FOR EACH ROW
  EXECUTE FUNCTION set_certificate_number();

-- ==================== FUNÇÃO AUXILIAR PARA BUSCAR TEMPLATES ====================
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

-- ==================== COMENTÁRIOS ====================
COMMENT ON TABLE certificate_templates IS 'Templates de certificados customizáveis';
COMMENT ON TABLE template_fields IS 'Campos dinâmicos dos templates';
COMMENT ON TABLE certificate_generations IS 'Histórico de certificados gerados';
COMMENT ON FUNCTION get_template_with_fields IS 'Busca template com seus campos ordenados';

-- Success message
SELECT 'Sistema de templates de certificados criado com sucesso!' as result;