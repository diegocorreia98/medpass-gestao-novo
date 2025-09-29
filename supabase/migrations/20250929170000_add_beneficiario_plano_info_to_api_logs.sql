-- Adicionar campos de beneficiário e plano aos logs de API
-- Isso permitirá rastrear melhor as operações no Histórico Completo

ALTER TABLE public.api_integrations_log
ADD COLUMN beneficiario_nome TEXT,
ADD COLUMN plano_nome TEXT,
ADD COLUMN plano_codigo_rms TEXT;

-- Adicionar comentários explicativos
COMMENT ON COLUMN public.api_integrations_log.beneficiario_nome IS 'Nome do beneficiário relacionado à operação de API';
COMMENT ON COLUMN public.api_integrations_log.plano_nome IS 'Nome do plano relacionado à operação de API';
COMMENT ON COLUMN public.api_integrations_log.plano_codigo_rms IS 'Código RMS do plano usado na operação';

-- Criar índices para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_api_logs_beneficiario_nome ON public.api_integrations_log(beneficiario_nome) WHERE beneficiario_nome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_logs_plano_nome ON public.api_integrations_log(plano_nome) WHERE plano_nome IS NOT NULL;