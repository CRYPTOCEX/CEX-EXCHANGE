"use client";

/**
 * Pattern Library Wrapper for Trading Pro
 *
 * Reuses the binary trading pattern library component since
 * chart patterns apply to all types of trading.
 *
 * Uses a portal to render inside the main content area (below the header).
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PatternLibraryBase from "@/app/[locale]/binary/components/education/pattern-library";
import type { ChartPattern } from "@/app/[locale]/binary/components/education/pattern-library";

export interface PatternLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onPatternSelect?: (pattern: ChartPattern) => void;
}

export default function PatternLibrary({ isOpen, onClose, onPatternSelect }: PatternLibraryProps) {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Find the GridLayout container (main content area below header)
    // This ensures the pattern library appears below the navbar
    const gridLayout = document.querySelector('.tp-grid-layout');
    if (gridLayout instanceof HTMLElement) {
      setPortalContainer(gridLayout);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <PatternLibraryBase
      isOpen={isOpen}
      onClose={onClose}
      onPatternSelect={onPatternSelect}
    />
  );

  // If we found the grid layout container, portal into it
  // Otherwise fall back to rendering in place
  if (portalContainer) {
    return createPortal(content, portalContainer);
  }

  return content;
}

export type { ChartPattern };
