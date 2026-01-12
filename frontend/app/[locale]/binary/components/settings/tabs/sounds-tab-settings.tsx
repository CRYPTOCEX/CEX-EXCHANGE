"use client";

/**
 * Sounds Tab Settings Component
 *
 * Audio feedback settings for trading events
 */

import { useCallback } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";
import { SettingSection } from "./setting-section";
import type { AudioConfig, SoundType, IAudioFeedback } from "@/components/binary/audio-feedback";

// ============================================================================
// TYPES
// ============================================================================

export interface SoundsTabSettingsProps {
  darkMode: boolean;
  audioConfig: AudioConfig;
  audioFeedback: IAudioFeedback;
  onAudioToggle: (enabled: boolean) => void;
  onVolumeChange: (volume: number) => void;
  onSoundToggle: (soundType: SoundType, enabled: boolean) => void;
}

// ============================================================================
// SOUND GROUPS CONFIGURATION
// ============================================================================

interface SoundItem {
  key: SoundType;
  label: string;
  description: string;
}

const TRADE_RESULT_SOUNDS: SoundItem[] = [
  { key: "order_won", label: "Win Sound", description: "Play when trade wins" },
  { key: "order_lost", label: "Loss Sound", description: "Play when trade loses" },
];

const ORDER_EVENT_SOUNDS: SoundItem[] = [
  { key: "order_placed", label: "Order Placed", description: "Play when order is placed" },
  { key: "order_expired", label: "Order Expired", description: "Play when order expires" },
];

const COUNTDOWN_SOUNDS: SoundItem[] = [
  { key: "countdown_tick", label: "Countdown Tick", description: "Play at 5-4 seconds" },
  { key: "countdown_final", label: "Final Countdown", description: "Play at 2-1 seconds" },
];

const ALERT_SOUNDS: SoundItem[] = [
  { key: "price_alert", label: "Price Alert", description: "Play when price alert triggers" },
  { key: "error", label: "Error Sound", description: "Play on errors" },
  { key: "success", label: "Success Sound", description: "Play on success" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function SoundsTabSettings({
  darkMode,
  audioConfig,
  audioFeedback,
  onAudioToggle,
  onVolumeChange,
  onSoundToggle,
}: SoundsTabSettingsProps) {
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const mutedClass = darkMode ? "text-zinc-400" : "text-gray-500";
  const hoverBg = darkMode ? "hover:bg-zinc-800/50" : "hover:bg-gray-100";

  const handleTestSound = useCallback(
    async (soundType: SoundType) => {
      await audioFeedback.initialize();
      await audioFeedback.play(soundType);
    },
    [audioFeedback]
  );

  const renderSoundGroup = (title: string, sounds: SoundItem[]) => (
    <div className={`p-3 rounded-lg ${darkMode ? "bg-zinc-800" : "bg-gray-100"}`}>
      <h4 className={`text-xs font-medium ${textClass} mb-3`}>{title}</h4>
      <div className="space-y-2">
        {sounds.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between">
            <div className="flex-1">
              <span className={`text-sm ${textClass}`}>{label}</span>
              <p className={`text-xs ${mutedClass}`}>{description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTestSound(key)}
                className={`p-1.5 rounded ${hoverBg} ${mutedClass}`}
                title="Test sound"
              >
                <Play size={12} />
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={audioConfig.sounds[key]}
                  onChange={(e) => onSoundToggle(key, e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={`w-8 h-4 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all ${
                    audioConfig.sounds[key] ? "bg-blue-500" : darkMode ? "bg-zinc-600" : "bg-gray-300"
                  }`}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <SettingSection
      title="Sound Effects"
      description="Audio feedback for trading events"
      icon={audioConfig.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      enabled={audioConfig.enabled}
      onToggle={onAudioToggle}
      darkMode={darkMode}
      accentColor="blue"
    >
      <div className="space-y-4 pt-2">
        {/* Volume slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${mutedClass}`}>Volume</span>
            <span className={`text-sm font-medium ${textClass}`}>
              {Math.round(audioConfig.volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={audioConfig.volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className={`w-full h-2 rounded-full appearance-none cursor-pointer ${
              darkMode ? "bg-zinc-700" : "bg-gray-200"
            } [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer`}
          />
        </div>

        {/* Sound toggles */}
        <div className="space-y-2">
          {renderSoundGroup("Trade Results", TRADE_RESULT_SOUNDS)}
          {renderSoundGroup("Order Events", ORDER_EVENT_SOUNDS)}
          {renderSoundGroup("Countdown", COUNTDOWN_SOUNDS)}
          {renderSoundGroup("Alerts", ALERT_SOUNDS)}
        </div>
      </div>
    </SettingSection>
  );
}

export default SoundsTabSettings;
