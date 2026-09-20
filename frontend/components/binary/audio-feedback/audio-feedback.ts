/**
 * Binary Chart Library - Audio Feedback System
 * Sound effects for trading events
 *
 * Full replica of chart-engine audio feedback with ADSR envelope support.
 */

import type { AudioConfig, SoundType, IAudioFeedback } from "./types";
import { defaultAudioConfig } from "./types";

// ============================================================================
// SOUND DEFINITIONS
// ============================================================================

interface SoundDefinition {
  frequency: number;
  type: OscillatorType;
  duration: number;
  volume: number;
  envelope?: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  modulation?: {
    frequency: number;
    depth: number;
  };
}

const soundDefinitions: Record<SoundType, SoundDefinition[]> = {
  order_placed: [
    {
      frequency: 880,
      type: "sine",
      duration: 0.1,
      volume: 0.3,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.04 },
    },
    {
      frequency: 1320,
      type: "sine",
      duration: 0.15,
      volume: 0.3,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.09 },
    },
  ],
  order_won: [
    {
      // Pleasant victory chord - C major arpeggio
      frequency: 523, // C5
      type: "sine",
      duration: 0.12,
      volume: 0.25,
      envelope: { attack: 0.01, decay: 0.04, sustain: 0.25, release: 0.07 },
    },
    {
      frequency: 659, // E5
      type: "sine",
      duration: 0.12,
      volume: 0.25,
      envelope: { attack: 0.01, decay: 0.04, sustain: 0.25, release: 0.07 },
    },
    {
      frequency: 784, // G5
      type: "sine",
      duration: 0.18,
      volume: 0.25,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.25, release: 0.12 },
    },
  ],
  order_lost: [
    {
      // Gentle descending tone - not harsh sawtooth
      frequency: 350,
      type: "sine",
      duration: 0.15,
      volume: 0.15,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.15, release: 0.09 },
    },
    {
      frequency: 280,
      type: "sine",
      duration: 0.2,
      volume: 0.12,
      envelope: { attack: 0.02, decay: 0.06, sustain: 0.12, release: 0.12 },
    },
  ],
  order_expired: [
    {
      frequency: 440,
      type: "sine",
      duration: 0.2,
      volume: 0.2,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.09 },
    },
    {
      frequency: 330,
      type: "sine",
      duration: 0.3,
      volume: 0.15,
      envelope: { attack: 0.05, decay: 0.1, sustain: 0.2, release: 0.15 },
    },
  ],
  countdown_tick: [
    {
      // Soft, subtle tick - lower frequency and very short
      frequency: 600,
      type: "sine",
      duration: 0.03,
      volume: 0.05,
      envelope: { attack: 0.002, decay: 0.01, sustain: 0.05, release: 0.018 },
    },
  ],
  countdown_final: [
    {
      // Gentle ascending tone - not harsh
      frequency: 700,
      type: "sine",
      duration: 0.08,
      volume: 0.15,
      envelope: { attack: 0.01, decay: 0.02, sustain: 0.15, release: 0.05 },
    },
    {
      frequency: 900,
      type: "sine",
      duration: 0.12,
      volume: 0.15,
      envelope: { attack: 0.01, decay: 0.03, sustain: 0.15, release: 0.08 },
    },
  ],
  price_alert: [
    {
      frequency: 800,
      type: "sine",
      duration: 0.15,
      volume: 0.3,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.09 },
    },
    {
      frequency: 1000,
      type: "sine",
      duration: 0.15,
      volume: 0.3,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.09 },
    },
    {
      frequency: 800,
      type: "sine",
      duration: 0.15,
      volume: 0.3,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.09 },
    },
  ],
  error: [
    {
      frequency: 200,
      type: "square",
      duration: 0.15,
      volume: 0.2,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.2, release: 0.09 },
    },
    {
      frequency: 150,
      type: "square",
      duration: 0.2,
      volume: 0.15,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.15, release: 0.14 },
    },
  ],
  success: [
    {
      frequency: 600,
      type: "sine",
      duration: 0.1,
      volume: 0.25,
      envelope: { attack: 0.01, decay: 0.03, sustain: 0.25, release: 0.06 },
    },
    {
      frequency: 900,
      type: "sine",
      duration: 0.15,
      volume: 0.25,
      envelope: { attack: 0.01, decay: 0.03, sustain: 0.25, release: 0.11 },
    },
  ],
};

