/**
 * Motion Components Barrel Export
 *
 * Only the provider. This file used to also re-export `m`, `AnimatePresence`,
 * `useAnimation` and friends straight through from framer-motion, which was
 * quietly dangerous: `import { m } from "@/components/motion"` resolves this
 * module, and this module imports `./lazy-motion-provider` — so a leaf
 * component asking for the animated namespace would pull `LazyMotion` and the
 * provider into its own chunk, which is the exact shape the lazy feature
 * bundle exists to avoid. Nothing consumed those re-exports; call sites import
 * `m` from "framer-motion" directly.
 */

export { LazyMotionProvider } from "./lazy-motion-provider";
