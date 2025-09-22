import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { popupNotificationService } from '@/services/popupNotificationService';
import type {
  PopupNotificationDisplayData,
  PopupShowContext,
  UsePopupNotificationsReturn,
  PopupNotificationViewInsert,
} from '@/types/popup-notifications';

interface UsePopupNotificationsOptions {
  context: PopupShowContext;
  sessionId?: string;
  autoShow?: boolean;
  maxConcurrentPopups?: number;
  delayBetweenPopups?: number; // milliseconds
}

export function usePopupNotifications(
  options: UsePopupNotificationsOptions
): UsePopupNotificationsReturn {
  const {
    context,
    sessionId: providedSessionId,
    autoShow = true,
    maxConcurrentPopups = 1,
    delayBetweenPopups = 2000
  } = options;

  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // State management
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPopup, setCurrentPopup] = useState<PopupNotificationDisplayData | null>(null);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [viewedPopups, setViewedPopups] = useState<Set<string>>(new Set());
  const [sessionId] = useState(() =>
    providedSessionId || popupNotificationService.generateSessionId()
  );

  // Query to fetch eligible popups
  const {
    data: eligiblePopups = [],
    isLoading,
    error,
    refetch: refreshEligiblePopups,
  } = useQuery({
    queryKey: ['popup-notifications', user?.id, context, sessionId],
    queryFn: async () => {
      if (!user?.id) return [];

      const response = await popupNotificationService.getEligiblePopups(
        user.id,
        context,
        sessionId
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.popups;
    },
    enabled: !!user?.id && !!profile,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Mutation to track popup views
  const trackViewMutation = useMutation({
    mutationFn: async (view: PopupNotificationViewInsert) => {
      const response = await popupNotificationService.trackView(view);
      if (!response.success && response.error) {
        throw new Error(response.error);
      }
      return response;
    },
    onError: (error) => {
      console.error('❌ Error tracking popup view:', error);
    },
  });

  // Mutation to update popup views
  const updateViewMutation = useMutation({
    mutationFn: async ({
      popupId,
      userId,
      updates
    }: {
      popupId: string;
      userId: string;
      updates: { action_clicked?: boolean; dismissed?: boolean };
    }) => {
      const response = await popupNotificationService.updateView(
        popupId,
        userId,
        updates,
        sessionId
      );
      if (!response.success && response.error) {
        throw new Error(response.error);
      }
      return response;
    },
    onError: (error) => {
      console.error('❌ Error updating popup view:', error);
    },
  });

  // Get unviewed popups
  const unviewedPopups = useMemo(() => {
    return eligiblePopups.filter(popup => !viewedPopups.has(popup.id));
  }, [eligiblePopups, viewedPopups]);

  // Check if there are more popups to show
  const hasMorePopups = useMemo(() => {
    return currentIndex < unviewedPopups.length - 1;
  }, [currentIndex, unviewedPopups.length]);

  // Track a popup view
  const trackView = useCallback(async (
    popupId: string,
    action: 'viewed' | 'clicked' | 'dismissed' = 'viewed'
  ) => {
    if (!user?.id) return;

    try {
      if (action === 'viewed') {
        // Track initial view
        await trackViewMutation.mutateAsync({
          popup_id: popupId,
          user_id: user.id,
          session_id: sessionId,
          user_agent: popupNotificationService.getUserAgent(),
        });
      } else {
        // Update existing view with action
        await updateViewMutation.mutateAsync({
          popupId,
          userId: user.id,
          updates: {
            action_clicked: action === 'clicked',
            dismissed: action === 'dismissed',
          },
        });
      }
    } catch (error) {
      console.error(`❌ Error tracking ${action}:`, error);
    }
  }, [user?.id, sessionId, trackViewMutation, updateViewMutation]);

  // Show next popup
  const showNextPopup = useCallback(() => {
    if (unviewedPopups.length === 0) {
      setCurrentPopup(null);
      setIsPopupVisible(false);
      return;
    }

    const nextIndex = Math.min(currentIndex, unviewedPopups.length - 1);
    const nextPopup = unviewedPopups[nextIndex];

    if (nextPopup && !viewedPopups.has(nextPopup.id)) {
      setCurrentPopup(nextPopup);
      setIsPopupVisible(true);
      setCurrentIndex(nextIndex);

      // Track view
      trackView(nextPopup.id, 'viewed');

      // Mark as viewed
      setViewedPopups(prev => new Set([...prev, nextPopup.id]));
    }
  }, [unviewedPopups, currentIndex, viewedPopups, trackView]);

  // Hide current popup
  const hideCurrentPopup = useCallback(() => {
    setCurrentPopup(null);
    setIsPopupVisible(false);

    // Auto-show next popup after delay if enabled
    if (autoShow && hasMorePopups && delayBetweenPopups > 0) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, delayBetweenPopups);
    }
  }, [autoShow, hasMorePopups, delayBetweenPopups]);

  // Handle popup action click
  const handlePopupAction = useCallback(async (popup: PopupNotificationDisplayData) => {
    await trackView(popup.id, 'clicked');

    // Navigate to action URL if provided
    if (popup.action_url) {
      if (popup.action_url.startsWith('http')) {
        // External URL
        window.open(popup.action_url, '_blank', 'noopener,noreferrer');
      } else {
        // Internal route
        window.location.href = popup.action_url;
      }
    }

    hideCurrentPopup();
  }, [trackView, hideCurrentPopup]);

  // Handle popup dismiss
  const handlePopupDismiss = useCallback(async (popup: PopupNotificationDisplayData) => {
    await trackView(popup.id, 'dismissed');
    hideCurrentPopup();
  }, [trackView, hideCurrentPopup]);

  // Auto-show first popup when data is loaded
  useEffect(() => {
    if (autoShow && !isPopupVisible && unviewedPopups.length > 0 && !currentPopup) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        showNextPopup();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [autoShow, isPopupVisible, unviewedPopups.length, currentPopup, showNextPopup]);

  // Auto-show next popup when index changes
  useEffect(() => {
    if (autoShow && !isPopupVisible && currentIndex < unviewedPopups.length) {
      const timer = setTimeout(() => {
        showNextPopup();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [autoShow, isPopupVisible, currentIndex, unviewedPopups.length, showNextPopup]);

  // Refresh popups when context or user changes
  const refreshPopups = useCallback(async () => {
    setCurrentIndex(0);
    setCurrentPopup(null);
    setIsPopupVisible(false);
    setViewedPopups(new Set());
    await refreshEligiblePopups();
  }, [refreshEligiblePopups]);

  // Return hook interface
  return {
    // Data
    eligiblePopups: unviewedPopups,
    currentPopup: isPopupVisible ? currentPopup : null,
    isLoading,
    error: error?.message || null,

    // Actions
    showNextPopup,
    hideCurrentPopup,
    trackView,
    refreshEligiblePopups: refreshPopups,

    // State
    hasMorePopups,
    currentIndex,
  };
}

// Helper hook for specific contexts
export function useLoginPopups(sessionId?: string) {
  return usePopupNotifications({
    context: 'login',
    sessionId,
    autoShow: true,
    delayBetweenPopups: 3000,
  });
}

export function useDashboardPopups(sessionId?: string) {
  return usePopupNotifications({
    context: 'dashboard',
    sessionId,
    autoShow: true,
    delayBetweenPopups: 2000,
  });
}

// Hook for managing popup notifications in admin interface
export function usePopupNotificationAdmin() {
  const queryClient = useQueryClient();

  // Query to get all popups
  const {
    data: allPopups = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['popup-notifications-admin'],
    queryFn: async () => {
      const response = await popupNotificationService.getAllPopups();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.popups;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Create popup mutation
  const createPopupMutation = useMutation({
    mutationFn: popupNotificationService.createPopup.bind(popupNotificationService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popup-notifications-admin'] });
    },
  });

  // Update popup mutation
  const updatePopupMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      popupNotificationService.updatePopup(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popup-notifications-admin'] });
    },
  });

  // Delete popup mutation
  const deletePopupMutation = useMutation({
    mutationFn: popupNotificationService.deletePopup.bind(popupNotificationService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popup-notifications-admin'] });
    },
  });

  return {
    // Data
    allPopups,
    isLoading,
    error: error?.message || null,

    // Actions
    createPopup: createPopupMutation.mutateAsync,
    updatePopup: ({ id, updates }: { id: string; updates: any }) =>
      updatePopupMutation.mutateAsync({ id, updates }),
    deletePopup: deletePopupMutation.mutateAsync,
    refresh: refetch,

    // Mutation states
    isCreating: createPopupMutation.isPending,
    isUpdating: updatePopupMutation.isPending,
    isDeleting: deletePopupMutation.isPending,
  };
}