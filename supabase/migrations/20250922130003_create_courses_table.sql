-- Tabela de Cursos para Sistema de Certificados
-- Migração para criar a estrutura básica de cursos

-- ==================== CATEGORIAS DE CURSOS ====================
CREATE TABLE IF NOT EXISTS course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- Nome do ícone para exibição
  color VARCHAR(20) DEFAULT '#3B82F6', -- Cor hexadecimal para a categoria
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ==================== CURSOS ====================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  short_description VARCHAR(500),

  -- Categoria e classificação
  category_id UUID REFERENCES course_categories(id),

  -- Conteúdo
  thumbnail_url TEXT,
  video_intro_url TEXT,

  -- Configurações do curso
  duration_hours INTEGER, -- Duração estimada em horas
  difficulty_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
  language VARCHAR(10) DEFAULT 'pt-BR',

  -- Status e configurações
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_free BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,

  -- Certificação
  has_certificate BOOLEAN DEFAULT true,
  certificate_template_id UUID REFERENCES certificate_templates(id),
  passing_score INTEGER DEFAULT 70, -- Pontuação mínima para aprovação (%)

  -- Metadados
  tags JSONB DEFAULT '[]'::jsonb,
  requirements JSONB DEFAULT '[]'::jsonb, -- Lista de pré-requisitos
  learning_objectives JSONB DEFAULT '[]'::jsonb, -- Objetivos de aprendizagem

  -- SEO e URLs
  slug VARCHAR(200) UNIQUE,
  meta_title VARCHAR(200),
  meta_description VARCHAR(500),

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ==================== MÓDULOS DO CURSO ====================
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== AULAS/LIÇÕES ====================
CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE, -- Para facilitar queries

  title VARCHAR(200) NOT NULL,
  description TEXT,
  content TEXT, -- Conteúdo textual da aula

  -- Mídia
  video_url TEXT,
  video_duration INTEGER, -- Duração em segundos
  attachments JSONB DEFAULT '[]'::jsonb, -- Lista de arquivos anexos

  -- Configurações
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_preview BOOLEAN DEFAULT false, -- Permite visualização sem matrícula

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== INSCRIÇÕES/MATRÍCULAS ====================
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status da matrícula
  status VARCHAR(20) DEFAULT 'active', -- active, completed, dropped, suspended
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Progresso
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  current_lesson_id UUID REFERENCES course_lessons(id),

  -- Avaliação
  final_score INTEGER, -- Pontuação final (%)
  passed BOOLEAN DEFAULT false,
  certificate_issued BOOLEAN DEFAULT false,

  -- Metadados
  notes TEXT, -- Anotações do aluno ou admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint para evitar matrículas duplicadas
  CONSTRAINT unique_user_course_enrollment UNIQUE(user_id, course_id)
);

-- ==================== PROGRESSO DAS AULAS ====================
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status da aula
  status VARCHAR(20) DEFAULT 'not_started', -- not_started, in_progress, completed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Tempo gasto (em segundos)
  time_spent INTEGER DEFAULT 0,

  -- Última posição no vídeo (se aplicável)
  video_position INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint para evitar duplicatas
  CONSTRAINT unique_user_lesson_progress UNIQUE(user_id, lesson_id)
);

-- ==================== ÍNDICES ====================
-- Categorias
CREATE INDEX idx_course_categories_active ON course_categories(is_active) WHERE is_active = true;
CREATE INDEX idx_course_categories_order ON course_categories(display_order);

-- Cursos
CREATE INDEX idx_courses_active ON courses(is_active) WHERE is_active = true;
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_courses_featured ON courses(is_featured) WHERE is_featured = true;
CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_created_at ON courses(created_at DESC);

-- Módulos
CREATE INDEX idx_course_modules_course ON course_modules(course_id);
CREATE INDEX idx_course_modules_order ON course_modules(course_id, display_order);

-- Aulas
CREATE INDEX idx_course_lessons_module ON course_lessons(module_id);
CREATE INDEX idx_course_lessons_course ON course_lessons(course_id);
CREATE INDEX idx_course_lessons_order ON course_lessons(module_id, display_order);

-- Matrículas
CREATE INDEX idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_course_enrollments_status ON course_enrollments(status);
CREATE INDEX idx_course_enrollments_completed ON course_enrollments(completed_at) WHERE completed_at IS NOT NULL;

-- Progresso
CREATE INDEX idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);

