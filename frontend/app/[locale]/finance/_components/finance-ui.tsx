"use client";

import { ReactNode, forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { m, MotionProps } from "framer-motion";
import { LucideIcon } from "lucide-react";

/**
 * Shared design primitives for the Finance experience.
 * These components establish the cohesive premium look across
 * wallet, deposit, withdraw, transfer and history pages.
 */

// ─────────────────────────────────────────────────────────
// AmbientBackground — subtle radial accents behind content
// ─────────────────────────────────────────────────────────
/**
 * Ambient page wash.
 *
 * The `tone` prop used to select one of five hardcoded rgba pairs — blue, green,
 * amber, violet, rose — so /deposit, /withdraw and /transfer each sat on a
 * differently-coloured ground. Under R3 the page ground is a surface, not a
 * mood: it is now the background token with a single low-opacity accent bloom,
 * identical on every finance page.
 *
 * `tone` is retained as an accepted-and-ignored prop so the ~6 call sites keep
 * compiling; it is deliberately not wired to anything.
 */
export function AmbientBackground({ tone: _tone = "blue" }: { tone?: "blue" | "green" | "amber" | "violet" | "rose" }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute -top-40 left-1/2 h-[640px] w-[1100px] -translate-x-1/2 rounded-full blur-[120px] opacity-70"
        style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.10), transparent)" }}
      />
      <div
        className="absolute bottom-[-260px] right-[-200px] h-[560px] w-[560px] rounded-full blur-[140px] opacity-60"
        style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.07), transparent)" }}
      />
      <div
        className="absolute top-[40%] left-[-200px] h-[420px] w-[420px] rounded-full blur-[140px] opacity-50"
        style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.07), transparent)" }}
      />
      <div className="absolute inset-0 text-border-strong opacity-40"
           style={{
             backgroundImage:
               "radial-gradient(currentColor 1px, transparent 1px)",
             backgroundSize: "32px 32px",
           }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// FinanceShell — standard site container
// ─────────────────────────────────────────────────────────
export function FinanceShell({
  children,
  className,
  // kept for API compatibility; layout uses the site `container` regardless
  maxWidth: _maxWidth,
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: "default" | "narrow" | "wide" | "full";
}) {
  return (
    <div className={cn("container mx-auto px-4 md:px-6", className)}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PageHeader — consistent page title + actions
// ─────────────────────────────────────────────────────────
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon: Icon,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        {Icon && (
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-2 text-foreground shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          {eyebrow && (
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle-foreground">
              {eyebrow}
            </div>
          )}
          <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 sm:gap-3">{actions}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// GlassPanel — reusable elevated surface
// ─────────────────────────────────────────────────────────
type GlassPanelProps = {
  className?: string;
  children: ReactNode;
  interactive?: boolean;
  padded?: boolean;
} & MotionProps;

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, children, interactive, padded = true, ...rest }, ref) => {
    return (
      <m.div
        ref={ref}
        {...rest}
        className={cn(
          /* The `0_1px_0_…_inset` rule is a top-edge bevel highlight, and its
             two arms are a deliberate pair, not a bug: 0.6 in light, 0.04/0.06
             in dark. A highlight has to be WHITE in both themes (that is the
             physics of a bevel), which is exactly what --overlay-foreground is
             — so both arms tokenize to it at their own alpha and neither
             collapses into the other. The drop-shadow halves ride --shadow, the
             panel's shadow-colour token: they were `rgba(15,23,42,…)` (a
             chromatic slate, light) and `rgba(0,0,0,…)` (dark), so the owner
             could recolour every `shadow-lg` in the app and these four panels
             kept the old ink. A box-shadow is invisible to a colour-only scan,
             which is how they survived every earlier sweep.
             NOTE: a Tailwind arbitrary value cannot contain spaces — the
             `hsl(var(--x)/a)` fragments below must stay space-free. */
          "relative overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-[0_1px_0_hsl(var(--overlay-foreground)/0.6)_inset,0_24px_48px_-24px_hsl(var(--shadow)/0.18)]",
          "dark:shadow-[0_1px_0_hsl(var(--overlay-foreground)/0.04)_inset,0_24px_48px_-24px_hsl(var(--shadow)/0.6)]",
          interactive && "transition-all duration-200 hover:border-border-strong hover:shadow-[0_1px_0_hsl(var(--overlay-foreground)/0.6)_inset,0_32px_60px_-30px_hsl(var(--shadow)/0.28)] dark:hover:shadow-[0_1px_0_hsl(var(--overlay-foreground)/0.06)_inset,0_32px_60px_-30px_hsl(var(--shadow)/0.7)]",
          padded && "p-4 sm:p-6",
          className
        )}
      >
        {children}
      </m.div>
    );
  }
);
GlassPanel.displayName = "GlassPanel";

// ─────────────────────────────────────────────────────────
// SectionTitle — small consistent section heading
// ─────────────────────────────────────────────────────────
export function SectionTitle({
  step,
  title,
  hint,
  icon: Icon,
  trailing,
  className,
}: {
  step?: number | string;
  title: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-3">
        {step !== undefined && (
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md shadow-primary/20">
            {step}
          </div>
        )}
        {Icon && !step && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
        <div>
          <div className="text-[15px] font-semibold leading-tight text-foreground">
            {title}
          </div>
          {hint && (
            <div className="mt-0.5 text-xs text-subtle-foreground">{hint}</div>
          )}
        </div>
      </div>
      {trailing}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// WALLET TYPE SYSTEM — consistent palette for FIAT/SPOT/ECO/FUTURES
// ─────────────────────────────────────────────────────────
export type WalletType = "FIAT" | "SPOT" | "ECO" | "FUTURES" | string;

export const WALLET_THEMES: Record<
  string,
  {
    label: string;
    accent: string;            // tailwind text color for accent
    chip: string;              // background pill style
    ring: string;              // ring color
    glow: string;              // gradient for hero card
    gradient: string;          // gradient for backgrounds
    softBg: string;            // subtle card background
    iconBg: string;            // icon container background
    border: string;            // border color
  }
> = {
  /**
   * Wallet type is categorical identity — four peers, no ordering, no state — so
   * each takes a fixed slot on the chart ramp, which is the ramp validated for
   * CVD separation and contrast in both themes.
   *
   * **The slot order here is load-bearing.** `components/partials/header/wallet-popover.tsx`
   * assigns the same four types to the same four slots (SPOT→1, FIAT→2, ECO→3,
   * FUTURES→4). If these two ever disagree, one wallet reads as two different
   * colours depending on whether you are looking at the header or the page.
   *
   * Was: FIAT emerald, SPOT blue, ECO violet, FUTURES amber — four hue families
   * that also collided with the up/down and success/warning tokens, so a green
   * FIAT chip was indistinguishable from a "succeeded" chip beside it.
   */
  FIAT: {
    label: "Fiat",
    accent: "text-chart-2",
    chip: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    ring: "ring-chart-2/40",
    glow: "from-chart-2/30 via-chart-2/10 to-transparent",
    gradient: "from-chart-2 to-chart-2/60",
    softBg: "bg-chart-2/5",
    iconBg: "bg-chart-2/10 text-chart-2",
    border: "border-chart-2/30",
  },
  SPOT: {
    label: "Spot",
    accent: "text-chart-1",
    chip: "bg-chart-1/10 text-chart-1 border-chart-1/20",
    ring: "ring-chart-1/40",
    glow: "from-chart-1/30 via-chart-1/10 to-transparent",
    gradient: "from-chart-1 to-chart-1/60",
    softBg: "bg-chart-1/5",
    iconBg: "bg-chart-1/10 text-chart-1",
    border: "border-chart-1/30",
  },
  ECO: {
    label: "Eco",
    accent: "text-chart-3",
    chip: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    ring: "ring-chart-3/40",
    glow: "from-chart-3/30 via-chart-3/10 to-transparent",
    gradient: "from-chart-3 to-chart-3/60",
    softBg: "bg-chart-3/5",
    iconBg: "bg-chart-3/10 text-chart-3",
    border: "border-chart-3/30",
  },
  FUTURES: {
    label: "Futures",
    accent: "text-chart-4",
    chip: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    ring: "ring-chart-4/40",
    glow: "from-chart-4/30 via-chart-4/10 to-transparent",
    gradient: "from-chart-4 to-chart-4/60",
    softBg: "bg-chart-4/5",
    iconBg: "bg-chart-4/10 text-chart-4",
    border: "border-chart-4/30",
  },
};

/** Unknown wallet types stay neutral rather than borrowing a ramp slot. */
export function getWalletTheme(type?: string) {
  return WALLET_THEMES[(type || "").toUpperCase()] || {
    label: type || "Other",
    accent: "text-muted-foreground",
    chip: "bg-muted text-muted-foreground border-border",
    ring: "ring-border-strong",
    glow: "from-muted/60 via-muted/20 to-transparent",
    gradient: "from-muted-foreground to-muted-foreground/60",
    softBg: "bg-muted/40",
    iconBg: "bg-muted text-muted-foreground",
    border: "border-border",
  };
}

// ─────────────────────────────────────────────────────────
// TypeBadge — consistent pill badge for wallet types
// ─────────────────────────────────────────────────────────
export function TypeBadge({ type, className }: { type: string; className?: string }) {
  const theme = getWalletTheme(type);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        theme.chip,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", `bg-current`)} />
      {theme.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// CurrencyMark — circular currency pill
// ─────────────────────────────────────────────────────────

/**
 * Icon URLs that have already 404'd in this browser session.
 *
 * Module scope, not component state, and that is the point: one currency is
 * drawn once per wallet row, again in the view dialog, again on the detail page
 * and again after every re-render. `/img/crypto` carries ~11.5k symbols but the
 * listed set moves faster than the icon set does, so a token with no file is
 * ordinary — without this, every one of those renders re-requests a file the
 * server has already said is not there. Static assets do not appear mid-session,
 * so a miss stays a miss until reload.
 */
const failedCurrencyIcons = new Set<string>();

/**
 * The first candidate that has not already failed, or `null` when they all have.
 *
 * A wallet can offer more than one source: ECO rows carry an operator-uploaded
 * `icon` from `ecosystemToken`, and every symbol has a path in the bundled
 * `/img/crypto` set. Trying them in order means an ECO token whose upload has
 * gone missing still shows its coin logo rather than dropping straight to
 * letters.
 */
function firstUsableIcon(candidates: (string | null | undefined)[]) {
  for (const candidate of candidates) {
    if (candidate && !failedCurrencyIcons.has(candidate)) return candidate;
  }
  return null;
}

export function CurrencyMark({
  code,
  size = "md",
  type,
  icon,
  fallback,
}: {
  code: string;
  size?: "sm" | "md" | "lg" | "xl";
  type?: string;
  /**
   * One URL, or several tried in order. Pass an array when the row carries its
   * own icon and there is also a path-built fallback — `[row.icon, resolve(code)]`.
   * Empty entries are skipped, so a caller never has to filter first.
   */
  icon?: string | (string | null | undefined)[] | null;
  /**
   * Rendered INSTEAD of the letter mark when no source is usable.
   *
   * The letter mark is right where the mark stands alone or beside a heading,
   * which is every call site that predates icons. It is wrong in a table cell
   * that already prints the code an inch to the right: a currency with no icon
   * would draw a coloured disc reading BTC next to the word BTC. Pass `null`
   * there and the cell collapses to exactly what it showed before icons —
   * which is the honest answer, since nothing was learned about the currency.
   */
  fallback?: ReactNode;
}) {
  const theme = getWalletTheme(type || "");
  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-12 w-12 text-sm",
    xl: "h-16 w-16 text-base",
  };

  const candidates = (Array.isArray(icon) ? icon : [icon]).filter(
    Boolean
  ) as string[];
  const candidateKey = candidates.join("|");

  /**
   * Which candidate we are on, and for which currency.
   *
   * The currency is part of the state rather than an effect dependency because
   * the reset has to happen DURING the render that changed it. Lists recycle a
   * single element across pages and filters, so this instance is handed a
   * different currency without unmounting — resetting in an effect would paint
   * one frame of the previous row's exhausted state, which is the letter mark
   * of a currency that is no longer in this cell. This is React's own
   * adjust-state-during-render pattern; the re-render happens before the browser
   * sees anything.
   */
  const [progress, setProgress] = useState({ key: candidateKey, attempt: 0 });
  if (progress.key !== candidateKey) {
    setProgress({ key: candidateKey, attempt: 0 });
  }
  const attempt = progress.key === candidateKey ? progress.attempt : 0;

  const src = firstUsableIcon(candidates.slice(attempt));

  // The whole mark goes, not just its contents — an empty circle is the defect
  // this component exists to avoid, and it is no better for being deliberate.
  if (!src && fallback !== undefined) return <>{fallback}</>;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold shadow-md",
        sizes[size],
        // A coin logo is a transparent PNG/WebP, so the type gradient shows
        // through it as a coloured halo and the mark reads as a status pill
        // rather than as the coin. The gradient is the LETTER treatment; an
        // icon gets a neutral plate.
        //
        // The direction and its stops stay in ONE interpolated literal: split
        // across two `cn` arguments, `bg-linear-to-br` reads as a gradient with
        // no stops to the design-debt scanner, which is a real defect class
        // here — just not this one.
        src
          ? "bg-muted"
          : `bg-linear-to-br ${theme.gradient} text-overlay-foreground`
      )}
    >
      {src ? (
        <img
          src={src}
          alt={code}
          className="h-full w-full object-cover"
          onError={() => {
            // Remember across instances, then advance. When nothing is left
            // `src` is null and the letter mark below takes over — the old
            // handler hid the <img> instead, which left an empty coloured
            // circle with no way to tell which currency it was.
            failedCurrencyIcons.add(src);
            setProgress((p) => ({ key: candidateKey, attempt: p.attempt + 1 }));
          }}
        />
      ) : (
        <span className="tracking-tight">{(code || "?").slice(0, 3)}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MetricTile — small KPI block
// ─────────────────────────────────────────────────────────
export function MetricTile({
  label,
  value,
  hint,
  delta,
  icon: Icon,
  tone,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  delta?: { value: ReactNode; positive?: boolean };
  icon?: LucideIcon;
  /** Accepted for call-site compatibility and deliberately ignored — a metric is
   *  data, not state, so every tile uses the same neutral treatment. */
  tone?: "blue" | "green" | "violet" | "amber" | "rose";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-4 backdrop-blur-xl transition-all hover:border-border-strong sm:p-5",
        className
      )}
    >
      {/*
        A metric is DATA, not state. The five `tone` hues (blue/green/violet/
        amber/rose) coloured the icon tile and a corner bloom purely for variety,
        which is why four KPIs in one row read as four different statuses. The
        only thing on this tile that carries meaning is `delta`, and it now wears
        the up/down tokens (R1). `tone` is accepted and ignored — see the prop doc.
      */}
      <div
        aria-hidden
        className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
        style={{ background: "radial-gradient(closest-side, hsl(var(--primary)), transparent)" }}
      />
      <div className="relative flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-subtle-foreground">
          {label}
        </span>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "text-xs font-semibold tabular-nums",
              delta.positive ? "text-up" : "text-down"
            )}
          >
            {delta.positive ? "▲" : "▼"} {delta.value}
          </span>
        )}
      </div>
      {hint && (
        <div className="mt-1 text-xs text-subtle-foreground">{hint}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// QuickActionTile — "deposit / withdraw / transfer" buttons
// ─────────────────────────────────────────────────────────
export function QuickActionTile({
  title,
  description,
  icon: Icon,
  onClick,
  tone = "blue",
  badge,
  "data-tour": dataTour,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
  /** Accepted for call-site compatibility and deliberately ignored — see below. */
  tone?: "blue" | "green" | "rose" | "violet" | "amber";
  badge?: string;
  /**
   * A guided-tour anchor, forwarded to the button.
   *
   * Declared explicitly rather than by spreading `...rest`, because this
   * component deliberately swallows `tone` and a blanket spread would start
   * leaking that onto the DOM as an unknown attribute.
   *
   * It is here because the four tiles are direct grid children with no per-tile
   * wrapper, so an anchor on the grid highlights all four at once — and a
   * walkthrough that says "this is how you move money between your own wallets"
   * while spotlighting Deposit, Withdraw, Transfer AND History is pointing at
   * nothing in particular.
   */
  "data-tour"?: string;
}) {
  /*
    These four tiles are Deposit / Withdraw / Transfer / History — peer navigation
    actions, all equally interactive, already told apart by their icon and label.
    Colouring them green/rose/blue/violet made a row of buttons look like a row of
    statuses, and "withdraw = rose" in particular read as an error affordance on a
    perfectly ordinary action. R2: the accent means interactive, and all four are.
  */
  return (
    <button
      onClick={onClick}
      data-tour={dataTour}
      className={cn(
        "group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card/70 p-4 text-left backdrop-blur-xl transition-all",
        "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg"
      )}
    >
      <div
        aria-hidden
        className="absolute -right-12 -top-12 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-30"
        style={{ background: "hsl(var(--primary))" }}
      />
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-md ring-1 ring-primary/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-foreground">{title}</div>
          {badge && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <div className="mt-0.5 text-xs text-subtle-foreground">{description}</div>
        )}
      </div>
      <div className="relative h-8 w-8 shrink-0 rounded-lg border border-border bg-card text-subtle-foreground transition-colors group-hover:border-border-strong group-hover:text-foreground">
        <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// SelectableCard — "tap to choose" card used by deposit/withdraw flows
// ─────────────────────────────────────────────────────────
export function SelectableCard({
  selected,
  onClick,
  icon,
  title,
  subtitle,
  badges,
  trailing,
  className,
  disabled,
}: {
  selected?: boolean;
  onClick: () => void;
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border bg-card/70 p-4 text-left backdrop-blur-xl transition-all",
        selected
          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
          : "border-border hover:border-border-strong",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {selected && (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      {icon && (
        <div className="shrink-0">{icon}</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-foreground">{title}</div>
        {subtitle && (
          <div className="mt-0.5 truncate text-xs text-subtle-foreground">{subtitle}</div>
        )}
        {badges && <div className="mt-2 flex flex-wrap items-center gap-1.5">{badges}</div>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// EmptyState — generic empty placeholder
// ─────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted text-subtle-foreground">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-subtle-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// formatNumber — locale/precision aware number display
// ─────────────────────────────────────────────────────────
export function formatNumber(value: number | string | undefined | null, opts?: { decimals?: number; compact?: boolean }) {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (!isFinite(n)) return "0";
  const decimals = opts?.decimals ?? (Math.abs(n) >= 1 ? 2 : 6);
  if (opts?.compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n);
}
