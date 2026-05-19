"use client";

/**
 * Lazy Motion Provider
 *
 * Uses framer-motion's LazyMotion feature to reduce bundle size by ~85%.
 * Instead of loading the full framer-motion library, only the features
 * you actually use are loaded.
 *
 * Usage:
 * 1. Wrap your app/layout with <LazyMotionProvider>
 * 2. Use `m` instead of `motion` for animations
 *
 * Example:
 * import { m } from "framer-motion";
 *
 * <m.div animate={{ opacity: 1 }} />
 */

import { LazyMotion, domAnimation, domMax } from "framer-motion";
import type { ReactNode } from "react";

interface LazyMotionProviderProps {
  children: ReactNode;
  /**
   * Use "domAnimation" for basic animations (smaller bundle)
   * Use "domMax" for advanced features like layout animations, drag, etc.
   */
  features?: "basic" | "full";
}

/**
 * Provides lazy-loaded framer-motion features.
 *
 * Place this at the top of your app to enable lazy loading of animation features.
 *
 * Note: strict mode is disabled to allow gradual migration from `motion` to `m`.
 * For optimal tree-shaking, migrate components to use `m` instead of `motion`:
 *   import { m } from "framer-motion";
 *   <m.div animate={{ opacity: 1 }} />
 */
export function LazyMotionProvider({
  children,
  features = "basic",
}: LazyMotionProviderProps) {
  const featureBundle = features === "full" ? domMax : domAnimation;

  return (
    <LazyMotion features={featureBundle}>
      {children}
    </LazyMotion>
  );
}

export default LazyMotionProvider;
