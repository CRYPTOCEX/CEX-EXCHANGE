/**
 * Binary Trading Audio Feedback
 *
 * Audio feedback system for trading events.
 * Provides programmatic audio tones for various trading actions.
 *
 * @example
 * ```tsx
 * import { AudioFeedback, getAudioFeedback } from "@/components/binary/audio-feedback";
 *
 * // Create instance
 * const audio = new AudioFeedback({ enabled: true, volume: 0.5 });
 *
 * // Or use global singleton
 * const audio = getAudioFeedback();
 *
 * // Play sounds
 * audio.playWin();
 * audio.playLoss();
 * audio.playOrderPlaced();
 * ```
 */

// Types
export type { AudioConfig, SoundType, IAudioFeedback } from "./types";
export { defaultAudioConfig } from "./types";

// Audio Feedback
export {
  AudioFeedback,
  getAudioFeedback,
  disposeGlobalAudioFeedback,
} from "./audio-feedback";
