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
      "inline-flex items-center justify-center bg-background dark:bg-zinc-950 border-b border-border dark:border-zinc-800",
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
      "border-b-2 border-transparent data-[state=active]:border-primary dark:data-[state=active]:border-emerald-500",
      "text-muted-foreground dark:text-zinc-500 data-[state=active]:text-foreground dark:data-[state=active]:text-zinc-100 hover:text-foreground/80 dark:hover:text-zinc-300",
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
