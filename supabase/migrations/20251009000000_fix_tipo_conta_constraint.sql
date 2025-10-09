-- Remover a constraint antiga do tipo_conta se existir
ALTER TABLE public.unidades
DROP CONSTRAINT IF EXISTS unidades_tipo_conta_check;

-- Adicionar nova constraint que aceita os valores do frontend
ALTER TABLE public.unidades
ADD CONSTRAINT unidades_tipo_conta_check
CHECK (tipo_conta IN ('Conta Corrente', 'Conta Poupança', 'Conta Salário', 'corrente', 'poupanca'));

-- Atualizar comentário
COMMENT ON COLUMN public.unidades.tipo_conta IS 'Tipo da conta bancária: Conta Corrente, Conta Poupança ou Conta Salário';
