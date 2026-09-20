"use client";

/**
 * Shared analytics primitives — Obsidian design system.
 *
 * Every file in this folder used to rebuild the same panel, the same uppercase
 * section heading, the same stat tile and the same win/loss chip, each with its
 * own `theme === "dark" ? … : …` ladder. Tokens are theme-aware, so those
 * ladders are deleted rather than translated (DESIGN-SYSTEM.md R5) and the
 * shapes live here once.
 *
 * ── the encoding vocabulary ────────────────────────────────────────────────
 * Analytics is where colour stops being decoration and becomes encoding, so
 * this cluster uses exactly one vocabulary:
 *
 *   `Tone` = up | neutral | down — direction of money and quality of an
 *   outcome. P&L, win/loss and the profit curve are `up`/`down` (R1); the
 *   middle band is neutral ink, NOT a third hue. The win-rate gauge used to
 *   band four unrelated hues across one continuous scale, which reads as four
 *   unrelated categories; three tones on one axis is the honest shape.
 *
 * Two measured constraints drive the details below:
 *
 *  1. `--up` and `--down` are a red/green pair, so they are NOT separable
 *     under deuteranopia: OKLab ΔE 5.5 light / 5.2 dark against a floor of 6.
 *     Every mark that carries a tone must therefore also carry a non-colour
 *     cue — a glyph, a shape, a written label. Never tone alone.
 *  2. In LIGHT mode a tone sitting on its own tint measures 2.95:1 (up) and
 *     3.80:1 (down) against a 4.5:1 floor for small text. So a chip puts the
 *     hue on its ICON and the label on `--foreground`, which measures 16:1 on
 *     the same tint. The token values themselves are a Phase-0 decision and
 *     are deliberately left alone.
 */

import { memo, useCallback, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// TONE — the single encoding vocabulary
// ============================================================================

export type Tone = "up" | "neutral" | "down";

/**
 * Ink. The middle band is a neutral gray, not a third hue — a diverging scale
 * takes two poles and a gray midpoint, and `--muted-foreground` measures
 * 6.1:1 light / 7.5:1 dark on a card, so it stays legible at 12px where the
 * two poles do not.
 */
export const toneText: Record<Tone, string> = {
  up: "text-up",
  neutral: "text-muted-foreground",
  down: "text-down",
};

/** Filled marks — dots, bars, segments. */
export const toneMark: Record<Tone, string> = {
  up: "bg-up",
  neutral: "bg-muted-foreground",
  down: "bg-down",
};

/** SVG strokes — gauge arcs. */
export const toneStroke: Record<Tone, string> = {
  up: "stroke-up",
  neutral: "stroke-muted-foreground",
  down: "stroke-down",
};

/** Chip grounds. Labels on these must stay on foreground ink — see header. */
export const toneTint: Record<Tone, string> = {
  up: "bg-up/12",
  neutral: "bg-surface-3",
  down: "bg-down/12",
};

/** Direction of money. `>= 0` is up, matching the arithmetic everywhere else. */
export function pnlTone(value: number): Tone {
  return value >= 0 ? "up" : "down";
}

/**
 * Win rate is a continuous scale, so it gets ONE banding rule shared by the
 * gauge, the per-symbol table, the hour/day breakdowns and quick insights.
 * Before this they disagreed — the gauge banded at 60/50/40 and every table
 * split at 50, so the same 47% figure was two different colours on one screen.
 */
export function winRateTone(rate: number): Tone {
  if (rate >= 60) return "up";
  if (rate >= 40) return "neutral";
  return "down";
}

/** Good / neutral / bad for a risk metric — the same three tones. */
export type MetricStatus = "good" | "neutral" | "bad";
export const statusTone: Record<MetricStatus, Tone> = {
  good: "up",
  neutral: "neutral",
  bad: "down",
};

// ============================================================================
// SURFACES
// ============================================================================

/** The card every analytics block sits on. One step above the page ground. */
export const Panel = memo(function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      {children}
    </div>
  );
});

/** The uppercase section label above every block. */
export const PanelTitle = memo(function PanelTitle({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <h3
      className={cn(
        "text-sm font-medium uppercase tracking-wide text-muted-foreground",
        className
      )}
    >
      {children}
    </h3>
  );
});

// ============================================================================
// MARKS
// ============================================================================

