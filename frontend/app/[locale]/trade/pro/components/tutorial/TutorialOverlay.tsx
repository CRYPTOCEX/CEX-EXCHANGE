"use client";

/**
 * TutorialOverlay Component for Trading Pro
 *
 * Interactive onboarding overlay that guides new users through
 * the trading interface with step-by-step instructions.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import type { TutorialStep } from "../../hooks/useTutorial";

// ============================================================================
// TYPES
// ============================================================================

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
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[998] transition-opacity duration-300" />
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
    <div className="fixed inset-0 z-[998] pointer-events-none">
      {/* Overlay with cutout */}
      <svg className="w-full h-full">
        <defs>
          <mask id="spotlight-mask-tp">
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
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask-tp)"
          className="backdrop-blur-sm"
        />
      </svg>

      {/* Highlight border */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="absolute border-2 border-[var(--tp-blue)] shadow-[0_0_20px_rgba(59,130,246,0.5)]"
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
    // Responsive tooltip width - smaller on tablet
    const tooltipWidth = viewportWidth < 1024 ? Math.min(320, viewportWidth - 40) : 360;
    const tooltipHeight = 280;
    const offset = viewportWidth < 1024 ? 12 : 20;
    const minMargin = viewportWidth < 1024 ? 20 : 40;

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

    // Keep tooltip within viewport
    if (top + tooltipHeight > viewportHeight - minMargin) {
      top = targetRect.top - tooltipHeight - offset;
    }

    if (top + tooltipHeight > viewportHeight - minMargin || top < minMargin) {
      top = Math.max(minMargin, (viewportHeight - tooltipHeight) / 2);
    }

    left = Math.max(minMargin, Math.min(left, viewportWidth - tooltipWidth - minMargin));

    return { top: `${top}px`, left: `${left}px`, transform: "none" };
  }, [targetRect, step.position]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed z-[999] w-[calc(100vw-40px)] max-w-[360px] rounded-xl shadow-2xl border bg-[var(--tp-bg-primary)] border-[var(--tp-border)]"
      style={{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        transform: tooltipPosition.transform,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--tp-border)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--tp-blue)]" />
          <span className="text-xs font-medium text-[var(--tp-blue)]">
            {t("step")} {currentIndex + 1} {t("of")} {totalSteps}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full transition-colors hover:bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-muted)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2 text-[var(--tp-text-primary)]">
          {step.title}
        </h3>
        <p className="text-sm mb-3 text-[var(--tp-text-secondary)]">
          {step.description}
        </p>

        {step.actionHint && (
          <div className="text-xs px-3 py-2 rounded-lg mb-4 bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-muted)]">
            {step.actionHint}
          </div>
        )}

        {/* Progress bar */}
        <div className="h-1 rounded-full mb-4 overflow-hidden bg-[var(--tp-bg-tertiary)]">
          <motion.div
            className="h-full bg-[var(--tp-blue)]"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors bg-[var(--tp-bg-tertiary)] hover:bg-[var(--tp-bg-elevated)] text-[var(--tp-text-secondary)]"
              >
                <ChevronLeft className="w-4 h-4" />
                {t("prev")}
              </button>
            )}

            {allowSkip && !isLastStep && (
              <button
                onClick={onSkip}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
              >
                <SkipForward className="w-4 h-4" />
                Skip
              </button>
            )}
          </div>

          <button
            onClick={onNext}
            className="flex items-center gap-1 px-4 py-1.5 text-sm rounded-lg bg-[var(--tp-blue)] hover:bg-[var(--tp-blue)]/90 text-white font-medium transition-colors"
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
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", damping: 20 }}
        className="relative max-w-md w-full mx-4 p-8 rounded-2xl text-center bg-[var(--tp-bg-primary)]"
      >
        {/* Celebration icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", damping: 10 }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--tp-blue)] to-[var(--tp-green)] flex items-center justify-center"
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </motion.div>

        <h2 className="text-2xl font-bold mb-3 text-[var(--tp-text-primary)]">
          {t("tutorial_completed")}
        </h2>

        <p className="mb-6 text-[var(--tp-text-secondary)]">
          {t("youre_now_ready_to_start_trading_good_luck")}
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors bg-[var(--tp-bg-tertiary)] hover:bg-[var(--tp-bg-elevated)] text-[var(--tp-text-secondary)]"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[var(--tp-blue)] hover:bg-[var(--tp-blue)]/90 text-white font-medium transition-colors"
          >
            {t("start_trading")}
          </button>
        </div>
      </motion.div>
    </motion.div>
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

  const handleSkip = useCallback(() => {
    setShowCompletion(true);
  }, []);

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
        <motion.div
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
