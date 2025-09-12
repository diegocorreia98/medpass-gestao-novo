-- Fix foreign key relationship for subscription_checkout_links
-- Add missing foreign key constraint between subscription_checkout_links and subscriptions

-- First, add the foreign key constraint
ALTER TABLE public.subscription_checkout_links 
ADD CONSTRAINT subscription_checkout_links_subscription_id_fkey 
FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_checkout_links_token 
ON public.subscription_checkout_links(token) WHERE is_used = false;

CREATE INDEX IF NOT EXISTS idx_subscription_checkout_links_expires_at 
ON public.subscription_checkout_links(expires_at) WHERE is_used = false;

CREATE INDEX IF NOT EXISTS idx_subscription_checkout_links_subscription_id 
ON public.subscription_checkout_links(subscription_id);