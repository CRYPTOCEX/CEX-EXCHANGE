"use client";

/**
 * Orientation Detection Hook
 *
 * Detects device orientation and provides:
 * - Current orientation (portrait/landscape)
 * - Orientation change events
 * - Lock/unlock orientation (where supported)
 */

import { useState, useEffect, useCallback } from "react";

// ============================================================================
// TYPES
// ============================================================================

export type Orientation = "portrait" | "landscape";

// Screen Orientation API types (not fully supported in all TypeScript versions)
type OrientationLockType =
  | "any"
  | "natural"
  | "landscape"
  | "portrait"
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape-primary"
  | "landscape-secondary";

// Extended ScreenOrientation interface with lock/unlock
// Use intersection type instead of extends to avoid conflicts with built-in types
type ExtendedScreenOrientation = ScreenOrientation & {
  lock?: (orientation: OrientationLockType) => Promise<void>;
};

export interface OrientationState {
  orientation: Orientation;
  angle: number;
  isLandscape: boolean;
  isPortrait: boolean;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface UseOrientationOptions {
  lockToLandscape?: boolean;
  lockToPortrait?: boolean;
  onOrientationChange?: (state: OrientationState) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function getOrientation(): Orientation {
  if (typeof window === "undefined") return "portrait";

  // Try Screen Orientation API first
  if (screen.orientation) {
    const type = screen.orientation.type;
    return type.includes("landscape") ? "landscape" : "portrait";
  }

  // Fallback to window dimensions
  return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
}

function getOrientationAngle(): number {
  if (typeof window === "undefined") return 0;

  // Try Screen Orientation API first
  if (screen.orientation) {
    return screen.orientation.angle;
  }

  // Fallback to deprecated orientation property
  if (typeof window.orientation === "number") {
    return window.orientation;
  }

  return 0;
}

function buildOrientationState(): OrientationState {
  if (typeof window === "undefined") {
    return {
      orientation: "portrait",
      angle: 0,
      isLandscape: false,
      isPortrait: true,
      width: 0,
      height: 0,
      aspectRatio: 1,
    };
  }

  const orientation = getOrientation();
  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    orientation,
    angle: getOrientationAngle(),
    isLandscape: orientation === "landscape",
    isPortrait: orientation === "portrait",
    width,
    height,
    aspectRatio: width / height,
  };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useOrientation(options: UseOrientationOptions = {}): OrientationState & {
  lockOrientation: (target: Orientation | "natural") => Promise<boolean>;
  unlockOrientation: () => void;
  isLockSupported: boolean;
} {
  const { onOrientationChange } = options;

  const [state, setState] = useState<OrientationState>(buildOrientationState);
  const [isLockSupported, setIsLockSupported] = useState(false);

  // Check lock support
  useEffect(() => {
    const orientation = screen?.orientation as ExtendedScreenOrientation | undefined;
    setIsLockSupported(
      typeof screen !== "undefined" &&
      "orientation" in screen &&
      typeof orientation?.lock === "function"
    );
  }, []);

  // Handle orientation changes
  useEffect(() => {
    const handleChange = () => {
      const newState = buildOrientationState();
      setState(newState);
      onOrientationChange?.(newState);
    };

    // Use Screen Orientation API if available
    if (screen.orientation) {
      screen.orientation.addEventListener("change", handleChange);
    }

    // Also listen to resize for fallback
    window.addEventListener("resize", handleChange);
    window.addEventListener("orientationchange", handleChange);

    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener("change", handleChange);
      }
      window.removeEventListener("resize", handleChange);
      window.removeEventListener("orientationchange", handleChange);
    };
  }, [onOrientationChange]);

  // Lock orientation
  const lockOrientation = useCallback(async (target: Orientation | "natural"): Promise<boolean> => {
    const orientation = screen?.orientation as ExtendedScreenOrientation | undefined;
    if (!isLockSupported || typeof screen === "undefined" || !orientation?.lock) {
      return false;
    }

    try {
      let lockType: OrientationLockType;
      switch (target) {
        case "landscape":
          lockType = "landscape";
          break;
        case "portrait":
          lockType = "portrait";
          break;
        case "natural":
          lockType = "natural";
          break;
        default:
          lockType = "any";
      }

      await orientation.lock(lockType);
      return true;
    } catch {
      // Lock not supported or denied
      return false;
    }
  }, [isLockSupported]);

  // Unlock orientation
  const unlockOrientation = useCallback(() => {
    const orientation = screen?.orientation as ExtendedScreenOrientation | undefined;
    if (typeof screen !== "undefined" && orientation?.unlock) {
      try {
        orientation.unlock();
      } catch {
        // Ignore errors
      }
    }
  }, []);

  return {
    ...state,
    lockOrientation,
    unlockOrientation,
    isLockSupported,
  };
}

// ============================================================================
// LANDSCAPE MODE HOOK
// ============================================================================

export interface LandscapeModeOptions {
  /** Auto-lock to landscape when enabled */
  autoLock?: boolean;
  /** Minimum width to consider as true landscape (avoids split-screen) */
  minLandscapeWidth?: number;
  /** Callback when entering landscape */
  onEnterLandscape?: () => void;
  /** Callback when exiting landscape */
  onExitLandscape?: () => void;
}

export function useLandscapeMode(options: LandscapeModeOptions = {}) {
  const {
    autoLock = false,
    minLandscapeWidth = 600,
    onEnterLandscape,
    onExitLandscape,
  } = options;

  const [isLandscapeMode, setIsLandscapeMode] = useState(false);
  const orientation = useOrientation({
    onOrientationChange: (state) => {
      const isValidLandscape = state.isLandscape && state.width >= minLandscapeWidth;

      if (isValidLandscape && !isLandscapeMode) {
        setIsLandscapeMode(true);
        onEnterLandscape?.();
      } else if (!isValidLandscape && isLandscapeMode) {
        setIsLandscapeMode(false);
        onExitLandscape?.();
      }
    },
  });

  // Initial check
  useEffect(() => {
    const isValidLandscape = orientation.isLandscape && orientation.width >= minLandscapeWidth;
    setIsLandscapeMode(isValidLandscape);
  }, [orientation.isLandscape, orientation.width, minLandscapeWidth]);

  // Auto-lock if enabled
  useEffect(() => {
    if (autoLock && isLandscapeMode) {
      orientation.lockOrientation("landscape");
      return () => {
        orientation.unlockOrientation();
      };
    }
  }, [autoLock, isLandscapeMode, orientation]);

  return {
    isLandscapeMode,
    orientation,
    enterFullscreenLandscape: useCallback(async () => {
      // Request fullscreen
      if (document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          // Ignore - may require user gesture
        }
      }

      // Lock to landscape
      await orientation.lockOrientation("landscape");
    }, [orientation]),
    exitFullscreenLandscape: useCallback(async () => {
      // Exit fullscreen
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // Ignore
        }
      }

      // Unlock orientation
      orientation.unlockOrientation();
    }, [orientation]),
  };
}

export default useOrientation;
