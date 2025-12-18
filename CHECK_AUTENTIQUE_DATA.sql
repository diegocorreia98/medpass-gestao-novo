-- Query para verificar os dados do Autentique salvos no beneficiário

-- Buscar pelo document_id do Autentique
SELECT 
    id,
    nome,
    cpf,
    email,
    autentique_document_id,
    autentique_signature_link,
    contract_status,
    contract_signed_at,
    created_at,
    -- Mostrar os dados JSON do Autentique de forma formatada
    jsonb_pretty(autentique_data) as dados_autentique,
    jsonb_pretty(autentique_signed_data) as dados_assinatura
FROM beneficiarios
WHERE autentique_document_id = '01KCS87RTN26W7VY2T3FSCCAHP'
ORDER BY created_at DESC
LIMIT 1;

-- OU buscar os últimos beneficiários com dados do Autentique
-- SELECT 
--     id,
--     nome,
--     autentique_document_id,
--     contract_status,
--     contract_signed_at,
--     created_at
-- FROM beneficiarios
-- WHERE autentique_document_id IS NOT NULL
-- ORDER BY created_at DESC
-- LIMIT 5;

