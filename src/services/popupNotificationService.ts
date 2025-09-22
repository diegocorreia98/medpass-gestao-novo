import { supabase } from "@/integrations/supabase/client";
import type {
  PopupNotification,
  PopupNotificationInsert,
  PopupNotificationUpdate,
  PopupNotificationView,
  PopupNotificationViewInsert,
  PopupNotificationDisplayData,
  PopupShowContext,
  GetEligiblePopupsResponse,
  CreatePopupResponse,
  TrackViewResponse,
  PopupNotificationAnalytics,
  PopupNotificationStats,
  ImageUploadResult,
  VideoUrlValidationResult,
  MediaValidationResult,
} from "@/types/popup-notifications";

class PopupNotificationService {
  /**
   * Get eligible popup notifications for a user and context
   */
  async getEligiblePopups(
    userId: string,
    context: PopupShowContext = 'dashboard',
    sessionId?: string
  ): Promise<GetEligiblePopupsResponse> {
    try {
      console.log(`🔔 Getting eligible popups for user ${userId} in context ${context}`);

      const { data, error } = await supabase.rpc('get_eligible_popup_notifications', {
        p_user_id: userId,
        p_show_context: context,
        p_session_id: sessionId || null
      });

      if (error) {
        console.error('❌ Error getting eligible popups:', error);
        return { popups: [], error: error.message };
      }

      const popups: PopupNotificationDisplayData[] = (data || []).map((popup: any) => ({
        ...popup,
        isExpired: popup.expires_at ? new Date(popup.expires_at) <= new Date() : false,
        canShow: true
      }));

      console.log(`✅ Found ${popups.length} eligible popups`);
      return { popups };
    } catch (error: any) {
      console.error('❌ Error in getEligiblePopups:', error);
      return { popups: [], error: error.message };
    }
  }

