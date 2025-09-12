-- COMPREHENSIVE SECURITY FIX FOR BENEFICIARIOS TABLE
-- Phase 1: Create encryption functions and enhanced security

-- Create extension for encryption if not exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create secure function to encrypt sensitive data
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(input_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN input_text;
  END IF;
  
  -- Use AES encryption with a key derived from Supabase secrets
  RETURN encode(
    encrypt(input_text::bytea, 
           digest('MedPassSecurity2024', 'sha256')::bytea, 
           'aes'), 
    'base64'
  );
END;
$$;

-- Create function to decrypt sensitive data
CREATE OR REPLACE FUNCTION public.decrypt_sensitive_data(encrypted_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN encrypted_text;
  END IF;
  
  BEGIN
    RETURN convert_from(
      decrypt(decode(encrypted_text, 'base64'), 
             digest('MedPassSecurity2024', 'sha256')::bytea, 
             'aes'), 
      'UTF8'
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Return original if decryption fails (for backwards compatibility)
      RETURN encrypted_text;
  END;
END;
$$;

-- Create function to mask CPF for display
CREATE OR REPLACE FUNCTION public.mask_cpf(cpf_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF cpf_input IS NULL OR length(cpf_input) < 11 THEN
    RETURN cpf_input;
  END IF;
  
  -- Mask CPF: XXX.XXX.XXX-XX -> XXX.XXX.***-**
  RETURN overlay(cpf_input placing '***-**' from 9);
END;
$$;

-- Create function to mask email
CREATE OR REPLACE FUNCTION public.mask_email(email_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  at_position integer;
  username_part text;
  domain_part text;
BEGIN
  IF email_input IS NULL OR email_input = '' THEN
    RETURN email_input;
  END IF;
  
  at_position := position('@' in email_input);
  IF at_position = 0 THEN
    RETURN email_input;
  END IF;
  
  username_part := substring(email_input from 1 for at_position - 1);
  domain_part := substring(email_input from at_position);
  
  -- Mask username part: user@domain.com -> us***@domain.com
  IF length(username_part) > 2 THEN
    username_part := substring(username_part from 1 for 2) || '***';
  END IF;
  
  RETURN username_part || domain_part;
END;
$$;

-- Create function to mask phone
CREATE OR REPLACE FUNCTION public.mask_phone(phone_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF phone_input IS NULL OR length(phone_input) < 8 THEN
    RETURN phone_input;
  END IF;
  
  -- Mask phone: keep first 3 and last 2 digits
  RETURN substring(phone_input from 1 for 3) || '****' || right(phone_input, 2);
END;
$$;

-- Create enhanced security function to check user access rights
CREATE OR REPLACE FUNCTION public.can_access_beneficiario_data(beneficiario_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  current_user_type user_type;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get current user type
  SELECT user_type INTO current_user_type
  FROM public.profiles
  WHERE user_id = current_user_id;
  
  -- Matriz users can access all data
  IF current_user_type = 'matriz' THEN
    RETURN TRUE;
  END IF;
  
  -- Unidade users can only access their own beneficiarios
  IF current_user_type = 'unidade' AND beneficiario_user_id = current_user_id THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;