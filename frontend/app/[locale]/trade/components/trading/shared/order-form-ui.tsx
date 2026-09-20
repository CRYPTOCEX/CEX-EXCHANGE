"use client";

import type React from "react";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared terminal form primitives for `trade/components/trading/**`.
 *
 * The spot limit / market / stop forms, the futures market / limit forms and
 * the AI investment form were five hand-written copies of the same six
 * controls. Colour lives here now, so the buy side cannot be one green in one
 * tab and a different green in the next.
 *
 * Contrast notes that drove the choices below (measured, not guessed):
 *  - `--up` as ink is 3.39:1 on a light ground, `--warning` 3.60:1. Both are
 *    under the 4.5:1 floor for the 10-13px type this surface uses, so a small
 *    label never carries the hue — the ICON does and the label stays on
 *    `--foreground`. See DESIGN-SYSTEM.md's open token item.
 *  - Price and P&L figures are the exception (R1): they keep `text-up` /
 *    `text-down` on a plain surface, never on a matching tint.
 */

/** Dense 13px input used by every price/amount field on this surface. */
export const FIELD_INPUT_CLASS =
  "w-full pl-3 pr-12 py-1.5 text-xs border border-border rounded-sm bg-surface-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

export function FieldLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("text-xs font-medium text-muted-foreground", className)}>
      {children}
    </label>
  );
}

/**
 * Label row + text input + trailing unit. Ten near-identical copies of this
 * block existed across the three spot forms and the AI investment form.
 */
export function UnitField({
  label,
  labelAction,
  unit,
  value,
  onChange,
  readOnly,
  placeholder = "0.00",
  inputClassName,
  type = "text",
  inputProps,
}: {
  label: React.ReactNode;
  /** Rendered opposite the label — steppers, a live price, etc. */
  labelAction?: React.ReactNode;
  unit: React.ReactNode;
  value: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
  placeholder?: string;
  inputClassName?: string;
  type?: string;
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "readOnly" | "placeholder" | "type" | "className"
  >;
}) {
  return (
    <div className="space-y-1">
      {labelAction ? (
        <div className="flex items-center justify-between">
          <FieldLabel>{label}</FieldLabel>
          {labelAction}
        </div>
      ) : (
        <FieldLabel>{label}</FieldLabel>
      )}
      <div className="relative">
        <input
          type={type}
          className={cn(FIELD_INPUT_CLASS, inputClassName)}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          {...inputProps}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * BUY / SELL selector. `--up` and `--down` are the only saturated colours a
 * trader should catch peripherally (R1), and the ink flips with the fill via
 * `--primary-foreground` rather than a hardcoded white.
 */
export function SideToggle({
  buyMode,
  onBuy,
  onSell,
  buyLabel,
  sellLabel,
}: {
  buyMode: boolean;
  onBuy: () => void;
  onSell: () => void;
  buyLabel: React.ReactNode;
  sellLabel: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-1">
      <Button
        className={cn(
          "h-8 text-xs font-medium rounded-md",
          buyMode
            ? "bg-up hover:bg-up/90 text-primary-foreground"
            : "bg-surface-3 hover:bg-surface-3/80 text-muted-foreground"
        )}
        onClick={onBuy}
      >
        {buyLabel}
      </Button>
      <Button
        className={cn(
          "h-8 text-xs font-medium rounded-md",
          !buyMode
            ? "bg-down hover:bg-down/90 text-primary-foreground"
            : "bg-surface-3 hover:bg-surface-3/80 text-muted-foreground"
        )}
        onClick={onSell}
      >
        {sellLabel}
      </Button>
    </div>
  );
}

/** 25 / 50 / 75 / 100 sizing row. */
export function PercentButtons({
  percentSelected,
  onPercentClick,
  size = "sm",
}: {
  percentSelected: number | null;
  onPercentClick: (percent: number) => void;
  /** `sm` = 24px (spot forms), `md` = 32px (AI investment). */
  size?: "sm" | "md";
}) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {[25, 50, 75, 100].map((percent) => (
        <Button
          key={percent}
          variant="outline"
          size="sm"
          className={cn(
            "text-xs rounded-sm border-border bg-surface-3 hover:bg-surface-3/70 text-foreground transition-colors",
            size === "sm" ? "h-6" : "h-8",
            percentSelected === percent &&
              "border-primary ring-1 ring-ring/50 text-foreground"
          )}
          onClick={() => onPercentClick(percent)}
        >
          {percent}%
        </Button>
      ))}
    </div>
  );
}

