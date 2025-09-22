-- =====================================================
-- APLICAR POLÍTICAS RLS DO SISTEMA DE CURSOS
-- Execute este SQL APÓS executar o apply_course_schema.sql
-- =====================================================

-- ==================== HABILITAR RLS ====================
ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

-- ==================== REMOVER POLÍTICAS EXISTENTES ====================
-- Remove políticas se já existirem para evitar conflitos
DROP POLICY IF EXISTS "Matriz can manage categories" ON course_categories;
DROP POLICY IF EXISTS "Unidades can view active categories" ON course_categories;
DROP POLICY IF EXISTS "Matriz can manage all courses" ON courses;
DROP POLICY IF EXISTS "Unidades can view published courses" ON courses;
DROP POLICY IF EXISTS "Matriz can manage all modules" ON course_modules;
DROP POLICY IF EXISTS "Unidades can view modules of published courses" ON course_modules;
DROP POLICY IF EXISTS "Matriz can manage all lessons" ON course_lessons;
DROP POLICY IF EXISTS "Unidades can view lessons of published courses" ON course_lessons;
DROP POLICY IF EXISTS "Matriz can manage all materials" ON lesson_materials;
DROP POLICY IF EXISTS "Unidades can view materials of published lessons" ON lesson_materials;
DROP POLICY IF EXISTS "Users can manage their own course progress" ON course_progress;
DROP POLICY IF EXISTS "Matriz can view all course progress" ON course_progress;
DROP POLICY IF EXISTS "Users can manage their own lesson progress" ON lesson_progress;
DROP POLICY IF EXISTS "Matriz can view all lesson progress" ON lesson_progress;
DROP POLICY IF EXISTS "Users can view their own certificates" ON course_certificates;
DROP POLICY IF EXISTS "System can create certificates" ON course_certificates;
DROP POLICY IF EXISTS "Matriz can view all certificates" ON course_certificates;
DROP POLICY IF EXISTS "Users can manage their own notes" ON user_notes;
DROP POLICY IF EXISTS "Matriz can view all notes" ON user_notes;

-- ==================== CATEGORIAS ====================
-- Matriz pode gerenciar todas as categorias
CREATE POLICY "Matriz can manage categories" ON course_categories FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- Unidades podem apenas visualizar categorias ativas
CREATE POLICY "Unidades can view active categories" ON course_categories FOR SELECT
USING (
  active = true AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND user_type = 'unidade'
  )
);

-- ==================== CURSOS ====================
-- Matriz pode gerenciar todos os cursos
CREATE POLICY "Matriz can manage all courses" ON courses FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- Unidades podem ver apenas cursos publicados
CREATE POLICY "Unidades can view published courses" ON courses FOR SELECT
USING (
  status = 'published' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND user_type = 'unidade'
  )
);

-- ==================== MÓDULOS ====================
-- Matriz pode gerenciar todos os módulos
CREATE POLICY "Matriz can manage all modules" ON course_modules FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- Unidades podem ver módulos de cursos publicados
CREATE POLICY "Unidades can view modules of published courses" ON course_modules FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses c
  INNER JOIN profiles p ON p.user_id = auth.uid()
  WHERE c.id = course_modules.course_id
  AND c.status = 'published'
  AND p.user_type = 'unidade'
));

-- ==================== AULAS ====================
-- Matriz pode gerenciar todas as aulas
CREATE POLICY "Matriz can manage all lessons" ON course_lessons FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- Unidades podem ver aulas de cursos publicados
CREATE POLICY "Unidades can view lessons of published courses" ON course_lessons FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses c
  INNER JOIN course_modules m ON m.course_id = c.id
  INNER JOIN profiles p ON p.user_id = auth.uid()
  WHERE m.id = course_lessons.module_id
  AND c.status = 'published'
  AND p.user_type = 'unidade'
));

-- ==================== MATERIAIS ====================
-- Matriz pode gerenciar todos os materiais
CREATE POLICY "Matriz can manage all materials" ON lesson_materials FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- Unidades podem ver materiais de aulas de cursos publicados
CREATE POLICY "Unidades can view materials of published lessons" ON lesson_materials FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses c
  INNER JOIN course_modules m ON m.course_id = c.id
  INNER JOIN course_lessons l ON l.module_id = m.id
  INNER JOIN profiles p ON p.user_id = auth.uid()
  WHERE l.id = lesson_materials.lesson_id
  AND c.status = 'published'
  AND p.user_type = 'unidade'
));

-- ==================== PROGRESSO DOS CURSOS ====================
-- Usuários podem gerenciar apenas seu próprio progresso
CREATE POLICY "Users can manage their own course progress" ON course_progress FOR ALL
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND user_type = 'unidade'
  )
);

-- Matriz pode ver progresso de todos os usuários
CREATE POLICY "Matriz can view all course progress" ON course_progress FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- ==================== PROGRESSO DAS AULAS ====================
-- Usuários podem gerenciar apenas seu próprio progresso
CREATE POLICY "Users can manage their own lesson progress" ON lesson_progress FOR ALL
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND user_type = 'unidade'
  )
);

-- Matriz pode ver progresso de todos os usuários
CREATE POLICY "Matriz can view all lesson progress" ON lesson_progress FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- ==================== CERTIFICADOS ====================
-- Usuários podem ver apenas seus próprios certificados
CREATE POLICY "Users can view their own certificates" ON course_certificates FOR SELECT
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND user_type = 'unidade'
  )
);

-- Sistema pode criar certificados para usuários
CREATE POLICY "System can create certificates" ON course_certificates FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND user_type = 'unidade'
  )
);

-- Matriz pode ver todos os certificados
CREATE POLICY "Matriz can view all certificates" ON course_certificates FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- ==================== ANOTAÇÕES ====================
-- Usuários podem gerenciar apenas suas próprias anotações
CREATE POLICY "Users can manage their own notes" ON user_notes FOR ALL
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND user_type = 'unidade'
  )
);

-- Matriz pode ver anotações de todos os usuários
CREATE POLICY "Matriz can view all notes" ON user_notes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- ==================== VERIFICAÇÃO ====================
-- Verificar se todas as políticas foram criadas
SELECT
    'RLS aplicado com sucesso!' as status,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename LIKE '%course%' OR tablename IN ('user_notes', 'lesson_materials');