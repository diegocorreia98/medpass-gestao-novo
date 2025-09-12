-- Criar tabela para gerenciar links de checkout de assinatura
CREATE TABLE public.subscription_checkout_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscription_checkout_links ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view valid checkout links"
ON public.subscription_checkout_links
FOR SELECT
USING (expires_at > now() AND is_used = false);

CREATE POLICY "Edge functions can manage checkout links"
ON public.subscription_checkout_links
FOR ALL
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_subscription_checkout_links_updated_at
BEFORE UPDATE ON public.subscription_checkout_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add checkout_link column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN checkout_link TEXT;