"use client";

/**
 * Bottom Sheet Component
 *
 * Mobile-optimized modal that slides up from the bottom:
 * - Swipe down to dismiss
 * - Multiple snap points
 * - Backdrop blur
 * - Touch-optimized header
 */

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  memo,
  ReactNode,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { X } from "lucide-react";
import { triggerHapticFeedback } from "../../hooks/use-gestures";

// ============================================================================
// TYPES
// ============================================================================

export interface BottomSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback when sheet should close */
  onClose: () => void;
  /** Sheet content */
  children: ReactNode;
  /** Title shown in header */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Show close button */
  showCloseButton?: boolean;
  /** Enable swipe to dismiss (default: true) */
  swipeToDismiss?: boolean;
  /** Snap points as percentage of viewport height (default: [0.5, 0.9]) */
  snapPoints?: number[];
  /** Initial snap point index (default: 0) */
  initialSnapPoint?: number;
  /** Close when tapping backdrop (default: true) */
  closeOnBackdrop?: boolean;
  /** Custom header content */
  headerContent?: ReactNode;
  /** Custom footer content */
  footerContent?: ReactNode;
  /** Additional class for sheet container */
  className?: string;
  /** Enable haptic feedback */
  hapticEnabled?: boolean;
  /** Maximum height as viewport percentage (default: 0.95) */
  maxHeight?: number;
}

