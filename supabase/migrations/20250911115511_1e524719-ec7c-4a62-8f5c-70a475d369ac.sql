-- Criar alguns beneficiários de teste para a unidade do usuário atual
INSERT INTO public.beneficiarios (
  user_id, 
  unidade_id, 
  plano_id, 
  nome, 
  cpf, 
  email, 
  telefone, 
  endereco, 
  cidade, 
  estado, 
  cep,
  valor_plano, 
  status, 
  data_adesao
) VALUES 
-- Beneficiário 1
(
  '49fd2e97-ad5e-445b-a959-ba4c532e277a',
  '239377fc-92bd-40fa-8d9d-c1375329c55e',
  (SELECT id FROM planos WHERE ativo = true LIMIT 1),
  'João da Silva',
  '123.456.789-01',
  'joao.silva@email.com',
  '(11) 99999-0001',
  'Rua das Flores, 123',
  'São Paulo',
  'SP',
  '01234-567',
  150.00,
  'ativo',
  CURRENT_DATE
),
-- Beneficiário 2
(
  '49fd2e97-ad5e-445b-a959-ba4c532e277a',
  '239377fc-92bd-40fa-8d9d-c1375329c55e',
  (SELECT id FROM planos WHERE ativo = true LIMIT 1),
  'Maria Santos',
  '987.654.321-09',
  'maria.santos@email.com',
  '(11) 99999-0002',
  'Av. Paulista, 456',
  'São Paulo',
  'SP',
  '01310-100',
  150.00,
  'ativo',
  CURRENT_DATE - INTERVAL '1 day'
),
-- Beneficiário 3
(
  '49fd2e97-ad5e-445b-a959-ba4c532e277a',
  '239377fc-92bd-40fa-8d9d-c1375329c55e',
  (SELECT id FROM planos WHERE ativo = true LIMIT 1),
  'Pedro Oliveira',
  '456.789.123-45',
  'pedro.oliveira@email.com',
  '(11) 99999-0003',
  'Rua Augusta, 789',
  'São Paulo',
  'SP',
  '01305-000',
  150.00,
  'pendente',
  CURRENT_DATE - INTERVAL '2 days'
);