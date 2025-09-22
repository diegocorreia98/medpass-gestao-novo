import React, { useEffect, useState } from 'react';
import { X, Info, CheckCircle, AlertTriangle, XCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  PopupNotificationDisplayData,
  PopupNotificationComponentProps,
  PopupNotificationType,
} from '@/types/popup-notifications';

// Type icons mapping
const TYPE_ICONS: Record<PopupNotificationType, React.ComponentType<any>> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  promotional: Star,
};

// Type colors mapping
const TYPE_COLORS: Record<PopupNotificationType, {
  icon: string;
  border: string;
  background: string;
  text: string;
}> = {
  info: {
    icon: 'text-blue-500',
    border: 'border-blue-200',
    background: 'bg-blue-50/80',
    text: 'text-blue-900',
  },
  success: {
    icon: 'text-green-500',
    border: 'border-green-200',
    background: 'bg-green-50/80',
    text: 'text-green-900',
  },
  warning: {
    icon: 'text-yellow-500',
    border: 'border-yellow-200',
    background: 'bg-yellow-50/80',
    text: 'text-yellow-900',
  },
  error: {
    icon: 'text-red-500',
    border: 'border-red-200',
    background: 'bg-red-50/80',
    text: 'text-red-900',
  },
  promotional: {
    icon: 'text-purple-500',
    border: 'border-purple-200',
    background: 'bg-purple-50/80',
    text: 'text-purple-900',
  },
};

interface VideoPlayerProps {
  url: string;
  className?: string;
}

function VideoPlayer({ url, className }: VideoPlayerProps) {
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [videoType, setVideoType] = useState<'youtube' | 'vimeo' | 'direct'>('direct');

  useEffect(() => {
    try {
      const urlObj = new URL(url);

      // YouTube
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        let videoId: string | null = null;

        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
          videoId = urlObj.searchParams.get('v');
        }

        if (videoId) {
          setEmbedUrl(`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`);
          setVideoType('youtube');
          return;
        }
      }

      // Vimeo
      if (urlObj.hostname.includes('vimeo.com')) {
        const videoId = urlObj.pathname.split('/').pop();
        if (videoId && /^\d+$/.test(videoId)) {
          setEmbedUrl(`https://player.vimeo.com/video/${videoId}?autoplay=0`);
          setVideoType('vimeo');
          return;
        }
      }

      // Direct video file
      setEmbedUrl(url);
      setVideoType('direct');
    } catch (error) {
      console.error('Error processing video URL:', error);
      setEmbedUrl(url);
      setVideoType('direct');
    }
  }, [url]);

  if (videoType === 'direct') {
    return (
      <video
        className={cn('w-full h-auto rounded-lg', className)}
        controls
        preload="metadata"
        src={embedUrl}
      >
        Seu navegador não suporta vídeos.
      </video>
    );
  }

  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative w-full h-0 pb-[56.25%]"> {/* 16:9 aspect ratio */}
        <iframe
          src={embedUrl}
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video"
        />
      </div>
    </div>
  );
}

interface PopupNotificationOverlayProps extends PopupNotificationComponentProps {
  isVisible: boolean;
  onAnimationComplete?: () => void;
}

