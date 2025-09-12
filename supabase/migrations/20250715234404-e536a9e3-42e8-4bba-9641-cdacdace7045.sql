-- Solução definitiva para o problema do tipo user_type
-- Primeiro, vamos remover completamente o trigger e função
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Agora vamos recriar tudo de forma mais robusta
-- Criando a função com validação explícita do schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_type_value public.user_type;
BEGIN
  -- Converter string para enum de forma explícita
  BEGIN
    user_type_value := COALESCE((NEW.raw_user_meta_data ->> 'user_type')::public.user_type, 'unidade'::public.user_type);
  EXCEPTION
    WHEN others THEN
      user_type_value := 'unidade'::public.user_type;
  END;

  INSERT INTO public.profiles (user_id, full_name, user_type)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    user_type_value
  );
  
  RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();