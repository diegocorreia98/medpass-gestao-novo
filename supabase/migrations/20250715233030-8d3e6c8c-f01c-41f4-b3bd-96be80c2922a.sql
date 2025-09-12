-- Create the user_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_type AS ENUM ('matriz', 'unidade');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the status_ativo enum if it doesn't exist  
DO $$ BEGIN
    CREATE TYPE status_ativo AS ENUM ('ativo', 'inativo', 'pendente');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;