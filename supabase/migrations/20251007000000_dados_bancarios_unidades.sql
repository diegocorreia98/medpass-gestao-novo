-- Adicionar campos de dados bancários na tabela unidades
ALTER TABLE public.unidades
ADD COLUMN IF NOT EXISTS banco TEXT,
ADD COLUMN IF NOT EXISTS agencia TEXT,
ADD COLUMN IF NOT EXISTS conta TEXT,
ADD COLUMN IF NOT EXISTS tipo_conta TEXT CHECK (tipo_conta IN ('corrente', 'poupanca')),
ADD COLUMN IF NOT EXISTS chave_pix TEXT,
ADD COLUMN IF NOT EXISTS tipo_chave_pix TEXT CHECK (tipo_chave_pix IN ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'));

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.unidades.banco IS 'Nome do banco para transferência';
COMMENT ON COLUMN public.unidades.agencia IS 'Número da agência bancária';
COMMENT ON COLUMN public.unidades.conta IS 'Número da conta bancária';
COMMENT ON COLUMN public.unidades.tipo_conta IS 'Tipo da conta bancária: corrente ou poupança';
COMMENT ON COLUMN public.unidades.chave_pix IS 'Chave PIX para transferências';
COMMENT ON COLUMN public.unidades.tipo_chave_pix IS 'Tipo da chave PIX: cpf, cnpj, email, telefone ou aleatoria';
