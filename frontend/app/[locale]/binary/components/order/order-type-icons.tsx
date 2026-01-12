"use client";

/**
 * Professional SVG icons for binary order types
 * Each type has a combined icon and separate directional icons for trading buttons
 */

import type { BinaryOrderType } from "@/types/binary-trading";

interface IconProps {
  size?: number;
  className?: string;
}

// ============================================================================
// RISE/FALL ICONS
// ============================================================================

// Combined Rise/Fall icon - shows both directions
export function RiseFallIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Rising line */}
      <path
        d="M4 18L10 12L14 16L20 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Up arrow at end */}
      <path
        d="M15 10H20V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Rise icon - upward arrow with growth indication
export function RiseIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Upward arrow */}
      <path
        d="M12 19V5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M5 12L12 5L19 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Fall icon - downward arrow
export function FallIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Downward arrow */}
      <path
        d="M12 5V19"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M19 12L12 19L5 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============================================================================
// HIGHER/LOWER ICONS
// ============================================================================

// Combined Higher/Lower icon - barrier with both directions
export function HigherLowerIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Barrier line */}
      <line
        x1="3"
        y1="12"
        x2="21"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 2"
      />
      {/* Up arrow */}
      <path
        d="M8 9L8 4M8 4L5 7M8 4L11 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Down arrow */}
      <path
        d="M16 15L16 20M16 20L13 17M16 20L19 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Higher icon - price above barrier
export function HigherIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Barrier line */}
      <line
        x1="3"
        y1="16"
        x2="21"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 2"
        opacity="0.6"
      />
      {/* Strong up arrow breaking above */}
      <path
        d="M12 18V6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M6 11L12 5L18 11"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Lower icon - price below barrier
export function LowerIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Barrier line */}
      <line
        x1="3"
        y1="8"
        x2="21"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 2"
        opacity="0.6"
      />
      {/* Strong down arrow breaking below */}
      <path
        d="M12 6V18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M18 13L12 19L6 13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============================================================================
// TOUCH/NO TOUCH ICONS
// ============================================================================

// Combined Touch/No Touch icon
export function TouchNoTouchIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Target circle */}
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Inner circle */}
      <circle
        cx="12"
        cy="12"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Center dot */}
      <circle
        cx="12"
        cy="12"
        r="1.5"
        fill="currentColor"
      />
    </svg>
  );
}

// Touch icon - finger touching target
export function TouchIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Target/barrier line */}
      <line
        x1="3"
        y1="8"
        x2="21"
        y2="8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Price line touching */}
      <path
        d="M6 18L10 14L12 8L14 12L18 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Touch point indicator */}
      <circle
        cx="12"
        cy="8"
        r="2.5"
        fill="currentColor"
      />
    </svg>
  );
}

// No Touch icon - barrier avoided
export function NoTouchIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Target/barrier line */}
      <line
        x1="3"
        y1="6"
        x2="21"
        y2="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Price line staying below */}
      <path
        d="M4 16L8 14L12 12L16 13L20 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Shield/block indicator */}
      <circle
        cx="12"
        cy="6"
        r="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <line
        x1="10"
        y1="4"
        x2="14"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ============================================================================
// CALL/PUT ICONS
// ============================================================================

// Combined Call/Put icon
export function CallPutIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Strike price line */}
      <line
        x1="3"
        y1="12"
        x2="21"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 2"
      />
      {/* Call (up) candlestick */}
      <rect x="6" y="5" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.3" />
      <line x1="8" y1="3" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="15" x2="8" y2="17" stroke="currentColor" strokeWidth="1.5" />
      {/* Put (down) candlestick */}
      <rect x="14" y="9" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.3" />
      <line x1="16" y1="7" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="16" y1="19" x2="16" y2="21" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// Call icon - bullish position
export function CallIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Strike line */}
      <line
        x1="3"
        y1="16"
        x2="21"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 2"
        opacity="0.5"
      />
      {/* Bullish candle */}
      <rect x="9" y="6" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
      <line x1="12" y1="3" x2="12" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Up indicator */}
      <path d="M17 10L20 7L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Put icon - bearish position
