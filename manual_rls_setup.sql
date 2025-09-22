-- ========================================
-- MANUAL RLS POLICIES SETUP
-- Execute this AFTER creating the tables
-- ========================================

-- STEP 1: ENABLE RLS ON ALL TABLES
ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

-- STEP 2: CREATE RLS POLICIES

-- ==================== CATEGORIAS ====================
-- Matriz can manage all categories
CREATE POLICY "Matriz can manage categories" ON course_categories FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- Unidades can only view active categories
CREATE POLICY "Unidades can view active categories" ON course_categories FOR SELECT
USING (
  active = true AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND user_type = 'unidade'
  )
);

-- ==================== CURSOS ====================
-- Matriz can manage all courses
CREATE POLICY "Matriz can manage all courses" ON courses FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- Unidades can only view published courses
CREATE POLICY "Unidades can view published courses" ON courses FOR SELECT
USING (
  status = 'published' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND user_type = 'unidade'
  )
);

-- ==================== MÓDULOS ====================
-- Matriz can manage all modules
CREATE POLICY "Matriz can manage all modules" ON course_modules FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- Unidades can view modules of published courses
CREATE POLICY "Unidades can view modules of published courses" ON course_modules FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses c
  INNER JOIN profiles p ON p.user_id = auth.uid()
  WHERE c.id = course_modules.course_id
  AND c.status = 'published'
  AND p.user_type = 'unidade'
));

-- ==================== AULAS ====================
-- Matriz can manage all lessons
CREATE POLICY "Matriz can manage all lessons" ON course_lessons FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- Unidades can view lessons of published courses
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
-- Matriz can manage all materials
CREATE POLICY "Matriz can manage all materials" ON lesson_materials FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- Unidades can view materials of published lessons
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
-- Users can manage their own course progress
CREATE POLICY "Users can manage their own course progress" ON course_progress FOR ALL
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND user_type = 'unidade'
  )
);

-- Matriz can view all course progress
CREATE POLICY "Matriz can view all course progress" ON course_progress FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- ==================== PROGRESSO DAS AULAS ====================
-- Users can manage their own lesson progress
CREATE POLICY "Users can manage their own lesson progress" ON lesson_progress FOR ALL
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND user_type = 'unidade'
  )
);

-- Matriz can view all lesson progress
CREATE POLICY "Matriz can view all lesson progress" ON lesson_progress FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- ==================== CERTIFICADOS ====================
-- Users can view their own certificates
CREATE POLICY "Users can view their own certificates" ON course_certificates FOR SELECT
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND user_type = 'unidade'
  )
);

-- System can create certificates for users
CREATE POLICY "System can create certificates" ON course_certificates FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND user_type = 'unidade'
  )
);

-- Matriz can view all certificates
CREATE POLICY "Matriz can view all certificates" ON course_certificates FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));

-- ==================== ANOTAÇÕES ====================
-- Users can manage their own notes
CREATE POLICY "Users can manage their own notes" ON user_notes FOR ALL
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND user_type = 'unidade'
  )
);

-- Matriz can view all notes
CREATE POLICY "Matriz can view all notes" ON user_notes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid() AND user_type = 'matriz'
));