  /**
   * Create a new popup notification
   */
  async createPopup(popup: PopupNotificationInsert): Promise<CreatePopupResponse> {
    try {
      console.log('🔔 Creating new popup notification:', popup.title);

      const { data, error } = await supabase
        .from('popup_notifications')
        .insert([popup])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating popup:', error);
        return { popup: null, error: error.message };
      }

      console.log('✅ Popup created successfully:', data.id);
      return { popup: data };
    } catch (error: any) {
      console.error('❌ Error in createPopup:', error);
      return { popup: null, error: error.message };
    }
  }

  /**
   * Update an existing popup notification
   */
  async updatePopup(id: string, updates: PopupNotificationUpdate): Promise<CreatePopupResponse> {
    try {
      console.log(`🔔 Updating popup notification ${id}`);

      const { data, error } = await supabase
        .from('popup_notifications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating popup:', error);
        return { popup: null, error: error.message };
      }

      console.log('✅ Popup updated successfully');
      return { popup: data };
    } catch (error: any) {
      console.error('❌ Error in updatePopup:', error);
      return { popup: null, error: error.message };
    }
  }

  /**
   * Delete a popup notification
   */
  async deletePopup(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔔 Deleting popup notification ${id}`);

      const { error } = await supabase
        .from('popup_notifications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting popup:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Popup deleted successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error in deletePopup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all popup notifications (for admin interface)
   */
  async getAllPopups(): Promise<{ popups: PopupNotification[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('popup_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error getting all popups:', error);
        return { popups: [], error: error.message };
      }

      return { popups: data || [] };
    } catch (error: any) {
      console.error('❌ Error in getAllPopups:', error);
      return { popups: [], error: error.message };
    }
  }

  /**
   * Track a popup notification view
   */
  async trackView(view: PopupNotificationViewInsert): Promise<TrackViewResponse> {
    try {
      console.log(`📊 Tracking view for popup ${view.popup_id}`);

      const { error } = await supabase
        .from('popup_notification_views')
        .insert([view]);

      if (error) {
        // Ignore duplicate view errors (same popup, user, session)
        if (error.code === '23505') {
          console.log('ℹ️ Duplicate view ignored (same session)');
          return { success: true };
        }
        console.error('❌ Error tracking view:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ View tracked successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error in trackView:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a popup notification view (for action clicks, dismissals)
   */
  async updateView(
    popupId: string,
    userId: string,
    updates: { action_clicked?: boolean; dismissed?: boolean },
    sessionId?: string
  ): Promise<TrackViewResponse> {
    try {
      console.log(`📊 Updating view for popup ${popupId}`);

      let query = supabase
        .from('popup_notification_views')
        .update(updates)
        .eq('popup_id', popupId)
        .eq('user_id', userId);

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { error } = await query;

      if (error) {
        console.error('❌ Error updating view:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ View updated successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error in updateView:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get popup analytics
   */
  async getPopupAnalytics(popupId?: string): Promise<{ analytics: PopupNotificationAnalytics[]; error?: string }> {
    try {
      let query = supabase
        .from('popup_notification_views')
        .select(`
          popup_id,
          popup_notifications!inner(title, created_at),
          viewed_at,
          action_clicked,
          dismissed
        `);

      if (popupId) {
        query = query.eq('popup_id', popupId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error getting analytics:', error);
        return { analytics: [], error: error.message };
      }

      // Process analytics data
      const analyticsMap = new Map<string, any>();

      (data || []).forEach((view: any) => {
        const popupId = view.popup_id;

        if (!analyticsMap.has(popupId)) {
          analyticsMap.set(popupId, {
            popup_id: popupId,
            title: view.popup_notifications.title,
            created_at: view.popup_notifications.created_at,
            total_views: 0,
            unique_views: new Set(),
            action_clicks: 0,
            dismissals: 0,
            last_viewed: null
          });
        }

        const analytics = analyticsMap.get(popupId);
        analytics.total_views++;
        analytics.unique_views.add(view.user_id);

        if (view.action_clicked) analytics.action_clicks++;
        if (view.dismissed) analytics.dismissals++;

        if (!analytics.last_viewed || view.viewed_at > analytics.last_viewed) {
          analytics.last_viewed = view.viewed_at;
        }
      });

      const analytics: PopupNotificationAnalytics[] = Array.from(analyticsMap.values()).map(a => ({
        popup_id: a.popup_id,
        title: a.title,
        total_views: a.total_views,
        unique_views: a.unique_views.size,
        action_clicks: a.action_clicks,
        dismissals: a.dismissals,
        conversion_rate: a.total_views > 0 ? (a.action_clicks / a.total_views) * 100 : 0,
        dismissal_rate: a.total_views > 0 ? (a.dismissals / a.total_views) * 100 : 0,
        created_at: a.created_at,
        last_viewed: a.last_viewed
      }));

      return { analytics };
    } catch (error: any) {
      console.error('❌ Error in getPopupAnalytics:', error);
      return { analytics: [], error: error.message };
    }
  }

  /**
   * Get popup statistics
   */
  async getPopupStats(): Promise<{ stats: PopupNotificationStats | null; error?: string }> {
    try {
      const [popupsResult, viewsResult] = await Promise.all([
        supabase.from('popup_notifications').select('id, is_active, expires_at'),
        supabase.from('popup_notification_views').select('action_clicked, dismissed')
      ]);

      if (popupsResult.error || viewsResult.error) {
        const error = popupsResult.error || viewsResult.error;
        console.error('❌ Error getting stats:', error);
        return { stats: null, error: error?.message };
      }

      const popups = popupsResult.data || [];
      const views = viewsResult.data || [];

      const now = new Date();
      const activePopups = popups.filter(p => p.is_active && (!p.expires_at || new Date(p.expires_at) > now));
      const expiredPopups = popups.filter(p => p.expires_at && new Date(p.expires_at) <= now);

      const totalClicks = views.filter(v => v.action_clicked).length;
      const totalDismissals = views.filter(v => v.dismissed).length;

      const stats: PopupNotificationStats = {
        total_popups: popups.length,
        active_popups: activePopups.length,
        expired_popups: expiredPopups.length,
        total_views: views.length,
        total_clicks: totalClicks,
        total_dismissals: totalDismissals,
        overall_conversion_rate: views.length > 0 ? (totalClicks / views.length) * 100 : 0,
        overall_dismissal_rate: views.length > 0 ? (totalDismissals / views.length) * 100 : 0
      };

      return { stats };
    } catch (error: any) {
      console.error('❌ Error in getPopupStats:', error);
      return { stats: null, error: error.message };
    }
  }

  /**
   * Upload image to storage
   */
  async uploadImage(file: File, path?: string): Promise<ImageUploadResult> {
    try {
      console.log('📤 Uploading image:', file.name);

      // Validate file
      if (!file.type.startsWith('image/')) {
        return { success: false, error: 'O arquivo deve ser uma imagem' };
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return { success: false, error: 'A imagem deve ter no máximo 5MB' };
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = path ? `${path}/${fileName}` : `popup-images/${fileName}`;

      const { data, error } = await supabase.storage
        .from('popup-assets')
        .upload(filePath, file);

      if (error) {
        console.error('❌ Error uploading image:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('popup-assets')
        .getPublicUrl(data.path);

      console.log('✅ Image uploaded successfully');
      return {
        success: true,
        url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type
      };
    } catch (error: any) {
      console.error('❌ Error in uploadImage:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate video URL and get embed information
   */
  validateVideoUrl(url: string): VideoUrlValidationResult {
    try {
      if (!url) {
        return { isValid: false, error: 'URL do vídeo é obrigatória' };
      }

      const urlObj = new URL(url);

      // YouTube validation
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        let videoId: string | null = null;

        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
          videoId = urlObj.searchParams.get('v');
        }

        if (videoId) {
          return {
            isValid: true,
            type: 'youtube',
            embedUrl: `https://www.youtube.com/embed/${videoId}`,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
          };
        }
      }

      // Vimeo validation
      if (urlObj.hostname.includes('vimeo.com')) {
        const videoId = urlObj.pathname.split('/').pop();
        if (videoId && /^\d+$/.test(videoId)) {
          return {
            isValid: true,
            type: 'vimeo',
            embedUrl: `https://player.vimeo.com/video/${videoId}`,
            thumbnailUrl: `https://vumbnail.com/${videoId}.jpg`
          };
        }
      }

      // Direct video file validation
      if (url.match(/\.(mp4|webm|ogg)$/i)) {
        return {
          isValid: true,
          type: 'direct',
          embedUrl: url
        };
      }

      return {
        isValid: false,
        error: 'URL de vídeo não suportada. Use YouTube, Vimeo ou arquivo direto (.mp4, .webm, .ogg)',
        type: 'unknown'
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'URL inválida'
      };
    }
  }

  /**
   * Validate media (image or video)
   */
  validateMedia(imageUrl?: string, videoUrl?: string): MediaValidationResult {
    if (!imageUrl && !videoUrl) {
      return { isValid: true }; // No media is valid
    }

    if (imageUrl && videoUrl) {
      return {
        isValid: false,
        error: 'Escolha apenas uma opção: imagem OU vídeo'
      };
    }

    if (imageUrl) {
      try {
        new URL(imageUrl);
        return { isValid: true, type: 'image', url: imageUrl };
      } catch {
        return { isValid: false, error: 'URL da imagem é inválida' };
      }
    }

    if (videoUrl) {
      const videoValidation = this.validateVideoUrl(videoUrl);
      if (videoValidation.isValid) {
        return { isValid: true, type: 'video', url: videoValidation.embedUrl };
      } else {
        return { isValid: false, error: videoValidation.error };
      }
    }

    return { isValid: true };
  }

  /**
   * Generate session ID for tracking
   */
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Get user agent for analytics
   */
  getUserAgent(): string {
    return navigator.userAgent;
  }
}

