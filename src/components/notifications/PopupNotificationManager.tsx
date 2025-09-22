import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePopupNotifications } from '@/hooks/usePopupNotifications';
import { PopupNotificationOverlay } from './PopupNotificationOverlay';
import type {
  PopupNotificationManagerProps,
  PopupNotificationDisplayData,
  PopupNotificationEvent,
  PopupNotificationEventHandler,
} from '@/types/popup-notifications';

interface PopupNotificationManagerOptions extends PopupNotificationManagerProps {
  onEvent?: PopupNotificationEventHandler;
  maxConcurrentPopups?: number;
  delayBetweenPopups?: number;
  autoShow?: boolean;
}

export function PopupNotificationManager({
  showOn,
  userId: providedUserId,
  sessionId: providedSessionId,
  className,
  onEvent,
  maxConcurrentPopups = 1,
  delayBetweenPopups = 2000,
  autoShow = true,
}: PopupNotificationManagerOptions) {
  const { user, profile } = useAuth();
  const [isReady, setIsReady] = useState(false);

  // Use provided userId or fall back to authenticated user
  const userId = providedUserId || user?.id;

  // Generate session ID if not provided
  const [sessionId] = useState(() =>
    providedSessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2)}`
  );

  // Use popup notifications hook
  const {
    currentPopup,
    isLoading,
    error,
    trackView,
    hideCurrentPopup,
    hasMorePopups,
  } = usePopupNotifications({
    context: showOn,
    sessionId,
    autoShow,
    maxConcurrentPopups,
    delayBetweenPopups,
  });

  // Wait for authentication to be ready
  useEffect(() => {
    if (user && profile) {
      setIsReady(true);
    }
  }, [user, profile]);

  // Event handler helper
  const emitEvent = useCallback((event: PopupNotificationEvent) => {
    console.log('🔔 Popup Event:', event);
    onEvent?.(event);
  }, [onEvent]);

  // Handle popup action click
  const handlePopupAction = useCallback(async (popup: PopupNotificationDisplayData) => {
    try {
      // Track the action click
      await trackView(popup.id, 'clicked');

      // Emit event
      emitEvent({
        type: 'popup_action_clicked',
        popup_id: popup.id,
        action_url: popup.action_url,
      });

      // Navigate to action URL if provided
      if (popup.action_url) {
        if (popup.action_url.startsWith('http')) {
          // External URL - open in new tab
          window.open(popup.action_url, '_blank', 'noopener,noreferrer');
        } else {
          // Internal route - navigate in same window
          window.location.href = popup.action_url;
        }
      }

      // Hide the popup
      hideCurrentPopup();
    } catch (error) {
      console.error('❌ Error handling popup action:', error);
      emitEvent({
        type: 'popup_error',
        popup_id: popup.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [trackView, emitEvent, hideCurrentPopup]);

  // Handle popup dismiss
  const handlePopupDismiss = useCallback(async (popup: PopupNotificationDisplayData) => {
    try {
      // Track the dismissal
      await trackView(popup.id, 'dismissed');

      // Emit event
      emitEvent({
        type: 'popup_dismissed',
        popup_id: popup.id,
        method: 'close_button',
      });

      // Hide the popup
      hideCurrentPopup();
    } catch (error) {
      console.error('❌ Error handling popup dismiss:', error);
      emitEvent({
        type: 'popup_error',
        popup_id: popup.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [trackView, emitEvent, hideCurrentPopup]);

  // Handle popup close (X button or overlay click)
  const handlePopupClose = useCallback(async (popup: PopupNotificationDisplayData) => {
    try {
      // Track as dismissed if not already tracked
      await trackView(popup.id, 'dismissed');

      // Emit event
      emitEvent({
        type: 'popup_dismissed',
        popup_id: popup.id,
        method: 'overlay_click',
      });

      // Hide the popup
      hideCurrentPopup();
    } catch (error) {
      console.error('❌ Error handling popup close:', error);
      emitEvent({
        type: 'popup_error',
        popup_id: popup.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [trackView, emitEvent, hideCurrentPopup]);

  // Emit popup shown event when a popup appears
  useEffect(() => {
    if (currentPopup) {
      emitEvent({
        type: 'popup_shown',
        popup_id: currentPopup.id,
        context: showOn,
      });
    }
  }, [currentPopup, showOn, emitEvent]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('❌ PopupNotificationManager error:', error);
    }
  }, [error]);

  // Don't render anything if not ready or no user
  if (!isReady || !userId || isLoading) {
    return null;
  }

  // Don't render if there's an error
  if (error) {
    console.error('❌ PopupNotificationManager failed to load:', error);
    return null;
  }

  // Only render overlay if there's a current popup
  if (!currentPopup) {
    return null;
  }

  return (
    <div className={className}>
      <PopupNotificationOverlay
        notification={currentPopup}
        isVisible={!!currentPopup}
        onAction={handlePopupAction}
        onDismiss={handlePopupDismiss}
        onClose={handlePopupClose}
        onAnimationComplete={() => {
          // Callback when animation completes (optional)
        }}
      />
    </div>
  );
}

// Specialized components for specific contexts
interface LoginPopupManagerProps {
  sessionId?: string;
  onEvent?: PopupNotificationEventHandler;
  className?: string;
}

export function LoginPopupManager({
  sessionId,
  onEvent,
  className,
}: LoginPopupManagerProps) {
  return (
    <PopupNotificationManager
      showOn="login"
      sessionId={sessionId}
      onEvent={onEvent}
      className={className}
      autoShow={true}
      delayBetweenPopups={3000}
    />
  );
}

interface DashboardPopupManagerProps {
  sessionId?: string;
  onEvent?: PopupNotificationEventHandler;
  className?: string;
}

export function DashboardPopupManager({
  sessionId,
  onEvent,
  className,
}: DashboardPopupManagerProps) {
  return (
    <PopupNotificationManager
      showOn="dashboard"
      sessionId={sessionId}
      onEvent={onEvent}
      className={className}
      autoShow={true}
      delayBetweenPopups={2000}
    />
  );
}

// Hook for external components to listen to popup events
interface UsePopupEventsOptions {
  onPopupShown?: (popupId: string, context: string) => void;
  onPopupActionClicked?: (popupId: string, actionUrl: string | null) => void;
  onPopupDismissed?: (popupId: string, method: string) => void;
  onPopupError?: (popupId: string, error: string) => void;
}

export function usePopupEvents(options: UsePopupEventsOptions) {
  const handleEvent: PopupNotificationEventHandler = useCallback((event) => {
    switch (event.type) {
      case 'popup_shown':
        options.onPopupShown?.(event.popup_id, event.context);
        break;
      case 'popup_action_clicked':
        options.onPopupActionClicked?.(event.popup_id, event.action_url);
        break;
      case 'popup_dismissed':
        options.onPopupDismissed?.(event.popup_id, event.method);
        break;
      case 'popup_error':
        options.onPopupError?.(event.popup_id, event.error);
        break;
    }
  }, [options]);

  return handleEvent;
}

// Context provider for popup events (optional advanced usage)
import { createContext, useContext } from 'react';

interface PopupEventContextType {
  addEventListener: (handler: PopupNotificationEventHandler) => () => void;
  removeEventListener: (handler: PopupNotificationEventHandler) => void;
}

const PopupEventContext = createContext<PopupEventContextType | null>(null);

interface PopupEventProviderProps {
  children: React.ReactNode;
}

export function PopupEventProvider({ children }: PopupEventProviderProps) {
  const [listeners] = useState<Set<PopupNotificationEventHandler>>(new Set());

  const addEventListener = useCallback((handler: PopupNotificationEventHandler) => {
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, [listeners]);

  const removeEventListener = useCallback((handler: PopupNotificationEventHandler) => {
    listeners.delete(handler);
  }, [listeners]);

  const contextValue: PopupEventContextType = {
    addEventListener,
    removeEventListener,
  };

  return (
    <PopupEventContext.Provider value={contextValue}>
      {children}
    </PopupEventContext.Provider>
  );
}

export function usePopupEventContext() {
  const context = useContext(PopupEventContext);
  if (!context) {
    throw new Error('usePopupEventContext must be used within PopupEventProvider');
  }
  return context;
}