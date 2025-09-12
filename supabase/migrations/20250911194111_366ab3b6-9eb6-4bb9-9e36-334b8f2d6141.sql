-- Recriar convites aceitos para Gabriely e Kamila
INSERT INTO public.convites_matriz (
  email,
  token,
  expires_at,
  aceito,
  user_id_aceito,
  created_by,
  created_at,
  updated_at
) VALUES 
(
  'gabriely@franquiascotafacil.com.br',
  'gabriely_' || gen_random_uuid()::text,
  now() + interval '7 days',
  true,
  'b9abe92c-ee01-42af-b460-a4324b1d42f0'::uuid,
  'b9abe92c-ee01-42af-b460-a4324b1d42f0'::uuid,
  now(),
  now()
),
(
  'kamilaaguiar.cotafacil@gmail.com',
  'kamila_' || gen_random_uuid()::text,
  now() + interval '7 days',
  true,
  'ff1f8f1b-c1c3-4fa8-b702-9f4a5f8a9a4f'::uuid,
  'ff1f8f1b-c1c3-4fa8-b702-9f4a5f8a9a4f'::uuid,
  now(),
  now()
);