class NotificationSoundService {
  private audioContext: AudioContext | null = null;
  private audioCache: Map<string, AudioBuffer> = new Map();
  private isEnabled: boolean = true;
  private volume: number = 0.7;

  constructor() {
    // Initialize audio context when user interacts with page
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    // Create audio context on first user interaction
    const initContext = () => {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🎵 Audio context initialized');
      }
    };

    // Listen for first user interaction to enable audio
    ['click', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, initContext, { once: true });
    });
  }

  private async loadAudio(url: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      await this.resumeAudioContext();
    }

    if (this.audioCache.has(url)) {
      return this.audioCache.get(url)!;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

      this.audioCache.set(url, audioBuffer);
      console.log(`🎵 Audio loaded and cached: ${url}`);

      return audioBuffer;
    } catch (error) {
      console.error('❌ Error loading audio:', error);
      throw error;
    }
  }

  private async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('🎵 Audio context resumed');
    }
  }

  async playSound(soundUrl: string, options: { volume?: number; force?: boolean } = {}) {
    // Check if sounds are enabled (unless forced)
    if (!this.isEnabled && !options.force) {
      console.log('🔇 Sounds are disabled');
      return;
    }

    try {
      await this.resumeAudioContext();

      const audioBuffer = await this.loadAudio(soundUrl);
      const source = this.audioContext!.createBufferSource();
      const gainNode = this.audioContext!.createGain();

      // Set volume
      const currentVolume = options.volume ?? this.volume;
      gainNode.gain.setValueAtTime(currentVolume, this.audioContext!.currentTime);

      // Connect nodes
      source.buffer = audioBuffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      // Play sound
      source.start(0);
      console.log(`🎵 Playing sound: ${soundUrl} (volume: ${currentVolume})`);

    } catch (error) {
      console.error('❌ Error playing sound:', error);

      // Fallback to HTML5 Audio API
      try {
        const audio = new Audio(soundUrl);
        audio.volume = options.volume ?? this.volume;
        await audio.play();
        console.log(`🎵 Fallback audio played: ${soundUrl}`);
      } catch (fallbackError) {
        console.error('❌ Fallback audio also failed:', fallbackError);

        // Final fallback: generated beep sound for payment success
        if (soundUrl.includes('payment-success')) {
          try {
            await this.playGeneratedPaymentSound(options.volume ?? this.volume);
          } catch (generatedError) {
            console.error('❌ Generated sound also failed:', generatedError);
          }
        }
      }
    }
  }

  // Generate a payment success sound using Web Audio API
  private async playGeneratedPaymentSound(volume: number = 0.7): Promise<void> {
    await this.resumeAudioContext();

    const playBeep = (frequency: number, duration: number, startTime: number) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext!.currentTime + startTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.3, this.audioContext!.currentTime + startTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext!.currentTime + startTime + duration);

      oscillator.start(this.audioContext!.currentTime + startTime);
      oscillator.stop(this.audioContext!.currentTime + startTime + duration);
    };

    // Play a nice "cha-ching" like sound sequence
    playBeep(800, 0.1, 0);     // First note
    playBeep(1000, 0.1, 0.1);  // Second note
    playBeep(1200, 0.2, 0.2);  // Final note (longer)

    console.log('🎵 Generated payment success sound played');
  }

  // Specific method for payment success sound
  async playPaymentSuccessSound(options: { volume?: number } = {}) {
    const soundUrl = '/sounds/payment-success.mp3';
    await this.playSound(soundUrl, {
      ...options,
      force: true // Always play payment sounds, even if sounds are disabled
    });
  }

  // Configuration methods
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log(`🎵 Notification sounds ${enabled ? 'enabled' : 'disabled'}`);
  }

  isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    console.log(`🎵 Volume set to: ${this.volume}`);
  }

  getVolume(): number {
    return this.volume;
  }

  // Preload sounds for better performance
  async preloadSounds() {
    try {
      await this.loadAudio('/sounds/payment-success.mp3');
      console.log('🎵 Notification sounds preloaded');
    } catch (error) {
      console.warn('⚠️ Could not preload notification sounds:', error);
    }
  }

  // Clean up resources
  dispose() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      console.log('🎵 Audio context disposed');
    }
    this.audioCache.clear();
  }
}

// Create singleton instance
export const notificationSoundService = new NotificationSoundService();

// Export for easier usage
export const playPaymentSuccessSound = (options?: { volume?: number }) =>
  notificationSoundService.playPaymentSuccessSound(options);

export const preloadNotificationSounds = () =>
  notificationSoundService.preloadSounds();

export default notificationSoundService;