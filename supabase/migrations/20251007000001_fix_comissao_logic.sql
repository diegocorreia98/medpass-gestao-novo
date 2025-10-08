-- Corrigir lógica de cálculo de comissões
-- Nova regra: 1ª parcela = apenas comissão de adesão, 2ª parcela em diante = comissão recorrente

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

    -- Inserir comissão de adesão apenas se valor_plano > 0 (titular)
    -- A comissão de adesão é gerada no mês da data de adesão (1ª parcela)
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

      -- Inserir comissão recorrente para a 2ª parcela (mês seguinte à adesão)
      -- A comissão recorrente começa apenas a partir da 2ª parcela
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
        DATE_TRUNC('month', NEW.data_adesao) + INTERVAL '1 month', -- Mês seguinte
        'recorrente'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Comentário explicativo
COMMENT ON FUNCTION public.calcular_comissao() IS 'Calcula comissões de adesão (1ª parcela) e recorrente (2ª parcela em diante). A comissão de adesão é gerada no mês da adesão, e a recorrente começa no mês seguinte.';
