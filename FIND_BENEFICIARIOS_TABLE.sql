-- Script para encontrar a tabela beneficiarios em qualquer schema
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'beneficiarios'
ORDER BY table_schema, ordinal_position
LIMIT 20;

