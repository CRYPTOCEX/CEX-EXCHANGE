/**
 * Binary Trading App Hooks
 *
 * Re-exports all hooks for the binary trading mobile experience
 */

// Gesture hooks
export {
  useSwipe,
  usePinchZoom,
  useTapGestures,
  useHapticFeedback,
  useGestures,
  triggerHapticFeedback,
  type SwipeDirection,
  type SwipeHandlers,
  type SwipeConfig,
  type PinchHandlers,
  type PinchState,
  type TapHandlers,
  type TapConfig,
  type HapticIntensity,
  type CombinedGestureHandlers,
  type CombinedGestureConfig,
} from "./use-gestures";

// Orientation hooks
export {
  useOrientation,
  useLandscapeMode,
  type Orientation,
  type OrientationState,
  type UseOrientationOptions,
  type LandscapeModeOptions,
} from "./use-orientation";

// Mobile data optimization
export {
  useMobileDataOptimization,
  useThrottledValue,
  type NetworkQuality,
  type DataSaverMode,
  type MobileDataConfig,
  type MobileDataState,
  type UseMobileDataOptimizationOptions,
} from "./use-mobile-data-optimization";

// Tutorial hooks
export {
  useTutorial,
  BINARY_TRADING_TUTORIAL_STEPS,
  type TutorialProgress,
  type UseTutorialOptions,
  type UseTutorialReturn,
} from "./use-tutorial";
