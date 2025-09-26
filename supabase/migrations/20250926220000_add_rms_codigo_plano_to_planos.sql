-- Adicionar campo rms_codigo_plano na tabela planos
-- Este campo armazenará o idClienteContrato específico para cada plano na RMS

ALTER TABLE public.planos
ADD COLUMN rms_codigo_plano TEXT;

-- Adicionar comentário explicativo sobre o campo
COMMENT ON COLUMN public.planos.rms_codigo_plano IS 'Código do contrato/plano na RMS (idClienteContrato) - campo obrigatório para integração com API RMS';

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_planos_rms_codigo_plano ON public.planos(rms_codigo_plano) WHERE rms_codigo_plano IS NOT NULL;