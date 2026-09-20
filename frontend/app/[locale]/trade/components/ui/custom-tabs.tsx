"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center bg-background border-b border-border",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

interface TabTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  icon?: React.ReactNode;
}

const TabTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabTriggerProps
>(({ className, icon, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center h-8 px-2.5 text-xs font-medium transition-all",
      // The active indicator is interaction, not state (R2). It used to be the
      // brand accent in light and emerald in dark, so an active tab read as a
      // "success" in one theme and as the accent in the other.
      "border-b-2 border-transparent data-[state=active]:border-primary",
      "text-muted-foreground data-[state=active]:text-foreground hover:text-foreground/80",
      "focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  >
    {icon && <span className="mr-1">{icon}</span>}
    {children}
  </TabsPrimitive.Trigger>
));
TabTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-0 focus-visible:outline-none", className)}
    {...props}
  />
));
TabContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabTrigger, TabContent };
