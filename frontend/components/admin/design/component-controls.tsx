"use client";

/**
 * COMPONENT GEOMETRY CONTROLS — the editor half of plans/COMPONENT-SYSTEM.md.
 * ============================================================================
 *
 * The colour panel (`design-controls.tsx`) is a grid of swatches because every
 * token it edits is a colour. These are lengths, multipliers and font weights,
 * so they get sliders and steppers instead — but they are the SAME tokens, in
 * the same registry, saved to the same setting. Nothing here has its own
 * storage, its own validator or its own save button.
 *
 * WHY THE RANGES LIVE HERE AND NOT IN THE REGISTRY
 *
 * `lib/design-theme.ts` says what is LEGAL — `isValidTokenValue` is the
 * contract the server enforces before a value reaches a <style> tag. A slider's
 * min and max are a different question: what is USEFUL. A row height of 12rem
 * is perfectly legal and completely useless, and the registry has no business
 * having an opinion about it. So ranges are editor policy and stay in the
 * editor, next to RADIUS_STOPS and SPEED_STOPS which are there for the same
 * reason.
 *
 * WHY EVERY NUMBER IS RE-FORMATTED BEFORE IT IS STORED
 *
 * `setToken` silently drops anything `isValidTokenValue` rejects, and the
 * patterns are strict: `LENGTH_RE` allows at most three decimal places, and
 * `SCALE_RE` the same. JavaScript will hand you `1.7000000000000002` from an
 * ordinary slider step, which fails both — and fails INVISIBLY, as a control
 * that moves on screen and then does nothing. `fmt()` exists for exactly that.
 */

import * as React from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TOKENS, type TokenDef, type TokenGroup } from "@/lib/design-theme";
import { DEFAULT_BASE } from "@/lib/design-theme-defaults";
import { COMPONENT_PRESETS, type ComponentPreset } from "@/lib/component-presets";
import type { Scheme } from "@/components/admin/design/use-design-draft";
import { useTranslations } from "next-intl";

/* ==========================================================================
   VALUE HANDLING
   ========================================================================== */

/**
 * Trim a float to something the token patterns accept.
 *
 * Three decimals is the ceiling in both `LENGTH_RE` and `SCALE_RE`; trailing
 * zeros are stripped so a stored value compares equal to the shipped default
 * as a STRING — `isOverridden` is a key-presence check, but the "same as
 * default" reading an owner does by eye depends on `1` not showing as `1.000`.
 */
function fmt(n: number): string {
  return String(Number(n.toFixed(3)));
}

/** `"2.25rem"` -> `"rem"`. Defaults to px, which is what a unitless 0 means here. */
function unitOf(value: string): string {
  const m = /[a-z]+$/.exec(value.trim());
  return m ? m[0] : "px";
}

function numOf(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Slider bounds per token, in the token's OWN unit.
 *
 * Anything absent falls back to the kind's generic range, which is deliberately
 * wide — a missing entry should feel loose, not broken.
 */
const RANGE: Record<string, { min: number; max: number; step: number }> = {
  "--table-row-height": { min: 1.75, max: 5, step: 0.125 },
  "--table-header-height": { min: 1.75, max: 5, step: 0.125 },
  "--table-cell-padding-x": { min: 0, max: 2.5, step: 0.125 },
  "--table-row-border-width": { min: 0, max: 3, step: 1 },
  "--control-border-width": { min: 0, max: 3, step: 1 },
  "--card-border-width": { min: 0, max: 3, step: 1 },
  "--field-gap": { min: 0.25, max: 2.5, step: 0.125 },
  "--dialog-padding": { min: 0.5, max: 3, step: 0.125 },
  "--chart-line-width": { min: 1, max: 6, step: 0.5 },
  "--chart-point-radius": { min: 0, max: 8, step: 1 },
  /* Radius SCALES get a wider ceiling than the generic 0-2. They multiply
     `--radius-md`, which is 3px at the shipped radius — so 2x is 6px and still
     visibly square, and the "Rounded" preset would sit outside a range the
     slider could express. `SCALE_RE` stops at 5, so 5 is also the hard ceiling
     rather than a chosen one. */
  "--control-radius-scale": { min: 0, max: 5, step: 0.25 },
  "--badge-radius-scale": { min: 0, max: 5, step: 0.25 },
  "--table-radius-scale": { min: 0, max: 3, step: 0.25 },
};

const SCALE_RANGE = { min: 0, max: 2, step: 0.05 };
const LENGTH_RANGE = { min: 0, max: 4, step: 0.125 };

function rangeFor(def: TokenDef) {
  return RANGE[def.name] ?? (def.kind === "scale" ? SCALE_RANGE : LENGTH_RANGE);
}

/** 300-800. Below 300 is unreadable at interface sizes; above 800 few faces have a cut. */
const WEIGHT_STOPS = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Heavy" },
];

