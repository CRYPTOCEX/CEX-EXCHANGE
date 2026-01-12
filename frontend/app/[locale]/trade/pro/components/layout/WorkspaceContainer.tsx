"use client";

import React, { ReactNode, useEffect } from "react";
import { cn } from "../../utils/cn";

interface WorkspaceContainerProps {
  children: ReactNode;
  className?: string;
}

export function WorkspaceContainer({
  children,
  className,
}: WorkspaceContainerProps) {
  // Handle viewport height for all devices (fixes iPad/tablet 100vh issue)
  useEffect(() => {
    const updateViewportHeight = () => {
      // Use the actual visible viewport height to account for browser UI (address bar, etc.)
      const height = window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
    };

    updateViewportHeight();

    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', () => {
      // Delay for orientation change to complete
      setTimeout(updateViewportHeight, 100);
    });

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
    };
  }, []);

  return (
    <div
      className={cn(
        "tp-workspace",
        "h-screen-mobile w-full",
        "bg-[var(--tp-bg-primary)]",
        "flex flex-col",
        "overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}
