"use client";

import React, { memo, useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { cn } from "../../utils/cn";
import { LayoutSelector } from "./LayoutSelector";
import { SettingsButton } from "./SettingsButton";
import { AuthHeaderControls } from "@/components/auth/auth-header-controls";
import { Maximize, BookOpen, Sun, Moon } from "lucide-react";
import PatternLibrary from "../education/PatternLibrary";

interface QuickActionsProps {
  compact?: boolean;
}

export const QuickActions = memo(function QuickActions({ compact = false }: QuickActionsProps) {
  const [showPatternLibrary, setShowPatternLibrary] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Handle mounting state to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine dark mode based on resolved theme
  const darkMode = !mounted ? true : resolvedTheme === "dark";

  // Toggle theme function
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <>
      <div className="flex items-center h-full">
        {/* Pattern Library - hidden on mobile */}
        {!compact && (
          <button
            onClick={() => setShowPatternLibrary((prev) => !prev)}
            className={cn(
              "h-10 w-10 flex items-center justify-center",
              "border-r border-[var(--tp-border)]",
              "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]",
              "hover:bg-[var(--tp-bg-tertiary)]",
              "transition-colors",
              "cursor-pointer",
              showPatternLibrary && "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-primary)]"
            )}
            title="Pattern Library"
          >
            <BookOpen size={16} />
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
            title={darkMode ? "Light Mode" : "Dark Mode"}
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
              "cursor-pointer"
            )}
            title="Fullscreen"
          >
            <Maximize size={16} />
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

      {/* Pattern Library Modal */}
      <PatternLibrary
        isOpen={showPatternLibrary}
        onClose={() => setShowPatternLibrary(false)}
      />
    </>
  );
});