/* ==========================================================================
   ROWS
   ========================================================================== */

function ResetDot({ overridden, onClear }: { overridden: boolean; onClear: () => void }) {
  const t = useTranslations("components");
  if (!overridden) {
    /* A fixed-size placeholder, not `null`: without it every row's label shifts
       sideways the moment it is first overridden, and a panel of twenty rows
       twitches as you work down it. */
    return <span className="h-6 w-6 shrink-0" aria-hidden="true" />;
  }
  return (
    <Button
      size="2xs"
      variant="ghost"
      iconOnly
      className="h-6 w-6 shrink-0 text-muted-foreground"
      onClick={onClear}
      title={t("reset_to_the_shipped_value")}
      aria-label={t("reset_to_the_shipped_value")}
    >
      <RotateCcw className="h-3 w-3" aria-hidden="true" />
    </Button>
  );
}

function RowShell({
  def,
  overridden,
  onClear,
  readout,
  children,
}: {
  def: TokenDef;
  overridden: boolean;
  onClear: () => void;
  readout: string;
  children: React.ReactNode;
}) {
  /* `px-3` on the ROW, not on a wrapper around the list — that is what lets the
     `divide-y` between rows reach both edges of the panel. See the `bleed` note
     on StudioGroup. */
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            overridden ? "bg-primary" : "bg-transparent"
          )}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
          {def.label}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
          {readout}
        </span>
        <ResetDot overridden={overridden} onClear={onClear} />
      </div>
      <div className="mt-1.5 pl-3.5">{children}</div>
      {def.help ? (
        <p className="mt-1 pl-3.5 text-[11px] leading-snug text-muted-foreground">{def.help}</p>
      ) : null}
    </div>
  );
}

function SliderRow({
  def,
  value,
  overridden,
  onChange,
  onClear,
}: {
  def: TokenDef;
  value: string;
  overridden: boolean;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  const shipped = DEFAULT_BASE[def.name] ?? "";
  /* The UNIT comes from the shipped default, never from the current value: an
     owner sliding a rem token to 0 would otherwise store "0" with whatever unit
     happened to be parsed off an empty string, and the next drag would write
     the wrong one. */
  const unit = def.kind === "scale" ? "" : unitOf(shipped);
  const { min, max, step } = rangeFor(def);
  const n = numOf(value);

  return (
    <RowShell
      def={def}
      overridden={overridden}
      onClear={onClear}
      readout={def.kind === "scale" ? `${fmt(n)}×` : `${fmt(n)}${unit}`}
    >
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={n}
        onChange={(e) => onChange(`${fmt(Number(e.target.value))}${unit}`)}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-3 accent-primary"
        aria-label={def.label}
      />
    </RowShell>
  );
}

function WeightRow({
  def,
  value,
  overridden,
  onChange,
  onClear,
}: {
  def: TokenDef;
  value: string;
  overridden: boolean;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  return (
    <RowShell def={def} overridden={overridden} onClear={onClear} readout={value}>
      <div className="flex flex-wrap gap-1">
        {WEIGHT_STOPS.map((w) => (
          <button
            key={w.value}
            type="button"
            onClick={() => onChange(w.value)}
            aria-pressed={value === w.value}
            className={cn(
              "rounded-md border px-1.5 py-0.5 text-[10px] transition-colors",
              value === w.value
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-border-strong"
            )}
            style={{ fontWeight: Number(w.value) }}
          >
            {w.label}
          </button>
        ))}
      </div>
    </RowShell>
  );
}

/* ==========================================================================
   VARIANT BUNDLES
   ========================================================================== */

function PresetRow({
  presets,
  activeId,
  onApply,
  onReset,
}: {
  presets: ComponentPreset[];
  activeId: string;
  onApply: (p: ComponentPreset) => void;
  /** Omitted when nothing in the group is overridden — there is nothing to reset. */
  onReset?: () => void;
}) {
  const t = useTranslations("components");
  return (
    <div className="border-b border-border px-3 pb-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onApply(p)}
            aria-pressed={activeId === p.id}
            title={p.hint}
            className={cn(
              "rounded-md border px-2 py-1 text-[11px] transition-colors",
              activeId === p.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-border-strong"
            )}
          >
            {p.label}
          </button>
        ))}
        {/* Shown only when it applies. A permanently-visible "Custom" chip
            would read as a fifth option you can press, and it is not one —
            it is a description of where you already are. */}
        {activeId === "custom" ? (
          <span className="rounded-md border border-dashed border-border-strong px-2 py-1 text-[11px] text-muted-foreground">
            Custom
          </span>
        ) : null}
        {onReset ? (
          <Button
            size="2xs"
            variant="ghost"
            className="ms-auto h-6 px-1.5 text-[11px] text-muted-foreground"
            onClick={onReset}
          >
            {t("reset_all")}
          </Button>
        ) : null}
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        {t("a_starting_point_not_a_mode")}
      </p>
    </div>
  );
}

