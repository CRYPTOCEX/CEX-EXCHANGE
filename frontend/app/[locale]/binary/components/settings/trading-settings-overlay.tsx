"use client";

/**
 * Trading Settings Overlay
 *
 * Full-screen settings panel that overlays the chart area.
 * Uses horizontal tabs and collapsible settings sections.
 * Each tab content is in a separate component for maintainability.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  X,
  Settings,
  Zap,
  TrendingUp,
  Shield,
  Target,
  AlertTriangle,
  Volume2,
  Bell,
  Type,
  ListChecks,
} from "lucide-react";
import { type MartingaleState } from "./martingale-settings";
import { useRiskManagement } from "../risk-management/use-risk-management";
import LimitOrderForm from "../risk-management/limit-order-form";
import PendingLimitsPanel from "../risk-management/pending-limits-panel";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import {
  AudioFeedback,
  defaultAudioConfig,
  type AudioConfig,
  type SoundType,
} from "@/components/binary/audio-feedback";
import { useTradingSettingsStore } from "@/store/trade/use-trading-settings-store";

// Import tab components
import {
  TradingTabSettings,
  ProtectionTabSettings,
  SizingTabSettings,
  SoundsTabSettings,
  NotificationsTabSettings,
  DisplayTabSettings,
} from "./tabs";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

export type SettingsTab = "trading" | "protection" | "sizing" | "sounds" | "notifications" | "display" | "limits";

interface TradingSettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * @deprecated No longer read. The overlay is built on design tokens, which
   * are already theme-aware; kept so the desktop and mobile layouts that pass
   * it keep compiling.
   */
  darkMode?: boolean;
  /** Initial tab to show when overlay opens */
  initialTab?: SettingsTab;
  // Trading data
  balance: number;
  currentPrice: number;
  symbol: string;
  // Trading stats for position sizing
  winRate?: number;
  avgProfit?: number;
  avgLoss?: number;
  // One-click trading
  oneClickEnabled: boolean;
  onOneClickChange: (enabled: boolean) => void;
  oneClickMaxAmount: number;
  // Martingale
  martingaleState: MartingaleState;
  onMartingaleChange: (state: MartingaleState) => void;
  currentAmount: number;
  // Risk management callbacks
  onPlaceOrder?: (side: "RISE" | "FALL", amount: number, expiryMinutes: number) => Promise<boolean>;
  onSetAmount?: (amount: number) => void;
  /** When true, disables enter/exit animations for instant overlay switching on mobile */
  isMobile?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TradingSettingsOverlay({
  isOpen,
  onClose,
  initialTab,
  balance,
  currentPrice,
  symbol,
  winRate = 55,
  avgProfit = 0,
  avgLoss = 0,
  oneClickEnabled,
  onOneClickChange,
  oneClickMaxAmount,
  martingaleState,
  onMartingaleChange,
  currentAmount,
  onPlaceOrder = async () => false,
  onSetAmount = () => {},
  isMobile = false,
}: TradingSettingsOverlayProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || "trading");

  // Limit orders need the live payout and the selected expiry. Both already live in
  // the binary store, so they are read here rather than threaded through as props.
  const selectedExpiryMinutes = useBinaryStore((s) => s.selectedExpiryMinutes);
  const getProfitForSelectedLevel = useBinaryStore((s) => s.getProfitForSelectedLevel);
  const profitPercentage = getProfitForSelectedLevel();

  // Update active tab when initialTab changes (e.g., opening from notification settings)
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Risk management hook
  const riskManagement = useRiskManagement({
    balance,
    currentPrice,
    onLimitOrderTriggered: useCallback(
      async (order) => {
        await onPlaceOrder(order.side, order.amount, order.expiryMinutes);
      },
      [onPlaceOrder]
    ),
    onDailyLimitReached: useCallback(() => {
      console.log("Daily limit reached!");
    }, []),
    onCooldownStarted: useCallback((endsAt) => {
      console.log("Cooldown started, ends at:", new Date(endsAt));
    }, []),
  });

  // Check if trading is allowed
  const tradingStatus = useMemo(() => {
    return riskManagement.canTrade();
  }, [riskManagement]);

  // Count active features
  const activeFeatures = useMemo(() => {
    let count = 0;
    if (oneClickEnabled) count++;
    if (martingaleState.enabled) count++;
    if (riskManagement.state.stopLoss.enabled) count++;
    if (riskManagement.state.takeProfit.enabled) count++;
    if (riskManagement.state.dailyLimit.enabled) count++;
    if (riskManagement.state.cooldown.enabled) count++;
    return count;
  }, [oneClickEnabled, martingaleState.enabled, riskManagement.state]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Tab configuration
  const tabs = [
    { id: "trading" as const, label: tCommon("trading"), icon: Zap },
    { id: "protection" as const, label: t("protection"), icon: Shield },
    { id: "sizing" as const, label: tCommon("sizing"), icon: Target },
    { id: "limits" as const, label: tCommon("limits"), icon: ListChecks },
    { id: "display" as const, label: tCommon("display"), icon: Type },
    { id: "sounds" as const, label: t("sounds"), icon: Volume2 },
    { id: "notifications" as const, label: tCommon("notifications"), icon: Bell },
  ];

  // Audio feedback from global store (auto-persists to localStorage)
  const audioConfig = useTradingSettingsStore((state) => state.audio);
  const setAudioEnabled = useTradingSettingsStore((state) => state.setAudioEnabled);
  const setAudioVolume = useTradingSettingsStore((state) => state.setAudioVolume);
  const setSoundEnabled = useTradingSettingsStore((state) => state.setSoundEnabled);

  const [audioFeedback] = useState(() => new AudioFeedback(audioConfig));

  // Sync audioFeedback instance when config changes
  useEffect(() => {
    audioFeedback.setConfig(audioConfig);
  }, [audioConfig, audioFeedback]);

  // Audio toggle handlers - now use global store
  const handleAudioToggle = useCallback((enabled: boolean) => {
    setAudioEnabled(enabled);
  }, [setAudioEnabled]);

  const handleVolumeChange = useCallback((volume: number) => {
    setAudioVolume(volume);
  }, [setAudioVolume]);

  const handleSoundToggle = useCallback((soundType: SoundType, enabled: boolean) => {
    setSoundEnabled(soundType, enabled);
  }, [setSoundEnabled]);

  // On mobile, skip animations for instant overlay switching
  if (!isOpen) return null;

  // Wrapper components - use div on mobile (no animation), m.div on desktop
  const Wrapper = isMobile ? 'div' : m.div;
  const wrapperProps = isMobile ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  };

  const BackdropWrapper = isMobile ? 'div' : m.div;
  const backdropProps = isMobile ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const PanelWrapper = isMobile ? 'div' : m.div;
  const panelProps = isMobile ? {} : {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
    transition: { type: "spring" as const, damping: 30, stiffness: 400 },
  };

  const content = (
    <Wrapper
      {...wrapperProps}
      className="absolute inset-0 z-50 flex"
    >
      {/* Backdrop — `overlay` is dark in BOTH themes on purpose; a scrim has to
          darken what is behind it regardless of the page theme. */}
      <BackdropWrapper
        {...backdropProps}
        className="absolute inset-0 bg-overlay/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Settings Panel */}
      <PanelWrapper
        {...panelProps}
        className="relative ml-auto h-full w-full max-w-2xl flex flex-col bg-card border-l border-border"
      >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">{tCommon("trading_settings")}</h2>
                  <p className="text-xs text-muted-foreground">
                    {t("configure_your_trading_preferences")}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label={t("close_settings")}
                className="p-2 rounded-lg transition-colors text-muted-foreground hover:bg-surface-3 hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stats bar — a summary of what is switched on, so the accent marks
                "active" and nothing here claims to be a success or a warning. */}
            <div className="px-5 py-2.5 border-b border-border bg-surface-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${activeFeatures > 0 ? "bg-primary" : "bg-border-strong"}`} />
                    <span className="text-muted-foreground">{activeFeatures} Active</span>
                  </div>
                  {oneClickEnabled && (
                    <div className="flex items-center gap-1.5">
                      <Zap size={12} className="text-primary" />
                      <span className="text-muted-foreground">1-Click</span>
                    </div>
                  )}
                  {martingaleState.enabled && (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={12} className="text-primary" />
                      <span className="text-muted-foreground">Martingale</span>
                    </div>
                  )}
                  {riskManagement.state.dailyLimit.enabled && (
                    <div className="flex items-center gap-1.5">
                      <Shield size={12} className="text-primary" />
                      <span className="text-muted-foreground">Protected</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {symbol}
                </span>
              </div>
            </div>

            {/* Horizontal Tabs */}
            <div className="flex items-center gap-1 px-5 py-3 border-b border-border overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-pressed={isActive}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-surface-3 text-foreground"
                        : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                    }`}
                  >
                    <Icon size={14} className={isActive ? "text-primary" : undefined} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Trading blocked warning — the one strip in this overlay that has
                genuinely earned a status colour. The hue is on the icon and the
                message sits on `foreground`: 14px `text-destructive` on its own
                tint measures 3.64:1 in light mode, under the 4.5:1 floor. */}
            {!tradingStatus.allowed && (
              <div
                role="alert"
                className="px-5 py-3 bg-destructive/10 border-b border-destructive/30"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-destructive shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    {tCommon("trading_blocked")}: {tradingStatus.reason}
                  </span>
                </div>
              </div>
            )}

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* Trading Tab */}
                {activeTab === "trading" && (
                  <m.div
                    key="trading"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <TradingTabSettings
                      oneClickEnabled={oneClickEnabled}
                      onOneClickChange={onOneClickChange}
                      oneClickMaxAmount={oneClickMaxAmount}
                      martingaleState={martingaleState}
                      onMartingaleChange={onMartingaleChange}
                      balance={balance}
                      currentAmount={currentAmount}
                    />
                  </m.div>
                )}

                {/* Protection Tab */}
                {activeTab === "protection" && (
                  <m.div
                    key="protection"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ProtectionTabSettings
                      balance={balance}
                      dailyLimit={riskManagement.state.dailyLimit}
                      stopLoss={riskManagement.state.stopLoss}
                      takeProfit={riskManagement.state.takeProfit}
                      cooldown={riskManagement.state.cooldown}
                      updateDailyLimit={riskManagement.updateDailyLimit}
                      updateStopLoss={riskManagement.updateStopLoss}
                      updateTakeProfit={riskManagement.updateTakeProfit}
                      updateCooldown={riskManagement.updateCooldown}
                      overrideDailyLimit={riskManagement.overrideDailyLimit}
                      overrideCooldown={riskManagement.overrideCooldown}
                    />
                  </m.div>
                )}

                {/* Position Sizing Tab */}
                {activeTab === "sizing" && (
                  <m.div
                    key="sizing"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <SizingTabSettings
                      balance={balance}
                      winRate={winRate}
                      avgProfit={avgProfit}
                      avgLoss={avgLoss}
                      positionSizing={riskManagement.state.positionSizing}
                      updatePositionSizing={riskManagement.updatePositionSizing}
                      onSetAmount={onSetAmount}
                    />
                  </m.div>
                )}

                {/* Limit Orders Tab */}
                {activeTab === "limits" && (
                  <m.div
                    key="limits"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    <PendingLimitsPanel
                      orders={riskManagement.getPendingLimitOrders()}
                      currentPrice={currentPrice}
                      onCancel={riskManagement.cancelLimitOrder}
                    />
                    <LimitOrderForm
                      currentPrice={currentPrice}
                      symbol={symbol}
                      balance={balance}
                      profitPercentage={profitPercentage}
                      expiryMinutes={selectedExpiryMinutes}
                      onSubmit={(data) => riskManagement.addLimitOrder(data, symbol)}
                    />
                  </m.div>
                )}

                {/* Display Tab */}
                {activeTab === "display" && (
                  <m.div
                    key="display"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <DisplayTabSettings />
                  </m.div>
                )}

                {/* Sounds Tab */}
                {activeTab === "sounds" && (
                  <m.div
                    key="sounds"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <SoundsTabSettings
                      audioConfig={audioConfig}
                      audioFeedback={audioFeedback}
                      onAudioToggle={handleAudioToggle}
                      onVolumeChange={handleVolumeChange}
                      onSoundToggle={handleSoundToggle}
                    />
                  </m.div>
                )}

                {/* Notifications Tab */}
                {activeTab === "notifications" && (
                  <m.div
                    key="notifications"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <NotificationsTabSettings />
                  </m.div>
                )}
              </AnimatePresence>
            </div>
      </PanelWrapper>
    </Wrapper>
  );

  // On mobile, skip AnimatePresence to avoid exit animation delay
  if (isMobile) {
    return content;
  }

  return (
    <AnimatePresence>
      {isOpen && content}
    </AnimatePresence>
  );
}

export default TradingSettingsOverlay;
