/**
 * Motion Components Barrel Export
 *
 * Re-exports framer-motion components with lazy loading support.
 */

export { LazyMotionProvider } from "./lazy-motion-provider";

// Re-export commonly used framer-motion exports
// These work with LazyMotion when using `m` instead of `motion`
export {
  m,
  AnimatePresence,
  useAnimation,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
  type MotionValue,
  type PanInfo,
} from "framer-motion";
