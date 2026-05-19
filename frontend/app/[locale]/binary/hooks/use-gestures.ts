"use client";

/**
 * Mobile Gesture Hooks
 *
 * Provides gesture detection for mobile trading experience:
 * - useSwipe: Swipe gesture detection
 * - usePinchZoom: Pinch-to-zoom detection
 * - useTapGestures: Single/double tap detection
 * - useHapticFeedback: Haptic vibration feedback
 */

import { useCallback, useRef, useEffect, useState } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface SwipeDirection {
  direction: "left" | "right" | "up" | "down";
  velocity: number;
  distance: number;
}

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipe?: (direction: SwipeDirection) => void;
}

export interface SwipeConfig {
  threshold?: number; // Minimum distance to trigger swipe (default: 50px)
  velocityThreshold?: number; // Minimum velocity to trigger (default: 0.3)
  preventDefaultOnHorizontal?: boolean; // Prevent default for horizontal swipes
  preventDefaultOnVertical?: boolean; // Prevent default for vertical swipes
}

export interface PinchState {
  scale: number;
  center: { x: number; y: number };
  isActive: boolean;
}

export interface PinchHandlers {
  onPinchStart?: (center: { x: number; y: number }) => void;
  onPinch?: (state: PinchState) => void;
  onPinchEnd?: (finalScale: number) => void;
}

export interface TapHandlers {
  onTap?: (position: { x: number; y: number }) => void;
  onDoubleTap?: (position: { x: number; y: number }) => void;
  onLongPress?: (position: { x: number; y: number }) => void;
}

export interface TapConfig {
  doubleTapDelay?: number; // Max time between taps for double-tap (default: 300ms)
  longPressDelay?: number; // Time to hold for long press (default: 500ms)
}

// ============================================================================
// SWIPE HOOK
// ============================================================================

export function useSwipe(
  handlers: SwipeHandlers,
  config: SwipeConfig = {}
): {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
} {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    preventDefaultOnHorizontal = true,
    preventDefaultOnVertical = false,
  } = config;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchCurrentRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchCurrentRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchCurrentRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

    // Prevent default based on direction
    if (isHorizontal && preventDefaultOnHorizontal) {
      e.preventDefault();
    } else if (!isHorizontal && preventDefaultOnVertical) {
      e.preventDefault();
    }
  }, [preventDefaultOnHorizontal, preventDefaultOnVertical]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !touchCurrentRef.current) return;

    const start = touchStartRef.current;
    const end = touchCurrentRef.current;
    const duration = Date.now() - start.time;

    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    // Determine if this is a valid swipe
    if (distance >= threshold && velocity >= velocityThreshold) {
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      let direction: SwipeDirection["direction"];
      if (isHorizontal) {
        direction = deltaX > 0 ? "right" : "left";
      } else {
        direction = deltaY > 0 ? "down" : "up";
      }

      const swipeData: SwipeDirection = {
        direction,
        velocity,
        distance,
      };

      // Call specific handlers
      switch (direction) {
        case "left":
          handlers.onSwipeLeft?.();
          break;
        case "right":
          handlers.onSwipeRight?.();
          break;
        case "up":
          handlers.onSwipeUp?.();
          break;
        case "down":
          handlers.onSwipeDown?.();
          break;
      }

      // Call generic handler
      handlers.onSwipe?.(swipeData);
    }

    // Reset
    touchStartRef.current = null;
    touchCurrentRef.current = null;
  }, [handlers, threshold, velocityThreshold]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

// ============================================================================
// PINCH ZOOM HOOK
// ============================================================================

export function usePinchZoom(
  handlers: PinchHandlers,
  options: { minScale?: number; maxScale?: number } = {}
): {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  isActive: boolean;
} {
  const { minScale = 0.5, maxScale = 3 } = options;

  const [isActive, setIsActive] = useState(false);
  const initialDistanceRef = useRef<number | null>(null);
  const initialCenterRef = useRef<{ x: number; y: number } | null>(null);
  const currentScaleRef = useRef(1);

  const getDistance = (touches: React.TouchList): number => {
    const [t1, t2] = [touches[0], touches[1]];
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  const getCenter = (touches: React.TouchList): { x: number; y: number } => {
    const [t1, t2] = [touches[0], touches[1]];
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    };
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialDistanceRef.current = getDistance(e.touches);
      initialCenterRef.current = getCenter(e.touches);
      currentScaleRef.current = 1;
      setIsActive(true);
      handlers.onPinchStart?.(initialCenterRef.current);
    }
  }, [handlers]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistanceRef.current && initialCenterRef.current) {
      e.preventDefault();

      const currentDistance = getDistance(e.touches);
      const rawScale = currentDistance / initialDistanceRef.current;
      const scale = Math.max(minScale, Math.min(maxScale, rawScale));

      currentScaleRef.current = scale;

      handlers.onPinch?.({
        scale,
        center: initialCenterRef.current,
        isActive: true,
      });
    }
  }, [handlers, minScale, maxScale]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (initialDistanceRef.current !== null) {
      handlers.onPinchEnd?.(currentScaleRef.current);
      initialDistanceRef.current = null;
      initialCenterRef.current = null;
      setIsActive(false);
    }
  }, [handlers]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isActive,
  };
}

// ============================================================================
// TAP GESTURES HOOK
// ============================================================================

