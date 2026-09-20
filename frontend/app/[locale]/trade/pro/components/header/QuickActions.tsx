"use client";

import React, { memo, useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { cn } from "../../utils/cn";
import { LayoutSelector } from "./LayoutSelector";
import { SettingsButton } from "./SettingsButton";
import { AuthHeaderControls } from "@/components/auth/auth-header-controls";
import {
  Maximize,
  Minimize,
  BookOpen,
  Sun,
  Moon,
  BarChart3,
  Newspaper,
} from "lucide-react";
import PatternLibrary from "../education/PatternLibrary";
import AnalyticsOverlay from "../analytics/AnalyticsOverlay";
import NewsOverlay from "../news/NewsOverlay";
import { useExtensionStatus } from "../../providers/ExtensionStatusProvider";
import { useTranslations } from "next-intl";

interface QuickActionsProps {
  compact?: boolean;
  /** Current market — scopes the news feed. */
  symbol?: string;
}

/**
 * The three surfaces this toolbar opens are FULL VIEWS of the same workspace
 * box, so at most one can be open. Independent booleans let two of them stack
 * in the same portal (the later one wins by DOM order, the first is stranded
 * underneath) and made a single Escape dismiss both.
 */
type OverlayId = "patterns" | "analytics" | "news";

export const QuickActions = memo(function QuickActions({
  compact = false,
  symbol,
}: QuickActionsProps) {
  const tCommon = useTranslations("common");
  const [activeOverlay, setActiveOverlay] = useState<OverlayId | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // News is CORE, so it is gated by an admin setting rather than an extension
  // flag — there is no addon to install and nothing to fall back to.
  const { settings: adminSettings } = useExtensionStatus();
  const newsEnabled = !!adminSettings.newsEnabled;

  const toggleOverlay = useCallback((id: OverlayId) => {
    setActiveOverlay((prev) => (prev === id ? null : id));
  }, []);

  // Stable identity: TerminalOverlay keys its Escape listener on `onClose`, so
  // an inline arrow would tear down and re-add the listener on every render.
  const closeOverlay = useCallback(() => setActiveOverlay(null), []);

  // Handle mounting state to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Compact hides every button that opens these views, so an overlay left open
  // across the transition would be unreachable from the toolbar. Close it.
  useEffect(() => {
    if (compact) setActiveOverlay(null);
  }, [compact]);

  // Determine dark mode based on resolved theme
  const darkMode = !mounted ? true : resolvedTheme === "dark";

  // Toggle theme function
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  /**
   * The button has TWO states, so it needs two icons and two labels: Maximize to
   * enter, Minimize to leave. It rendered `Maximize` unconditionally, which read
   * as "enter fullscreen" while already fullscreen — and since the browser also
   * exits on Escape or F11, the icon was not even a reliable lie: the only way
   * to know the real state is to listen for `fullscreenchange`, which is what
   * this does rather than tracking the clicks.
   */
  useEffect(() => {
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    sync();
    document.addEventListener("fullscreenchange", sync);
    // Safari never fired the unprefixed event until 16.4 and still fires this one.
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const handleFullscreen = useCallback(() => {
    // Both calls return a promise that REJECTS — requestFullscreen when the
    // permissions policy forbids it (an embedded terminal) and exitFullscreen
    // when the state changed underneath us. Unhandled, that surfaces as an
    // uncaught rejection in the console for a button that simply cannot work
    // here. The listener above keeps the icon honest either way.
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  return (
    <>
      <div className="flex items-center h-full">
        {/* Pattern Library - hidden on mobile */}
        {!compact && (
          <button
            onClick={() => toggleOverlay("patterns")}
            className={cn(
              "h-10 w-10 flex items-center justify-center",
              "border-r border-[var(--tp-border)]",
              "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
              "hover:bg-[var(--tp-bg-tertiary)]",
              "transition-colors",
              "cursor-pointer",
              activeOverlay === "patterns" &&
                "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-primary)]"
            )}
            title={tCommon("pattern_library")}
          >
            <BookOpen size={16} />
          </button>
        )}

        {/* Trading Analytics - hidden on mobile */}
        {!compact && (
          <button
            onClick={() => toggleOverlay("analytics")}
            className={cn(
              "h-10 w-10 flex items-center justify-center",
              "border-r border-[var(--tp-border)]",
              "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
              "hover:bg-[var(--tp-bg-tertiary)]",
              "transition-colors",
              "cursor-pointer",
              activeOverlay === "analytics" &&
                "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-primary)]"
            )}
            title={tCommon("trading_analytics")}
          >
            <BarChart3 size={16} />
          </button>
        )}

        {/* Market News - hidden on mobile */}
        {!compact && newsEnabled && (
          <button
            onClick={() => toggleOverlay("news")}
            className={cn(
              "h-10 w-10 flex items-center justify-center",
              "border-r border-[var(--tp-border)]",
              "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
              "hover:bg-[var(--tp-bg-tertiary)]",
              "transition-colors",
              "cursor-pointer",
              activeOverlay === "news" &&
                "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-primary)]"
            )}
            title={tCommon("market_news")}
          >
            <Newspaper size={16} />
          </button>
        )}

        {/* Theme Toggle - hidden on mobile */}
        {!compact && (
          <button
            onClick={toggleTheme}
            className={cn(
              "h-10 w-10 flex items-center justify-center",
              "border-r border-[var(--tp-border)]",
              "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
              "hover:bg-[var(--tp-bg-tertiary)]",
              "transition-colors",
              "cursor-pointer"
            )}
            title={darkMode ? tCommon("light_mode") : tCommon("dark_mode")}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}

        {/* Fullscreen - hidden on mobile */}
        {!compact && (
          <button
            onClick={handleFullscreen}
            className={cn(
              "h-10 w-10 flex items-center justify-center",
              "border-r border-[var(--tp-border)]",
              "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
              "hover:bg-[var(--tp-bg-tertiary)]",
              "transition-colors",
              "cursor-pointer",
              isFullscreen &&
                "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-primary)]"
            )}
            title={isFullscreen ? tCommon("exit_fullscreen") : tCommon("fullscreen")}
            aria-label={
              isFullscreen ? tCommon("exit_fullscreen") : tCommon("fullscreen")
            }
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        )}

        {/* Layout selector - hidden on mobile */}
        {!compact && (
          <div className="h-10 flex items-center border-r border-[var(--tp-border)]">
            <LayoutSelector />
          </div>
        )}

        {/* Settings */}
        <div className="h-10 flex items-center border-r border-[var(--tp-border)]">
          <SettingsButton compact={compact} />
        </div>

        {/* Auth controls - Login/Signup for unauthenticated, Profile for authenticated */}
        <AuthHeaderControls isMobile={compact} variant="binary" square />
      </div>

      {/*
        The three secondary surfaces this toolbar opens are all FULL VIEWS
        portalled into the workspace grid — never centred dialogs floating over
        the whole page. They keep the header (symbol, price, account) visible
        above them, and they give charts and prose the room they need. Analytics
        was the odd one out: a `max-w-6xl h-[85vh]` box on a raw scrim, opened
        by the button directly beside the Pattern Library's full view.
      */}
      <PatternLibrary
        isOpen={activeOverlay === "patterns"}
        onClose={closeOverlay}
      />

      <AnalyticsOverlay
        isOpen={activeOverlay === "analytics"}
        onClose={closeOverlay}
      />

      {/* `newsEnabled` is re-read here, not just on the button: admin settings
          are fetched at runtime, so the flag can flip off while the view is
          open and would otherwise leave an overlay no button can dismiss. */}
      <NewsOverlay
        isOpen={activeOverlay === "news" && newsEnabled}
        onClose={closeOverlay}
        symbol={symbol}
      />
    </>
  );
});
