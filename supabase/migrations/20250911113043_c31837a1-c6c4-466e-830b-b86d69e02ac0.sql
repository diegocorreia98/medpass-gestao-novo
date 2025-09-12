-- Limpar unidades duplicadas, mantendo apenas a mais antiga para cada usuário
DELETE FROM unidades 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id 
  FROM unidades 
  ORDER BY user_id, created_at ASC
);

-- Adicionar constraint única para prevenir futuras duplicações
ALTER TABLE unidades ADD CONSTRAINT unique_user_unidade UNIQUE (user_id);