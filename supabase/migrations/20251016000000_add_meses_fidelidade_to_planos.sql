-- Adicionar campo meses_fidelidade à tabela planos
ALTER TABLE planos
ADD COLUMN IF NOT EXISTS meses_fidelidade INTEGER DEFAULT 12 NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN planos.meses_fidelidade IS 'Número de meses de fidelidade do plano';
