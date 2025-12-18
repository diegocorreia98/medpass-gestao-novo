-- Migration: Add Autentique contract signature support
-- Criado em: 2025-01-18
-- Descrição: Adiciona colunas e índices para suportar assinatura de contratos via Autentique

-- Adicionar colunas para Autentique na tabela beneficiarios
ALTER TABLE public.beneficiarios 
ADD COLUMN IF NOT EXISTS autentique_document_id TEXT,
ADD COLUMN IF NOT EXISTS autentique_signature_link TEXT,
ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT 'not_requested',
ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS autentique_data JSONB,
ADD COLUMN IF NOT EXISTS autentique_signed_data JSONB;

-- Criar índice para busca rápida pelo document_id do Autentique
CREATE INDEX IF NOT EXISTS idx_beneficiarios_autentique_document 
ON public.beneficiarios(autentique_document_id)
WHERE autentique_document_id IS NOT NULL;

-- Criar índice para filtrar por status do contrato
CREATE INDEX IF NOT EXISTS idx_beneficiarios_contract_status 
ON public.beneficiarios(contract_status);

-- Comentários nas colunas
COMMENT ON COLUMN public.beneficiarios.autentique_document_id IS 'ID do documento criado no Autentique';
COMMENT ON COLUMN public.beneficiarios.autentique_signature_link IS 'Link para assinatura do documento';
COMMENT ON COLUMN public.beneficiarios.contract_status IS 'Status do contrato: not_requested, pending_signature, signed, refused, error';
COMMENT ON COLUMN public.beneficiarios.contract_signed_at IS 'Data/hora em que o contrato foi assinado';
COMMENT ON COLUMN public.beneficiarios.autentique_data IS 'Dados completos retornados pelo Autentique na criação';
COMMENT ON COLUMN public.beneficiarios.autentique_signed_data IS 'Dados do webhook quando o contrato foi assinado';

-- Possíveis valores para contract_status:
-- 'not_requested' - Contrato ainda não foi solicitado
-- 'pending_signature' - Aguardando assinatura do cliente
-- 'signed' - Contrato assinado com sucesso
-- 'refused' - Cliente recusou assinar o contrato
-- 'error' - Erro ao gerar ou processar contrato

