-- Create table for API settings
CREATE TABLE public.api_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_name TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  masked_value TEXT,
  updated_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for api_settings access (only matriz users)
CREATE POLICY "Only matriz users can view API settings" 
ON public.api_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'matriz'
  )
);

CREATE POLICY "Only matriz users can insert API settings" 
ON public.api_settings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'matriz'
  )
  AND updated_by = auth.uid()
);

CREATE POLICY "Only matriz users can update API settings" 
ON public.api_settings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'matriz'
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_api_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_api_settings_updated_at
  BEFORE UPDATE ON public.api_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_api_settings_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_api_settings_name ON public.api_settings(setting_name);