// ============================================================================
// SHARED AUDIO CONTEXT (singleton to prevent multiple contexts)
// ============================================================================

let sharedAudioContext: AudioContext | null = null;
let audioContextInitialized = false;
let audioContextError = false;
let hasUserInteracted = false;

// Track user interaction globally - required for AudioContext autoplay policy
if (typeof window !== "undefined") {
  const markInteracted = () => {
    hasUserInteracted = true;
    // Try to resume any suspended context after user interaction
    if (sharedAudioContext?.state === "suspended") {
      sharedAudioContext.resume().catch(() => {});
    }
  };

  // Listen for user interaction events (once each)
  ["click", "touchstart", "keydown", "mousedown"].forEach((event) => {
    window.addEventListener(event, markInteracted, { once: true, passive: true });
  });
}

async function getSharedAudioContext(): Promise<AudioContext | null> {
  // If we've already had an error, don't try again
  if (audioContextError) return null;

  // Don't create AudioContext until user has interacted with the page
  if (!hasUserInteracted) {
    return null;
  }

  // Return existing context if available and running
  if (sharedAudioContext) {
    try {
      // Check if context is in a valid state
      if (sharedAudioContext.state === "closed") {
        sharedAudioContext = null;
        audioContextInitialized = false;
      } else if (sharedAudioContext.state === "suspended") {
        await sharedAudioContext.resume();
      }
      return sharedAudioContext;
    } catch {
      // Context is in bad state, recreate it
      sharedAudioContext = null;
      audioContextInitialized = false;
    }
  }

  // Create new context
  if (!audioContextInitialized) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        audioContextError = true;
        return null;
      }

      sharedAudioContext = new AudioContextClass();

      // Handle errors on the audio context
      sharedAudioContext.onstatechange = () => {
        if (sharedAudioContext?.state === "closed") {
          sharedAudioContext = null;
          audioContextInitialized = false;
        }
      };

      // Resume if suspended (required for autoplay policy)
      if (sharedAudioContext.state === "suspended") {
        await sharedAudioContext.resume();
      }

      audioContextInitialized = true;
    } catch (error) {
      // Silently fail - don't spam console with audio errors
      audioContextError = true;
      return null;
    }
  }

  return sharedAudioContext;
}

// ============================================================================
// AUDIO FEEDBACK CLASS
// ============================================================================

export class AudioFeedback implements IAudioFeedback {
  private config: AudioConfig;
  private isInitialized: boolean = false;