/**
 * A tone chip — WIN/LOSS, RISE/FALL, a trade side.
 *
 * The glyph carries the hue (and is the CVD fallback), the label carries
 * foreground ink so it stays legible on the tint in light mode.
 */
export const ToneChip = memo(function ToneChip({
  tone,
  icon,
  children,
  className,
}: {
  tone: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-foreground",
        toneTint[tone],
        className
      )}
    >
      {icon ? <span className={toneText[tone]}>{icon}</span> : null}
      {children}
    </span>
  );
});

/**
 * A small tone dot. `shape` is the non-colour cue that keeps win and loss
 * apart for a deuteranope — a filled disc for up, a rotated square for down.
 */
export const ToneDot = memo(function ToneDot({
  tone,
  size = 8,
  className,
  style,
}: {
  tone: Tone;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn(
        "inline-block shrink-0",
        toneMark[tone],
        tone === "down" ? "rotate-45" : "rounded-full",
        className
      )}
      style={{ width: size, height: size, ...style }}
    />
  );
});

// ============================================================================
// TILES
// ============================================================================

/** The stat tile repeated across the summary grid. */
export const StatTile = memo(function StatTile({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  /* ReactNode, not string. A money value arrives here pre-formatted as
     "1,234.00 USDT" — a number glued to a word — and a plain string cannot be
     split, so the ticker either lands in the monospace face or the digits lose
     their tabular alignment. Accepting a node lets the call site pass
     <MoneyFigure>, exactly as StatsCard already does. */
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** Omit when the figure has no direction — it then takes plain ink. */
  tone?: Tone;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {icon ? <div className="rounded-lg bg-surface-3 p-2">{icon}</div> : null}
      </div>
      <div
        className={cn(
          "mb-1 text-2xl font-semibold leading-tight tracking-tight",
          tone ? toneText[tone] : "text-foreground"
        )}
      >
        {value}
      </div>
      {subtitle ? (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      ) : null}
    </div>
  );
});

// ============================================================================
// CANVAS COLOURS
// ============================================================================

/**
 * Tokens a canvas needs as real colour values.
 *
 * A chart library cannot take a class, so the values are read off the document
 * element and RE-READ whenever the theme flips. Caching them at mount is the
 * bug that leaves a canvas painted for dark mode after a switch to light
 * (DESIGN-SYSTEM.md, Phase 7).
 */
const CANVAS_TOKENS = [
  "card",
  "border",
  "border-strong",
  "subtle-foreground",
  "muted-foreground",
  "up",
  "down",
] as const;

export type CanvasToken = (typeof CANVAS_TOKENS)[number];

export interface TokenColors {
  /** Opaque `hsl(...)` for a token. */
  color: (token: CanvasToken) => string;
  /** The same token at an alpha, e.g. an area fill under a line. */
  alpha: (token: CanvasToken, a: number) => string;
  /** Raw `H S% L%` triples, keyed by token. Empty before the first read. */
  raw: Partial<Record<CanvasToken, string>>;
}

function readTokens(): Partial<Record<CanvasToken, string>> {
  if (typeof document === "undefined") return {};
  const cs = getComputedStyle(document.documentElement);
  const out: Partial<Record<CanvasToken, string>> = {};
  for (const token of CANVAS_TOKENS) {
    const value = cs.getPropertyValue(`--${token}`).trim();
    if (value) out[token] = value;
  }
  return out;
}

export function useTokenColors(): TokenColors {
  const [raw, setRaw] = useState<Partial<Record<CanvasToken, string>>>(readTokens);

  useEffect(() => {
    const sync = () => setRaw(readTokens());
    // next-themes flips a class (and colorScheme) on <html>; that mutation is
    // the only reliable signal that the token values just changed.
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    // A system-level flip while the app is on "system" changes nothing in the
    // DOM until next-themes reacts, so listen for it directly too.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    sync();
    return () => {
      observer.disconnect();
      media.removeEventListener("change", sync);
    };
  }, []);

  const color = useCallback(
    (token: CanvasToken) => {
      const value = raw[token];
      return value ? `hsl(${value})` : "transparent";
    },
    [raw]
  );

  const alpha = useCallback(
    (token: CanvasToken, a: number) => {
      const value = raw[token];
      return value ? `hsl(${value} / ${a})` : "transparent";
    },
    [raw]
  );

  return { color, alpha, raw };
}
