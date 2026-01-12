"use client";

/**
 * Tutorial Hook for Trading Pro
 *
 * Manages tutorial state, progress, and persistence.
 * Tracks which steps have been completed and allows resuming.
 */

import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector for element to highlight
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: "click" | "hover" | "none";
  actionHint?: string;
  spotlightPadding?: number;
  spotlightRadius?: number;
}

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

const STORAGE_KEY_PREFIX = "trading_pro_tutorial_";

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

export const TRADING_PRO_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Trading Pro!",
    description:
      "Let's take a quick tour of the professional trading interface. You'll learn how to navigate the charts, place orders, and manage your trades.",
    position: "center",
    action: "none",
  },
  {
    id: "chart",
    title: "The Price Chart",
    description:
      "This is your main trading view. Watch real-time price movements with candlestick charts. Use the toolbar to add indicators, draw trend lines, and analyze patterns.",
    targetSelector: "[data-tutorial='chart-panel']",
    position: "right",
    spotlightPadding: 12,
    actionHint: "Tip: Use scroll to zoom and drag to pan the chart",
  },
  {
    id: "orderbook",
    title: "Order Book",
    description:
      "See live buy and sell orders from the market. The depth shows liquidity at each price level. Click on a price to auto-fill your order form.",
    targetSelector: "[data-tutorial='orderbook-panel']",
    position: "left",
    spotlightPadding: 8,
    actionHint: "Tip: Click any price to set it as your order price",
  },
  {
    id: "trading-form",
    title: "Trading Form",
    description:
      "Place your orders here. Choose between market, limit, or stop orders. Set your price and amount, then click Buy or Sell to execute.",
    targetSelector: "[data-tutorial='trading-panel']",
    position: "left",
    spotlightPadding: 12,
  },
  {
    id: "order-types",
    title: "Order Types",
    description:
      "Market orders execute immediately at current price. Limit orders wait for your specified price. Stop orders trigger when price reaches your level.",
    targetSelector: "[data-tutorial='order-type-selector']",
    position: "left",
    spotlightPadding: 8,
  },
  {
    id: "balances",
    title: "Your Balances",
    description:
      "View your available balance for trading. The quick percentage buttons help you quickly set order amounts based on your balance.",
    targetSelector: "[data-tutorial='balance-display']",
    position: "left",
    spotlightPadding: 8,
  },
  {
    id: "orders-panel",
    title: "Orders & History",
    description:
      "Track your open orders, order history, and executed trades. You can cancel pending orders or view details of past transactions.",
    targetSelector: "[data-tutorial='orders-panel']",
    position: "top",
    spotlightPadding: 8,
  },
  {
    id: "markets",
    title: "Markets Panel",
    description:
      "Browse and search available trading pairs. Star your favorites for quick access. Click any market to switch your trading view.",
    targetSelector: "[data-tutorial='markets-panel']",
    position: "right",
    spotlightPadding: 8,
  },
  {
    id: "complete",
    title: "You're Ready!",
    description:
      "You now know the basics of the Trading Pro interface. Start by exploring the charts and placing your first order. Happy trading!",
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

  // Listen for event to manually start tutorial (from settings)
  useEffect(() => {
    const handleStartTutorial = () => {
      // Reset progress and start fresh
      const newProgress = {
        ...getDefaultProgress(),
        startedAt: new Date().toISOString(),
      };
      setProgress(newProgress);
      saveProgress(tutorialId, newProgress);
      setIsOpen(true);
    };

    window.addEventListener("tp-start-tutorial", handleStartTutorial);
    return () => window.removeEventListener("tp-start-tutorial", handleStartTutorial);
  }, [tutorialId]);

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
      completedSteps: TRADING_PRO_TUTORIAL_STEPS.map((s) => s.id),
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
      const stepId = TRADING_PRO_TUTORIAL_STEPS[step]?.id;
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
    steps: TRADING_PRO_TUTORIAL_STEPS,
    startTutorial,
    closeTutorial,
    completeTutorial,
    resetTutorial,
    setCurrentStep,
    shouldShowTutorial,
  };
}

export default useTutorial;
