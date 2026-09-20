"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HttpMethod } from "../types/openapi";

/**
 * HTTP methods are one of the few legitimately CATEGORICAL sets in the app, so
 * multiple hues are correct here — but they must come from the validated
 * `--chart-1..6` ramp, not from status tokens.
 *
 * What this used to be: `get` blue, `post` green, `put` amber, `delete` red —
 * which after Phase 6's rename would have become success / warning /
 * destructive. A DELETE badge reading as "destructive" is a coincidence of
 * hue, not a design: nothing about DELETE is an error, and a POST that
 * succeeded and a POST that 500'd wear the identical green chip. Status tokens
 * doing categorical duty is exactly the failure DESIGN-SYSTEM.md §4a and §8c
 * call out, and it always ends by collapsing two meanings into one paint.
 *
 * Slots are positional. Where the ramp happens to sit near the hue every API
 * console already uses (1 blue / 3 green / 2 gold / 5 red) that is kept, because
 * developers scan these by colour and re-teaching the convention buys nothing.
 *
 * CONTRAST — the ramp is tuned to a lightness band where *neither* white nor
 * near-black clears 4.5:1 in both themes, so a filled chip needs its ink to
 * flip with the theme. `--primary-foreground` is exactly that pairing (white in
 * light, near-black in dark) and it is the ink already paired with a filled
 * accent. Ink-on-own-fill, read back from getComputedStyle in Chrome,
 * light / dark:
 *
 *   GET     chart-1  5.03 / 5.48
 *   PUT     chart-2  5.00 / 5.48
 *   POST    chart-3  4.56 / 5.91
 *   PATCH   chart-4  5.23 / 5.19
 *   DELETE  chart-5  5.26 / 5.11
 *   OPTIONS chart-6  4.80 / 5.69
 *
 * All six clear 4.5:1 in both themes at the 10px `sm` size. A tinted chip
 * (ink at full strength over a 10% wash of itself, the shape this file had) was
 * measured first and rejected: four of the six slots land between 3.99 and 4.39
 * in light mode.
 *
 * HEAD and TRACE take no slot. They never appear in this spec, they carry no
 * payload semantics worth separating, and per §8c colour stops separating
 * anything much past six keys — the label already names them.
 */
const METHOD_FILL: Record<string, string> = {
  get: "bg-chart-1 border-chart-1 text-primary-foreground",
  post: "bg-chart-3 border-chart-3 text-primary-foreground",
  put: "bg-chart-2 border-chart-2 text-primary-foreground",
  patch: "bg-chart-4 border-chart-4 text-primary-foreground",
  delete: "bg-chart-5 border-chart-5 text-primary-foreground",
  del: "bg-chart-5 border-chart-5 text-primary-foreground", // alias for delete
  options: "bg-chart-6 border-chart-6 text-primary-foreground",
  head: "bg-surface-3 border-border text-muted-foreground",
  trace: "bg-surface-3 border-border text-muted-foreground",
};

/**
 * The same assignment as ink on a plain ground, for callers that want the hue
 * without the chip (the per-method counters on the overview). Exported so the
 * mapping lives in exactly one place — two copies is how a method ends up one
 * colour in the sidebar and another on the landing card.
 *
 * Measured on `--card`, light / dark: chart-1 5.01/5.17, chart-2 4.99/5.19,
 * chart-3 4.55/5.59, chart-4 5.23/4.90, chart-5 5.26/4.82, chart-6 4.78/5.35.
 */
export const METHOD_INK: Record<string, string> = {
  get: "text-chart-1",
  post: "text-chart-3",
  put: "text-chart-2",
  patch: "text-chart-4",
  delete: "text-chart-5",
  del: "text-chart-5",
  options: "text-chart-6",
  head: "text-muted-foreground",
  trace: "text-muted-foreground",
};

/** Neutral chip — the filter's unselected state. */
const METHOD_QUIET = "bg-surface-3 border-border text-muted-foreground";

interface MethodBadgeProps {
  method: HttpMethod | string;
  size?: "sm" | "md" | "lg";
  /** Render neutral instead of filled (used for an unselected filter). */
  quiet?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: "text-[10px] px-1.5 py-0.5 font-semibold",
  md: "text-xs px-2 py-0.5 font-semibold",
  lg: "text-sm px-2.5 py-1 font-semibold",
};

export function MethodBadge({ method, size = "md", quiet = false, className }: MethodBadgeProps) {
  const methodLower = method.toLowerCase();
  const style = quiet ? METHOD_QUIET : METHOD_FILL[methodLower] || METHOD_FILL.get;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono uppercase tracking-wide",
        style,
        sizeStyles[size],
        className
      )}
    >
      {method.toUpperCase()}
    </Badge>
  );
}

// Component for method filter checkboxes
interface MethodFilterProps {
  methods: HttpMethod[];
  selected: HttpMethod[];
  onChange: (methods: HttpMethod[]) => void;
  className?: string;
}

export function MethodFilter({ methods, selected, onChange, className }: MethodFilterProps) {
  const toggleMethod = (method: HttpMethod) => {
    if (selected.includes(method)) {
      onChange(selected.filter((m) => m !== method));
    } else {
      onChange([...selected, method]);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {methods.map((method) => {
        const isSelected = selected.includes(method);
        return (
          <button
            key={method}
            type="button"
            aria-pressed={isSelected}
            onClick={() => toggleMethod(method)}
            /* The unselected state used to be `opacity-50`, which on a filled
               chip drops the label under 2:1. It drops the fill instead. */
            className={cn(
              "rounded-md transition-transform focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              isSelected ? "scale-100" : "scale-95 hover:scale-100"
            )}
          >
            <MethodBadge method={method} size="sm" quiet={!isSelected} />
          </button>
        );
      })}
    </div>
  );
}