-- ==================== TRIGGERS ====================
-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_course_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers nas tabelas principais
CREATE TRIGGER trigger_course_categories_updated_at
  BEFORE UPDATE ON course_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_course_updated_at();

CREATE TRIGGER trigger_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_course_updated_at();

CREATE TRIGGER trigger_course_modules_updated_at
  BEFORE UPDATE ON course_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_course_updated_at();

CREATE TRIGGER trigger_course_lessons_updated_at
  BEFORE UPDATE ON course_lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_course_updated_at();

CREATE TRIGGER trigger_course_enrollments_updated_at
  BEFORE UPDATE ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_course_updated_at();

CREATE TRIGGER trigger_lesson_progress_updated_at
  BEFORE UPDATE ON lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_course_updated_at();

-- ==================== FUNÇÃO PARA GERAR SLUG ====================
CREATE OR REPLACE FUNCTION generate_course_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Criar slug base do título
  base_slug := lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
  final_slug := base_slug;

  -- Verificar se já existe e incrementar se necessário
  WHILE EXISTS(SELECT 1 FROM courses WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter::text;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ==================== FUNÇÃO PARA ATUALIZAR PROGRESSO ====================
CREATE OR REPLACE FUNCTION update_enrollment_progress(p_enrollment_id UUID)
RETURNS VOID AS $$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
  new_progress INTEGER;
BEGIN
  -- Contar total de aulas do curso
  SELECT COUNT(cl.id) INTO total_lessons
  FROM course_enrollments ce
  JOIN courses c ON ce.course_id = c.id
  JOIN course_modules cm ON c.id = cm.course_id
  JOIN course_lessons cl ON cm.id = cl.module_id
  WHERE ce.id = p_enrollment_id AND cl.is_active = true;

  -- Contar aulas completadas
  SELECT COUNT(lp.id) INTO completed_lessons
  FROM lesson_progress lp
  JOIN course_enrollments ce ON lp.enrollment_id = ce.id
  WHERE ce.id = p_enrollment_id AND lp.status = 'completed';

  -- Calcular percentual
  IF total_lessons > 0 THEN
    new_progress := ROUND((completed_lessons::DECIMAL / total_lessons) * 100);
  ELSE
    new_progress := 0;
  END IF;

  -- Atualizar matrícula
  UPDATE course_enrollments
  SET
    progress_percentage = new_progress,
    updated_at = NOW(),
    completed_at = CASE
      WHEN new_progress = 100 AND completed_at IS NULL THEN NOW()
      WHEN new_progress < 100 THEN NULL
      ELSE completed_at
    END,
    status = CASE
      WHEN new_progress = 100 THEN 'completed'
      WHEN new_progress > 0 THEN 'active'
      ELSE status
    END
  WHERE id = p_enrollment_id;
END;
$$ LANGUAGE plpgsql;

-- ==================== TRIGGER PARA ATUALIZAR PROGRESSO AUTOMATICAMENTE ====================
CREATE OR REPLACE FUNCTION trigger_update_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar progresso quando uma aula for marcada como completa
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM update_enrollment_progress(NEW.enrollment_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lesson_progress_update
  AFTER UPDATE ON lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_progress();

-- ==================== DADOS INICIAIS ====================
-- Inserir algumas categorias padrão
INSERT INTO course_categories (name, description, icon, color) VALUES
('Cursos Gerais', 'Cursos de formação geral', 'BookOpen', '#3B82F6'),
('Treinamentos', 'Treinamentos específicos', 'Users', '#10B981'),
('Certificações', 'Cursos para certificação', 'Award', '#F59E0B')
ON CONFLICT DO NOTHING;

-- ==================== COMENTÁRIOS ====================
COMMENT ON TABLE course_categories IS 'Categorias dos cursos para organização';
COMMENT ON TABLE courses IS 'Cursos disponíveis na plataforma';
COMMENT ON TABLE course_modules IS 'Módulos que organizam as aulas de um curso';
COMMENT ON TABLE course_lessons IS 'Aulas/lições individuais dentro dos módulos';
COMMENT ON TABLE course_enrollments IS 'Matrículas dos usuários nos cursos';
COMMENT ON TABLE lesson_progress IS 'Progresso individual dos usuários nas aulas';

COMMENT ON FUNCTION generate_course_slug IS 'Gera slug único para cursos baseado no título';
COMMENT ON FUNCTION update_enrollment_progress IS 'Atualiza automaticamente o progresso de uma matrícula';

-- Success message
SELECT 'Sistema de cursos criado com sucesso!' as result;