-- Força limpeza do cache da função de autenticação
-- Primeiro, remove completamente a função e trigger existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Aguarda para garantir que o cache seja limpo
-- Recria a função com verificação explícita dos tipos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica se o tipo user_type existe antes de usar
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    RAISE EXCEPTION 'Type user_type does not exist';
  END IF;
  
  INSERT INTO public.profiles (user_id, full_name, user_type)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'user_type')::user_type, 'unidade'::user_type)
  );
  RETURN NEW;
END;
$$;

-- Recria o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();