  constructor(config: Partial<AudioConfig> = {}) {
    this.config = { ...defaultAudioConfig, ...config };
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const ctx = await getSharedAudioContext();
      if (ctx) {
        this.isInitialized = true;
      }
    } catch (error) {
      console.warn("Audio feedback initialization failed:", error);
    }
  }

  /**
   * Play a sound effect
   */
  async play(soundType: SoundType): Promise<void> {
    if (!this.config.enabled || !this.config.sounds[soundType]) return;

    // Get shared audio context
    const audioContext = await getSharedAudioContext();
    if (!audioContext) return;

    // Mark as initialized since we have a working context
    this.isInitialized = true;

    const definitions = soundDefinitions[soundType];
    if (!definitions) return;

    const masterVolume = this.config.volume;
    let delay = 0;

    for (const def of definitions) {
      this.playTone(audioContext, def, delay, masterVolume);
      delay += def.duration * 0.8; // Overlap slightly
    }
  }

  /**
   * Play a single tone with ADSR envelope
   */
  private playTone(
    audioContext: AudioContext,
    def: SoundDefinition,
    delay: number,
    masterVolume: number
  ): void {
    try {
      const now = audioContext.currentTime + delay;
      const volume = def.volume * masterVolume;

      // Create oscillator
      const oscillator = audioContext.createOscillator();
      oscillator.type = def.type;
      oscillator.frequency.setValueAtTime(def.frequency, now);

      // Create gain node for envelope
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0, now);

      // Apply envelope
      const env = def.envelope || {
        attack: 0.01,
        decay: 0.05,
        sustain: 0.5,
        release: def.duration * 0.3,
      };

      gainNode.gain.linearRampToValueAtTime(volume, now + env.attack);
      gainNode.gain.linearRampToValueAtTime(
        volume * env.sustain,
        now + env.attack + env.decay
      );
      gainNode.gain.setValueAtTime(
        volume * env.sustain,
        now + def.duration - env.release
      );
      gainNode.gain.linearRampToValueAtTime(0, now + def.duration);

      // Apply frequency modulation if specified
      if (def.modulation) {
        const modOsc = audioContext.createOscillator();
        const modGain = audioContext.createGain();

        modOsc.frequency.setValueAtTime(def.modulation.frequency, now);
        modGain.gain.setValueAtTime(def.modulation.depth, now);

        modOsc.connect(modGain);
        modGain.connect(oscillator.frequency);

        modOsc.start(now);
        modOsc.stop(now + def.duration);
      }

      // Connect and play
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(now);
      oscillator.stop(now + def.duration + 0.1);
    } catch (error) {
      // Silently ignore audio errors - don't break the app for audio issues
      console.warn("Audio playback error:", error);
    }
  }

  /**
   * Play order placed sound
   */
  playOrderPlaced(): Promise<void> {
    return this.play("order_placed");
  }

  /**
   * Play win sound
   */
  playWin(): Promise<void> {
    return this.play("order_won");
  }

  /**
   * Play loss sound
   */
  playLoss(): Promise<void> {
    return this.play("order_lost");
  }

  /**
   * Play expired sound
   */
  playExpired(): Promise<void> {
    return this.play("order_expired");
  }

  /**
   * Play countdown tick
   */
  playCountdownTick(): Promise<void> {
    return this.play("countdown_tick");
  }

  /**
   * Play final countdown
   */
  playCountdownFinal(): Promise<void> {
    return this.play("countdown_final");
  }

  /**
   * Play price alert
   */
  playPriceAlert(): Promise<void> {
    return this.play("price_alert");
  }

  /**
   * Play error sound
   */
  playError(): Promise<void> {
    return this.play("error");
  }

  /**
   * Play success sound
   */
  playSuccess(): Promise<void> {
    return this.play("success");
  }

  /**
   * Enable/disable audio
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Enable/disable specific sound
   */
  setSoundEnabled(soundType: SoundType, enabled: boolean): void {
    this.config.sounds[soundType] = enabled;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<AudioConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current config
   */
  getConfig(): AudioConfig {
    return { ...this.config };
  }

  /**
   * Check if audio is supported and initialized
   */
  isReady(): boolean {
    return this.isInitialized && sharedAudioContext !== null;
  }

  /**
   * Test a specific sound (plays regardless of enabled state)
   */
  async testSound(soundType: SoundType): Promise<void> {
    // Temporarily enable for testing
    const wasEnabled = this.config.sounds[soundType];
    const wasGlobalEnabled = this.config.enabled;

    this.config.enabled = true;
    this.config.sounds[soundType] = true;

    await this.play(soundType);

    // Restore settings
    this.config.sounds[soundType] = wasEnabled;
    this.config.enabled = wasGlobalEnabled;
  }

  /**
   * Cleanup - note: we don't close the shared context, just mark this instance as not initialized
   */
  dispose(): void {
    this.isInitialized = false;
    // Don't close the shared audio context - other instances may be using it
  }
}

// ============================================================================
// SINGLETON INSTANCE (for global use)
// ============================================================================

let globalAudioFeedback: AudioFeedback | null = null;

export function getAudioFeedback(config?: Partial<AudioConfig>): AudioFeedback {
  if (!globalAudioFeedback) {
    globalAudioFeedback = new AudioFeedback(config);
  }
  return globalAudioFeedback;
}

export function disposeGlobalAudioFeedback(): void {
  if (globalAudioFeedback) {
    globalAudioFeedback.dispose();
    globalAudioFeedback = null;
  }
}

// Clean up on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", disposeGlobalAudioFeedback);
}

export default AudioFeedback;