export function PopupNotificationOverlay({
  notification,
  isVisible,
  onAction,
  onDismiss,
  onClose,
  onAnimationComplete,
}: PopupNotificationOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(isVisible);

  const TypeIcon = TYPE_ICONS[notification.type];
  const colors = TYPE_COLORS[notification.type];

  // Handle visibility changes with animation
  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Small delay to ensure the element is rendered before animating
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      // Keep rendered until animation completes
      const timer = setTimeout(() => {
        setShouldRender(false);
        onAnimationComplete?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onAnimationComplete]);

  // Handle escape key
  useEffect(() => {
    if (!isVisible) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible]);

  const handleAction = () => {
    onAction?.(notification);
  };

  const handleDismiss = () => {
    onDismiss?.(notification);
  };

  const handleClose = () => {
    onClose?.(notification);
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex items-center justify-center p-4',
        'bg-black/50 backdrop-blur-sm',
        'transition-all duration-300 ease-out',
        isAnimating
          ? 'opacity-100'
          : 'opacity-0'
      )}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-title"
      aria-describedby="popup-message"
    >
      <Card
        className={cn(
          'relative w-full max-w-lg mx-auto shadow-2xl',
          'transform transition-all duration-300 ease-out',
          colors.border,
          colors.background,
          isAnimating
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-4 scale-95 opacity-0'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-start justify-between p-6 pb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={cn('flex-shrink-0', colors.icon)}>
                <TypeIcon size={24} />
              </div>
              <h2
                id="popup-title"
                className={cn(
                  'text-xl font-semibold truncate',
                  colors.text
                )}
              >
                {notification.title}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className={cn(
                'flex-shrink-0 h-8 w-8 p-0 rounded-full',
                'hover:bg-black/10 transition-colors',
                colors.text
              )}
              aria-label="Fechar notificação"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Media Content */}
          {(notification.image_url || notification.video_url) && (
            <div className="px-6 pb-4">
              {notification.image_url && (
                <img
                  src={notification.image_url}
                  alt="Imagem da notificação"
                  className="w-full h-auto max-h-64 object-cover rounded-lg border border-border/20"
                  loading="lazy"
                />
              )}
              {notification.video_url && !notification.image_url && (
                <VideoPlayer
                  url={notification.video_url}
                  className="max-h-64"
                />
              )}
            </div>
          )}

          {/* Message Content */}
          {notification.message && (
            <div className="px-6 pb-4">
              <p
                id="popup-message"
                className={cn(
                  'text-sm leading-relaxed whitespace-pre-wrap',
                  colors.text
                )}
              >
                {notification.message}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-border/20">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className={cn(
                'transition-colors',
                colors.text,
                'hover:bg-black/5'
              )}
            >
              {notification.close_label || 'Fechar'}
            </Button>

            {notification.action_url && (
              <Button
                onClick={handleAction}
                className={cn(
                  'transition-all duration-200',
                  // Different styles based on type
                  notification.type === 'promotional'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : notification.type === 'success'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : notification.type === 'warning'
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : notification.type === 'error'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                {notification.action_label || 'Entendi'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Preview component for admin interface
interface PopupNotificationPreviewProps {
  notification: Partial<PopupNotificationDisplayData>;
  className?: string;
}

export function PopupNotificationPreview({
  notification,
  className,
}: PopupNotificationPreviewProps) {
  const mockNotification: PopupNotificationDisplayData = {
    id: 'preview',
    title: notification.title || 'Título de Exemplo',
    message: notification.message || 'Esta é uma mensagem de exemplo para visualizar como a notificação aparecerá.',
    type: notification.type || 'info',
    image_url: notification.image_url || null,
    video_url: notification.video_url || null,
    action_url: notification.action_url || null,
    action_label: notification.action_label || 'Entendi',
    close_label: notification.close_label || 'Fechar',
    target_user_type: notification.target_user_type || 'all',
    target_user_ids: notification.target_user_ids || null,
    is_active: true,
    show_on_login: notification.show_on_login ?? true,
    show_on_dashboard: notification.show_on_dashboard ?? false,
    max_displays_per_user: notification.max_displays_per_user || 1,
    priority: notification.priority || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: notification.expires_at || null,
    created_by: null,
    updated_by: null,
  };

  return (
    <div className={cn('border-2 border-dashed border-gray-300 rounded-lg p-4', className)}>
      <div className="text-center text-sm text-gray-500 mb-4">
        Preview da Notificação
      </div>
      <div className="relative bg-gray-100 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
        {/* Preview container with lower z-index */}
        <div className="relative max-w-lg w-full">
          <Card
            className={cn(
              'relative w-full shadow-lg border',
              TYPE_COLORS[mockNotification.type].border,
              TYPE_COLORS[mockNotification.type].background,
            )}
          >
            <CardContent className="p-0">
              {/* Header */}
              <div className="flex items-start justify-between p-6 pb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn('flex-shrink-0', TYPE_COLORS[mockNotification.type].icon)}>
                    {React.createElement(TYPE_ICONS[mockNotification.type], { size: 24 })}
                  </div>
                  <h2
                    className={cn(
                      'text-xl font-semibold truncate',
                      TYPE_COLORS[mockNotification.type].text
                    )}
                  >
                    {mockNotification.title}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'flex-shrink-0 h-8 w-8 p-0 rounded-full',
                    'hover:bg-black/10 transition-colors',
                    TYPE_COLORS[mockNotification.type].text
                  )}
                  aria-label="Fechar notificação"
                >
                  <X size={16} />
                </Button>
              </div>

              {/* Media Content */}
              {(mockNotification.image_url || mockNotification.video_url) && (
                <div className="px-6 pb-4">
                  {mockNotification.image_url && (
                    <img
                      src={mockNotification.image_url}
                      alt="Imagem da notificação"
                      className="w-full h-auto max-h-32 object-cover rounded-lg border border-border/20"
                      loading="lazy"
                    />
                  )}
                  {mockNotification.video_url && !mockNotification.image_url && (
                    <div className="w-full h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                      🎥 Vídeo: {mockNotification.video_url}
                    </div>
                  )}
                </div>
              )}

              {/* Message Content */}
              {mockNotification.message && (
                <div className="px-6 pb-4">
                  <p
                    className={cn(
                      'text-sm leading-relaxed whitespace-pre-wrap',
                      TYPE_COLORS[mockNotification.type].text
                    )}
                  >
                    {mockNotification.message}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-border/20">
                <Button
                  variant="outline"
                  className={cn(
                    'transition-colors',
                    TYPE_COLORS[mockNotification.type].text,
                    'hover:bg-black/5'
                  )}
                >
                  {mockNotification.close_label || 'Fechar'}
                </Button>

                {mockNotification.action_url && (
                  <Button
                    className={cn(
                      'transition-all duration-200',
                      mockNotification.type === 'promotional'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : mockNotification.type === 'success'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : mockNotification.type === 'warning'
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : mockNotification.type === 'error'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    )}
                  >
                    {mockNotification.action_label || 'Entendi'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}