export interface BottomSheetHandle {
  snapTo: (index: number) => void;
  close: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const BottomSheet = memo(
  forwardRef<BottomSheetHandle, BottomSheetProps>(function BottomSheet(
    {
      isOpen,
      onClose,
      children,
      title,
      subtitle,
      showCloseButton = true,
      swipeToDismiss = true,
      snapPoints = [0.5, 0.9],
      initialSnapPoint = 0,
      closeOnBackdrop = true,
      headerContent,
      footerContent,
      className = "",
      hapticEnabled = true,
      maxHeight = 0.95,
    },
    ref
  ) {
    const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnapPoint);
    const [viewportHeight, setViewportHeight] = useState(0);
    const sheetRef = useRef<HTMLDivElement>(null);
    const y = useMotionValue(0);

    // Calculate sheet heights
    useEffect(() => {
      const updateHeight = () => {
        setViewportHeight(window.innerHeight);
      };
      updateHeight();
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    }, []);

    // Reset snap point when opened
    useEffect(() => {
      if (isOpen) {
        setCurrentSnapIndex(initialSnapPoint);
        y.set(0);
      }
    }, [isOpen, initialSnapPoint, y]);

    // Calculate current snap height
    const currentSnapHeight = viewportHeight * snapPoints[currentSnapIndex];

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      snapTo: (index: number) => {
        if (index >= 0 && index < snapPoints.length) {
          setCurrentSnapIndex(index);
          if (hapticEnabled) {
            triggerHapticFeedback("selection");
          }
        }
      },
      close: onClose,
    }));

    // Handle drag end
    const handleDragEnd = useCallback(
      (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offsetY = info.offset.y;
        const velocityY = info.velocity.y;

        // Check if should dismiss
        if (swipeToDismiss && (offsetY > 150 || velocityY > 500)) {
          if (hapticEnabled) {
            triggerHapticFeedback("light");
          }
          onClose();
          return;
        }

        // Find nearest snap point based on current position + offset
        const currentHeight = viewportHeight * snapPoints[currentSnapIndex];
        const newHeight = currentHeight - offsetY;
        const newPercentage = newHeight / viewportHeight;

        let nearestIndex = 0;
        let minDistance = Math.abs(newPercentage - snapPoints[0]);

        snapPoints.forEach((point, index) => {
          const distance = Math.abs(newPercentage - point);
          if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = index;
          }
        });

        // Apply velocity bias
        if (velocityY < -300 && nearestIndex < snapPoints.length - 1) {
          nearestIndex = Math.min(nearestIndex + 1, snapPoints.length - 1);
        } else if (velocityY > 300 && nearestIndex > 0) {
          nearestIndex = Math.max(nearestIndex - 1, 0);
        }

        if (nearestIndex !== currentSnapIndex) {
          if (hapticEnabled) {
            triggerHapticFeedback("selection");
          }
        }

        setCurrentSnapIndex(nearestIndex);
      },
      [
        currentSnapIndex,
        snapPoints,
        viewportHeight,
        swipeToDismiss,
        onClose,
        hapticEnabled,
      ]
    );

    // Handle backdrop click
    const handleBackdropClick = useCallback(() => {
      if (closeOnBackdrop) {
        if (hapticEnabled) {
          triggerHapticFeedback("light");
        }
        onClose();
      }
    }, [closeOnBackdrop, onClose, hapticEnabled]);

    // Handle close button
    const handleClose = useCallback(() => {
      if (hapticEnabled) {
        triggerHapticFeedback("light");
      }
      onClose();
    }, [onClose, hapticEnabled]);

    // Transform for backdrop opacity
    const backdropOpacity = useTransform(
      y,
      [0, viewportHeight * 0.3],
      [1, 0]
    );

    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleBackdropClick}
              style={{ opacity: backdropOpacity }}
            />

            {/* Sheet */}
            <motion.div
              ref={sheetRef}
              className={`fixed inset-x-0 bottom-0 z-50 bg-zinc-900 rounded-t-2xl shadow-2xl flex flex-col ${className}`}
              style={{
                height: currentSnapHeight,
                maxHeight: `${maxHeight * 100}%`,
                y,
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 400,
              }}
              drag={swipeToDismiss ? "y" : false}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={handleDragEnd}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-zinc-700" />
              </div>

              {/* Header */}
              {(title || headerContent || showCloseButton) && (
                <div className="flex items-center justify-between px-4 pb-3 border-b border-zinc-800">
                  <div className="flex-1">
                    {headerContent || (
                      <div>
                        {title && (
                          <h2 className="text-lg font-semibold text-white">
                            {title}
                          </h2>
                        )}
                        {subtitle && (
                          <p className="text-sm text-zinc-400">{subtitle}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {showCloseButton && (
                    <button
                      onClick={handleClose}
                      className="p-2 -mr-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {children}
              </div>

              {/* Footer */}
              {footerContent && (
                <div className="border-t border-zinc-800 pb-safe-or-4">
                  {footerContent}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  })
);

// ============================================================================
// SIMPLE BOTTOM SHEET (no snap points)
// ============================================================================

export interface SimpleBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  showCloseButton?: boolean;
  className?: string;
}

export const SimpleBottomSheet = memo(function SimpleBottomSheet({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
  className = "",
}: SimpleBottomSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      showCloseButton={showCloseButton}
      snapPoints={[0.6]}
      initialSnapPoint={0}
      className={className}
    >
      {children}
    </BottomSheet>
  );
});

// ============================================================================
// ACTION SHEET (for confirmations/actions)
// ============================================================================

export interface ActionSheetAction {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "destructive" | "primary";
  onPress: () => void;
}

export interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: ActionSheetAction[];
  cancelLabel?: string;
}

export const ActionSheet = memo(function ActionSheet({
  isOpen,
  onClose,
  title,
  message,
  actions,
  cancelLabel = "Cancel",
}: ActionSheetProps) {
  const handleAction = useCallback(
    (action: ActionSheetAction) => {
      triggerHapticFeedback("light");
      action.onPress();
      onClose();
    },
    [onClose]
  );

  const handleCancel = useCallback(() => {
    triggerHapticFeedback("light");
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
          />

          {/* Sheet */}
          <motion.div
            className="fixed inset-x-4 bottom-4 z-50 space-y-2 pb-safe-or-0"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Actions group */}
            <div className="bg-zinc-800 rounded-xl overflow-hidden">
              {/* Header */}
              {(title || message) && (
                <div className="px-4 py-3 text-center border-b border-zinc-700">
                  {title && (
                    <p className="text-sm font-medium text-white">{title}</p>
                  )}
                  {message && (
                    <p className="text-xs text-zinc-400 mt-0.5">{message}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              {actions.map((action, index) => {
                const variantStyles = {
                  default: "text-white hover:bg-zinc-700",
                  destructive: "text-red-500 hover:bg-red-500/10",
                  primary: "text-blue-500 hover:bg-blue-500/10",
                };

                return (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action)}
                    className={`w-full px-4 py-3.5 flex items-center justify-center gap-2 text-base font-medium transition-colors active:scale-[0.98] ${
                      variantStyles[action.variant || "default"]
                    } ${
                      index < actions.length - 1 ? "border-b border-zinc-700" : ""
                    }`}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                );
              })}
            </div>

            {/* Cancel button */}
            <button
              onClick={handleCancel}
              className="w-full px-4 py-3.5 bg-zinc-800 rounded-xl text-base font-semibold text-white hover:bg-zinc-700 transition-colors active:scale-[0.98]"
            >
              {cancelLabel}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default BottomSheet;
