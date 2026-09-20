"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        // `font-medium` -> the field-label token, which ships at 500 and is
        // therefore the same weight. Separate from `--control-font-weight`
        // because a label is not a control: making form labels heavier is a
        // legibility choice about scanning a long form, and has nothing to do
        // with how bold the buttons are.
        "flex items-center gap-2 text-sm leading-none font-[var(--field-label-weight)] select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Label };
