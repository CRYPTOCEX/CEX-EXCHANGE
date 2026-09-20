"use client";

/**
 * Terminal workspace kit — the full-page panel chrome, shared.
 *
 * WHY THIS EXISTS AT `components/` AND NOT INSIDE A ROUTE
 * This chrome has now been written three times. `trade/pro` built it first
 * (`Panel.tsx` + `PanelHeader.tsx`) against its private `--tp-*` variables. The
 * FX terminal could not import that — those stylesheets are not loaded on its
 * route — so `(ext)/forex-trading/trade/components/fx-panel.tsx` rebuilt the
 * same pattern on semantic tokens, with a header comment explaining the
 * mapping it had to re-derive (`--tp-bg-secondary` → `bg-card`,
 * `--tp-bg-tertiary` → `bg-surface-3`, `--tp-border` → `border-border`).
 *
 * A fourth terminal would have to do it again. This is that mapping, once, in a
 * place any route can reach. Geometry and behaviour are copied deliberately
 * from fx-panel.tsx so the three terminals stay pixel-consistent:
 *
 *   - expanded: card ground, hairline on every edge, `h-8 min-h-[32px]` header
 *     with `pl-3 pr-1.5` (the right inset matches the buttons' own ~5px pad, so
 *     the last control sits as close to the border as it does to the top edge)
 *   - collapsed: the WHOLE panel becomes a strip — 28px wide for a side panel
 *     with a vertical title, 32px tall for a bottom dock — and clicking
 *     anywhere on it expands
 *   - chevrons: expanded points TOWARD the edge it collapses to, collapsed
 *     points back INTO the layout
 *
 * Panels butt together with `gap-px` on the workspace rather than sharing a
 * border, because each panel already draws its own hairline on all four edges
 * and adjoining them directly paints a 2px seam.
 *
 * The vertical title uses arbitrary properties rather than a stylesheet class,
 * so this kit stays importable without also importing a route's CSS.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export type PanelSide = "left" | "right" | "bottom";

/* ------------------------------------------------------------------ shell */

/**
 * Full-viewport terminal root.
 *
 * `h-screen` only fills the viewport when the route's layout has suppressed the
 * site header — see the `usePathname` branch in
 * `(ext)/forex-trading/layout.tsx`. Rendered under normal page chrome this will
 * overflow by the height of that header.
 */
