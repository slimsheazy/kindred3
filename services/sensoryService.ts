
/**
 * SensoryService: Orchestrates the 'Resonance' of Kindred.
 * Manages specialized haptic patterns (vibration) and synthesized audio tones
 * to create a visceral, biological connection between partners.
 */
class SensoryService {
  private audioCtx: AudioContext | null = null;
  private breathingInterval: any = null;

  private initAudio() {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('AudioContext not supported');
      }
    }
  }

  /**
   * Heartbeat Pulse: Used for sending/receiving Love Pulses.
   * Pattern: Double biological beat (lub-dub).
   */
  pulse() {
    if ('vibrate' in navigator) {
      // lub-dub... lub-dub
      navigator.vibrate([100, 80, 150, 400, 100, 80, 150]);
    }
    this.playTone(120, 'sine', 0.15, 0.6, true);
  }

  /**
   * Success Resonance: Used for goal completion or milestone achievement.
   * Pattern: Ascending shimmer.
   */
  success() {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 30, 30, 30, 60, 60, 150]);
    }
    this.playSweep(300, 900, 0.6);
  }

  /**
   * Alert/Intervention: Used for mediation tension or critical errors.
   * Pattern: Sharp, stuttering friction shiver.
   */
  alert() {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 30, 200, 30, 200, 30, 500]);
    }
    this.playTone(60, 'sawtooth', 0.2, 0.8);
  }

  /**
   * Ripple: Used when a partner enters the shared space.
   * Pattern: Expanding pulses.
   */
  ripple() {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 100, 30, 150, 60, 200, 100]);
    }
    this.playSweep(200, 100, 1.0);
  }

  /**
   * Shiver: Used for rising tension in mediation.
   * Pattern: High-frequency erratic vibration.
   */
  shiver() {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 200]);
    }
    this.playTone(50, 'square', 0.1, 0.3);
  }

  /**
   * Shimmer: Used for discovery or "Lens" interpretation.
   * Pattern: Gentle micro-taps.
   */
  shimmer() {
    if ('vibrate' in navigator) {
      navigator.vibrate([5, 50, 5, 50, 5, 100]);
    }
    this.playTone(880, 'sine', 0.05, 0.4);
  }

  /**
   * Emotion Resonance: Tonal feedback mapped to emotional spectrum.
   */
  emotionResonance(freq: number) {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
    this.playTone(freq, 'sine', 0.1, 0.5);
  }

  /**
   * Grounding Breath: rhythmic pulsing for calming interactions.
   */
  startBreathing() {
    if (this.breathingInterval) return;
    this.breathingInterval = setInterval(() => {
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      this.playTone(100, 'sine', 0.02, 2.0);
    }, 4000);
  }

  stopBreathing() {
    if (this.breathingInterval) {
      clearInterval(this.breathingInterval);
      this.breathingInterval = null;
    }
  }

  /**
   * Selection/Soft Tap: Used for navigation.
   */
  tap() {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    this.playTone(440, 'sine', 0.05, 0.1);
  }

  private playTone(freq: number, type: OscillatorType, volume: number, duration: number, isDouble = false) {
    this.initAudio();
    if (!this.audioCtx || this.audioCtx.state === 'suspended') return;

    const createOsc = (startTime: number) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    createOsc(this.audioCtx.currentTime);
    if (isDouble) {
      createOsc(this.audioCtx.currentTime + 0.18);
    }
  }

  private playSweep(startFreq: number, endFreq: number, duration: number) {
    this.initAudio();
    if (!this.audioCtx || this.audioCtx.state === 'suspended') return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.frequency.setValueAtTime(startFreq, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, this.audioCtx.currentTime + duration);
    gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }

  async resume() {
    if (this.audioCtx?.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }
}

export const sensoryService = new SensoryService();
