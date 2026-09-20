"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({
  message = "Loading...",
}: LoadingOverlayProps) {
  return (
    <div className="h-screen w-full bg-[var(--tp-bg-primary)] flex flex-col items-center justify-center">
      <Loader2 className="w-8 h-8 text-[var(--tp-blue)] animate-spin mb-4" />
      <p className="text-[var(--tp-text-secondary)] text-sm">{message}</p>
    </div>
  );
}
