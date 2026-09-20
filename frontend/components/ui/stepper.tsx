"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDot,
  Loader2,
  ChevronRight,
  Star,
  CircleCheck,
  Clock,
  AlertCircle,
  X,
} from "lucide-react";
import { cva } from "class-variance-authority";
import { m, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

export interface StepLabelItem {
  label: string;
  description: string;
  icon?: React.ReactNode;
  status?: "complete" | "current" | "upcoming" | "error" | "warning";
}

export interface StepperProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: StepLabelItem[];
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  disableNext?: boolean;
  isDone?: boolean;
  children: React.ReactNode;
  direction?: "horizontal" | "vertical";
  variant?:
    | "default"
    | "outline"
    | "pills"
    | "numbered"
    | "icon"
    | "card"
    | "minimal"
    | "timeline";
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  animation?: "fade" | "slide" | "zoom" | "flip" | "none";
  connectorStyle?: "solid" | "dashed" | "dotted" | "gradient" | "none";
  allowStepClick?: boolean;
  showStepDescription?: boolean | "hover";
  className?: string;
}

/**
 * `colorScheme` is DEPRECATED and every value now renders identically.
 *
 * It offered five decorative hues (blue / green / purple / amber / rose) that
 * carried no meaning — the exact pattern the design system removes: one accent
 * for interaction, semantic colour reserved for state (DESIGN-SYSTEM.md R2).
 * All five accounted for 172 hardcoded palette classes in this file alone.
 *
 * No caller ever used them (the only two pass "default", which was already
 * token-based), so collapsing them is a no-op in practice. The prop is kept so
 * existing call sites compile; drop it when they are next touched.
 */
