-- Fix database function security by setting explicit search_path

-- Update handle_new_user function with explicit search_path
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

-- Update calcular_comissao function with explicit search_path (already has it, but ensuring consistency)
CREATE OR REPLACE FUNCTION public.calcular_comissao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_unidade_id UUID;
  v_percentual_adesao DECIMAL(5,2);
  v_percentual_recorrente DECIMAL(5,2);
BEGIN
  -- Buscar a unidade do beneficiário
  SELECT u.id INTO v_unidade_id
  FROM public.unidades u
  WHERE u.user_id = NEW.user_id;
  
  -- Buscar os percentuais de comissão do plano
  SELECT p.comissao_adesao_percentual, p.comissao_recorrente_percentual 
  INTO v_percentual_adesao, v_percentual_recorrente
  FROM public.planos p
  WHERE p.id = NEW.plano_id;
  
  -- Inserir comissões se unidade existir e percentuais estiverem definidos
  IF v_unidade_id IS NOT NULL AND v_percentual_adesao IS NOT NULL AND v_percentual_recorrente IS NOT NULL THEN
    
    -- Inserir comissão de adesão (apenas se valor_plano > 0, ou seja, se for titular)
    IF NEW.valor_plano > 0 THEN
      INSERT INTO public.comissoes (
        beneficiario_id,
        unidade_id,
        user_id,
        valor_comissao,
        percentual,
        mes_referencia,
        tipo_comissao
      ) VALUES (
        NEW.id,
        v_unidade_id,
        NEW.user_id,
        NEW.valor_plano * (v_percentual_adesao / 100),
        v_percentual_adesao,
        DATE_TRUNC('month', NEW.data_adesao),
        'adesao'
      );
      
      -- Inserir comissão recorrente
      INSERT INTO public.comissoes (
        beneficiario_id,
        unidade_id,
        user_id,
        valor_comissao,
        percentual,
        mes_referencia,
        tipo_comissao
      ) VALUES (
        NEW.id,
        v_unidade_id,
        NEW.user_id,
        NEW.valor_plano * (v_percentual_recorrente / 100),
        v_percentual_recorrente,
        DATE_TRUNC('month', NEW.data_adesao),
        'recorrente'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;