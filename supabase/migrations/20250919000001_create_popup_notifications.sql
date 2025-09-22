-- Create popup notifications system
-- This migration creates tables for advanced popup notifications with media support

-- Main popup notifications table
CREATE TABLE IF NOT EXISTS public.popup_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'promotional')),

  -- Media fields
  image_url TEXT,
  video_url TEXT,

  -- Action configuration
  action_url TEXT,
  action_label VARCHAR(100) DEFAULT 'Entendi',
  close_label VARCHAR(50) DEFAULT 'Fechar',

  -- Targeting configuration
  target_user_type VARCHAR(20) CHECK (target_user_type IN ('matriz', 'unidade', 'all')),
  target_user_ids UUID[],

  -- Display controls
  is_active BOOLEAN DEFAULT TRUE,
  show_on_login BOOLEAN DEFAULT TRUE,
  show_on_dashboard BOOLEAN DEFAULT FALSE,
  max_displays_per_user INTEGER DEFAULT 1,

  -- Priority for ordering (higher = more important)
  priority INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Popup notification views tracking table
CREATE TABLE IF NOT EXISTS public.popup_notification_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  popup_id UUID NOT NULL REFERENCES public.popup_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  action_clicked BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  session_id TEXT, -- Track different sessions
  user_agent TEXT, -- For analytics
  ip_address INET, -- For analytics

  -- Prevent duplicate views per session
  UNIQUE(popup_id, user_id, session_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_popup_notifications_active ON public.popup_notifications(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_popup_notifications_target_type ON public.popup_notifications(target_user_type);
CREATE INDEX IF NOT EXISTS idx_popup_notifications_show_on_login ON public.popup_notifications(show_on_login) WHERE show_on_login = true;
CREATE INDEX IF NOT EXISTS idx_popup_notifications_show_on_dashboard ON public.popup_notifications(show_on_dashboard) WHERE show_on_dashboard = true;
CREATE INDEX IF NOT EXISTS idx_popup_notifications_expires_at ON public.popup_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_popup_notifications_priority ON public.popup_notifications(priority DESC);
CREATE INDEX IF NOT EXISTS idx_popup_notifications_created_at ON public.popup_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_popup_notification_views_popup_id ON public.popup_notification_views(popup_id);
CREATE INDEX IF NOT EXISTS idx_popup_notification_views_user_id ON public.popup_notification_views(user_id);
CREATE INDEX IF NOT EXISTS idx_popup_notification_views_viewed_at ON public.popup_notification_views(viewed_at DESC);

-- Add RLS (Row Level Security)
ALTER TABLE public.popup_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_notification_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for popup_notifications

-- Policy: Anyone can view active, non-expired popup notifications
CREATE POLICY "Anyone can view active popup notifications" ON public.popup_notifications
  FOR SELECT USING (
    is_active = true AND
    (expires_at IS NULL OR expires_at > NOW())
  );

-- Policy: Only matriz users can insert/update/delete popup notifications
CREATE POLICY "Matriz users can manage popup notifications" ON public.popup_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND user_type = 'matriz'
    )
  );

-- RLS Policies for popup_notification_views

-- Policy: Users can view their own notification views
CREATE POLICY "Users can view own notification views" ON public.popup_notification_views
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own notification views
CREATE POLICY "Users can insert own notification views" ON public.popup_notification_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own notification views
CREATE POLICY "Users can update own notification views" ON public.popup_notification_views
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Matriz users can view all notification views (for analytics)
CREATE POLICY "Matriz users can view all notification views" ON public.popup_notification_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND user_type = 'matriz'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_popup_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_popup_notification_updated_at
  BEFORE UPDATE ON public.popup_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_popup_notification_updated_at();

-- Function to get eligible popup notifications for a user
CREATE OR REPLACE FUNCTION get_eligible_popup_notifications(
  p_user_id UUID,
  p_show_context TEXT DEFAULT 'dashboard', -- 'login' or 'dashboard'
  p_session_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(20),
  image_url TEXT,
  video_url TEXT,
  action_url TEXT,
  action_label VARCHAR(100),
  close_label VARCHAR(50),
  priority INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  user_type_value TEXT;
BEGIN
  -- Get user type
  SELECT p.user_type INTO user_type_value
  FROM public.profiles p
  WHERE p.user_id = p_user_id;

  RETURN QUERY
  SELECT
    pn.id,
    pn.title,
    pn.message,
    pn.type,
    pn.image_url,
    pn.video_url,
    pn.action_url,
    pn.action_label,
    pn.close_label,
    pn.priority,
    pn.created_at
  FROM public.popup_notifications pn
  WHERE
    -- Basic filters
    pn.is_active = true
    AND (pn.expires_at IS NULL OR pn.expires_at > NOW())

    -- Context filters
    AND (
      (p_show_context = 'login' AND pn.show_on_login = true) OR
      (p_show_context = 'dashboard' AND pn.show_on_dashboard = true)
    )

    -- User targeting filters
    AND (
      pn.target_user_type = 'all' OR
      pn.target_user_type = user_type_value OR
      p_user_id = ANY(pn.target_user_ids)
    )

    -- View limits check
    AND (
      pn.max_displays_per_user IS NULL OR
      pn.max_displays_per_user <= 0 OR
      (
        SELECT COUNT(*)
        FROM public.popup_notification_views pnv
        WHERE pnv.popup_id = pn.id
        AND pnv.user_id = p_user_id
        AND (p_session_id IS NULL OR pnv.session_id != p_session_id)
      ) < pn.max_displays_per_user
    )

  ORDER BY pn.priority DESC, pn.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.popup_notifications TO authenticated;
GRANT ALL ON public.popup_notification_views TO authenticated;
GRANT EXECUTE ON FUNCTION get_eligible_popup_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION update_popup_notification_updated_at TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.popup_notifications IS 'Advanced popup notifications with media support and targeting';
COMMENT ON TABLE public.popup_notification_views IS 'Tracking table for popup notification views and interactions';
COMMENT ON FUNCTION get_eligible_popup_notifications IS 'Function to get popup notifications eligible for a specific user and context';

COMMENT ON COLUMN public.popup_notifications.type IS 'Notification type: info, success, warning, error, promotional';
COMMENT ON COLUMN public.popup_notifications.target_user_type IS 'Target user type: matriz, unidade, or all';
COMMENT ON COLUMN public.popup_notifications.show_on_login IS 'Whether to show this popup on login page';
COMMENT ON COLUMN public.popup_notifications.show_on_dashboard IS 'Whether to show this popup on dashboard';
COMMENT ON COLUMN public.popup_notifications.max_displays_per_user IS 'Maximum times to show this popup per user (0 = unlimited)';
COMMENT ON COLUMN public.popup_notifications.priority IS 'Priority for ordering (higher = more important)';