-- Migration SEGURA: Add Autentique contract signature support
-- Esta migration verifica se as colunas existem antes de adicionar

-- Adicionar colunas para Autentique (usando DO block para verificar existência)
DO $$ 
BEGIN
    -- autentique_document_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'beneficiarios' 
        AND column_name = 'autentique_document_id'
    ) THEN
        ALTER TABLE beneficiarios ADD COLUMN autentique_document_id TEXT;
    END IF;

    -- autentique_signature_link
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'beneficiarios' 
        AND column_name = 'autentique_signature_link'
    ) THEN
        ALTER TABLE beneficiarios ADD COLUMN autentique_signature_link TEXT;
    END IF;

    -- contract_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'beneficiarios' 
        AND column_name = 'contract_status'
    ) THEN
        ALTER TABLE beneficiarios ADD COLUMN contract_status TEXT DEFAULT 'not_requested';
    END IF;

    -- contract_signed_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'beneficiarios' 
        AND column_name = 'contract_signed_at'
    ) THEN
        ALTER TABLE beneficiarios ADD COLUMN contract_signed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- autentique_data
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'beneficiarios' 
        AND column_name = 'autentique_data'
    ) THEN
        ALTER TABLE beneficiarios ADD COLUMN autentique_data JSONB;
    END IF;

    -- autentique_signed_data
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'beneficiarios' 
        AND column_name = 'autentique_signed_data'
    ) THEN
        ALTER TABLE beneficiarios ADD COLUMN autentique_signed_data JSONB;
    END IF;
END $$;

-- Criar índices (IF NOT EXISTS disponível a partir do PostgreSQL 9.5)
CREATE INDEX IF NOT EXISTS idx_beneficiarios_autentique_document 
ON beneficiarios(autentique_document_id)
WHERE autentique_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_beneficiarios_contract_status 
ON beneficiarios(contract_status);

-- Adicionar comentários nas colunas
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'beneficiarios' 
        AND column_name = 'autentique_document_id'
    ) THEN
        COMMENT ON COLUMN beneficiarios.autentique_document_id IS 'ID do documento criado no Autentique';
        COMMENT ON COLUMN beneficiarios.autentique_signature_link IS 'Link para assinatura do documento';
        COMMENT ON COLUMN beneficiarios.contract_status IS 'Status do contrato: not_requested, pending_signature, signed, refused, error';
        COMMENT ON COLUMN beneficiarios.contract_signed_at IS 'Data/hora em que o contrato foi assinado';
        COMMENT ON COLUMN beneficiarios.autentique_data IS 'Dados completos retornados pelo Autentique na criação';
        COMMENT ON COLUMN beneficiarios.autentique_signed_data IS 'Dados do webhook quando o contrato foi assinado';
    END IF;
END $$;

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Migration do Autentique aplicada com sucesso!';
END $$;

