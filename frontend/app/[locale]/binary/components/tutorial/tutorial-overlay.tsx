"use client";

/**
 * TutorialOverlay Component
 *
 * Interactive onboarding overlay that guides new users through
 * the binary trading interface with step-by-step instructions.
 *
 * Features:
 * - Highlights target UI elements
 * - Step-by-step navigation
 * - Skip/resume functionality
 * - Progress tracking
 * - Animated transitions
 *
 * Theming note: every surface here used to be a `useTheme()` ternary
 * (a hardcoded dark surface on one arm, white on the other). Those are gone. A token is already
 * theme-correct, so the branch was redundant — and worse, `theme` is
 * `undefined` until next-themes mounts, so the FIRST paint of an overlay that
 * auto-opens on this route always picked the light arm and then snapped.
 *
 * The `#F7941D` / `#FF8A00` orange this file used for the spotlight ring,
 * progress bar, step counter and both CTAs was a fifth brand colour that no
 * token ever registered; it is `primary` now.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  RotateCcw,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ProgressTrack } from "../binary-ui";

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

export interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  steps: TutorialStep[];
  allowSkip?: boolean;
}

// ============================================================================
// SPOTLIGHT COMPONENT
// ============================================================================

interface SpotlightProps {
  targetRect: DOMRect | null;
  padding?: number;
  radius?: number;
}

function Spotlight({ targetRect, padding = 8, radius = 8 }: SpotlightProps) {
  if (!targetRect) {
    return (
      <div className="fixed inset-0 bg-overlay/60 backdrop-blur-sm z-[var(--z-tour-scrim)] transition-opacity duration-300" />
    );
  }

  const spotlightStyle = {
    top: targetRect.top - padding,
    left: targetRect.left - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
    borderRadius: radius,
  };

  return (
    <div className="fixed inset-0 z-[var(--z-tour-scrim)] pointer-events-none">
      {/* Overlay with cutout */}
      <svg className="w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={spotlightStyle.left}
              y={spotlightStyle.top}
              width={spotlightStyle.width}
              height={spotlightStyle.height}
              rx={spotlightStyle.borderRadius}
              fill="black"
            />
          </mask>
        </defs>
        {/* `--overlay` is dark in both themes, which is the point of a scrim. */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="hsl(var(--overlay) / 0.6)"
          mask="url(#spotlight-mask)"
          className="backdrop-blur-sm"
        />
      </svg>

      {/* Highlight border */}
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="absolute border-2 border-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
        style={{
          top: spotlightStyle.top,
          left: spotlightStyle.left,
          width: spotlightStyle.width,
          height: spotlightStyle.height,
          borderRadius: spotlightStyle.borderRadius,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

interface TooltipProps {
  step: TutorialStep;
  targetRect: DOMRect | null;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  allowSkip: boolean;
}

function Tooltip({
  step,
  targetRect,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onClose,
  isFirstStep,
  isLastStep,
  allowSkip,
}: TooltipProps) {
  const t = useTranslations("common");

  // Calculate tooltip position
  const tooltipPosition = useMemo(() => {
    if (!targetRect || step.position === "center") {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 1080;
    const tooltipWidth = 360;
    const tooltipHeight = 280; // Increased to account for full card including buttons
    const offset = 20;
    const minMargin = 40; // Minimum margin from viewport edges

    let top: number;
    let left: number;

    switch (step.position) {
      case "top":
        top = targetRect.top - tooltipHeight - offset;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case "bottom":
        top = targetRect.bottom + offset;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case "left":
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - offset;
        break;
      case "right":
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.right + offset;
        break;
      default:
        top = targetRect.bottom + offset;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    }

    // Keep tooltip within viewport with proper margins
    // Ensure the tooltip doesn't go below the viewport (most important for bottom elements)
    if (top + tooltipHeight > viewportHeight - minMargin) {
      // Position above the target instead
      top = targetRect.top - tooltipHeight - offset;
    }

    // If still below viewport or above, center it vertically
    if (top + tooltipHeight > viewportHeight - minMargin || top < minMargin) {
      top = Math.max(minMargin, (viewportHeight - tooltipHeight) / 2);
    }

    // Ensure horizontal bounds
    left = Math.max(minMargin, Math.min(left, viewportWidth - tooltipWidth - minMargin));

    return { top: `${top}px`, left: `${left}px`, transform: "none" };
  }, [targetRect, step.position]);

  return (
    <m.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed z-[var(--z-tour-content)] w-[360px] max-w-[calc(100vw-2rem)] rounded-xl shadow-2xl border border-border bg-popover"
      style={{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        transform: tooltipPosition.transform,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-foreground">
            {t("step")} {currentIndex + 1} {t("of")} {totalSteps}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="p-1 rounded-full transition-colors cursor-pointer text-muted-foreground hover:bg-surface-3 hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2 text-foreground">
          {step.title}
        </h3>
        <p className="text-sm mb-3 text-muted-foreground">{step.description}</p>

        {step.actionHint && (
          <div className="text-xs px-3 py-2 rounded-lg mb-4 bg-surface-3 text-muted-foreground">
            {step.actionHint}
          </div>
        )}

        {/* Progress bar */}
        <ProgressTrack
          percent={((currentIndex + 1) / totalSteps) * 100}
          height="h-1"
          className="mb-4 border-0"
        />

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={onPrev}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer bg-surface-3 hover:bg-surface-3/70 text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
                {t("previous")}
              </button>
            )}

            {allowSkip && !isLastStep && (
              <button
                type="button"
                onClick={onSkip}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="w-4 h-4" />
                Skip
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-1 px-4 py-1.5 text-sm rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors cursor-pointer"
          >
            {isLastStep ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Finish
              </>
            ) : (
              <>
                {t("next")}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </m.div>
  );
}

// ============================================================================
// COMPLETION SCREEN
// ============================================================================

interface CompletionScreenProps {
  onClose: () => void;
  onRestart: () => void;
}

function CompletionScreen({ onClose, onRestart }: CompletionScreenProps) {
  const t = useTranslations("common");

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[var(--z-tour-content)] flex items-center justify-center bg-overlay/60 backdrop-blur-sm"
    >
      <m.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", damping: 20 }}
        className="relative max-w-md w-full mx-4 p-8 rounded-2xl text-center bg-popover border border-border"
      >
        {/* Celebration icon */}
        <m.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", damping: 10 }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary flex items-center justify-center"
        >
          <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
        </m.div>

        <h2 className="text-2xl font-bold mb-3 text-foreground">
          {t("tutorial_completed")}
        </h2>

        <p className="mb-6 text-muted-foreground">
          {t("youre_now_ready_to_start_trading_good_luck")}
        </p>

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer bg-surface-3 hover:bg-surface-3/70 text-foreground"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors cursor-pointer"
          >
            {t("start_trading")}
          </button>
        </div>
      </m.div>
    </m.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TutorialOverlay({
  isOpen,
  onClose,
  onComplete,
  currentStep,
  setCurrentStep,
  steps,
  allowSkip = true,
}: TutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Find and track the target element
  useEffect(() => {
    if (!isOpen || !currentStepData?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const findElement = () => {
      const element = document.querySelector(currentStepData.targetSelector!);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    };

    // Initial find
    findElement();

    // Re-find on scroll/resize
    const handleUpdate = () => findElement();
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    // Re-find periodically in case element is dynamically rendered
    const interval = setInterval(findElement, 500);

    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
      clearInterval(interval);
    };
  }, [isOpen, currentStep, currentStepData]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      setShowCompletion(true);
    } else {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, isLastStep, setCurrentStep]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, isFirstStep, setCurrentStep]);

  /**
   * Skip dismisses. It used to open the completion screen — so skipping the
   * tour congratulated you on finishing it, and took a second click to get out
   * of. `onComplete()` still fires so the tour is marked seen and does not
   * reappear; only the celebration is skipped, which is what the user asked for.
   */
  const handleSkip = useCallback(() => {
    setShowCompletion(false);
    onComplete();
    onClose();
  }, [onComplete, onClose]);

  const handleComplete = useCallback(() => {
    setShowCompletion(false);
    onComplete();
    onClose();
  }, [onComplete, onClose]);

  const handleRestart = useCallback(() => {
    setShowCompletion(false);
    setCurrentStep(0);
  }, [setCurrentStep]);

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {showCompletion ? (
        <CompletionScreen
          key="completion"
          onClose={handleComplete}
          onRestart={handleRestart}
        />
      ) : (
        <m.div
          key="tutorial"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Spotlight
            targetRect={targetRect}
            padding={currentStepData?.spotlightPadding}
            radius={currentStepData?.spotlightRadius}
          />

          <Tooltip
            step={currentStepData}
            targetRect={targetRect}
            currentIndex={currentStep}
            totalSteps={steps.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleSkip}
            onClose={onClose}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            allowSkip={allowSkip}
          />
        </m.div>
      )}
    </AnimatePresence>
  );
}