export function PutIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Strike line */}
      <line
        x1="3"
        y1="8"
        x2="21"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 2"
        opacity="0.5"
      />
      {/* Bearish candle */}
      <rect x="9" y="6" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
      <line x1="12" y1="3" x2="12" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Down indicator */}
      <path d="M17 14L20 17L23 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ============================================================================
// TURBO ICONS
// ============================================================================

// Combined Turbo icon - lightning fast
export function TurboIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Lightning bolt */}
      <path
        d="M13 2L4 14H11L10 22L20 10H13L13 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
    </svg>
  );
}

// Turbo Up icon
export function TurboUpIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Lightning with up direction */}
      <path
        d="M11 2L4 11H9L8 16L16 8H11L11 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.2"
      />
      {/* Rocket trail up */}
      <path
        d="M18 22V14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M15 17L18 14L21 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Turbo Down icon
export function TurboDownIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Lightning with down direction */}
      <path
        d="M11 2L4 11H9L8 16L16 8H11L11 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.2"
      />
      {/* Rocket trail down */}
      <path
        d="M18 14V22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M15 19L18 22L21 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============================================================================
// ORDER TYPE COLORS
// ============================================================================

// Shared color scheme for order types - use these for consistent theming
export const ORDER_TYPE_COLORS: Record<BinaryOrderType, {
  bg: string;
  bgDark: string;
  border: string;
  text: string;
  textDark: string;
}> = {
  RISE_FALL: {
    bg: "bg-blue-50",
    bgDark: "bg-blue-500/20",
    border: "border-blue-500",
    text: "text-blue-600",
    textDark: "text-blue-400",
  },
  HIGHER_LOWER: {
    bg: "bg-purple-50",
    bgDark: "bg-purple-500/20",
    border: "border-purple-500",
    text: "text-purple-600",
    textDark: "text-purple-400",
  },
  TOUCH_NO_TOUCH: {
    bg: "bg-orange-50",
    bgDark: "bg-orange-500/20",
    border: "border-orange-500",
    text: "text-orange-600",
    textDark: "text-orange-400",
  },
  CALL_PUT: {
    bg: "bg-green-50",
    bgDark: "bg-green-500/20",
    border: "border-green-500",
    text: "text-green-600",
    textDark: "text-green-400",
  },
  TURBO: {
    bg: "bg-red-50",
    bgDark: "bg-red-500/20",
    border: "border-red-500",
    text: "text-red-600",
    textDark: "text-red-400",
  },
};

// ============================================================================
// ICON MAPS
// ============================================================================

// Map of order types to their combined icons (for selection UI)
export const ORDER_TYPE_ICON_MAP: Record<BinaryOrderType, React.FC<IconProps>> = {
  RISE_FALL: RiseFallIcon,
  HIGHER_LOWER: HigherLowerIcon,
  TOUCH_NO_TOUCH: TouchNoTouchIcon,
  CALL_PUT: CallPutIcon,
  TURBO: TurboIcon,
};

// Map of order types to their directional icons (for trading buttons)
export const ORDER_TYPE_DIRECTION_ICONS: Record<BinaryOrderType, { up: React.FC<IconProps>; down: React.FC<IconProps> }> = {
  RISE_FALL: { up: RiseIcon, down: FallIcon },
  HIGHER_LOWER: { up: HigherIcon, down: LowerIcon },
  TOUCH_NO_TOUCH: { up: TouchIcon, down: NoTouchIcon },
  CALL_PUT: { up: CallIcon, down: PutIcon },
  TURBO: { up: TurboUpIcon, down: TurboDownIcon },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

// Helper component for combined order type icon
export function OrderTypeIcon({
  orderType,
  size = 16,
  className = "",
}: {
  orderType: BinaryOrderType;
  size?: number;
  className?: string;
}) {
  const IconComponent = ORDER_TYPE_ICON_MAP[orderType];
  return <IconComponent size={size} className={className} />;
}

// Helper component for directional icons (up/down buttons)
export function OrderDirectionIcon({
  orderType,
  direction,
  size = 16,
  className = "",
}: {
  orderType: BinaryOrderType;
  direction: "up" | "down";
  size?: number;
  className?: string;
}) {
  const icons = ORDER_TYPE_DIRECTION_ICONS[orderType];
  const IconComponent = direction === "up" ? icons.up : icons.down;
  return <IconComponent size={size} className={className} />;
}

export default OrderTypeIcon;