/** Explanatory copy under a form — a raised strip, not a status. */
export function NoteBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-2 bg-surface-2 rounded-sm border border-border">
      <p className="text-xs text-muted-foreground">{children}</p>
    </div>
  );
}

/** Estimated-fee line. */
export function FeeRow({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-1 py-0.5 text-[10px] text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const NOTICE_TONES = {
  destructive: {
    box: "bg-destructive/10 border-destructive/30",
    icon: "text-destructive",
  },
  success: { box: "bg-success/10 border-success/30", icon: "text-success" },
  warning: { box: "bg-warning/10 border-warning/30", icon: "text-warning" },
} as const;

/**
 * Tinted notice. The label sits on `--foreground`, never on the status hue:
 * status ink on its own tint measures 2.8-3.9:1 in light mode.
 */
export function NoticeBox({
  tone,
  icon,
  children,
  className,
}: {
  tone: keyof typeof NOTICE_TONES;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const tokens = NOTICE_TONES[tone];
  return (
    <div
      className={cn(
        "p-2 border rounded-sm text-xs text-foreground flex items-start gap-2",
        tokens.box,
        className
      )}
    >
      {icon ? (
        <span className={cn("mt-0.5 flex-shrink-0", tokens.icon)}>{icon}</span>
      ) : null}
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** A rejected order. Five copies of this box existed across the two surfaces. */
export function OrderErrorBox({ message }: { message: React.ReactNode }) {
  return (
    <NoticeBox
      tone="destructive"
      icon={<AlertTriangle className="h-3.5 w-3.5" />}
    >
      {message}
    </NoticeBox>
  );
}

/**
 * Live price tinted by tick direction. Colour on a plain surface, which is the
 * one place R1 says the saturated hue must survive.
 */
export function DirectionalPrice({
  price,
  direction,
  iconSide = "left",
  className,
}: {
  price: React.ReactNode;
  direction: "up" | "down" | "neutral";
  iconSide?: "left" | "right";
  className?: string;
}) {
  const Icon =
    direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : null;
  const icon = Icon ? (
    <Icon
      className={cn(
        "h-3 w-3",
        iconSide === "left" ? "mr-1" : "ml-1",
        direction === "up" ? "text-up" : "text-down"
      )}
    />
  ) : null;

  return (
    <div className={cn("flex items-center", className)}>
      {iconSide === "left" && (
        <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
      )}
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          direction === "up"
            ? "text-up"
            : direction === "down"
              ? "text-down"
              : "text-muted-foreground"
        )}
      >
        {price}
      </span>
      {iconSide === "right" && icon}
    </div>
  );
}

export function ButtonSpinner() {
  return (
    <span className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
  );
}

/**
 * A disabled order button must not be a faded version of the live one.
 * `Button` ships `disabled:opacity-50`, which over a light ground turns
 * `bg-up` into a pale wash still carrying `--primary-foreground` white — the
 * label all but disappears. Disabled goes to the neutral ramp instead, so the
 * side colour only ever appears on a button you can actually press.
 */
export const DISABLED_ORDER_BUTTON =
  "disabled:opacity-100 disabled:bg-surface-3 disabled:text-muted-foreground";

/** Full-width submit, coloured by side. */
export function SubmitOrderButton({
  buyMode,
  isSubmitting,
  disabled,
  onClick,
  processingLabel,
  children,
}: {
  buyMode: boolean;
  isSubmitting: boolean;
  disabled?: boolean;
  onClick: () => void;
  processingLabel: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-1">
      <Button
        className={cn(
          "w-full h-8 text-sm font-medium rounded-sm text-primary-foreground",
          buyMode ? "bg-up hover:bg-up/90" : "bg-down hover:bg-down/90",
          DISABLED_ORDER_BUTTON
        )}
        onClick={onClick}
        disabled={disabled}
      >
        {isSubmitting ? (
          <span className="flex items-center">
            <ButtonSpinner />
            {processingLabel}
          </span>
        ) : (
          <span className="flex items-center justify-center">{children}</span>
        )}
      </Button>
    </div>
  );
}
