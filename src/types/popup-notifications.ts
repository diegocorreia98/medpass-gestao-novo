// Types for Popup Notifications System

export type PopupNotificationType = "info" | "success" | "warning" | "error" | "promotional";
export type PopupTargetUserType = "matriz" | "unidade" | "all";
export type PopupShowContext = "login" | "dashboard";

// Database table types
export interface PopupNotification {
  id: string;
  title: string;
  message: string | null;
  type: PopupNotificationType;

  // Media
  image_url: string | null;
  video_url: string | null;

  // Actions
  action_url: string | null;
  action_label: string;
  close_label: string;

  // Targeting
  target_user_type: PopupTargetUserType | null;
  target_user_ids: string[] | null;

  // Display controls
  is_active: boolean;
  show_on_login: boolean;
  show_on_dashboard: boolean;
  max_displays_per_user: number | null;
  priority: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  expires_at: string | null;

  // Audit
  created_by: string | null;
  updated_by: string | null;
}

export interface PopupNotificationView {
  id: string;
  popup_id: string;
  user_id: string;
  viewed_at: string;
  action_clicked: boolean;
  dismissed: boolean;
  session_id: string | null;
  user_agent: string | null;
  ip_address: string | null;
}

// Insert/Update types
export interface PopupNotificationInsert {
  title: string;
  message?: string;
  type: PopupNotificationType;
  image_url?: string;
  video_url?: string;
  action_url?: string;
  action_label?: string;
  close_label?: string;
  target_user_type?: PopupTargetUserType;
  target_user_ids?: string[];
  is_active?: boolean;
  show_on_login?: boolean;
  show_on_dashboard?: boolean;
  max_displays_per_user?: number;
  priority?: number;
  expires_at?: string;
  created_by?: string;
}

export interface PopupNotificationUpdate {
  title?: string;
  message?: string;
  type?: PopupNotificationType;
  image_url?: string;
  video_url?: string;
  action_url?: string;
  action_label?: string;
  close_label?: string;
  target_user_type?: PopupTargetUserType;
  target_user_ids?: string[];
  is_active?: boolean;
  show_on_login?: boolean;
  show_on_dashboard?: boolean;
  max_displays_per_user?: number;
  priority?: number;
  expires_at?: string;
  updated_by?: string;
}

export interface PopupNotificationViewInsert {
  popup_id: string;
  user_id: string;
  action_clicked?: boolean;
  dismissed?: boolean;
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
}

// Frontend component types
export interface PopupNotificationDisplayData extends PopupNotification {
  // Additional computed fields for display
  isExpired?: boolean;
  canShow?: boolean;
  viewCount?: number;
}

export interface PopupNotificationComponentProps {
  notification: PopupNotificationDisplayData;
  onAction?: (notification: PopupNotificationDisplayData) => void;
  onDismiss?: (notification: PopupNotificationDisplayData) => void;
  onClose?: (notification: PopupNotificationDisplayData) => void;
}

export interface PopupNotificationManagerProps {
  showOn: PopupShowContext;
  userId?: string;
  sessionId?: string;
  className?: string;
}

// Analytics types
export interface PopupNotificationAnalytics {
  popup_id: string;
  title: string;
  total_views: number;
  unique_views: number;
  action_clicks: number;
  dismissals: number;
  conversion_rate: number; // action_clicks / total_views
  dismissal_rate: number; // dismissals / total_views
  created_at: string;
  last_viewed: string | null;
}

export interface PopupNotificationStats {
  total_popups: number;
  active_popups: number;
  expired_popups: number;
  total_views: number;
  total_clicks: number;
  total_dismissals: number;
  overall_conversion_rate: number;
  overall_dismissal_rate: number;
}

// Form types for admin interface
export interface PopupNotificationFormData {
  title: string;
  message: string;
  type: PopupNotificationType;
  image_url: string;
  video_url: string;
  action_url: string;
  action_label: string;
  close_label: string;
  target_user_type: PopupTargetUserType;
  target_user_ids: string[];
  show_on_login: boolean;
  show_on_dashboard: boolean;
  max_displays_per_user: number;
  priority: number;
  expires_at: string;
}

// Service response types
export interface GetEligiblePopupsResponse {
  popups: PopupNotificationDisplayData[];
  error?: string;
}

export interface CreatePopupResponse {
  popup: PopupNotification | null;
  error?: string;
}

export interface TrackViewResponse {
  success: boolean;
  error?: string;
}

// Hook return types
export interface UsePopupNotificationsReturn {
  // Data
  eligiblePopups: PopupNotificationDisplayData[];
  currentPopup: PopupNotificationDisplayData | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  showNextPopup: () => void;
  hideCurrentPopup: () => void;
  trackView: (popupId: string, action?: 'viewed' | 'clicked' | 'dismissed') => Promise<void>;
  refreshEligiblePopups: () => Promise<void>;

  // State
  hasMorePopups: boolean;
  currentIndex: number;
}

// Media validation types
export interface MediaValidationResult {
  isValid: boolean;
  error?: string;
  type?: 'image' | 'video';
  url?: string;
}

// Upload types
export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  file_size?: number;
  file_type?: string;
}

export interface VideoUrlValidationResult {
  isValid: boolean;
  type?: 'youtube' | 'vimeo' | 'direct' | 'unknown';
  embedUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

// Template types for predefined popup styles
export interface PopupNotificationTemplate {
  id: string;
  name: string;
  description: string;
  type: PopupNotificationType;
  default_title: string;
  default_message: string;
  default_action_label: string;
  default_close_label: string;
  icon?: string;
  color_scheme: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
  };
}

// Event types for tracking
export type PopupNotificationEvent =
  | { type: 'popup_shown'; popup_id: string; context: PopupShowContext }
  | { type: 'popup_action_clicked'; popup_id: string; action_url: string | null }
  | { type: 'popup_dismissed'; popup_id: string; method: 'close_button' | 'overlay_click' | 'escape_key' }
  | { type: 'popup_expired'; popup_id: string }
  | { type: 'popup_error'; popup_id: string; error: string };

export interface PopupNotificationEventHandler {
  (event: PopupNotificationEvent): void;
}