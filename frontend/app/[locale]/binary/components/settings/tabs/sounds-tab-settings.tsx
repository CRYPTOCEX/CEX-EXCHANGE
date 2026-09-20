"use client";

/**
 * Sounds Tab Settings Component
 *
 * Audio feedback settings for trading events
 */

import { useCallback } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";
import { SettingSection } from "./setting-section";
import { RangeSlider, Toggle } from "../../risk-management/risk-ui";
import type { AudioConfig, SoundType, IAudioFeedback } from "@/components/binary/audio-feedback";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

export interface SoundsTabSettingsProps {
  /** @deprecated Theme is resolved by design tokens; retained for API stability. */
  darkMode?: boolean;
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
  audioConfig,
  audioFeedback,
  onAudioToggle,
  onVolumeChange,
  onSoundToggle,
}: SoundsTabSettingsProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const handleTestSound = useCallback(
    async (soundType: SoundType) => {
      await audioFeedback.initialize();
      await audioFeedback.play(soundType);
    },
    [audioFeedback]
  );

  const renderSoundGroup = (title: string, sounds: SoundItem[]) => (
    <div className="p-3 rounded-lg bg-surface-2">
      <h4 className="text-xs font-medium text-foreground mb-3">{title}</h4>
      <div className="space-y-2">
        {sounds.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between">
            <div className="flex-1">
              <span className="text-sm text-foreground">{label}</span>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTestSound(key)}
                className="p-1.5 rounded text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                title={tCommon("test_sound")}
              >
                <Play size={12} />
              </button>
              <Toggle
                size="sm"
                checked={audioConfig.sounds[key]}
                onChange={(enabled) => onSoundToggle(key, enabled)}
                ariaLabel={label}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <SettingSection
      title={tCommon("sound_effects")}
      description={t("audio_feedback_for_trading_events")}
      icon={audioConfig.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      enabled={audioConfig.enabled}
      onToggle={onAudioToggle}
    >
      <div className="space-y-4 pt-2">
        {/* Volume slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Volume</span>
            <span className="text-sm font-medium text-foreground">
              {Math.round(audioConfig.volume * 100)}%
            </span>
          </div>
          <RangeSlider
            value={audioConfig.volume}
            onChange={onVolumeChange}
            min={0}
            max={1}
            step={0.1}
            height="h-2"
            ariaLabel="Volume"
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
