-- Adicionar URL da API de Consulta de Beneficiários RMS
-- Baseado na documentação: RMSAPI-CONSULTA-BENEFICIARIOS-V3.md

-- Inserir a URL do endpoint de consulta de beneficiários
-- Ambiente de Homologação (ajustar para produção quando disponível)
INSERT INTO api_settings (setting_name, setting_value, updated_by)
SELECT
  'EXTERNAL_API_CONSULTA_BENEFICIARIOS_URL',
  'https://ddt8urmaeb.execute-api.us-east-1.amazonaws.com/hml-v1/rms1/beneficiarios',
  id
FROM profiles
WHERE user_type = 'matriz'
LIMIT 1
ON CONFLICT (setting_name)
DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();
