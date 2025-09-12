-- Adicionar campos de comissão configurável na tabela planos
ALTER TABLE public.planos 
ADD COLUMN comissao_adesao_percentual NUMERIC(5,2) DEFAULT 100.00,
ADD COLUMN comissao_recorrente_percentual NUMERIC(5,2) DEFAULT 30.00;

-- Migrar dados existentes: comissao_percentual atual vira comissao_recorrente_percentual
UPDATE public.planos 
SET comissao_recorrente_percentual = comissao_percentual
WHERE comissao_recorrente_percentual = 30.00;

-- Criar enum para tipo de comissão
CREATE TYPE tipo_comissao AS ENUM ('adesao', 'recorrente');

-- Adicionar campo tipo_comissao na tabela comissoes
ALTER TABLE public.comissoes 
ADD COLUMN tipo_comissao tipo_comissao DEFAULT 'recorrente';

-- Marcar todas as comissões existentes como recorrentes
UPDATE public.comissoes SET tipo_comissao = 'recorrente' WHERE tipo_comissao IS NULL;

-- Fazer o campo obrigatório
ALTER TABLE public.comissoes ALTER COLUMN tipo_comissao SET NOT NULL;

-- Atualizar a função calcular_comissao para gerar ambos os tipos
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
$function$