const stepperVariants = cva("transition-all duration-200", {
  variants: {
    size: {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

/**
 * `bg-primary` is load-bearing, not decoration.
 *
 * When `colorScheme` was collapsed, the five per-hue fills went with it and
 * nothing replaced them — so the bar rendered `h-full rounded-full` with no
 * background at all and painted NOTHING. Every stepper using `showProgress`
 * (the default) has been drawing an empty track since.
 */
const progressVariants = cva(
  "h-full rounded-full bg-primary transition-all duration-500"
);

const connectorVariants = cva("transition-all duration-300", {
  variants: {
    connectorStyle: {
      solid: "bg-current",
      dashed: "bg-transparent border-dashed border-t-2 border-current",
      dotted: "bg-transparent border-dotted border-t-2 border-current",
      gradient: "bg-linear-to-r from-current to-transparent",
      none: "hidden",
    },
  },
  defaultVariants: {
    connectorStyle: "solid",
  },
});

const buttonVariants = cva("transition-all duration-200", {
  variants: {
  },
  defaultVariants: {
  },
});

const ProgressBar = ({
  progress,
}: {
  progress: number;
}) => {
  return (
    <div className="w-full bg-muted rounded-full h-2 mb-6">
      <m.div
        className={cn(progressVariants({ }))}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
};

const getStepStatusIcon = (
  status?: StepLabelItem["status"],
  isCompleted?: boolean,
  isActive?: boolean
) => {
  if (status === "error") return <X className="h-4 w-4 text-destructive" />;
  if (status === "warning")
    return <AlertCircle className="h-4 w-4 text-warning" />;
  if (status === "complete" || isCompleted)
    return <Check className="h-4 w-4" />;
  if (status === "current" || isActive)
    return <CircleDot className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
};

const getAnimationVariants = (
  animation: StepperProps["animation"],
  direction: "horizontal" | "vertical"
) => {
  switch (animation) {
    case "fade":
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.3 },
      };
    case "slide":
      return {
        initial: { opacity: 0, [direction === "horizontal" ? "x" : "y"]: 20 },
        animate: { opacity: 1, [direction === "horizontal" ? "x" : "y"]: 0 },
        exit: { opacity: 0, [direction === "horizontal" ? "x" : "y"]: -20 },
        transition: { duration: 0.3 },
      };
    case "zoom":
      return {
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.1 },
        transition: { duration: 0.3 },
      };
    case "flip":
      return {
        initial: { opacity: 0, rotateX: 90 },
        animate: { opacity: 1, rotateX: 0 },
        exit: { opacity: 0, rotateX: -90 },
        transition: { duration: 0.4 },
      };
    case "none":
    default:
      return {
        initial: {},
        animate: {},
        exit: {},
        transition: {},
      };
  }
};

export function Stepper({
  currentStep,
  totalSteps,
  stepLabels,
  onNext,
  onPrev,
  onSubmit,
  isSubmitting,
  disableNext,
  isDone,
  children,
  direction = "horizontal",
  variant = "default",
  size = "md",
  showProgress = true,
  animation = "fade",
  connectorStyle = "solid",
  allowStepClick = false,
  showStepDescription = "hover",
  className,
}: StepperProps) {
  const t = useTranslations("common");
  const progress = (currentStep / totalSteps) * 100;
  const animationVariants = getAnimationVariants(animation, direction);

  const handleStepClick = (stepIndex: number) => {
    if (!allowStepClick) return;
    // Only allow clicking on completed steps or the next step
    if (stepIndex + 1 < currentStep || stepIndex + 1 === currentStep + 1) {
      // Here you would call a function to jump to that step
      // This would need to be implemented in the parent component
      console.log(`Jump to step ${stepIndex + 1}`);
    }
  };

  const renderStepIndicator = (index: number) => {
    const stepNumber = index + 1;
    const isActive = stepNumber === currentStep;
    const isCompleted = stepNumber < currentStep;
    const step = stepLabels[index];
    const status = step?.status;

    // Timeline variant
    if (variant === "timeline") {
      return (
        <div
          className={cn(
            "flex items-center justify-center rounded-full w-10 h-10 border-2 transition-all duration-300",
            isActive && "border-primary bg-primary/10 text-primary-ink shadow-md",
            isCompleted && "border-primary bg-primary text-primary-foreground",
            !isActive &&
              !isCompleted &&
              "border-muted-foreground text-muted-foreground"
            // The five per-colorScheme overrides that used to live here only
            // restated these same states in a decorative hue. Deleted with the
            // rest of colorScheme — the token lines above cover every case.
          )}
        >
          {step?.icon || getStepStatusIcon(status, isCompleted, isActive)}
        </div>
      );
    }

    // Card variant
    if (variant === "card") {
      return (
        <div
          className={cn(
            "flex items-center justify-center rounded-lg w-12 h-12 shadow-sm transition-all duration-300",
            isActive &&
              "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2",
            isCompleted && "bg-primary text-primary-foreground",
            !isActive && !isCompleted && "bg-muted text-muted-foreground"
            // per-colorScheme overrides deleted — see the icon variant above
          )}
        >
          {step?.icon ||
            (isCompleted ? <Check className="h-5 w-5" /> : stepNumber)}
        </div>
      );
    }

    // Minimal variant
    if (variant === "minimal") {
      return (
        <div
          className={cn(
            "flex items-center justify-center transition-all duration-300",
            isActive && "text-primary font-medium",
            isCompleted && "text-primary",
            !isActive && !isCompleted && "text-muted-foreground"
            // per-colorScheme overrides deleted
          )}
        >
          <div className="flex items-center">
            {isCompleted ? (
              <Check className="h-4 w-4 mr-1.5" />
            ) : (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full w-5 h-5 text-xs mr-1.5",
                  isActive && "bg-primary text-primary-foreground",
                  !isActive && "bg-muted text-muted-foreground"
                  // per-colorScheme overrides deleted
                )}
              >
                {stepNumber}
              </span>
            )}
            <span>{step.label}</span>
          </div>
        </div>
      );
    }

    // Icon variant
    if (variant === "icon") {
      return (
        <div className={cn("flex flex-col items-center justify-center gap-2")}>
          <div
            className={cn(
              "rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300",
              isActive &&
                "bg-primary text-primary-foreground shadow-lg scale-110",
              isCompleted && "bg-primary text-primary-foreground",
              !isActive && !isCompleted && "bg-muted text-muted-foreground"
              // per-colorScheme overrides deleted
            )}
          >
            {step?.icon ||
              (isCompleted ? (
                <Check className="h-5 w-5" />
              ) : (
                <Star className="h-5 w-5" />
              ))}
          </div>
        </div>
      );
    }

    // Numbered variant
    if (variant === "numbered") {
      return (
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "flex items-center justify-center rounded-full w-10 h-10 text-lg font-bold transition-all duration-300",
              isActive &&
                "bg-primary text-primary-foreground ring-4 ring-primary/20",
              isCompleted && "bg-primary text-primary-foreground",
              !isActive && !isCompleted && "bg-muted text-muted-foreground"
            )}
          >
            {isCompleted ? <Check className="h-5 w-5" /> : stepNumber}
          </div>
        </div>
      );
    }

    // Pills variant
    if (variant === "pills") {
      return (
        <div
          className={cn(
            "flex items-center justify-center rounded-full w-10 h-10 transition-all duration-200",
            isActive &&
              "bg-primary text-primary-foreground shadow-lg scale-110",
            isCompleted && "bg-primary text-primary-foreground",
            !isActive && !isCompleted && "bg-muted text-muted-foreground"
          )}
        >
          {isCompleted ? <Check size={16} /> : stepNumber}
        </div>
      );
    }

    // Outline variant
    if (variant === "outline") {
      return (
        <div
          className={cn(
            "flex items-center justify-center rounded-full w-10 h-10 border-2 transition-all duration-200",
            isActive && "border-primary text-primary",
            isCompleted && "border-primary bg-primary text-primary-foreground",
            !isActive &&
              !isCompleted &&
              "border-muted-foreground text-muted-foreground"
          )}
        >
          {isCompleted ? <Check size={16} /> : stepNumber}
        </div>
      );
    }

    // Default variant
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full w-10 h-10 transition-all duration-200",
          isActive && "bg-primary text-primary-foreground",
          isCompleted && "bg-primary text-primary-foreground",
          !isActive && !isCompleted && "bg-muted text-muted-foreground"
        )}
      >
        {isCompleted ? <Check size={16} /> : stepNumber}
      </div>
    );
  };

  const renderStepper = () => {
    if (direction === "horizontal") {
      return (
        <div
          className={cn(
            "w-full max-w-4xl mx-auto mb-8 mt-8",
            stepperVariants({ size })
          )}
        >
          {showProgress && (
            <ProgressBar progress={progress} />
          )}
          <div className="flex items-start">
            {stepLabels.map((step, index) => {
              const isActive = index + 1 === currentStep;
              const isCompleted = index + 1 < currentStep;
              const isClickable =
                allowStepClick &&
                (index + 1 < currentStep || index + 1 === currentStep + 1);
              const isLastStep = index === stepLabels.length - 1;

              return (
                <React.Fragment key={index}>
                  <div
                    className={cn(
                      "flex flex-col items-center space-y-2 relative group",
                      isClickable && "cursor-pointer"
                    )}
                    onClick={() => handleStepClick(index)}
                    role={isClickable ? "button" : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                  >
                    {renderStepIndicator(index)}

                    {variant !== "icon" && (
                      <div
                        className={cn(
                          "text-center transition-all duration-200",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground",
                          "mt-2"
                        )}
                      >
                        <p className="font-medium text-sm">{step.label}</p>
                        {showStepDescription === true && (
                          <p className="text-xs mt-1">{step.description}</p>
                        )}
                        {showStepDescription === "hover" && (
                          <p className="text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {step.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {!isLastStep && variant !== "minimal" && (
                    <div className="flex-1 flex items-start pt-5 px-2">
                      <div className="w-full h-[2px] relative">
                        <div
                          className={cn(
                            "w-full h-full",
                            connectorVariants({
                              connectorStyle,
                            })
                          )}
                        />
                        <m.div
                          className={cn(
                            "absolute top-0 left-0 h-full",
                            "bg-primary"
                          )}
                          initial={{ width: isCompleted ? "100%" : "0%" }}
                          animate={{ width: isCompleted ? "100%" : "0%" }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      );
    }

    // Vertical stepper
    return (
      <div
        className={cn(
          "flex flex-col space-y-8 w-full max-w-xs",
          stepperVariants({ size })
        )}
      >
        {stepLabels.map((step, index) => {
          const isActive = index + 1 === currentStep;
          const isCompleted = index + 1 < currentStep;
          const isClickable =
            allowStepClick &&
            (index + 1 < currentStep || index + 1 === currentStep + 1);

          return (
            <div
              key={index}
              className={cn(
                "flex items-start space-x-4 relative group",
                isClickable && "cursor-pointer"
              )}
              onClick={() => handleStepClick(index)}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
            >
              <div className="flex-shrink-0">
                {renderStepIndicator(index)}

                {index < stepLabels.length - 1 && variant !== "minimal" && (
                  <div className="absolute top-10 left-5 w-[2px] h-[calc(100%+12px)]">
                    <div
                      className={cn(
                        "w-full h-full",
                        connectorVariants({
                          connectorStyle,
                        })
                      )}
                    />
                    <m.div
                      className={cn(
                        "absolute top-0 left-0 w-full",
                        "bg-primary"
                      )}
                      initial={{ height: isCompleted ? "100%" : "0%" }}
                      animate={{ height: isCompleted ? "100%" : "0%" }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}
              </div>

              <div
                className={cn(
                  "transition-all duration-200 pt-1",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <p className="font-medium">{step.label}</p>
                {showStepDescription === true && (
                  <p className="text-sm mt-1">{step.description}</p>
                )}
                {showStepDescription === "hover" && (
                  <p className="text-sm mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderNavigation = () => {
    if (isDone) return;
    const backButtonVariant = "outline";
    const nextButtonVariant = "default";

    return (
      <div className="flex items-center justify-between mt-8">
        {currentStep > 1 ? (
          <Button
            variant={backButtonVariant}
            onClick={onPrev}
            className={cn(
              "group transition-all duration-200 hover:translate-x-[-2px]",
              buttonVariants({ }),
            )}
            data-outline={backButtonVariant === "outline"}
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-[-2px]" />
            {t("back")}
          </Button>
        ) : (
          <div />
        )}

        {currentStep < totalSteps ? (
          <Button
            onClick={onNext}
            disabled={disableNext}
            className={cn(
              "group transition-all duration-200 hover:translate-x-[2px]",
              buttonVariants({ })
            )}
          >
            {t("next")}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-[2px]" />
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className={cn("relative", buttonVariants({ }))}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("processing")}.
              </>
            ) : (
              <>
                {t("submit")}
                <Check className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  if (direction === "vertical") {
    return (
      <div className={cn("flex flex-col md:flex-row gap-8 w-full", className)}>
        {/* Left Side: Vertical Stepper */}
        <div className="md:w-64 w-full">
          {showProgress && (
            <ProgressBar progress={progress} />
          )}
          {renderStepper()}
        </div>

        {/* Right Side: Step Content */}
        <div className="flex-1 space-y-8">
          <AnimatePresence mode="wait">
            <m.div
              key={currentStep}
              {...animationVariants}
              className="bg-card rounded-lg p-6 border"
            >
              {children}
            </m.div>
          </AnimatePresence>
          {renderNavigation()}
        </div>
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className={cn("space-y-8 w-full", className)}>
      {renderStepper()}
      <AnimatePresence mode="wait">
        <m.div
          key={currentStep}
          {...animationVariants}
          className="bg-card rounded-lg p-6 border"
        >
          {children}
        </m.div>
      </AnimatePresence>
      {renderNavigation()}
    </div>
  );
}

export default Stepper;
