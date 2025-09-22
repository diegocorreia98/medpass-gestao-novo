-- ========================================
-- MANUAL COURSE SYSTEM SCHEMA SETUP
-- Execute this in Supabase Dashboard SQL Editor
-- ========================================

-- STEP 1: CREATE ALL TABLES
-- ==================== CATEGORIAS ====================
CREATE TABLE course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== CURSOS ====================
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  category_id UUID REFERENCES course_categories(id),
  instructor_name VARCHAR(100),
  instructor_bio TEXT,
  level VARCHAR(20) CHECK (level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  duration_hours INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN DEFAULT false,
  certificate_enabled BOOLEAN DEFAULT true,
  target_audience TEXT,
  active BOOLEAN DEFAULT true,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ==================== MÓDULOS ====================
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  duration_minutes INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_course_module_order UNIQUE(course_id, order_index)
);

-- ==================== AULAS ====================
CREATE TABLE course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  content_type VARCHAR(20) CHECK (content_type IN ('video', 'text', 'pdf', 'audio', 'quiz')) DEFAULT 'video',
  content_url TEXT,
  content_html TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_module_lesson_order UNIQUE(module_id, order_index)
);

-- ==================== MATERIAIS ====================
CREATE TABLE lesson_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== PROGRESSO CURSOS ====================
CREATE TABLE course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  progress_percentage INTEGER DEFAULT 0,
  last_lesson_id UUID REFERENCES course_lessons(id),
  total_watch_time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_course_progress UNIQUE(user_id, course_id)
);

-- ==================== PROGRESSO AULAS ====================
CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  watch_time_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  last_position_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_lesson_progress UNIQUE(user_id, lesson_id)
);

-- ==================== CERTIFICADOS ====================
CREATE TABLE course_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  certificate_number VARCHAR(50) UNIQUE NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  certificate_url TEXT,
  verification_code VARCHAR(20) UNIQUE DEFAULT substring(md5(random()::text), 1, 10),
  CONSTRAINT unique_user_course_certificate UNIQUE(user_id, course_id)
);

-- ==================== ANOTAÇÕES ====================
CREATE TABLE user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: CREATE INDEXES
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_courses_featured ON courses(featured);
CREATE INDEX idx_courses_active ON courses(active);
CREATE INDEX idx_course_progress_user ON course_progress(user_id);
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);

-- STEP 3: CREATE TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_course_categories_updated_at BEFORE UPDATE ON course_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_modules_updated_at BEFORE UPDATE ON course_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_lessons_updated_at BEFORE UPDATE ON course_lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_progress_updated_at BEFORE UPDATE ON course_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_notes_updated_at BEFORE UPDATE ON user_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- STEP 4: INSERT INITIAL DATA
INSERT INTO course_categories (name, description, slug, icon, color) VALUES
('Vendas', 'Técnicas e estratégias de vendas', 'vendas', 'TrendingUp', '#3B82F6'),
('Atendimento', 'Qualidade no atendimento ao cliente', 'atendimento', 'Users', '#10B981'),
('Gestão', 'Administração e gestão de unidades', 'gestao', 'Building2', '#8B5CF6'),
('Compliance', 'Normas e regulamentações', 'compliance', 'Shield', '#F59E0B'),
('Tecnologia', 'Uso de sistemas e ferramentas', 'tecnologia', 'Monitor', '#EF4444'),
('Desenvolvimento Pessoal', 'Soft skills e crescimento profissional', 'desenvolvimento', 'User', '#06B6D4');

-- STEP 5: CREATE SAMPLE COURSE (if users exist)
DO $$
DECLARE
    tech_category_id UUID;
    sample_user_id UUID;
BEGIN
    -- Get technology category ID
    SELECT id INTO tech_category_id FROM course_categories WHERE slug = 'tecnologia';

    -- Get first user ID (fallback)
    SELECT id INTO sample_user_id FROM auth.users LIMIT 1;

    -- Only insert if we have a user
    IF sample_user_id IS NOT NULL THEN
        INSERT INTO courses (title, description, category_id, instructor_name, instructor_bio, level, duration_hours, status, featured, target_audience, created_by)
        VALUES (
            'Introdução ao Sistema MedPass',
            'Aprenda a utilizar todas as funcionalidades do sistema MedPass para maximizar seus resultados.',
            tech_category_id,
            'Equipe MedPass',
            'Especialistas em gestão de saúde e tecnologia.',
            'beginner',
            2,
            'published',
            true,
            'Todos os usuários',
            sample_user_id
        );
    END IF;
END $$;