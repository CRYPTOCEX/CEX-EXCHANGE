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
import { motion, AnimatePresence } from "framer-motion";
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
  colorScheme?: "default" | "blue" | "green" | "purple" | "amber" | "rose";
  animation?: "fade" | "slide" | "zoom" | "flip" | "none";
  connectorStyle?: "solid" | "dashed" | "dotted" | "gradient" | "none";
  allowStepClick?: boolean;
  showStepDescription?: boolean | "hover";
  className?: string;
}

const stepperVariants = cva("transition-all duration-200", {
  variants: {
    colorScheme: {
      default: "",
      blue: "data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[completed=true]:bg-blue-500 data-[completed=true]:text-white",
      green:
        "data-[active=true]:bg-green-600 data-[active=true]:text-white data-[completed=true]:bg-green-500 data-[completed=true]:text-white",
      purple:
        "data-[active=true]:bg-purple-600 data-[active=true]:text-white data-[completed=true]:bg-purple-500 data-[completed=true]:text-white",
      amber:
        "data-[active=true]:bg-amber-600 data-[active=true]:text-white data-[completed=true]:bg-amber-500 data-[completed=true]:text-white",
      rose: "data-[active=true]:bg-rose-600 data-[active=true]:text-white data-[completed=true]:bg-rose-500 data-[completed=true]:text-white",
    },
    size: {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: {
    colorScheme: "default",
    size: "md",
  },
});

const progressVariants = cva(
  "h-full rounded-full transition-all duration-500",
  {
    variants: {
      colorScheme: {
        default: "bg-primary",
        blue: "bg-blue-600",
        green: "bg-green-600",
        purple: "bg-purple-600",
        amber: "bg-amber-600",
        rose: "bg-rose-600",
      },
    },
    defaultVariants: {
      colorScheme: "default",
    },
  }
);

const connectorVariants = cva("transition-all duration-300", {
  variants: {
    connectorStyle: {
      solid: "bg-current",
      dashed: "bg-transparent border-dashed border-t-2 border-current",
      dotted: "bg-transparent border-dotted border-t-2 border-current",
      gradient: "bg-gradient-to-r from-current to-transparent",
      none: "hidden",
    },
    colorScheme: {
      default: "text-muted-foreground data-[active=true]:text-primary",
      blue: "text-muted-foreground data-[active=true]:text-blue-600",
      green: "text-muted-foreground data-[active=true]:text-green-600",
      purple: "text-muted-foreground data-[active=true]:text-purple-600",
      amber: "text-muted-foreground data-[active=true]:text-amber-600",
      rose: "text-muted-foreground data-[active=true]:text-rose-600",
    },
  },
  defaultVariants: {
    connectorStyle: "solid",
    colorScheme: "default",
  },
});

const buttonVariants = cva("transition-all duration-200", {
  variants: {
    colorScheme: {
      default: "",
      blue: "bg-blue-600 text-white hover:bg-blue-700 data-[outline=true]:bg-transparent data-[outline=true]:text-blue-600 data-[outline=true]:border-blue-600 data-[outline=true]:hover:bg-blue-50",
      green:
        "bg-green-600 text-white hover:bg-green-700 data-[outline=true]:bg-transparent data-[outline=true]:text-green-600 data-[outline=true]:border-green-600 data-[outline=true]:hover:bg-green-50",
      purple:
        "bg-purple-600 text-white hover:bg-purple-700 data-[outline=true]:bg-transparent data-[outline=true]:text-purple-600 data-[outline=true]:border-purple-600 data-[outline=true]:hover:bg-purple-50",
      amber:
        "bg-amber-600 text-white hover:bg-amber-700 data-[outline=true]:bg-transparent data-[outline=true]:text-amber-600 data-[outline=true]:border-amber-600 data-[outline=true]:hover:bg-amber-50",
      rose: "bg-rose-600 text-white hover:bg-rose-700 data-[outline=true]:bg-transparent data-[outline=true]:text-rose-600 data-[outline=true]:border-rose-600 data-[outline=true]:hover:bg-rose-50",
    },
  },
  defaultVariants: {
    colorScheme: "default",
  },
});

const ProgressBar = ({
  progress,
  colorScheme = "default",
}: {
  progress: number;
  colorScheme?: StepperProps["colorScheme"];
}) => {
  return (
    <div className="w-full bg-muted rounded-full h-2 mb-6">
      <motion.div
        className={cn(progressVariants({ colorScheme }))}
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
  if (status === "error") return <X className="h-4 w-4 text-red-500" />;
  if (status === "warning")
    return <AlertCircle className="h-4 w-4 text-amber-500" />;
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
  colorScheme = "default",
  animation = "fade",
  connectorStyle = "solid",
  allowStepClick = false,
  showStepDescription = "hover",
  className,
}: StepperProps) {
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
            isActive && "border-primary bg-primary/10 text-primary shadow-md",
            isCompleted && "border-primary bg-primary text-primary-foreground",
            !isActive &&
              !isCompleted &&
              "border-muted-foreground text-muted-foreground",
            colorScheme === "blue" &&
              isActive &&
              "border-blue-600 bg-blue-50 text-blue-600",
            colorScheme === "blue" &&
              isCompleted &&
              "border-blue-600 bg-blue-600 text-white",
            colorScheme === "green" &&
              isActive &&
              "border-green-600 bg-green-50 text-green-600",
            colorScheme === "green" &&
              isCompleted &&
              "border-green-600 bg-green-600 text-white",
            colorScheme === "purple" &&
              isActive &&
              "border-purple-600 bg-purple-50 text-purple-600",
            colorScheme === "purple" &&
              isCompleted &&
              "border-purple-600 bg-purple-600 text-white",
            colorScheme === "amber" &&
              isActive &&
              "border-amber-600 bg-amber-50 text-amber-600",
            colorScheme === "amber" &&
              isCompleted &&
              "border-amber-600 bg-amber-600 text-white",
            colorScheme === "rose" &&
              isActive &&
              "border-rose-600 bg-rose-50 text-rose-600",
            colorScheme === "rose" &&
              isCompleted &&
              "border-rose-600 bg-rose-600 text-white"
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
            !isActive && !isCompleted && "bg-muted text-muted-foreground",
            colorScheme === "blue" &&
              isActive &&
              "bg-blue-600 text-white ring-blue-600",
            colorScheme === "blue" && isCompleted && "bg-blue-500 text-white",
            colorScheme === "green" &&
              isActive &&
              "bg-green-600 text-white ring-green-600",
            colorScheme === "green" && isCompleted && "bg-green-500 text-white",
            colorScheme === "purple" &&
              isActive &&
              "bg-purple-600 text-white ring-purple-600",
            colorScheme === "purple" &&
              isCompleted &&
              "bg-purple-500 text-white",
            colorScheme === "amber" &&
              isActive &&
              "bg-amber-600 text-white ring-amber-600",
            colorScheme === "amber" && isCompleted && "bg-amber-500 text-white",
            colorScheme === "rose" &&
              isActive &&
              "bg-rose-600 text-white ring-rose-600",
            colorScheme === "rose" && isCompleted && "bg-rose-500 text-white"
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
            !isActive && !isCompleted && "text-muted-foreground",
            colorScheme === "blue" &&
              (isActive || isCompleted) &&
              "text-blue-600",
            colorScheme === "green" &&
              (isActive || isCompleted) &&
              "text-green-600",
            colorScheme === "purple" &&
              (isActive || isCompleted) &&
              "text-purple-600",
            colorScheme === "amber" &&
              (isActive || isCompleted) &&
              "text-amber-600",
            colorScheme === "rose" &&
              (isActive || isCompleted) &&
              "text-rose-600"
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
                  !isActive && "bg-muted text-muted-foreground",
                  colorScheme === "blue" &&
                    isActive &&
                    "bg-blue-600 text-white",
                  colorScheme === "green" &&
                    isActive &&
                    "bg-green-600 text-white",
                  colorScheme === "purple" &&
                    isActive &&
                    "bg-purple-600 text-white",
                  colorScheme === "amber" &&
                    isActive &&
                    "bg-amber-600 text-white",
                  colorScheme === "rose" && isActive && "bg-rose-600 text-white"
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
              !isActive && !isCompleted && "bg-muted text-muted-foreground",
              colorScheme === "blue" && isActive && "bg-blue-600 text-white",
              colorScheme === "blue" && isCompleted && "bg-blue-500 text-white",
              colorScheme === "green" && isActive && "bg-green-600 text-white",
              colorScheme === "green" &&
                isCompleted &&
                "bg-green-500 text-white",
              colorScheme === "purple" &&
                isActive &&
                "bg-purple-600 text-white",
              colorScheme === "purple" &&
                isCompleted &&
                "bg-purple-500 text-white",
              colorScheme === "amber" && isActive && "bg-amber-600 text-white",
              colorScheme === "amber" &&
                isCompleted &&
                "bg-amber-500 text-white",
              colorScheme === "rose" && isActive && "bg-rose-600 text-white",
              colorScheme === "rose" && isCompleted && "bg-rose-500 text-white"
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
              !isActive && !isCompleted && "bg-muted text-muted-foreground",
              colorScheme === "blue" &&
                isActive &&
                "bg-blue-600 text-white ring-blue-100",
              colorScheme === "blue" && isCompleted && "bg-blue-500 text-white",
              colorScheme === "green" &&
                isActive &&
                "bg-green-600 text-white ring-green-100",
              colorScheme === "green" &&
                isCompleted &&
                "bg-green-500 text-white",
              colorScheme === "purple" &&
                isActive &&
                "bg-purple-600 text-white ring-purple-100",
              colorScheme === "purple" &&
                isCompleted &&
                "bg-purple-500 text-white",
              colorScheme === "amber" &&
                isActive &&
                "bg-amber-600 text-white ring-amber-100",
              colorScheme === "amber" &&
                isCompleted &&
                "bg-amber-500 text-white",
              colorScheme === "rose" &&
                isActive &&
                "bg-rose-600 text-white ring-rose-100",
              colorScheme === "rose" && isCompleted && "bg-rose-500 text-white"
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
            !isActive && !isCompleted && "bg-muted text-muted-foreground",
            colorScheme === "blue" && isActive && "bg-blue-600 text-white",
            colorScheme === "blue" && isCompleted && "bg-blue-500 text-white",
            colorScheme === "green" && isActive && "bg-green-600 text-white",
            colorScheme === "green" && isCompleted && "bg-green-500 text-white",
            colorScheme === "purple" && isActive && "bg-purple-600 text-white",
            colorScheme === "purple" &&
              isCompleted &&
              "bg-purple-500 text-white",
            colorScheme === "amber" && isActive && "bg-amber-600 text-white",
            colorScheme === "amber" && isCompleted && "bg-amber-500 text-white",
            colorScheme === "rose" && isActive && "bg-rose-600 text-white",
            colorScheme === "rose" && isCompleted && "bg-rose-500 text-white"
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
              "border-muted-foreground text-muted-foreground",
            colorScheme === "blue" &&
              isActive &&
              "border-blue-600 text-blue-600",
            colorScheme === "blue" &&
              isCompleted &&
              "border-blue-600 bg-blue-600 text-white",
            colorScheme === "green" &&
              isActive &&
              "border-green-600 text-green-600",
            colorScheme === "green" &&
              isCompleted &&
              "border-green-600 bg-green-600 text-white",
            colorScheme === "purple" &&
              isActive &&
              "border-purple-600 text-purple-600",
            colorScheme === "purple" &&
              isCompleted &&
              "border-purple-600 bg-purple-600 text-white",
            colorScheme === "amber" &&
              isActive &&
              "border-amber-600 text-amber-600",
            colorScheme === "amber" &&
              isCompleted &&
              "border-amber-600 bg-amber-600 text-white",
            colorScheme === "rose" &&
              isActive &&
              "border-rose-600 text-rose-600",
            colorScheme === "rose" &&
              isCompleted &&
              "border-rose-600 bg-rose-600 text-white"
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
          !isActive && !isCompleted && "bg-muted text-muted-foreground",
          colorScheme === "blue" && isActive && "bg-blue-600 text-white",
          colorScheme === "blue" && isCompleted && "bg-blue-500 text-white",
          colorScheme === "green" && isActive && "bg-green-600 text-white",
          colorScheme === "green" && isCompleted && "bg-green-500 text-white",
          colorScheme === "purple" && isActive && "bg-purple-600 text-white",
          colorScheme === "purple" && isCompleted && "bg-purple-500 text-white",
          colorScheme === "amber" && isActive && "bg-amber-600 text-white",
          colorScheme === "amber" && isCompleted && "bg-amber-500 text-white",
          colorScheme === "rose" && isActive && "bg-rose-600 text-white",
          colorScheme === "rose" && isCompleted && "bg-rose-500 text-white"
        )}
      >
        {isCompleted ? (
          <Check size={16} />
        ) : isActive ? (
          <CircleDot size={16} />
        ) : (
          stepNumber
        )}
      </div>
    );
  };

  const renderStepper = () => {
    if (direction === "horizontal") {
      return (
        <div
          className={cn(
            "w-full max-w-4xl mx-auto mb-8",
            stepperVariants({ colorScheme, size })
          )}
        >
          {showProgress && (
            <ProgressBar progress={progress} colorScheme={colorScheme} />
          )}
          <div className="flex items-start justify-between">
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
                    "flex flex-col items-center space-y-2 relative group",
                    index < stepLabels.length - 1 && "flex-1",
                    isClickable && "cursor-pointer"
                  )}
                  onClick={() => handleStepClick(index)}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                >
                  {renderStepIndicator(index)}

                  {index < stepLabels.length - 1 && variant !== "minimal" && (
                    <div className="absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-[2px]">
                      <div
                        className={cn(
                          "w-full h-full",
                          connectorVariants({
                            connectorStyle,
                            colorScheme,
                          })
                        )}
                      />
                      <motion.div
                        className={cn(
                          "absolute top-0 left-0 h-full",
                          colorScheme === "default" && "bg-primary",
                          colorScheme === "blue" && "bg-blue-600",
                          colorScheme === "green" && "bg-green-600",
                          colorScheme === "purple" && "bg-purple-600",
                          colorScheme === "amber" && "bg-amber-600",
                          colorScheme === "rose" && "bg-rose-600"
                        )}
                        initial={{ width: isCompleted ? "100%" : "0%" }}
                        animate={{ width: isCompleted ? "100%" : "0%" }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}

                  {variant !== "icon" && (
                    <div
                      className={cn(
                        "text-center transition-all duration-200",
                        isActive ? "text-foreground" : "text-muted-foreground",
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
          stepperVariants({ colorScheme, size })
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
                          colorScheme,
                        })
                      )}
                    />
                    <motion.div
                      className={cn(
                        "absolute top-0 left-0 w-full",
                        colorScheme === "default" && "bg-primary",
                        colorScheme === "blue" && "bg-blue-600",
                        colorScheme === "green" && "bg-green-600",
                        colorScheme === "purple" && "bg-purple-600",
                        colorScheme === "amber" && "bg-amber-600",
                        colorScheme === "rose" && "bg-rose-600"
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
    const t = useTranslations("components/ui/stepper");
    if (isDone) return;
    const backButtonVariant = colorScheme === "default" ? "outline" : "outline";
    const nextButtonVariant = colorScheme === "default" ? "default" : "default";

    return (
      <div className="flex items-center justify-between mt-8">
        {currentStep > 1 ? (
          <Button
            variant={backButtonVariant}
            onClick={onPrev}
            className={cn(
              "group transition-all duration-200 hover:translate-x-[-2px]",
              buttonVariants({ colorScheme }),
              colorScheme !== "default" && "data-[outline=true]"
            )}
            data-outline={backButtonVariant === "outline"}
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-[-2px]" />
            {t("Back")}
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
              buttonVariants({ colorScheme })
            )}
          >
            {t("Next")}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-[2px]" />
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className={cn("relative", buttonVariants({ colorScheme }))}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("Processing")}.
              </>
            ) : (
              <>
                {t("Submit")}
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
            <ProgressBar progress={progress} colorScheme={colorScheme} />
          )}
          {renderStepper()}
        </div>

        {/* Right Side: Step Content */}
        <div className="flex-1 space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              {...animationVariants}
              className="bg-card rounded-lg p-6 shadow-sm border"
            >
              {children}
            </motion.div>
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
        <motion.div
          key={currentStep}
          {...animationVariants}
          className="bg-card rounded-lg p-6 shadow-sm border"
        >
          {children}
        </motion.div>
      </AnimatePresence>
      {renderNavigation()}
    </div>
  );
}

export default Stepper;
