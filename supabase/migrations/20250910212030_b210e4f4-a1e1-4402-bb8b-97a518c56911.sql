-- Adicionar campo checkout_link na tabela beneficiarios
ALTER TABLE public.beneficiarios 
ADD COLUMN checkout_link TEXT;

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN public.beneficiarios.checkout_link IS 'Link de checkout/pagamento gerado para a adesão do beneficiário';