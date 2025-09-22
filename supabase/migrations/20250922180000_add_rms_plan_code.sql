-- Adicionar campo para código do plano RMS na tabela planos
-- Esta coluna permite vincular os planos internos com os códigos correspondentes na API RMS

ALTER TABLE public.planos
ADD COLUMN rms_plan_code VARCHAR(50);

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN public.planos.rms_plan_code IS 'Código do plano correspondente na API RMS para integração de adesões';

-- Criar índice para melhorar performance de consultas por código RMS
CREATE INDEX IF NOT EXISTS idx_planos_rms_plan_code ON public.planos(rms_plan_code) WHERE rms_plan_code IS NOT NULL;

-- Success message
SELECT 'Campo rms_plan_code adicionado à tabela planos com sucesso!' as result;