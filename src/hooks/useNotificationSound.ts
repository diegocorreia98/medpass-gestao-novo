import { useEffect, useCallback, useState } from 'react';
import { notificationSoundService, preloadNotificationSounds } from '@/services/notificationSoundService';

export function useNotificationSound() {
  const [isEnabled, setIsEnabled] = useState(() => {
    // Get initial state from localStorage
    const stored = localStorage.getItem('notificationSoundsEnabled');
    return stored !== null ? JSON.parse(stored) : true;
  });

  const [volume, setVolume] = useState(() => {
    // Get initial volume from localStorage
    const stored = localStorage.getItem('notificationVolume');
    return stored !== null ? parseFloat(stored) : 0.7;
  });

  // Initialize service on mount
  useEffect(() => {
    notificationSoundService.setEnabled(isEnabled);
    notificationSoundService.setVolume(volume);

    // Preload sounds for better performance
    preloadNotificationSounds().catch(console.warn);

    // Cleanup on unmount
    return () => {
      // Don't dispose the service as it's a singleton used across the app
    };
  }, []);

  // Update service when settings change
  useEffect(() => {
    notificationSoundService.setEnabled(isEnabled);
    localStorage.setItem('notificationSoundsEnabled', JSON.stringify(isEnabled));
  }, [isEnabled]);

  useEffect(() => {
    notificationSoundService.setVolume(volume);
    localStorage.setItem('notificationVolume', volume.toString());
  }, [volume]);

  const playPaymentSuccessSound = useCallback(async (customVolume?: number) => {
    try {
      await notificationSoundService.playPaymentSuccessSound({
        volume: customVolume ?? volume
      });
    } catch (error) {
      console.error('Error playing payment success sound:', error);
    }
  }, [volume]);

  const playCustomSound = useCallback(async (soundUrl: string, customVolume?: number) => {
    try {
      await notificationSoundService.playSound(soundUrl, {
        volume: customVolume ?? volume
      });
    } catch (error) {
      console.error(`Error playing custom sound ${soundUrl}:`, error);
    }
  }, [volume]);

  const toggleSounds = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  const updateVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
  }, []);

  // Test function to play a sound immediately
  const testSound = useCallback(async () => {
    try {
      await playPaymentSuccessSound();
    } catch (error) {
      console.error('Error testing sound:', error);
    }
  }, [playPaymentSuccessSound]);

  return {
    // State
    isEnabled,
    volume,

    // Actions
    playPaymentSuccessSound,
    playCustomSound,
    toggleSounds,
    updateVolume,
    testSound,

    // Setters
    setIsEnabled,
    setVolume: updateVolume,
  };
}

// Hook specifically for payment notifications
export function usePaymentNotificationSound() {
  const { playPaymentSuccessSound, isEnabled, volume } = useNotificationSound();

  const notifyPaymentSuccess = useCallback(async (beneficiaryName?: string) => {
    console.log(`🎵 Playing payment success sound for: ${beneficiaryName || 'unknown'}`, {
      isEnabled,
      volume
    });

    try {
      await playPaymentSuccessSound();
      console.log('✅ Payment success sound completed');
    } catch (error) {
      console.error('❌ Error in notifyPaymentSuccess:', error);
    }
  }, [playPaymentSuccessSound, isEnabled, volume]);

  return {
    notifyPaymentSuccess,
    isEnabled,
    volume
  };
}