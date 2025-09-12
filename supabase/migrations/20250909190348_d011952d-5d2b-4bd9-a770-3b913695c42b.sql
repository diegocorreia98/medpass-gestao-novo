-- Create user_settings table to store all user preferences
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  
  -- Notification preferences
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT false,
  sms_notifications BOOLEAN NOT NULL DEFAULT false,
  marketing_emails BOOLEAN NOT NULL DEFAULT false,
  
  -- Security preferences  
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  session_timeout INTEGER NOT NULL DEFAULT 30, -- in minutes
  
  -- Appearance preferences
  theme TEXT NOT NULL DEFAULT 'system',
  language TEXT NOT NULL DEFAULT 'pt-BR',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user settings
CREATE POLICY "Users can view their own settings"
ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get or create user settings
CREATE OR REPLACE FUNCTION public.get_or_create_user_settings()
RETURNS TABLE(
  id uuid,
  user_id uuid, 
  email_notifications boolean,
  push_notifications boolean,
  sms_notifications boolean,
  marketing_emails boolean,
  two_factor_enabled boolean,
  session_timeout integer,
  theme text,
  language text,
  timezone text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Try to get existing settings
  RETURN QUERY
  SELECT * FROM public.user_settings 
  WHERE user_settings.user_id = current_user_id;
  
  -- If no settings found, create default settings
  IF NOT FOUND THEN
    INSERT INTO public.user_settings (user_id)
    VALUES (current_user_id);
    
    RETURN QUERY
    SELECT * FROM public.user_settings 
    WHERE user_settings.user_id = current_user_id;
  END IF;
END;
$function$;