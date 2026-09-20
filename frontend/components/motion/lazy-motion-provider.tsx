"use client";

/**
 * Motion Provider
 *
 * Two jobs, both of which have to happen at the root:
 *
 * 1. `LazyMotion` — the framer-motion feature set (gesture handling, layout
 *    projection, the animation drivers) is fetched as its own chunk after
 *    hydration instead of riding in the baseline. See `./features.ts` for why
 *    that module exists and why the import below MUST stay dynamic.
 *
 * 2. `MotionConfig reducedMotion="user"` — makes every descendant respect the
 *    OS "reduce motion" setting. This CANNOT be done in CSS: 437 files animate
 *    through framer-motion, which writes inline styles from JS, so the
 *    `@media (prefers-reduced-motion)` blocks in globals.css never see those
 *    animations. Before this, only 5 of those 437 files honoured the
 *    preference (via a manual `useReducedMotion` call). `"user"` disables
 *    transform and layout animation while keeping opacity and colour, which is
 *    framer-motion's recommended setting — "reduce", not "remove".
 *
 * The saving in (1) is only real for components that render `m.*` rather than
 * `motion.*`: `motion` carries the features with it as a static import, `m`
 * takes them from this provider's context. Call sites were swept over to `m`
 * wholesale, which means the animated namespace is now the single letter `m`.
 * Note that ~18 files already bind `m` as a local — almost all of them
 * `(m) => m.symbol`-style arrow parameters over markets, methods or metrics.
 * None of them currently contains a motion element, but moving an `m.div` into
 * one of those scopes would silently resolve against the wrong object, with no
 * type error and no lint error (there is no `no-shadow` rule configured). If
 * you are adding an element inside a callback, check what `m` is bound to.
 *
 * Usage: wrap the app once (see `provider/providers.tsx`).
 */

import { LazyMotion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/* The dynamic import is the entire mechanism. Written as a static
   `import { domMax } from "framer-motion"` — which is what this file used to
   do — the feature bundle lands in the provider's own chunk, the provider is
   rendered by every route, and LazyMotion degrades into an inert context
   wrapper that ships exactly what it was supposed to defer. It is an easy
   mistake to make again because the static version type-checks, renders, and
   animates identically; the only symptom is the bundle. */
/* ONE RETRY, AND IT IS NOT DEFENSIVE PROGRAMMING — IT IS THE ONLY ERROR PATH.
   ---------------------------------------------------------------------------
   `LazyMotion` fetches this bundle in an effect that has no `.catch`, no
   timeout and an empty dependency array (framer-motion's
   `dist/es/components/LazyMotion/index.mjs`). A rejected import is therefore an
   unhandled rejection rather than a render throw, so NO React error boundary
   can see it, and `LazyContext.renderer` stays undefined for the life of the
   page. `useVisualElement` then never builds a visual element, which means
   `initial` becomes the TERMINAL state rather than the first frame.

   Measured on this tree, that is 969 `initial={{ … opacity: 0 … }}` sites
   across 275 files, plus 49 more that start at `height: 0`. In other words a
   single failed chunk fetch is a site-wide blank-content failure with nothing
   in the console a customer would recognise.

   That failure is not exotic here. This is a self-hosted product where `.next`
   is routinely hand-copied between deploys and a release restarts the process
   underneath open tabs, so a stale or missing chunk hash is the ORDINARY
   failure, not the rare one. A second attempt costs nothing on the happy path
   and converts the common transient case — one dropped request — into a
   slightly late animation instead of an invisible page. */
const loadFeatures = () =>
  import("./features")
    .then((mod) => mod.default)
    .catch(() => import("./features").then((mod) => mod.default));

interface LazyMotionProviderProps {
  children: ReactNode;
}

/**
 * Provides lazy-loaded framer-motion features.
 *
 * `strict` is deliberately NOT set, even though it is the one mechanism that
 * would stop a `motion.*` component creeping back into the baseline. The
 * chart-engine package ships a committed bundle
 * (`components/(ext)/chart-engine/dist/index.js`) which — on the line after its
 * `"use client"` directive — statically imports
 * `{ motion, AnimatePresence, useReducedMotion }` and renders those
 * components inside our tree. framer-motion's `useStrictMode` throws an
 * invariant for any preloaded-features component rendered under a strict
 * `LazyMotion`, so turning it on would make every chart page throw. Revisit
 * once chart-engine is migrated to `m` AND its dist is rebuilt.
 */
export function LazyMotionProvider({ children }: LazyMotionProviderProps) {
  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

export default LazyMotionProvider;
