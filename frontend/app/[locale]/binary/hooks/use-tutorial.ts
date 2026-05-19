"use client";

/**
 * Tutorial Hook
 *
 * Manages tutorial state, progress, and persistence.
 * Tracks which steps have been completed and allows resuming.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { TutorialStep } from "../components/tutorial/tutorial-overlay";

// ============================================================================
// TYPES
// ============================================================================

export interface TutorialProgress {
  completed: boolean;
  currentStep: number;
  completedSteps: string[];
  startedAt: string | null;
  completedAt: string | null;
  skipped: boolean;
}

export interface UseTutorialOptions {
  tutorialId: string;
  autoStart?: boolean;
  autoStartDelay?: number;
  onComplete?: () => void;
  onSkip?: () => void;
}

export interface UseTutorialReturn {
  isOpen: boolean;
  currentStep: number;
  progress: TutorialProgress;
  steps: TutorialStep[];
  startTutorial: () => void;
  closeTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  setCurrentStep: (step: number) => void;
  shouldShowTutorial: boolean;
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY_PREFIX = "binary_tutorial_";

function loadProgress(tutorialId: string): TutorialProgress {
  if (typeof window === "undefined") {
    return getDefaultProgress();
  }

  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${tutorialId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore storage errors
  }

  return getDefaultProgress();
}

function saveProgress(tutorialId: string, progress: TutorialProgress): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${tutorialId}`,
      JSON.stringify(progress)
    );
  } catch {
    // Ignore storage errors
  }
}

function getDefaultProgress(): TutorialProgress {
  return {
    completed: false,
    currentStep: 0,
    completedSteps: [],
    startedAt: null,
    completedAt: null,
    skipped: false,
  };
}

// ============================================================================
// TUTORIAL STEPS DEFINITION
// ============================================================================

export const BINARY_TRADING_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Binary Trading!",
    description:
      "Let's take a quick tour of the trading interface. You'll learn how to place trades, read the chart, and manage your positions.",
    position: "center",
    action: "none",
  },
  {
    id: "chart",
    title: "The Price Chart",
    description:
      "This is where you'll see real-time price movement. Watch the candles form to understand market direction. Green candles mean price went up, red means it went down.",
    targetSelector: "[data-tutorial='chart-area']",
    position: "right",
    spotlightPadding: 12,
    actionHint: "Tip: Use scroll to zoom and drag to pan the chart",
  },
  {
    id: "timeframe",
    title: "Chart Timeframe",
    description:
      "Change the timeframe to see different perspectives. Shorter timeframes (1m, 5m) show recent action, while longer ones (1h, 4h) show the bigger picture.",
    targetSelector: "[data-tutorial='timeframe-selector']",
    position: "bottom",
    spotlightPadding: 8,
  },
  {
    id: "market-selector",
    title: "Select a Market",
    description:
      "Choose which asset you want to trade. You can trade cryptocurrencies, forex pairs, and more. Start with popular pairs like BTC/USDT.",
    targetSelector: "[data-tutorial='market-selector']",
    position: "bottom",
    spotlightPadding: 8,
  },
  {
    id: "order-panel",
    title: "Trading Panel",
    description:
      "This is where you'll place your trades. Set your trade amount, choose your expiry time, and select whether you think the price will go UP (Rise) or DOWN (Fall).",
    targetSelector: "[data-tutorial='order-panel']",
    position: "left",
    spotlightPadding: 12,
  },
  {
    id: "amount-input",
    title: "Trade Amount",
    description:
      "Enter how much you want to trade. Start small while learning - you can use demo mode to practice without risking real money!",
    targetSelector: "[data-tutorial='amount-input']",
    position: "left",
    spotlightPadding: 8,
    actionHint: "Tip: Never risk more than you can afford to lose",
  },
  {
    id: "expiry-selector",
    title: "Expiry Time",
    description:
      "Select when your trade will expire. The outcome is determined at this exact time. Shorter expiries mean faster results but require more precision.",
    targetSelector: "[data-tutorial='expiry-selector']",
    position: "left",
    spotlightPadding: 8,
  },
  {
    id: "trade-buttons",
    title: "Place Your Trade",
    description:
      "Click RISE if you think the price will be higher at expiry, or FALL if you think it will be lower. Your potential profit is shown before you trade.",
    targetSelector: "[data-tutorial='trade-buttons']",
    position: "top",
    spotlightPadding: 12,
    actionHint: "Tip: Look for clear trends before placing trades",
  },
  {
    id: "demo-mode",
    title: "Demo Mode",
    description:
      "Switch to demo mode to practice with virtual money. This is the best way to learn without any risk. Master your strategy before trading with real funds!",
    targetSelector: "[data-tutorial='demo-toggle']",
    position: "bottom",
    spotlightPadding: 8,
    actionHint: "Recommended: Practice in demo mode first!",
  },
  {
    id: "complete",
    title: "You're Ready!",
    description:
      "You now know the basics of binary trading. Remember to always manage your risk, start small, and practice in demo mode. Good luck!",
    position: "center",
    action: "none",
  },
];

// ============================================================================
// HOOK
// ============================================================================

export function useTutorial(options: UseTutorialOptions): UseTutorialReturn {
  const {
    tutorialId,
    autoStart = true,
    autoStartDelay = 1500,
    onComplete,
    onSkip,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState<TutorialProgress>(getDefaultProgress);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  // Load progress from storage on mount
  useEffect(() => {
    const stored = loadProgress(tutorialId);
    setProgress(stored);
    setHasCheckedStorage(true);
  }, [tutorialId]);

  // Auto-start tutorial for first-time users
  useEffect(() => {
    if (!hasCheckedStorage) return;
    if (!autoStart) return;
    if (progress.completed || progress.skipped) return;

    const timeout = setTimeout(() => {
      setIsOpen(true);
      if (!progress.startedAt) {
        const newProgress = {
          ...progress,
          startedAt: new Date().toISOString(),
        };
        setProgress(newProgress);
        saveProgress(tutorialId, newProgress);
      }
    }, autoStartDelay);

    return () => clearTimeout(timeout);
  }, [hasCheckedStorage, autoStart, autoStartDelay, progress, tutorialId]);

  const startTutorial = useCallback(() => {
    const newProgress = {
      ...progress,
      startedAt: new Date().toISOString(),
      currentStep: 0,
    };
    setProgress(newProgress);
    saveProgress(tutorialId, newProgress);
    setIsOpen(true);
  }, [progress, tutorialId]);

  const closeTutorial = useCallback(() => {
    setIsOpen(false);
    // Save current step so user can resume
    const newProgress = {
      ...progress,
      skipped: true,
    };
    setProgress(newProgress);
    saveProgress(tutorialId, newProgress);
    onSkip?.();
  }, [progress, tutorialId, onSkip]);

  const completeTutorial = useCallback(() => {
    const newProgress = {
      ...progress,
      completed: true,
      completedAt: new Date().toISOString(),
      completedSteps: BINARY_TRADING_TUTORIAL_STEPS.map((s) => s.id),
    };
    setProgress(newProgress);
    saveProgress(tutorialId, newProgress);
    setIsOpen(false);
    onComplete?.();
  }, [progress, tutorialId, onComplete]);

  const resetTutorial = useCallback(() => {
    const newProgress = getDefaultProgress();
    setProgress(newProgress);
    saveProgress(tutorialId, newProgress);
  }, [tutorialId]);

  const setCurrentStep = useCallback(
    (step: number) => {
      const stepId = BINARY_TRADING_TUTORIAL_STEPS[step]?.id;
      const newCompletedSteps = stepId
        ? [...new Set([...progress.completedSteps, stepId])]
        : progress.completedSteps;

      const newProgress = {
        ...progress,
        currentStep: step,
        completedSteps: newCompletedSteps,
      };
      setProgress(newProgress);
      saveProgress(tutorialId, newProgress);
    },
    [progress, tutorialId]
  );

  const shouldShowTutorial = useMemo(() => {
    return hasCheckedStorage && !progress.completed && !progress.skipped;
  }, [hasCheckedStorage, progress.completed, progress.skipped]);

  return {
    isOpen,
    currentStep: progress.currentStep,
    progress,
    steps: BINARY_TRADING_TUTORIAL_STEPS,
    startTutorial,
    closeTutorial,
    completeTutorial,
    resetTutorial,
    setCurrentStep,
    shouldShowTutorial,
  };
}

export default useTutorial;
