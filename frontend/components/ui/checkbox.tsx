"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxSize = "sm" | "md" | "lg";
type CheckboxRadius = "none" | "sm" | "md" | "lg" | "full";

const sizeClasses: Record<CheckboxSize, string> = {
  sm: "size-3",
  md: "size-4",
  lg: "size-5",
};

const iconSizeClasses: Record<CheckboxSize, string> = {
  sm: "size-2.5",
  md: "size-3.5",
  lg: "size-4.5",
};

const radiusClasses: Record<CheckboxRadius, string> = {
  none: "rounded-none",
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

interface CheckboxProps
  extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  size?: CheckboxSize;
  radius?: CheckboxRadius;
}

function Checkbox({
  className,
  size = "md",
  radius = "md",
  ...props
}: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        sizeClasses[size],
        radiusClasses[radius],
        "peer border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shrink-0 border shadow-2xs transition-shadow outline-hidden focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className={iconSizeClasses[size]} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
