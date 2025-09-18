-- Create notifications table
-- This table stores user notifications for the bell icon system

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('info', 'success', 'warning', 'error')),
  lida BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  action_label VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_id ON public.notificacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON public.notificacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON public.notificacoes(lida);

-- Add RLS (Row Level Security)
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notificacoes
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.notificacoes
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON public.notificacoes
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: System can insert notifications for users
CREATE POLICY "System can insert notifications" ON public.notificacoes
  FOR INSERT WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.notificacoes IS 'User notifications for the bell icon system';
COMMENT ON COLUMN public.notificacoes.tipo IS 'Notification type: info, success, warning, error';
COMMENT ON COLUMN public.notificacoes.lida IS 'Whether notification has been read by user';
COMMENT ON COLUMN public.notificacoes.action_url IS 'Optional URL for notification action button';
COMMENT ON COLUMN public.notificacoes.action_label IS 'Optional label for notification action button';