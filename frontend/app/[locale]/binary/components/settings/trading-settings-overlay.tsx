"use client";

/**
 * Trading Settings Overlay
 *
 * Full-screen settings panel that overlays the chart area.
 * Uses horizontal tabs and collapsible settings sections.
 * Each tab content is in a separate component for maintainability.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { type MartingaleState } from "./martingale-settings";
import { useRiskManagement } from "../risk-management/use-risk-management";
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
} from "./tabs";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

export type SettingsTab = "trading" | "protection" | "sizing" | "sounds" | "notifications";

interface TradingSettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
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
  darkMode = true,
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
    { id: "trading" as const, label: "Trading", icon: Zap },
    { id: "protection" as const, label: "Protection", icon: Shield },
    { id: "sizing" as const, label: "Sizing", icon: Target },
    { id: "sounds" as const, label: "Sounds", icon: Volume2 },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
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

  // Theme matching overlay-theme.ts for consistency
  const theme = {
    bg: darkMode ? "bg-zinc-900" : "bg-white",
    bgSubtle: darkMode ? "bg-zinc-800/50" : "bg-gray-50",
    bgCard: darkMode ? "bg-zinc-800" : "bg-gray-100",
    border: darkMode ? "border-zinc-800/50" : "border-gray-200/50",
    text: darkMode ? "text-white" : "text-gray-900",
    textMuted: darkMode ? "text-zinc-400" : "text-gray-500",
    textSubtle: darkMode ? "text-zinc-500" : "text-gray-400",
    hoverBg: darkMode ? "hover:bg-zinc-700/50" : "hover:bg-gray-100",
    backdrop: darkMode ? "bg-black/60" : "bg-black/40",
  };

  // On mobile, skip animations for instant overlay switching
  if (!isOpen) return null;

  // Wrapper components - use div on mobile (no animation), motion.div on desktop
  const Wrapper = isMobile ? 'div' : motion.div;
  const wrapperProps = isMobile ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  };

  const BackdropWrapper = isMobile ? 'div' : motion.div;
  const backdropProps = isMobile ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const PanelWrapper = isMobile ? 'div' : motion.div;
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
      {/* Backdrop */}
      <BackdropWrapper
        {...backdropProps}
        className={`absolute inset-0 ${theme.backdrop} backdrop-blur-sm`}
        onClick={onClose}
      />

      {/* Settings Panel */}
      <PanelWrapper
        {...panelProps}
        className={`relative ml-auto h-full w-full max-w-2xl flex flex-col ${theme.bg} shadow-2xl border-l ${theme.border}`}
      >
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b ${theme.border}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${darkMode ? "bg-blue-500/10" : "bg-blue-50"}`}>
                  <Settings size={18} className="text-blue-500" />
                </div>
                <div>
                  <h2 className={`text-base font-semibold ${theme.text}`}>{tCommon("trading_settings")}</h2>
                  <p className={`text-xs ${theme.textMuted}`}>
                    {t("configure_your_trading_preferences")}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${theme.hoverBg} ${theme.textMuted}`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Stats bar */}
            <div className={`px-5 py-2.5 border-b ${theme.border} ${theme.bgSubtle}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${activeFeatures > 0 ? "bg-emerald-500" : darkMode ? "bg-zinc-600" : "bg-gray-300"}`} />
                    <span className={theme.textMuted}>{activeFeatures} Active</span>
                  </div>
                  {oneClickEnabled && (
                    <div className="flex items-center gap-1.5">
                      <Zap size={12} className="text-yellow-500" />
                      <span className={theme.textMuted}>{t("n_1_click")}</span>
                    </div>
                  )}
                  {martingaleState.enabled && (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={12} className="text-orange-500" />
                      <span className={theme.textMuted}>Martingale</span>
                    </div>
                  )}
                  {riskManagement.state.dailyLimit.enabled && (
                    <div className="flex items-center gap-1.5">
                      <Shield size={12} className="text-emerald-500" />
                      <span className={theme.textMuted}>Protected</span>
                    </div>
                  )}
                </div>
                <span className={`text-[10px] ${theme.textSubtle}`}>
                  {symbol}
                </span>
              </div>
            </div>

            {/* Horizontal Tabs */}
            <div className={`flex items-center gap-1 px-5 py-3 border-b ${theme.border} overflow-x-auto`}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? darkMode
                          ? "bg-zinc-800 text-white"
                          : "bg-gray-200 text-gray-900"
                        : `${theme.textMuted} ${theme.hoverBg}`
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Trading blocked warning */}
            {!tradingStatus.allowed && (
              <div
                className={`px-5 py-3 ${
                  darkMode ? "bg-red-500/10 border-b border-red-500/20" : "bg-red-50 border-b border-red-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  <span className="text-sm font-medium text-red-500">
                    {tCommon("trading_blocked")} {tradingStatus.reason}
                  </span>
                </div>
              </div>
            )}

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* Trading Tab */}
                {activeTab === "trading" && (
                  <motion.div
                    key="trading"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <TradingTabSettings
                      darkMode={darkMode}
                      oneClickEnabled={oneClickEnabled}
                      onOneClickChange={onOneClickChange}
                      oneClickMaxAmount={oneClickMaxAmount}
                      martingaleState={martingaleState}
                      onMartingaleChange={onMartingaleChange}
                      balance={balance}
                      currentAmount={currentAmount}
                    />
                  </motion.div>
                )}

                {/* Protection Tab */}
                {activeTab === "protection" && (
                  <motion.div
                    key="protection"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ProtectionTabSettings
                      darkMode={darkMode}
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
                  </motion.div>
                )}

                {/* Position Sizing Tab */}
                {activeTab === "sizing" && (
                  <motion.div
                    key="sizing"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <SizingTabSettings
                      darkMode={darkMode}
                      balance={balance}
                      winRate={winRate}
                      avgProfit={avgProfit}
                      avgLoss={avgLoss}
                      positionSizing={riskManagement.state.positionSizing}
                      updatePositionSizing={riskManagement.updatePositionSizing}
                      onSetAmount={onSetAmount}
                    />
                  </motion.div>
                )}

                {/* Sounds Tab */}
                {activeTab === "sounds" && (
                  <motion.div
                    key="sounds"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <SoundsTabSettings
                      darkMode={darkMode}
                      audioConfig={audioConfig}
                      audioFeedback={audioFeedback}
                      onAudioToggle={handleAudioToggle}
                      onVolumeChange={handleVolumeChange}
                      onSoundToggle={handleSoundToggle}
                    />
                  </motion.div>
                )}

                {/* Notifications Tab */}
                {activeTab === "notifications" && (
                  <motion.div
                    key="notifications"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <NotificationsTabSettings darkMode={darkMode} />
                  </motion.div>
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
