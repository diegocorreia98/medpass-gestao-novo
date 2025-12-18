-- Migration AUTOMÁTICA: Descobre o schema e aplica as colunas do Autentique
-- Este script descobre automaticamente em qual schema está a tabela beneficiarios

DO $$ 
DECLARE
    v_schema TEXT;
    v_table_full TEXT;
BEGIN
    -- Descobrir qual schema contém a tabela beneficiarios
    SELECT table_schema 
    INTO v_schema
    FROM information_schema.tables
    WHERE table_name = 'beneficiarios'
    LIMIT 1;

    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Tabela beneficiarios não encontrada em nenhum schema!';
    END IF;

    RAISE NOTICE 'Tabela encontrada no schema: %', v_schema;
    
    v_table_full := v_schema || '.beneficiarios';

    -- autentique_document_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = v_schema
        AND table_name = 'beneficiarios' 
        AND column_name = 'autentique_document_id'
    ) THEN
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN autentique_document_id TEXT', v_schema, 'beneficiarios');
        RAISE NOTICE '✅ Coluna autentique_document_id adicionada';
    ELSE
        RAISE NOTICE '⏭️  Coluna autentique_document_id já existe';
    END IF;

    -- autentique_signature_link
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = v_schema
        AND table_name = 'beneficiarios' 
        AND column_name = 'autentique_signature_link'
    ) THEN
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN autentique_signature_link TEXT', v_schema, 'beneficiarios');
        RAISE NOTICE '✅ Coluna autentique_signature_link adicionada';
    ELSE
        RAISE NOTICE '⏭️  Coluna autentique_signature_link já existe';
    END IF;

    -- contract_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = v_schema
        AND table_name = 'beneficiarios' 
        AND column_name = 'contract_status'
    ) THEN
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN contract_status TEXT DEFAULT %L', v_schema, 'beneficiarios', 'not_requested');
        RAISE NOTICE '✅ Coluna contract_status adicionada';
    ELSE
        RAISE NOTICE '⏭️  Coluna contract_status já existe';
    END IF;

    -- contract_signed_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = v_schema
        AND table_name = 'beneficiarios' 
        AND column_name = 'contract_signed_at'
    ) THEN
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN contract_signed_at TIMESTAMP WITH TIME ZONE', v_schema, 'beneficiarios');
        RAISE NOTICE '✅ Coluna contract_signed_at adicionada';
    ELSE
        RAISE NOTICE '⏭️  Coluna contract_signed_at já existe';
    END IF;

    -- autentique_data
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = v_schema
        AND table_name = 'beneficiarios' 
        AND column_name = 'autentique_data'
    ) THEN
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN autentique_data JSONB', v_schema, 'beneficiarios');
        RAISE NOTICE '✅ Coluna autentique_data adicionada';
    ELSE
        RAISE NOTICE '⏭️  Coluna autentique_data já existe';
    END IF;

    -- autentique_signed_data
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = v_schema
        AND table_name = 'beneficiarios' 
        AND column_name = 'autentique_signed_data'
    ) THEN
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN autentique_signed_data JSONB', v_schema, 'beneficiarios');
        RAISE NOTICE '✅ Coluna autentique_signed_data adicionada';
    ELSE
        RAISE NOTICE '⏭️  Coluna autentique_signed_data já existe';
    END IF;

    -- Criar índices
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_beneficiarios_autentique_document ON %I.%I(autentique_document_id) WHERE autentique_document_id IS NOT NULL', v_schema, 'beneficiarios');
    RAISE NOTICE '✅ Índice idx_beneficiarios_autentique_document criado';

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_beneficiarios_contract_status ON %I.%I(contract_status)', v_schema, 'beneficiarios');
    RAISE NOTICE '✅ Índice idx_beneficiarios_contract_status criado';

    -- Adicionar comentários
    EXECUTE format('COMMENT ON COLUMN %I.%I.autentique_document_id IS %L', v_schema, 'beneficiarios', 'ID do documento criado no Autentique');
    EXECUTE format('COMMENT ON COLUMN %I.%I.autentique_signature_link IS %L', v_schema, 'beneficiarios', 'Link para assinatura do documento');
    EXECUTE format('COMMENT ON COLUMN %I.%I.contract_status IS %L', v_schema, 'beneficiarios', 'Status do contrato: not_requested, pending_signature, signed, refused, error');
    EXECUTE format('COMMENT ON COLUMN %I.%I.contract_signed_at IS %L', v_schema, 'beneficiarios', 'Data/hora em que o contrato foi assinado');
    EXECUTE format('COMMENT ON COLUMN %I.%I.autentique_data IS %L', v_schema, 'beneficiarios', 'Dados completos retornados pelo Autentique na criação');
    EXECUTE format('COMMENT ON COLUMN %I.%I.autentique_signed_data IS %L', v_schema, 'beneficiarios', 'Dados do webhook quando o contrato foi assinado');
    RAISE NOTICE '✅ Comentários adicionados';

    RAISE NOTICE '';
    RAISE NOTICE '🎉 Migration do Autentique concluída com sucesso no schema: %', v_schema;
    
END $$;

