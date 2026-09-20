"use client";

/**
 * Dynamic Trading Buttons Component
 *
 * Displays trading buttons that adapt to the selected binary order type.
 * Each type has different sides (RISE/FALL, HIGHER/LOWER, etc.)
 *
 * Colour is DIRECTION, not identity. Every binary order type is a two-sided
 * bet: the first side wins when price goes the way the trader called it, the
 * second when it does not. Previously each type painted its own pair of hues
 * (blue/purple, amber/slate, teal/rose, yellow/violet), so the same bullish
 * action was five different colours depending on which product was selected and
 * "Lower" was purple while "Fall" was red. Both sides now take `up` / `down`,
 * and the per-type ICON carries the identity — which is what it was already for.
 */

import { Zap } from "lucide-react";
import type {
  BinaryOrderType,
  OrderSide,
} from "@/types/binary-trading";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SIDE_FILL, type Side } from "./order-ui";
import {
  RiseIcon,
  FallIcon,
  HigherIcon,
  LowerIcon,
  TouchIcon,
  NoTouchIcon,
  CallIcon,
  PutIcon,
  TurboUpIcon,
  TurboDownIcon,
} from "./order-type-icons";

// ============================================================================
// TYPES
// ============================================================================

interface DynamicTradingButtonsProps {
  orderType: BinaryOrderType;
  handlePlaceOrder: (side: OrderSide) => void | Promise<void>;
  profitPercentage: number;
  /**
   * THE PAYOUT PER SIDE, WHERE THE TWO SIDES ARE NOT PRICED THE SAME.
   *
   * A TOUCH/NO-TOUCH contract pays each side a different rate — that is what
   * the product IS — and `BinaryOrderService.ts:494-502` scales the barrier
   * rate by `touchProfitMultiplier` (1.2 default) or `noTouchProfitMultiplier`
   * (0.7 default) accordingly. This component printed the single
   * `profitPercentage` on BOTH buttons, so the NO_TOUCH button promised +95%
   * on a contract that pays 66.5%.
   *
   * Optional, and falling back to `profitPercentage`, because for the other
   * four order types the two sides genuinely do pay the same and the caller
   * has nothing to differentiate.
   */
  profitPercentageBySide?: Partial<Record<OrderSide, number>>;
  disabled?: boolean;
  isMobile?: boolean;
  /** @deprecated Tokens are theme-aware; kept so callers need no change. */
  darkMode?: boolean;
  oneClickEnabled?: boolean;
  isLoading?: boolean;
}

// ============================================================================
// BUTTON CONFIGURATION
// ============================================================================

type ButtonConfig = {
  side: OrderSide;
  label: string;
  icon: React.ElementType;
  /** Which half of the bet this button is — drives the fill and its paired ink. */
  tone: Side;
};

