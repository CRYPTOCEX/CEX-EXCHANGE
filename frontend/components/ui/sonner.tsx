"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      /*
       * Sonner styles itself through its own CSS custom properties, which the
       * `classNames` below do NOT override — they sit on the same element and
       * lose to sonner's inline vars. The library's defaults are neutral greys
       * (#171717 / #ededed / #fcfcfc), so a toast rendered off-token no matter
       * what utilities were applied. Point the vars at the design tokens.
       */
      style={
        {
          "--normal-bg": "hsl(var(--popover))",
          "--normal-text": "hsl(var(--popover-foreground))",
          "--normal-border": "hsl(var(--border))",
          "--success-bg": "hsl(var(--success) / 0.12)",
          "--success-text": "hsl(var(--success))",
          "--success-border": "hsl(var(--success) / 0.3)",
          "--error-bg": "hsl(var(--destructive) / 0.12)",
          "--error-text": "hsl(var(--destructive))",
          "--error-border": "hsl(var(--destructive) / 0.3)",
          "--warning-bg": "hsl(var(--warning) / 0.12)",
          "--warning-text": "hsl(var(--warning))",
          "--warning-border": "hsl(var(--warning) / 0.3)",
          "--info-bg": "hsl(var(--info) / 0.12)",
          "--info-text": "hsl(var(--info))",
          "--info-border": "hsl(var(--info) / 0.3)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-medium",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
