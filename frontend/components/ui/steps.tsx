import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/* ----------------------------------------------------------------------------
   1) CVA definitions for styling
----------------------------------------------------------------------------- */
const stepVariants = cva(
  "flex break-words [&_[step-box]]:font-medium \
   [&_[step-box=disable]]:text-foreground/70 \
   [&_[step-box=completed]]:text-primary-foreground \
   [&_[step-box=current]]:text-primary \
   [&_[step-box=current]]:bg-background",
  {
    variants: {
      variant: {
        default:
          "[&_[step-bar-bg=disable]]:before:bg-default-200 \
           [&_[step-bar-bg=current]]:before:bg-default-200 \
           [&_[step-bar-bg=completed]]:before:bg-primary \
           [&_[step-box=current]]:border-2 [&_[step-box=current]]:border-primary \
           [&_[step-box=completed]]:bg-primary \
           [&_[step-box=disable]]:bg-default-200 \
           [&_[step-box=error]]:bg-destructive \
           [&_[step-box=error]]:text-destructive-foreground",
      },
      size: {
        sm: "[&_[step-box]]:h-5 [&_[step-box]]:w-5 [&_[step-box]]:text-[10px]",
        md: "[&_[step-box]]:h-8 [&_[step-box]]:w-8 [&_[step-box]]:text-xs",
        lg: "[&_[step-box]]:h-9 [&_[step-box]]:w-9 [&_[step-box]]:text-sm",
        xl: "[&_[step-box]]:h-10 [&_[step-box]]:w-10 [&_[step-box]]:text-base",
      },
      content: {
        right: "flex-row",
        bottom: "flex-col",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "lg",
      content: "bottom",
    },
  }
);

const stepperVariants = cva("flex", {
  variants: {
    direction: {
      horizontal: "flex-row items-center",
      vertical: "flex-col ltr:items-baseline",
    },
  },
  defaultVariants: {
    direction: "horizontal",
  },
});

/* ----------------------------------------------------------------------------
   2) StepperProps for <Stepper>
----------------------------------------------------------------------------- */
interface StepperProps
  extends React.HTMLAttributes<HTMLOListElement>,
    VariantProps<typeof stepVariants> {
  /** The child <Step> elements */
  children?: React.ReactNode;
  /** Which step index is active (if relevant) */
  activestep?: number;
  /** If true, entire stepper is disabled except the last step */
  disabled?: boolean;
  /** Direction of steps */
  direction?: "horizontal" | "vertical";
  /** The current step index */
  current?: number;
  /** Content layout */
  content?: "bottom" | "right";
  /** Show an icon instead of step count? */
  icon?: boolean;
  /** If true, label is placed below or next to the icon (centered). */
  alternativeLabel?: boolean;
  /** If true, add spacing. */
  gap?: boolean;
  /** Overall status: error, success, etc. */
  status?: "error" | "warning" | "success" | "info";
}

/* ----------------------------------------------------------------------------
   3) StepProps for <Step>
   - Must contain all props we pass via cloneElement (isLast, index, current, etc.)
   - Add `disabled?: boolean` so that we can pass it from <Stepper>.
----------------------------------------------------------------------------- */
interface StepProps
  extends React.HTMLAttributes<HTMLLIElement>,
    VariantProps<typeof stepVariants> {
  children?: React.ReactNode;
  /** True if this step is the final step in the stepper */
  isLast?: boolean;
  /** The 1-based step count (index + 1) */
  count?: number;
  /** The current step index (to compare with `index`) */
  current?: number;
  /** The step's zero-based index in the list */
  index?: number;
  /** If `true` or a ReactNode, show an icon (Check, e.g.) or custom node */
  icon?: boolean | React.ReactNode;
  /** If `true`, apply spacing (gap) */
  gap?: boolean;
  /** Horizontal or vertical layout */
  direction?: "horizontal" | "vertical";
  /** If `true`, label is placed in an alternate layout */
  alternativeLabel?: boolean;
  /** True if this step is the second to last item in the list */
  isBeforeLast?: boolean;
  /** Overall status: error, success, etc. */
  status?: "error" | "warning" | "success" | "info";
  /** Content layout */
  content?: "bottom" | "right";
  /** Tells the step which step is actually “active” */
  activestep?: number;
  /** If true, the step is in a disabled state */
  disabled?: boolean;
}

/* ----------------------------------------------------------------------------
   4) <Stepper> parent component
   - Loops over children <Step> and injects props with cloneElement
----------------------------------------------------------------------------- */
export const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(
  (
    {
      className,
      children,
      activestep,
      direction = "horizontal",
      disabled,
      variant,
      size,
      current,
      content = "bottom",
      icon,
      alternativeLabel,
      gap,
      status,
      ...props
    },
    ref
  ) => {
    const childArray = React.Children.toArray(children);

    return (
      <ol
        ref={ref}
        className={cn(stepperVariants({ direction }), className, {
          "gap-2": gap,
          "text-center": alternativeLabel,
          "gap-3": content === "right",
        })}
        {...props}
      >
        {childArray.map((child, index) => {
          if (!React.isValidElement(child)) return null;

          // Instead of cloneElement<StepProps>, do a cast afterwards:
          const isLast = index === childArray.length - 1;
          const isBeforeLast = index === childArray.length - 2;
          const count = index + 1; // 1-based

          // Create a new props object we want to merge
          const newProps: Partial<StepProps> = {
            isLast,
            isBeforeLast,
            activestep,
            // If disabled was true, only the last step is not disabled:
            disabled: disabled && !isLast,
            count,
            index,
            current,
            gap,
            direction,
            alternativeLabel,
            content,
            status,
            size,
            className: cn(
              stepVariants({ variant, size, content }),
              (child?.props as { className?: string })?.className
            ),
          };

          return React.cloneElement(
            child,
            newProps
          ) as React.ReactElement<StepProps>;
        })}
      </ol>
    );
  }
);
Stepper.displayName = "Stepper";

/* ----------------------------------------------------------------------------
   5) <Step> child component
----------------------------------------------------------------------------- */
export const Step = React.forwardRef<HTMLLIElement, StepProps>(
  (
    {
      className,
      children,
      variant,
      size,
      isLast,
      count,
      current,
      content,
      index,
      icon,
      gap,
      direction,
      alternativeLabel,
      isBeforeLast,
      status,
      activestep,
      disabled,
      ...props
    },
    ref
  ) => {
    const getStepBarBg = (c: number | undefined, i: number | undefined) => {
      if (c === undefined || i === undefined) return "";
      if (c > i) return "completed";
      if (c < i) return "disable";
      if (c === i) return "current";
      return "";
    };

    const stepBarBg = getStepBarBg(current, index);

    const getStepBox = (
      c: number | undefined,
      i: number | undefined,
      s: StepProps["status"]
    ) => {
      if (c === undefined || i === undefined) return "";
      if (s === "error" && c === i) return "error";
      if (c > i) return "completed";
      if (c < i) return "disable";
      if (c === i) return "current";
      return "";
    };

    const stepBox = getStepBox(current, index, status);
    const isContentRight = content === "right";

    // Example logic for whether we display children
    const renderChildren = !isContentRight;

    return (
      <li
        ref={ref}
        className={cn(stepVariants({ variant, size, content }), className, {
          "flex-row gap-x-4 min-h-[80px]": direction === "vertical",
          "flex-1": !isLast,
          "last:flex-1": alternativeLabel && isLast,
          "last:flex-none": alternativeLabel && isLast && gap,
          "opacity-50 cursor-not-allowed": disabled && !isLast,
        })}
        {...props}
      >
        <div
          step-bar-bg={stepBarBg}
          className={cn("flex items-center flex-row relative z-1", {
            "flex-col": direction === "vertical",

            // Horizontal line under the steps
            "before:absolute before:z-[-1] before:top-1/2 before:-translate-y-1/2 before:w-full":
              !isLast && direction !== "vertical",
            "ltr:before:left-[44px] before:w-[calc(100%-44px)] rtl:before:right-[44px]":
              gap && !alternativeLabel,
            "ltr:before:left-1/2 rtl:before:right-1/2":
              alternativeLabel && !gap,
            "ltr:before:left-[calc(50%+33px)] rtl:before:right-[calc(50%+33px)] before:w-[calc(100%-60px)]":
              alternativeLabel && gap,
            "before:w-[calc(100%-85px)]":
              alternativeLabel && gap && isBeforeLast,
            "flex-1 before:h-0.5": isContentRight,
            "before:h-1": !isContentRight,
          })}
        >
          {/* The icon/circle representing this step */}
          <span
            className={cn(
              "flex-none inline-flex items-center justify-center rounded-full relative z-20 leading-none",
              {
                "mx-auto": alternativeLabel,
                "[&>svg]:w-5 [&>svg]:h-5": size !== "sm",
                "[&>svg]:w-3 [&>svg]:h-3": size === "sm",
              }
            )}
            step-box={stepBox}
          >
            {/* If step is completed, show check; else show icon or count */}
            {stepBarBg === "completed" ? <Check /> : icon ? icon : count}
          </span>

          {/* If content is on the right, place children inside */}
          {isContentRight && (
            <div className="bg-card px-3">{renderChildren && children}</div>
          )}

          {/* Vertical line between steps if not the last step */}
          {!isLast && direction === "vertical" && (
            <div
              className={cn(
                "h-full w-1 grow before:absolute before:h-full before:w-full relative",
                {
                  "before:top-[10px] before:h-[calc(100%-10px)]": gap,
                }
              )}
              step-bar-bg={stepBarBg}
            />
          )}
        </div>

        {/* If content is on bottom or not using isContentRight, show children here */}
        {!isContentRight && <div>{children}</div>}
      </li>
    );
  }
);
Step.displayName = "Step";

/* ----------------------------------------------------------------------------
   6) <StepLabel> and <StepDescription> subcomponents
----------------------------------------------------------------------------- */
interface CommonProps extends React.HTMLAttributes<HTMLDivElement> {
  error?: boolean;
}

export const StepLabel = React.forwardRef<HTMLDivElement, CommonProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "text-sm text-default-600 font-medium mt-2",
          error && "text-destructive",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
StepLabel.displayName = "StepLabel";

export const StepDescription = React.forwardRef<HTMLDivElement, CommonProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "text-sm text-muted-foreground",
          error && "text-destructive",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
StepDescription.displayName = "StepDescription";
