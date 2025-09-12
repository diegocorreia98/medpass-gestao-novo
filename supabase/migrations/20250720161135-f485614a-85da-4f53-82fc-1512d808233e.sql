-- Adicionar coluna custo à tabela planos
ALTER TABLE public.planos 
ADD COLUMN custo numeric NOT NULL DEFAULT 0;