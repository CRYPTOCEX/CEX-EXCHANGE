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
          //
          // THE OFF STATE USED TO BE INVISIBLE, IN BOTH THEMES.
          // `bg-surface-3` took the track from the GROUND family and the thumb
          // below takes `bg-background` from the same family, one step apart —
          // so the knob was a near-black dot on a dark-grey pill, on a card
          // that was itself barely a step away. Measured on the chart's
          // Auto-trade switch before the change:
          //
          //     thumb rgb(6,8,12) vs track rgb(24,32,41)   1.22:1
          //     track vs card ground rgb(18,24,31)         1.09:1
          //     WCAG 1.4.11 (non-text UI) requires         3.00:1
          //
          // Light theme was WORSE, not better: `--background` at 96.7%
          // lightness on `--surface-3` at 95.1% is 1.03:1.
          //
          // A knob is PAPER and a track is INK, and the two have to come from
          // opposite ends of the ramp or the control has no state to read. The
          // thumb is already paper — `--background` inverts with the theme — so
          // the track has to be ink that inverts with it, and
          // `--subtle-foreground` is the mid-weight token that does (53.9%
          // lightness in dark, 44.1% in light). Measured after, on the same
          // switch, with the tinted card ground rasterised from the painted
          // pixel rather than read off `getComputedStyle` (it computes to
          // `oklab(… / 0.1)`, whose coordinates are not RGB bytes):
          //
          //     dark   thumb/track 5.54:1   track/ground 4.58:1
          //     light  thumb/track 4.76:1   track/ground 4.49:1
          //
          // Only the UNCHECKED state moves. `data-[state=checked]:bg-primary`
          // is untouched, and the three call sites that already override the
          // off track (`data-[state=unchecked]:bg-warning`, in the gateway
          // layouts) still win through twMerge.
          "relative group data-[state=checked]:bg-primary data-[state=unchecked]:bg-subtle-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent shadow-2xs transition-[color,background-color,border-color,box-shadow] outline-hidden focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          className
        )}
      >
        {startContent && (
          <span className="absolute ltr:left-1 rtl:right-1 top-1/2 -translate-y-1/2 text-xs opacity-0 transition-all group-data-[state=checked]:opacity-100">
            {startContent}
          </span>
        )}
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className={cn(
            "bg-background pointer-events-none block size-4 rounded-full ring-0 shadow-lg transition-transform data-[state=checked]:ltr:translate-x-4 data-[state=checked]:rtl:-translate-x-4 data-[state=unchecked]:translate-x-0",
            thumbClass
          )}
        >
          {thumbIcon}
        </SwitchPrimitive.Thumb>
        {endContent && (
          <span className="absolute ltr:right-1 rtl:left-1 top-1/2 -translate-y-1/2 text-xs opacity-0 transition-all group-data-[state=checked]:opacity-100">
            {endContent}
          </span>
        )}
      </SwitchPrimitive.Root>
    );
  }
);
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