// Create singleton instance
export const popupNotificationService = new PopupNotificationService();

// Export individual methods for easier imports
export const getEligiblePopups = (userId: string, context?: PopupShowContext, sessionId?: string) =>
  popupNotificationService.getEligiblePopups(userId, context, sessionId);

export const createPopup = (popup: PopupNotificationInsert) =>
  popupNotificationService.createPopup(popup);

export const updatePopup = (id: string, updates: PopupNotificationUpdate) =>
  popupNotificationService.updatePopup(id, updates);

export const deletePopup = (id: string) =>
  popupNotificationService.deletePopup(id);

export const trackPopupView = (view: PopupNotificationViewInsert) =>
  popupNotificationService.trackView(view);

export const updatePopupView = (popupId: string, userId: string, updates: any, sessionId?: string) =>
  popupNotificationService.updateView(popupId, userId, updates, sessionId);

export const getPopupAnalytics = (popupId?: string) =>
  popupNotificationService.getPopupAnalytics(popupId);

export const getPopupStats = () =>
  popupNotificationService.getPopupStats();

export const uploadPopupImage = (file: File, path?: string) =>
  popupNotificationService.uploadImage(file, path);

export const validateVideoUrl = (url: string) =>
  popupNotificationService.validateVideoUrl(url);

export const validatePopupMedia = (imageUrl?: string, videoUrl?: string) =>
  popupNotificationService.validateMedia(imageUrl, videoUrl);

export default popupNotificationService;