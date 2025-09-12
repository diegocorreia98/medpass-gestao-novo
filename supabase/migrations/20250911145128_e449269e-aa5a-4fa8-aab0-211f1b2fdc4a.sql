-- Corrigir função para ter search_path seguro
CREATE OR REPLACE FUNCTION public.update_franquias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;