/**
 * Audio Feedback Types
 *
 * Type definitions for the trading audio feedback system.
 */

// ============================================================================
// SOUND TYPES
// ============================================================================

export type SoundType =
  | "order_placed"
  | "order_won"
  | "order_lost"
  | "order_expired"
  | "countdown_tick"
  | "countdown_final"
  | "price_alert"
  | "error"
  | "success";

// ============================================================================
// AUDIO CONFIG
// ============================================================================

export interface AudioConfig {
  enabled: boolean;
  volume: number;
  sounds: Record<SoundType, boolean>;
}

export const defaultAudioConfig: AudioConfig = {
  enabled: true,
  volume: 0.5,
  sounds: {
    order_placed: true,
    order_won: true,
    order_lost: true,
    order_expired: true,
    countdown_tick: false,
    countdown_final: true,
    price_alert: true,
    error: true,
    success: true,
  },
};

// ============================================================================
// AUDIO FEEDBACK INTERFACE
// ============================================================================

export interface IAudioFeedback {
  initialize(): Promise<void>;
  play(soundType: SoundType): Promise<void>;
  playOrderPlaced(): Promise<void>;
  playWin(): Promise<void>;
  playLoss(): Promise<void>;
  playExpired(): Promise<void>;
  playCountdownTick(): Promise<void>;
  playCountdownFinal(): Promise<void>;
  playPriceAlert(): Promise<void>;
  playError(): Promise<void>;
  playSuccess(): Promise<void>;
  setEnabled(enabled: boolean): void;
  setVolume(volume: number): void;
  setSoundEnabled(soundType: SoundType, enabled: boolean): void;
  setConfig(config: Partial<AudioConfig>): void;
  getConfig(): AudioConfig;
  isReady(): boolean;
  testSound(soundType: SoundType): Promise<void>;
  dispose(): void;
}
