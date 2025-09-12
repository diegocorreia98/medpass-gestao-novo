-- Criar tabela para armazenar eventos do webhook da Vindi
CREATE TABLE public.vindi_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vindi_webhook_events ENABLE ROW LEVEL SECURITY;

-- Create policy for system to insert events
CREATE POLICY "Sistema pode inserir eventos webhook" 
ON public.vindi_webhook_events 
FOR INSERT 
WITH CHECK (true);

-- Create policy for matriz to view events
CREATE POLICY "Matriz pode ver eventos webhook" 
ON public.vindi_webhook_events 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.user_type = 'matriz'
));

-- Create policy for system to update events
CREATE POLICY "Sistema pode atualizar eventos webhook" 
ON public.vindi_webhook_events 
FOR UPDATE 
USING (true);

-- Create index for better performance
CREATE INDEX idx_vindi_webhook_events_event_id ON public.vindi_webhook_events(event_id);
CREATE INDEX idx_vindi_webhook_events_type ON public.vindi_webhook_events(event_type);
CREATE INDEX idx_vindi_webhook_events_processed ON public.vindi_webhook_events(processed);