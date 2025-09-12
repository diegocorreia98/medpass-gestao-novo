-- Fase 1: Correções Críticas de Segurança

-- 1. Corrigir função calcular_comissao() com search_path seguro
CREATE OR REPLACE FUNCTION public.calcular_comissao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_unidade_id UUID;
  v_percentual DECIMAL(5,2);
BEGIN
  -- Buscar a unidade do beneficiário
  SELECT u.id INTO v_unidade_id
  FROM public.unidades u
  WHERE u.user_id = NEW.user_id;
  
  -- Buscar o percentual de comissão do plano
  SELECT p.comissao_percentual INTO v_percentual
  FROM public.planos p
  WHERE p.id = NEW.plano_id;
  
  -- Inserir comissão se unidade existir
  IF v_unidade_id IS NOT NULL AND v_percentual IS NOT NULL THEN
    INSERT INTO public.comissoes (
      beneficiario_id,
      unidade_id,
      user_id,
      valor_comissao,
      percentual,
      mes_referencia
    ) VALUES (
      NEW.id,
      v_unidade_id,
      NEW.user_id,
      NEW.valor_plano * (v_percentual / 100),
      v_percentual,
      DATE_TRUNC('month', NEW.data_adesao)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Corrigir função handle_new_user() com search_path seguro
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;