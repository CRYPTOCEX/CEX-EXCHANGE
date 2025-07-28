"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  /** Optional icon to render inside the thumb */
  thumbIcon?: React.ReactNode;
  /** Additional classes for the thumb */
  thumbClass?: string;
  /** Optional content to display at the start (left side) of the switch */
  startContent?: React.ReactNode;
  /** Optional content to display at the end (right side) of the switch */
  endContent?: React.ReactNode;
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(
  (
    { className, thumbIcon, thumbClass, startContent, endContent, ...props },
    ref
  ) => {
    return (
      <SwitchPrimitive.Root
        data-slot="switch"
        ref={ref}
        {...props}
        className={cn(
          // Default styling from ShadCN with a "group" and "relative" added for positioning extra content.
          "relative group data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent shadow-2xs transition-all outline-hidden focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        {startContent && (
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs opacity-0 transition-all group-data-[state=checked]:opacity-100">
            {startContent}
          </span>
        )}
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className={cn(
            "bg-background pointer-events-none block size-4 rounded-full ring-0 shadow-lg transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
            thumbClass
          )}
        >
          {thumbIcon}
        </SwitchPrimitive.Thumb>
        {endContent && (
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs opacity-0 transition-all group-data-[state=checked]:opacity-100">
            {endContent}
          </span>
        )}
      </SwitchPrimitive.Root>
    );
  }
);
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
