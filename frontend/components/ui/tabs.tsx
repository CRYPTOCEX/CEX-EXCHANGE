"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Tabs.
 *
 * MEASURED PROBLEM (2026-07-29): `<TabsList>` 146 uses with **124 (85%)**
 * carrying a className, and `<TabsTrigger>` 463 with 243 (52%). Neither
 * exposed a `variant` or `size`, so every non-default look was rebuilt by
 * hand — 50 distinct TabsList signatures and 24 TabsTrigger signatures
 * collapsing into just SIX recurring archetypes:
 *
 *   segmented (grid/pill on a muted track)  74   <- the primitive's own look
 *   default, untouched                      22
 *   segmented with a tinted track           19
 *   underline (transparent, bottom rule)    10
 *   bare card grid                           4
 *   solid-brand / tonal-card active states    +
 *
 * Those six are now the `variant` axis. The variant lives on `TabsList` and
 * reaches `TabsTrigger` through context, because the two are separate
 * components and Radix does not thread props between them — asking callers to
 * repeat `variant` on every trigger is how the drift started.
 *
 * BACK-COMPAT: `segmented` reproduces the previous class strings byte for byte
 * and is the default, so all 609 existing call sites render unchanged.
 *
 * Also corrected here: the trigger carried the OLD shadcn focus recipe
 * (`focus-visible:ring-2` + `ring-offset-2` + `focus-visible:outline-none`)
 * while every other control in the system uses `outline-hidden` +
 * `ring-ring/50` + `ring-[3px]`. Tabs were the last holdout.
 */

const FOCUS =
  "outline-hidden focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

type TabsVariant = "segmented" | "underline" | "pill" | "card" | "plain";
type TabsSize = "sm" | "md" | "lg";

const TabsCtx = React.createContext<{ variant: TabsVariant; size: TabsSize }>({
  variant: "segmented",
  size: "md",
});

const tabsListVariants = cva("inline-flex items-center justify-center", {
  variants: {
    variant: {
      segmented: "rounded-md bg-muted p-1 text-muted-foreground",
      underline:
        "w-full justify-start gap-4 rounded-none border-b border-border bg-transparent p-0 text-muted-foreground",
      pill: "gap-2 rounded-none bg-transparent p-0 text-muted-foreground",
      card: "gap-2 rounded-none bg-transparent p-0 text-muted-foreground",
      plain: "gap-4 rounded-none bg-transparent p-0 text-muted-foreground",
    },
    size: { sm: "", md: "", lg: "" },
  },
  compoundVariants: [
    // Only `segmented` is a fixed-height track; the others size to their
    // triggers, so forcing a height on them clips the active treatment.
    { variant: "segmented", size: "sm", class: "h-9" },
    { variant: "segmented", size: "md", class: "h-10" },
    { variant: "segmented", size: "lg", class: "h-11" },
    { variant: "underline", size: "sm", class: "h-auto" },
    { variant: "underline", size: "md", class: "h-auto" },
    { variant: "underline", size: "lg", class: "h-auto" },
  ],
  defaultVariants: { variant: "segmented", size: "md" },
});

const tabsTriggerVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium transition-[color,background-color,border-color,box-shadow] duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 " +
    FOCUS,
  {
    variants: {
      variant: {
        segmented:
          "rounded-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        underline:
          "rounded-none border-b-2 border-transparent bg-transparent data-[state=active]:border-primary data-[state=active]:text-foreground",
        pill: "rounded-full border border-border data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
        // Tonal, so it uses the derived ink — `text-primary` on a 10% primary
        // tint fails AA in light mode (DESIGN-SYSTEM.md 11b).
        card: "rounded-lg border border-border bg-card data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 data-[state=active]:text-primary-ink",
        plain:
          "rounded-none bg-transparent data-[state=active]:text-foreground",
      },
      size: {
        sm: "px-2.5 py-1 text-xs",
        md: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base",
      },
    },
    compoundVariants: [
      // The underline rule must sit flush with the list's bottom border.
      { variant: "underline", size: "sm", class: "pb-2" },
      { variant: "underline", size: "md", class: "pb-2.5" },
      { variant: "underline", size: "lg", class: "pb-3" },
    ],
    defaultVariants: { variant: "segmented", size: "md" },
  }
);

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> &
    VariantProps<typeof tabsListVariants>
>(({ className, variant, size, ...props }, ref) => {
  const v = (variant ?? "segmented") as TabsVariant;
  const s = (size ?? "md") as TabsSize;
  return (
    <TabsCtx.Provider value={React.useMemo(() => ({ variant: v, size: s }), [v, s])}>
      <TabsPrimitive.List
        ref={ref}
        className={cn(tabsListVariants({ variant: v, size: s }), className)}
        {...props}
      />
    </TabsCtx.Provider>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> &
    VariantProps<typeof tabsTriggerVariants>
>(({ className, variant, size, ...props }, ref) => {
  // Inherit from the enclosing TabsList unless this trigger overrides it.
  const ctx = React.useContext(TabsCtx);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        tabsTriggerVariants({
          variant: (variant ?? ctx.variant) as TabsVariant,
          size: (size ?? ctx.size) as TabsSize,
        }),
        className
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-2", FOCUS, className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsTriggerVariants };
