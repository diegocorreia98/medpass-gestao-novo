-- =====================================================
-- APLICAR SCHEMA DO SISTEMA DE CURSOS
-- Execute este SQL no Dashboard do Supabase
-- =====================================================

-- ==================== VERIFICAR SE JÁ EXISTEM ====================
-- Primeiro, vamos verificar se as tabelas já existem para evitar erros
DO $$
BEGIN
    -- Verificar se a tabela course_categories já existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'course_categories') THEN

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

        RAISE NOTICE 'Tabela course_categories criada';
    ELSE
        RAISE NOTICE 'Tabela course_categories já existe';
    END IF;
END $$;

-- ==================== CURSOS ====================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'courses') THEN
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

        RAISE NOTICE 'Tabela courses criada';
    ELSE
        RAISE NOTICE 'Tabela courses já existe';

        -- Verificar se as colunas active e tags existem, se não, adicionar
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'active') THEN
            ALTER TABLE courses ADD COLUMN active BOOLEAN DEFAULT true;
            RAISE NOTICE 'Coluna active adicionada à tabela courses';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'tags') THEN
            ALTER TABLE courses ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
            RAISE NOTICE 'Coluna tags adicionada à tabela courses';
        END IF;
    END IF;
END $$;

-- ==================== MÓDULOS ====================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'course_modules') THEN
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

        RAISE NOTICE 'Tabela course_modules criada';
    ELSE
        RAISE NOTICE 'Tabela course_modules já existe';

        -- Verificar se a coluna active existe
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'course_modules' AND column_name = 'active') THEN
            ALTER TABLE course_modules ADD COLUMN active BOOLEAN DEFAULT true;
            RAISE NOTICE 'Coluna active adicionada à tabela course_modules';
        END IF;
    END IF;
END $$;

-- ==================== AULAS ====================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'course_lessons') THEN
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

        RAISE NOTICE 'Tabela course_lessons criada';
    ELSE
        RAISE NOTICE 'Tabela course_lessons já existe';

        -- Verificar se a coluna active existe
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'course_lessons' AND column_name = 'active') THEN
            ALTER TABLE course_lessons ADD COLUMN active BOOLEAN DEFAULT true;
            RAISE NOTICE 'Coluna active adicionada à tabela course_lessons';
        END IF;
    END IF;
END $$;

-- ==================== DEMAIS TABELAS ====================
-- Materiais
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lesson_materials') THEN
        CREATE TABLE lesson_materials (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
          title VARCHAR(200) NOT NULL,
          file_url TEXT NOT NULL,
          file_type VARCHAR(50),
          file_size BIGINT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela lesson_materials criada';
    END IF;
END $$;

-- Progresso dos cursos
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'course_progress') THEN
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
        RAISE NOTICE 'Tabela course_progress criada';
    END IF;
END $$;

-- Progresso das aulas
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lesson_progress') THEN
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
        RAISE NOTICE 'Tabela lesson_progress criada';
    END IF;
END $$;

-- Certificados
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'course_certificates') THEN
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
        RAISE NOTICE 'Tabela course_certificates criada';
    END IF;
END $$;

-- Anotações
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_notes') THEN
        CREATE TABLE user_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          timestamp_seconds INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela user_notes criada';
    END IF;
END $$;

-- ==================== ÍNDICES ====================
-- Criar índices se não existirem
DO $$
BEGIN
    -- Índices para courses
    IF NOT EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_courses_status' AND n.nspname = 'public') THEN
        CREATE INDEX idx_courses_status ON courses(status);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_courses_category' AND n.nspname = 'public') THEN
        CREATE INDEX idx_courses_category ON courses(category_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_courses_featured' AND n.nspname = 'public') THEN
        CREATE INDEX idx_courses_featured ON courses(featured);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_courses_active' AND n.nspname = 'public') THEN
        CREATE INDEX idx_courses_active ON courses(active);
    END IF;

    -- Índices para progresso
    IF NOT EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_course_progress_user' AND n.nspname = 'public') THEN
        CREATE INDEX idx_course_progress_user ON course_progress(user_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_lesson_progress_user' AND n.nspname = 'public') THEN
        CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_lesson_progress_lesson' AND n.nspname = 'public') THEN
        CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
    END IF;

    RAISE NOTICE 'Índices criados ou já existiam';
END $$;

-- ==================== TRIGGERS ====================
-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_course_categories_updated_at') THEN
        CREATE TRIGGER update_course_categories_updated_at BEFORE UPDATE ON course_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_courses_updated_at') THEN
        CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_course_modules_updated_at') THEN
        CREATE TRIGGER update_course_modules_updated_at BEFORE UPDATE ON course_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_course_lessons_updated_at') THEN
        CREATE TRIGGER update_course_lessons_updated_at BEFORE UPDATE ON course_lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_course_progress_updated_at') THEN
        CREATE TRIGGER update_course_progress_updated_at BEFORE UPDATE ON course_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_lesson_progress_updated_at') THEN
        CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_user_notes_updated_at') THEN
        CREATE TRIGGER update_user_notes_updated_at BEFORE UPDATE ON user_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    RAISE NOTICE 'Triggers criados ou já existiam';
END $$;

-- ==================== DADOS INICIAIS ====================
-- Inserir categorias padrão se não existirem
INSERT INTO course_categories (name, description, slug, icon, color)
SELECT 'Vendas', 'Técnicas e estratégias de vendas', 'vendas', 'TrendingUp', '#3B82F6'
WHERE NOT EXISTS (SELECT 1 FROM course_categories WHERE slug = 'vendas');

INSERT INTO course_categories (name, description, slug, icon, color)
SELECT 'Atendimento', 'Qualidade no atendimento ao cliente', 'atendimento', 'Users', '#10B981'
WHERE NOT EXISTS (SELECT 1 FROM course_categories WHERE slug = 'atendimento');

INSERT INTO course_categories (name, description, slug, icon, color)
SELECT 'Gestão', 'Administração e gestão de unidades', 'gestao', 'Building2', '#8B5CF6'
WHERE NOT EXISTS (SELECT 1 FROM course_categories WHERE slug = 'gestao');

INSERT INTO course_categories (name, description, slug, icon, color)
SELECT 'Compliance', 'Normas e regulamentações', 'compliance', 'Shield', '#F59E0B'
WHERE NOT EXISTS (SELECT 1 FROM course_categories WHERE slug = 'compliance');

INSERT INTO course_categories (name, description, slug, icon, color)
SELECT 'Tecnologia', 'Uso de sistemas e ferramentas', 'tecnologia', 'Monitor', '#EF4444'
WHERE NOT EXISTS (SELECT 1 FROM course_categories WHERE slug = 'tecnologia');

INSERT INTO course_categories (name, description, slug, icon, color)
SELECT 'Desenvolvimento Pessoal', 'Soft skills e crescimento profissional', 'desenvolvimento', 'User', '#06B6D4'
WHERE NOT EXISTS (SELECT 1 FROM course_categories WHERE slug = 'desenvolvimento');

-- Verificar resultado
SELECT 'Schema aplicado com sucesso!' as status, COUNT(*) as categorias_criadas FROM course_categories;