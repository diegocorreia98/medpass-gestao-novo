-- Fix security vulnerability in subscription_checkout_links table
-- First check existing policies and drop them safely

-- Drop existing policies safely
DROP POLICY IF EXISTS "Anyone can view valid checkout links" ON public.subscription_checkout_links;
DROP POLICY IF EXISTS "Edge functions can manage checkout links" ON public.subscription_checkout_links;
DROP POLICY IF EXISTS "Only service role can read checkout links" ON public.subscription_checkout_links;
DROP POLICY IF EXISTS "Only service role can manage checkout links" ON public.subscription_checkout_links;

-- Create secure policies that restrict access properly
-- Only service role (edge functions) can access checkout links
CREATE POLICY "Service role only access" 
ON public.subscription_checkout_links 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Add audit logging for checkout link access attempts
CREATE OR REPLACE FUNCTION public.log_checkout_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscription_access_logs (
    subscription_id,
    access_type,
    ip_address,
    accessed_by
  ) VALUES (
    NEW.subscription_id,
    'checkout_link_created',
    inet_client_addr(),
    auth.uid()
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the main operation if logging fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to log checkout link creation (drop first if exists)
DROP TRIGGER IF EXISTS log_checkout_link_creation ON public.subscription_checkout_links;
CREATE TRIGGER log_checkout_link_creation
  AFTER INSERT ON public.subscription_checkout_links
  FOR EACH ROW EXECUTE FUNCTION public.log_checkout_access();

-- Add security function to cleanup expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_checkout_links()
RETURNS void AS $$
BEGIN
  -- Mark expired links as used to prevent reuse
  UPDATE public.subscription_checkout_links 
  SET is_used = true, updated_at = now()
  WHERE expires_at < now() AND is_used = false;
  
  -- Delete very old links (over 7 days)
  DELETE FROM public.subscription_checkout_links 
  WHERE created_at < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;