export function useTapGestures(
  handlers: TapHandlers,
  config: TapConfig = {}
): {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: () => void;
} {
  const { doubleTapDelay = 300, longPressDelay = 500 } = config;

  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isLongPressRef = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    isLongPressRef.current = false;

    // Set long press timer
    if (handlers.onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        handlers.onLongPress?.({ x: touch.clientX, y: touch.clientY });
        triggerHapticFeedback("medium");
      }, longPressDelay);
    }
  }, [handlers, longPressDelay]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    clearLongPressTimer();

    if (!touchStartRef.current || isLongPressRef.current) {
      touchStartRef.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const position = { x: touch.clientX, y: touch.clientY };

    // Check for double tap
    const now = Date.now();
    if (
      lastTapRef.current &&
      now - lastTapRef.current.time < doubleTapDelay &&
      Math.abs(touch.clientX - lastTapRef.current.x) < 20 &&
      Math.abs(touch.clientY - lastTapRef.current.y) < 20
    ) {
      handlers.onDoubleTap?.(position);
      lastTapRef.current = null;
    } else {
      // Single tap - wait for possible double tap
      lastTapRef.current = { time: now, ...position };

      // Trigger single tap after delay if no double tap
      setTimeout(() => {
        if (lastTapRef.current?.time === now) {
          handlers.onTap?.(position);
          lastTapRef.current = null;
        }
      }, doubleTapDelay);
    }

    touchStartRef.current = null;
  }, [handlers, doubleTapDelay, clearLongPressTimer]);

  const onTouchCancel = useCallback(() => {
    clearLongPressTimer();
    touchStartRef.current = null;
    isLongPressRef.current = false;
  }, [clearLongPressTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return {
    onTouchStart,
    onTouchEnd,
    onTouchCancel,
  };
}

// ============================================================================
// HAPTIC FEEDBACK
// ============================================================================

export type HapticIntensity = "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error";

export function triggerHapticFeedback(intensity: HapticIntensity = "light"): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;

  const patterns: Record<HapticIntensity, number | number[]> = {
    light: 10,
    medium: 25,
    heavy: 50,
    selection: 5,
    success: [10, 50, 10],
    warning: [20, 30, 20],
    error: [50, 100, 50],
  };

  try {
    navigator.vibrate(patterns[intensity]);
  } catch {
    // Ignore errors - haptic feedback is not critical
  }
}

export function useHapticFeedback(): {
  trigger: (intensity?: HapticIntensity) => void;
  isSupported: boolean;
} {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(typeof navigator !== "undefined" && "vibrate" in navigator);
  }, []);

  const trigger = useCallback((intensity: HapticIntensity = "light") => {
    triggerHapticFeedback(intensity);
  }, []);

  return { trigger, isSupported };
}

// ============================================================================
// COMBINED GESTURE HOOK
// ============================================================================

export interface CombinedGestureHandlers {
  swipe?: SwipeHandlers;
  pinch?: PinchHandlers;
  tap?: TapHandlers;
}

export interface CombinedGestureConfig {
  swipe?: SwipeConfig;
  tap?: TapConfig;
  enablePinch?: boolean;
  enableSwipe?: boolean;
  enableTap?: boolean;
}

export function useGestures(
  handlers: CombinedGestureHandlers,
  config: CombinedGestureConfig = {}
): {
  gestureProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: () => void;
  };
  isPinching: boolean;
} {
  const {
    enablePinch = true,
    enableSwipe = true,
    enableTap = true,
  } = config;

  const swipeHandlers = useSwipe(handlers.swipe || {}, config.swipe);
  const pinchHandlers = usePinchZoom(handlers.pinch || {});
  const tapHandlers = useTapGestures(handlers.tap || {}, config.tap);

  const [activeTouches, setActiveTouches] = useState(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setActiveTouches(e.touches.length);

    if (e.touches.length === 2 && enablePinch) {
      pinchHandlers.onTouchStart(e);
    } else if (e.touches.length === 1) {
      if (enableSwipe) swipeHandlers.onTouchStart(e);
      if (enableTap) tapHandlers.onTouchStart(e);
    }
  }, [enablePinch, enableSwipe, enableTap, pinchHandlers, swipeHandlers, tapHandlers]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && enablePinch) {
      pinchHandlers.onTouchMove(e);
    } else if (e.touches.length === 1 && enableSwipe) {
      swipeHandlers.onTouchMove(e);
    }
  }, [enablePinch, enableSwipe, pinchHandlers, swipeHandlers]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (activeTouches === 2 && enablePinch) {
      pinchHandlers.onTouchEnd(e);
    } else if (activeTouches === 1) {
      if (enableSwipe) swipeHandlers.onTouchEnd(e);
      if (enableTap) tapHandlers.onTouchEnd(e);
    }
    setActiveTouches(e.touches.length);
  }, [activeTouches, enablePinch, enableSwipe, enableTap, pinchHandlers, swipeHandlers, tapHandlers]);

  const onTouchCancel = useCallback(() => {
    if (enableTap) tapHandlers.onTouchCancel();
    setActiveTouches(0);
  }, [enableTap, tapHandlers]);

  return {
    gestureProps: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
    },
    isPinching: pinchHandlers.isActive,
  };
}

export default useGestures;