export function TerminalShell({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-screen flex-col overflow-hidden bg-background text-foreground",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

/** The region below the header: panels separated by one pixel of canvas. */
export function TerminalWorkspace({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("relative flex min-h-0 flex-1 gap-px", className)}>
      {children}
    </div>
  );
}

/** A column inside the workspace — stacks panels vertically with the same seam. */
export function TerminalColumn({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col gap-px", className)}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- controls */

/**
 * Panel-chrome button. One ink ramp for every control in the terminal
 * (`subtle` → `muted` on hover over a `border-strong` pad) and one focus
 * contract: a 1px ring drawn INSIDE the control, so it cannot be clipped by the
 * panel's `overflow-hidden`.
 */
export function PanelIconButton({
  label,
  onClick,
  className,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "cursor-pointer rounded p-1 text-subtle-foreground transition-colors hover:bg-border-strong hover:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

function CollapseChevron({ side, collapsed }: { side: PanelSide; collapsed: boolean }) {
  if (collapsed) {
    // Points back INTO the layout — where the panel will expand to.
    if (side === "left") return <ChevronRight size={14} />;
    if (side === "right") return <ChevronLeft size={14} />;
    return <ChevronUp size={14} />;
  }
  // Points TOWARD the edge the panel will collapse to.
  if (side === "left") return <ChevronLeft size={14} />;
  if (side === "right") return <ChevronRight size={14} />;
  return <ChevronDown size={14} />;
}

/* ------------------------------------------------------------------ header */

export function PanelHeader({
  title,
  side,
  onCollapse,
  headerExtra,
  onMaximize,
  isMaximized,
}: {
  title: string;
  side?: PanelSide;
  onCollapse?: () => void;
  headerExtra?: ReactNode;
  onMaximize?: () => void;
  isMaximized?: boolean;
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <div className="flex h-8 min-h-[32px] shrink-0 select-none items-center justify-between gap-2 border-b border-border bg-surface-3 pl-3 pr-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {headerExtra}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onMaximize && (
          <PanelIconButton
            label={isMaximized ? tCommon("restore_panel") : tCommon("maximize_panel")}
            onClick={onMaximize}
          >
            {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </PanelIconButton>
        )}
        {onCollapse && side && (
          <PanelIconButton label={tCommon("collapse_panel", { title: String(title) })} onClick={onCollapse}>
            <CollapseChevron side={side} collapsed={false} />
          </PanelIconButton>
        )}
      </div>
    </div>
  );
}

/** The whole collapsed panel — a slim clickable strip. */
export function CollapsedStrip({
  title,
  side,
  onExpand,
}: {
  title: string;
  side: PanelSide;
  onExpand: () => void;
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const vertical = side !== "bottom";
  return (
    <button
      type="button"
      aria-label={tCommon("expand_panel", { title: String(title) })}
      title={tCommon("expand_title", { title: String(title) })}
      onClick={onExpand}
      className={cn(
        "flex shrink-0 cursor-pointer items-center justify-center gap-1.5 bg-card text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
        vertical ? "w-[28px] min-w-[28px] flex-col" : "h-8 min-h-[32px] w-full",
        side === "left" && "border-r border-border",
        side === "right" && "border-l border-border",
        side === "bottom" && "border-t border-border"
      )}
    >
      <CollapseChevron side={side} collapsed />
      <span
        className={cn(
          "whitespace-nowrap text-xs font-medium",
          // Arbitrary properties instead of a stylesheet class, so this kit
          // carries no CSS import of its own.
          vertical && "[writing-mode:vertical-rl] [text-orientation:mixed] rotate-180"
        )}
      >
        {title}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------- panel */

export function TerminalPanel({
  title,
  side,
  collapsed,
  onToggle,
  maximizable,
  keepMountedWhenCollapsed,
  headerExtra,
  className,
  contentClassName,
  children,
}: {
  title: string;
  /** Which edge it collapses to. Omit with `onToggle` for a fixed panel. */
  side?: PanelSide;
  collapsed?: boolean;
  onToggle?: () => void;
  maximizable?: boolean;
  /**
   * Keep the CONTENT mounted (display:none) while collapsed, with the strip
   * rendered alongside. Default unmounts, matching pro; a dock opts in so its
   * tab selection and scroll position survive a collapse/expand cycle.
   */
  keepMountedWhenCollapsed?: boolean;
  headerExtra?: ReactNode;
  /**
   * Sizing classes for the EXPANDED panel. DROPPED while maximized, so this
   * must hold sizing and border classes only — anything the content depends on
   * (scroll behaviour, padding, flex direction) belongs in `contentClassName`,
   * which is always applied.
   */
  className?: string;
  contentClassName?: string;
  /** Called when this panel un-maximizes itself for an overlay. */
  onRestoreRequest?: () => void;
  children: ReactNode;
}) {
  const [isMaximized, setIsMaximized] = useState(false);

  /**
   * A maximized panel is `fixed inset-0 z-50`, so it sits ABOVE any dialog
   * opened afterwards — including the kill switch, which makes this a safety
   * issue rather than a cosmetic one. Routes dispatch this event before opening
   * an overlay; every maximized panel drops back into the layout first.
   */
  useEffect(() => {
    if (!isMaximized) return;
    const restore = () => setIsMaximized(false);
    window.addEventListener("hb-terminal:restore-panels", restore);
    return () => window.removeEventListener("hb-terminal:restore-panels", restore);
  }, [isMaximized]);

  const handleMaximize = useCallback(() => setIsMaximized((p) => !p), []);
  const handleCollapse = useCallback(() => {
    // Never leave a hidden fullscreen overlay armed behind a collapsed panel.
    setIsMaximized(false);
    onToggle?.();
  }, [onToggle]);

  const collapsible = !!onToggle && !!side;

  if (collapsed && collapsible && !keepMountedWhenCollapsed) {
    return <CollapsedStrip title={title} side={side!} onExpand={onToggle!} />;
  }

  return (
    <>
      {collapsed && collapsible && (
        <CollapsedStrip title={title} side={side!} onExpand={onToggle!} />
      )}
      <section
        className={cn(
          "flex min-h-0 min-w-0 flex-col overflow-hidden border border-border bg-card",
          collapsed
            ? "hidden"
            : isMaximized
              ? "fixed inset-0 z-50"
              : className
        )}
      >
        <PanelHeader
          title={title}
          side={side}
          onCollapse={collapsible ? handleCollapse : undefined}
          headerExtra={headerExtra}
          onMaximize={maximizable ? handleMaximize : undefined}
          isMaximized={isMaximized}
        />
        <div className={cn("min-h-0 flex-1", contentClassName ?? "overflow-hidden")}>
          {children}
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- readouts */

/**
 * One telemetry figure: tiny label over a dense numeral.
 *
 * Terminals put these in an unbroken hairline-divided strip. A border around
 * each individual figure is what makes a stat row read as a marketing dashboard
 * rather than as instrumentation, which is why `Readout` draws no frame of its
 * own — `ReadoutStrip` draws one frame for all of them.
 */
export function Readout({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: string;
  tone?: "up" | "down" | "accent" | "muted";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 px-3 py-1.5", className)} title={hint}>
      <span className="block truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "mt-0.5 block truncate font-mono text-sm font-semibold tabular-nums",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
          tone === "accent" && "text-primary",
          tone === "muted" && "text-muted-foreground",
          !tone && "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function ReadoutStrip({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid divide-border overflow-hidden border-border bg-card",
        className
      )}
    >
      {children}
    </div>
  );
}