/* ==========================================================================
   THE PANEL
   ========================================================================== */

export function ComponentTokens({
  group,
  resolveToken,
  isOverridden,
  setToken,
  clearToken,
}: {
  group: TokenGroup;
  resolveToken: (n: string, s: Scheme) => string;
  isOverridden: (n: string, s: Scheme) => boolean;
  setToken: (n: string, s: Scheme, v: string) => void;
  clearToken: (n: string, s: Scheme) => void;
}) {
  const items = React.useMemo(() => TOKENS.filter((t) => t.group === group), [group]);

  /* Every token in these groups is theme-INDEPENDENT, so the scheme argument is
     ignored by the hook (it routes them to `base`). "light" is passed as the
     required placeholder, exactly as ShapeTypeMotion does — geometry does not
     change with the colour scheme, and offering a "row height (dark)" control
     would be a decision with no meaning. */
  const S: Scheme = "light";

  const anyOverridden = items.some((t) => isOverridden(t.name, S));
  const presets = COMPONENT_PRESETS[group] ?? [];

  /**
   * Which bundle is showing.
   *
   * A bundle matches when the overridden set is EXACTLY its keys and every one
   * resolves to its value. Both halves are needed: checking only the values
   * would report "Compact" for a theme that is Compact plus a striping change,
   * and checking only the keys would report it for a theme that moved the same
   * tokens to different numbers. "As shipped" is the empty override set, which
   * falls out of the same rule rather than being special-cased.
   */
  const activeId = React.useMemo(() => {
    const overridden = items.filter((t) => isOverridden(t.name, S)).map((t) => t.name);
    for (const p of presets) {
      const keys = Object.keys(p.values);
      if (keys.length !== overridden.length) continue;
      if (!keys.every((k) => overridden.includes(k))) continue;
      if (!keys.every((k) => resolveToken(k, S) === p.values[k])) continue;
      return p.id;
    }
    return "custom";
  }, [items, presets, isOverridden, resolveToken]);

  /* Clear the whole group first, so switching bundles cannot leave a token
     behind from the previous one. Without this, Striped -> Ruled would keep the
     stripe: Ruled does not mention it, so it would never be written over. */
  const applyPreset = React.useCallback(
    (p: ComponentPreset) => {
      for (const t of items) clearToken(t.name, S);
      for (const [name, value] of Object.entries(p.values)) setToken(name, S, value);
    },
    [items, clearToken, setToken]
  );

  /* NO GROUP HEADING HERE. `StudioShell` already prints the active section's
     label above the panel, so rendering `GROUP_LABEL[group]` too gave every
     component screen the same word twice, one under the other, with the
     second one's rule and margin adding a band of dead space above the first
     control. The label belongs to the shell; this panel starts at content. */
  return (
    <div>
      {presets.length ? (
        <PresetRow
          presets={presets}
          activeId={activeId}
          onApply={applyPreset}
          onReset={
            anyOverridden
              ? () => {
                  for (const t of items) clearToken(t.name, S);
                }
              : undefined
          }
        />
      ) : null}

      {/* Full-strength `divide-border`, not `/60`. At 60% and inset it read as
          a hairline underlining each label; at full strength and edge to edge
          it reads as the panel being divided, which is what it is. */}
      <div className="divide-y divide-border">
        {items.map((def) =>
          def.kind === "weight" ? (
            <WeightRow
              key={def.name}
              def={def}
              value={resolveToken(def.name, S)}
              overridden={isOverridden(def.name, S)}
              onChange={(v) => setToken(def.name, S, v)}
              onClear={() => clearToken(def.name, S)}
            />
          ) : (
            <SliderRow
              key={def.name}
              def={def}
              value={resolveToken(def.name, S)}
              overridden={isOverridden(def.name, S)}
              onChange={(v) => setToken(def.name, S, v)}
              onClear={() => clearToken(def.name, S)}
            />
          )
        )}
      </div>
    </div>
  );
}