const BUTTON_CONFIGS: Record<BinaryOrderType, [ButtonConfig, ButtonConfig]> = {
  RISE_FALL: [
    { side: "RISE", label: "Rise", icon: RiseIcon, tone: "up" },
    { side: "FALL", label: "Fall", icon: FallIcon, tone: "down" },
  ],
  HIGHER_LOWER: [
    { side: "HIGHER", label: "Higher", icon: HigherIcon, tone: "up" },
    { side: "LOWER", label: "Lower", icon: LowerIcon, tone: "down" },
  ],
  TOUCH_NO_TOUCH: [
    { side: "TOUCH", label: "Touch", icon: TouchIcon, tone: "up" },
    { side: "NO_TOUCH", label: "No Touch", icon: NoTouchIcon, tone: "down" },
  ],
  CALL_PUT: [
    { side: "CALL", label: "Call", icon: CallIcon, tone: "up" },
    { side: "PUT", label: "Put", icon: PutIcon, tone: "down" },
  ],
  TURBO: [
    { side: "UP", label: "Up", icon: TurboUpIcon, tone: "up" },
    { side: "DOWN", label: "Down", icon: TurboDownIcon, tone: "down" },
  ],
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function DynamicTradingButtons({
  orderType,
  handlePlaceOrder,
  profitPercentage,
  profitPercentageBySide,
  disabled = false,
  isMobile = false,
  oneClickEnabled = false,
  isLoading = false,
}: DynamicTradingButtonsProps) {
  const t = useTranslations("binary_components");
  const [button1, button2] = BUTTON_CONFIGS[orderType];

  const renderButton = (config: ButtonConfig) => {
    const Icon = config.icon;
    // Check if label is long (like "No Touch") to adjust styling
    const isLongLabel = config.label.length > 6;

    return (
      /*
        IN-FLIGHT STATE — house pattern, `loading` on the Button itself.
        ---------------------------------------------------------------
        This was a raw <button> whose pressed state replaced its ENTIRE
        content — one-click bolt, direction icon, label and profit figure —
        with a hand-rolled `animate-spin` ring and the word "Placing…". Three
        things were wrong with that and only the first is cosmetic:

          1. The spinner was a hand-built `h-4 w-4 border-2 border-current
             border-t-transparent` ring, i.e. a fourth spelling of a spinner in
             this app, none of which track the design system's `size-4` glyph.
          2. Nothing announced the wait. A control that swaps its label without
             `aria-busy` changes under a screen reader with no explanation.
          3. The profit figure vanished. `+85%` is a fact about the MARKET, not
             about the press, so withholding it while an order is in flight both
             collapses the button's content and hides the number the trader is
             looking at.

        <Button> supplies (1) and (2) — the `size-4` spinner goes in its own
        leading slot and `loading` folds into `disabled` and sets `aria-busy`.
        (3) is fixed by keeping the figure outside the branch.

        Everything visual is preserved through className, which twMerge resolves
        against the base: `h-auto` beats `size="default"`'s `h-10` so the height
        is still content + padding, `px-2 py-3` beats `px-4 py-2`, `rounded-lg`
        beats `rounded-md`, `gap-1.5` beats `gap-2`, `font-bold` beats
        `font-medium` and `disabled:opacity-40` beats `disabled:opacity-50`.
      */
      <Button
        key={config.side}
        onClick={() => handlePlaceOrder(config.side)}
        loading={isLoading}
        disabled={disabled}
        className={cn(
          "flex-1 relative overflow-hidden group h-auto",
          SIDE_FILL[config.tone],
          // One-click arms the button to fire without a confirmation step. That
          // is a caution, so it rides the ring instead of restaining the fill.
          oneClickEnabled && "ring-2 ring-warning",
          isMobile ? "py-2.5" : "py-3",
          "px-2 rounded-lg gap-1.5 font-bold",
          isMobile ? "text-sm" : isLongLabel ? "text-sm" : "text-base",
          "disabled:opacity-40",
          "transition-all duration-200 shadow-md active:scale-[0.97]"
        )}
      >
        {/*
          INTENTIONAL, and the same exemption `components/auth/wallet-login-form.tsx`
          carries — the debt scanner's `hidden-while-loading` rule cannot tell
          this from a withheld row.

          <Button> paints its own spinner into the LEADING slot, which is
          exactly where these two glyphs sit. Rendering them anyway gives the
          button three leading icons — 14 + 6 + 16 + 6 + 16px ahead of the
          label instead of one 16px spinner — and reads as a rendering bug.
          Stepping them aside is what keeps exactly ONE spinning glyph there.
          Do not "fix" this into an unconditional icon.

          `size-3.5` / `size-4` as CLASSES, not the `size={14}` prop they
          replaced: Button's base carries
          `[&_svg:not([class*='size-'])]:size-4`, and a CSS rule beats an SVG's
          width/height presentation attributes — so the prop form would have
          been silently overridden to 16px and the mobile icon would have grown
          2px. Naming the size in the class both satisfies the `:not()` and
          states the number.
        */}
        {!isLoading && (
          <>
            {oneClickEnabled && <Zap className="size-3.5" />}
            <Icon className={isMobile ? "size-3.5" : "size-4"} />
          </>
        )}
        <span className={isLongLabel ? "text-sm" : ""}>
          {isLoading ? `${t("placing")}…` : config.label}
        </span>
        {/* Rendered in BOTH states. The payout is knowable before the press and
            unchanged by it, so it is chrome, not a value in flight.

            PER SIDE, because a TOUCH/NO-TOUCH contract does not pay both sides
            the same rate — see `profitPercentageBySide` above. */}
        <span className="text-[10px] font-medium opacity-80">
          +{Math.round(profitPercentageBySide?.[config.side] ?? profitPercentage)}%
        </span>
      </Button>
    );
  };

  return (
    <div className="p-2 border-t border-border bg-surface-2">
      <div className="flex gap-2">
        {renderButton(button1)}
        {renderButton(button2)}
      </div>
    </div>
  );
}
