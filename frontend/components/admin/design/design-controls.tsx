"use client";

/**
 * The editing surface: presets, the seed studio, per-token pickers, and the
 * non-colour axes.
 *
 * Ordered by how much of the site each control moves. A preset changes
 * everything; a seed changes a whole coherent palette; an individual token
 * changes one thing. Putting the individual pickers first — which is what a
 * "theme editor" usually does — is what produces incoherent sites, because it
 * invites the owner to start from the detail.
 */

import * as React from "react";
import {
  Activity,
  Bell,
  Check,
  CreditCard,
  LayoutGrid,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Type as TypeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  FONT_SLOTS,
  FONT_STACKS,
  GROUP_LABEL,
  ICON_SHAPE_TOKENS,
  TOKENS,
  deriveIconGeometry,
  type TokenDef,
  type TokenGroup,
} from "@/lib/design-theme";
import { hexToHslTriple, hslTripleToHex } from "@/lib/design-contrast";
import {
  DEFAULT_SEED,
  PRESETS,
  SHIPPED_PRESET_ID,
  generatePalette,
  type PaletteSeed,
  type Preset,
} from "@/lib/design-palette";
import { DEFAULT_THEMED } from "@/lib/design-theme-defaults";
import type { Scheme } from "./use-design-draft";
import { useTranslations } from "next-intl";

/* ==========================================================================
   PRESETS
   ========================================================================== */

/** A preset's identity in four swatches, generated from its own seed. */
function PresetChip({
  preset,
  active,
  scheme,
  onPick,
}: {
  preset: Preset;
  active: boolean;
  scheme: Scheme;
  onPick: () => void;
}) {
  /* Obsidian's swatches come from the SHIPPED defaults, not from the generator.
     Running its seed through `generatePalette` produces a near-miss (73 of 80
     values differ), so a generated chip would have advertised a palette the
     preset does not actually apply. */
  const p = React.useMemo(() => {
    if (preset.id === SHIPPED_PRESET_ID) {
      const out: Record<string, string> = {};
      for (const [name, pair] of Object.entries(DEFAULT_THEMED)) out[name] = pair[scheme];
      return out;
    }
    return generatePalette(preset.seed)[scheme];
  }, [preset.id, preset.seed, scheme]);
  const swatches = ["--background", "--card", "--primary", "--success"];

  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        /* `rounded-lg` is `var(--radius)`, the radius the design system names —
           `rounded-xl` was a shell that did not follow its own spec. `p-2.5`
           and the smaller swatches below are the compact pass: this is 8 cards
           in a 340px rail, and at the old size only three fitted on screen. */
        "group relative w-full overflow-hidden rounded-lg border p-2.5 text-start transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-border-strong"
      )}
      aria-pressed={active}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        {swatches.map((name) => (
          <span
            key={name}
            className="h-5 w-5 rounded-md border border-border"
            style={{ background: hslTripleToHex(p[name]) ?? undefined }}
          />
        ))}
        <span
          className="ms-auto rounded border border-border px-1.5 py-0.5 text-[10px] text-subtle-foreground"
          style={{ borderRadius: preset.radius }}
        >
          {preset.radius}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-foreground">{preset.label}</span>
        {active ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
      </div>
      {/* Clamped: the blurbs run to four lines and turned an 8-card gallery
          into a page of scrolling. Two lines is enough to tell them apart, and
          the full text stays available to a pointer and to assistive tech. */}
      <p
        className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground"
        title={preset.blurb}
      >
        {preset.blurb}
      </p>
    </button>
  );
}

export function PresetGallery({
  activeId,
  scheme,
  onApply,
}: {
  activeId?: string;
  scheme: Scheme;
  onApply: (p: Preset) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PRESETS.map((p) => (
        <PresetChip
          key={p.id}
          preset={p}
          scheme={scheme}
          active={activeId === p.id}
          onPick={() => onApply(p)}
        />
      ))}
    </div>
  );
}

/* ==========================================================================
   SEED STUDIO
   ========================================================================== */

function SeedSlider({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  gradient,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  gradient?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-xs font-medium text-foreground">{label}</label>
        <span className="font-mono text-[11px] tabular-nums text-subtle-foreground">
          {value}
          {suffix}
        </span>
      </div>
      {gradient ? (
        <div
          className="h-2 w-full rounded-full border border-border"
          style={{ background: gradient }}
          aria-hidden
        />
      ) : null}
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        aria-label={label}
      />
      {hint ? <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const HUE_BAR =
  "linear-gradient(to right, hsl(0 90% 50%), hsl(60 90% 50%), hsl(120 90% 50%), hsl(180 90% 50%), hsl(240 90% 50%), hsl(300 90% 50%), hsl(360 90% 50%))";

export function SeedStudio({
  seed,
  onSeedChange,
  onGenerate,
}: {
  seed: PaletteSeed;
  onSeedChange: (s: PaletteSeed) => void;
  onGenerate: () => void;
}) {
  const t = useTranslations("components");
  const set = (patch: Partial<PaletteSeed>) => onSeedChange({ ...seed, ...patch });

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("move_a_seed_and_the_whole")}
      </p>

      <SeedSlider
        label={t("brand_hue")}
        value={seed.accentHue}
        min={0}
        max={360}
        gradient={HUE_BAR}
        suffix="°"
        onChange={(v) => set({ accentHue: v })}
        hint={t("the_accent_means_interactive_it_keeps")}
      />
      <SeedSlider
        label={t("brand_intensity")}
        value={seed.accentSat}
        min={20}
        max={100}
        suffix="%"
        gradient={`linear-gradient(to right, hsl(${seed.accentHue} 20% 50%), hsl(${seed.accentHue} 100% 50%))`}
        onChange={(v) => set({ accentSat: v })}
      />
      <SeedSlider
        label={t("neutral_hue")}
        value={seed.neutralHue}
        min={0}
        max={360}
        gradient={HUE_BAR}
        suffix="°"
        onChange={(v) => set({ neutralHue: v })}
        hint={t("greys_biased_toward_a_hue_read")}
      />
      <SeedSlider
        label={t("neutral_tint")}
        value={seed.neutralChroma}
        min={0}
        max={40}
        suffix="%"
        gradient={`linear-gradient(to right, hsl(${seed.neutralHue} 0% 60%), hsl(${seed.neutralHue} 40% 60%))`}
        onChange={(v) => set({ neutralChroma: v })}
        hint={t("above_about_12_the_surfaces_stop")}
      />
      <SeedSlider
        label={t("light_page")}
        value={seed.lightBase}
        min={88}
        max={99}
        step={0.1}
        suffix="%"
        onChange={(v) => set({ lightBase: v })}
        hint={t("cards_are_pure_white_so_the")}
      />
      <SeedSlider
        label={t("dark_page")}
        value={seed.darkBase}
        min={2}
        max={16}
        step={0.5}
        suffix="%"
        onChange={(v) => set({ darkBase: v })}
      />
      <SeedSlider
        label={t("chart_spread")}
        value={seed.chartSpread ?? 58}
        min={20}
        max={90}
        suffix="°"
        onChange={(v) => set({ chartSpread: v })}
        hint={t("how_far_apart_the_six_series")}
      />

      <div className="flex gap-2">
        <Button size="sm" className="gap-1.5" onClick={onGenerate}>
          <Sparkles className="h-3.5 w-3.5" />
          {t("generate_palette")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => onSeedChange(DEFAULT_SEED)}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t("reset_seeds")}
        </Button>
      </div>
    </div>
  );
}

/* ==========================================================================
   TOKENS
   ========================================================================== */

function ColorRow({
  def,
  scheme,
  value,
  overridden,
  onChange,
  onClear,
}: {
  def: TokenDef;
  scheme: Scheme;
  value: string;
  overridden: boolean;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  const t = useTranslations("components");
  const hex = hslTripleToHex(value) ?? "#000000";
  const id = `tok-${def.name.replace(/^--/, "")}-${scheme}`;

  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <label htmlFor={id} className="relative h-7 w-7 shrink-0 cursor-pointer">
        <span
          className="block h-full w-full rounded-md border border-border"
          style={{ background: hex }}
        />
        <input
          id={id}
          type="color"
          value={hex}
          onChange={(e) => {
            const triple = hexToHslTriple(e.target.value);
            if (triple) onChange(triple);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-medium text-foreground">{def.label}</span>
          {overridden ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" title={t("changed_from_the_shipped_value")} />
          ) : null}
        </div>
        <span className="block truncate font-mono text-[10px] text-subtle-foreground">
          {def.name}
        </span>
      </div>
      {overridden ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 shrink-0 p-0"
          onClick={onClear}
          aria-label={t("reset", { label: String(def.label) })}
          title={t("back_to_the_shipped_value")}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  );
}

export function TokenGrid({
  scheme,
  resolveToken,
  isOverridden,
  setToken,
  clearToken,
}: {
  scheme: Scheme;
  resolveToken: (n: string, s: Scheme) => string;
  isOverridden: (n: string, s: Scheme) => boolean;
  setToken: (n: string, s: Scheme, v: string) => void;
  clearToken: (n: string, s: Scheme) => void;
}) {
  const tComponents = useTranslations("components");
  const groups: TokenGroup[] = ["brand", "surface", "status", "market", "depth", "chart"];

  /* Padding lives on the ROWS and on the headings, never on a wrapper, so every
     rule in this list runs the full width of the panel. Same reasoning as the
     `bleed` note on StudioGroup, and the same shape as the trade workspace
     lists. The container is `bleed` at the call site. */
  return (
    <div className="space-y-5">
      <p className="px-3 text-xs leading-relaxed text-muted-foreground">
        {tComponents("individual_overrides_a_dot_marks_a")}
      </p>
      {groups.map((group) => {
        const items = TOKENS.filter((t) => t.group === group && t.kind === "color");
        if (!items.length) return null;
        return (
          <section key={group}>
            <h4 className="mb-1 border-b border-border px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              {GROUP_LABEL[group]}
            </h4>
            <div className="divide-y divide-border">
              {items.map((def) => (
                <ColorRow
                  key={def.name}
                  def={def}
                  scheme={scheme}
                  value={resolveToken(def.name, scheme)}
                  overridden={isOverridden(def.name, scheme)}
                  onChange={(v) => setToken(def.name, scheme, v)}
                  onClear={() => clearToken(def.name, scheme)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   SHAPE, TYPE, MOTION
   ========================================================================== */

const RADIUS_STOPS = [
  { value: "0px", label: "Square" },
  { value: "0.125rem", label: "2px" },
  { value: "0.25rem", label: "4px" },
  { value: "0.375rem", label: "6px" },
  { value: "0.5rem", label: "8px" },
  { value: "0.625rem", label: "10px" },
  { value: "0.75rem", label: "12px" },
  { value: "0.875rem", label: "14px" },
  { value: "1rem", label: "16px" },
];

const SPEED_STOPS = [
  { value: "0", label: "Off", hint: "No transitions at all." },
  { value: "0.5", label: "Fast", hint: "Twice as quick as shipped." },
  { value: "0.75", label: "Brisk", hint: "" },
  { value: "1", label: "Default", hint: "The shipped timing." },
  { value: "1.3", label: "Relaxed", hint: "" },
  { value: "1.8", label: "Slow", hint: "Deliberate and cinematic." },
];

/**
 * Icon corner treatment.
 *
 * `--radius` only ever reached BOXES, so a site set to square corners still had
 * soft iconography sitting inside it. These modes carry the same decision into
 * the artwork — see `deriveIconGeometry` for why the join steps once instead of
 * easing (SVG has three join keywords and no continuum between them).
 *
 * "Follow radius" is not a stored value: it CLEARS all three so the derivation
 * applies. That is why the mode is detected from `isOverridden` rather than from
 * the resolved values — a pinned "round" and a derived "round" read identically
 * but behave differently the moment the radius moves.
 */
const ICON_SHAPE_MODES: {
  id: string;
  label: string;
  hint: string;
  values: Record<string, string> | null;
}[] = [
  {
    id: "follow",
    label: "Follow radius",
    hint: "Icons take their corners from the radius above. Square interface, square icons.",
    values: null,
  },
  {
    id: "round",
    label: "Rounded",
    hint: "The icon set as drawn — soft joins, round line ends.",
    values: { "--icon-join": "round", "--icon-cap": "round", "--icon-radius-scale": "1" },
  },
  {
    id: "bevel",
    label: "Bevelled",
    hint: "Cut corners and square ends. Engineered rather than friendly.",
    values: { "--icon-join": "bevel", "--icon-cap": "square", "--icon-radius-scale": "0.5" },
  },
  {
    id: "sharp",
    label: "Sharp",
    hint: "Mitred corners and flat ends. The drafting-table look.",
    values: { "--icon-join": "miter", "--icon-cap": "butt", "--icon-radius-scale": "0" },
  },
];

/* Chosen to exercise all three levers at once: LayoutGrid and CreditCard are
   built from rects (rx 1 and 2, so the scale shows), TrendingUp is a polyline
   whose corners are joins, and Activity is one long path that is almost all
   line ends. If a mode looks identical across these four, it is not working. */
const ICON_SPECIMENS = [LayoutGrid, CreditCard, TrendingUp, Activity, Bell];

export function ShapeTypeMotion({
  resolveToken,
  isOverridden,
  setToken,
  clearToken,
  fonts,
  setFont,
}: {
  resolveToken: (n: string, s: Scheme) => string;
  isOverridden: (n: string, s: Scheme) => boolean;
  setToken: (n: string, s: Scheme, v: string) => void;
  clearToken: (n: string, s: Scheme) => void;
  fonts: Record<string, string>;
  setFont: (slot: string, id: string) => void;
}) {
  const t = useTranslations("components");
  const radius = resolveToken("--radius", "light");
  const speed = resolveToken("--motion-scale", "light");

  /* Which icon mode is active. "Follow radius" is the absence of overrides, not
     a value, so it is detected from `isOverridden` — a pinned "round" and a
     derived "round" resolve identically but behave differently the moment the
     radius moves, and the panel has to tell the owner which one they have. */
  const iconPinned = ICON_SHAPE_TOKENS.some((n) => isOverridden(n, "light"));
  const iconMode = iconPinned
    ? ICON_SHAPE_MODES.find(
        (m) => m.values && ICON_SHAPE_TOKENS.every((n) => resolveToken(n, "light") === m.values![n])
      )?.id ?? "custom"
    : "follow";

  /**
   * The specimen row paints ITSELF.
   *
   * It used to rely on the panel's own document carrying the draft, which was
   * true when this was a standalone page that always themed itself. In the
   * studio that is an opt-in behind the overflow menu and off by default — so
   * the five icons directly beneath the four buttons sat at the SAVED geometry
   * no matter which button was pressed. Measured: the preview frame went
   * round -> bevel -> miter correctly while these stayed round throughout,
   * which is indistinguishable from a dead control.
   *
   * Declaring the three custom properties on the row makes it correct by
   * construction: custom properties inherit, the globals.css `svg` rules read
   * exactly these names, and an inline declaration outranks every layer. The
   * specimens now answer the question they exist to answer, whatever the rest
   * of the page is doing.
   *
   * `deriveIconGeometry` and not `resolveToken` for the unpinned case: the
   * draft stores nothing in "Follow radius" mode, so reading the tokens gives
   * the SHIPPED values rather than the ones the radius implies. That is the
   * same derivation `themeToResolvedVars` runs for the real site, so the row
   * and the site cannot disagree.
   */
  const iconVars = React.useMemo(() => {
    const vars = iconPinned
      ? Object.fromEntries(ICON_SHAPE_TOKENS.map((n) => [n, resolveToken(n, "light")]))
      : deriveIconGeometry(radius);
    return vars as unknown as React.CSSProperties;
  }, [iconPinned, radius, resolveToken]);

  /* What the row is actually drawing, spelled out. At the shipped 4px radius
     "Follow radius" and "Rounded" resolve to the SAME three values — without
     this readout the two buttons look like a bug rather than like a genuine
     coincidence that stops being one the moment the radius moves. */
  const effectiveIcon: Record<string, string> = iconPinned
    ? {
        "--icon-join": resolveToken("--icon-join", "light"),
        "--icon-cap": resolveToken("--icon-cap", "light"),
        "--icon-radius-scale": resolveToken("--icon-radius-scale", "light"),
      }
    : deriveIconGeometry(radius);

  return (
    <div className="space-y-6">
      <section>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
          {t("corner_radius")}
        </h4>
        <p className="mb-2 text-[11px] leading-snug text-muted-foreground">
          {t("one_anchor_drives_the_whole_ramp")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {RADIUS_STOPS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setToken("--radius", "light", r.value)}
              className={cn(
                "flex h-12 w-12 flex-col items-center justify-center gap-1 border text-[10px] transition-colors",
                radius === r.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-border-strong"
              )}
              style={{ borderRadius: r.value }}
              aria-pressed={radius === r.value}
            >
              <span
                className="h-4 w-4 border border-current opacity-60"
                style={{ borderRadius: r.value }}
              />
              {r.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
          {t("icon_corners")}
        </h4>
        <p className="mb-2 text-[11px] leading-snug text-muted-foreground">
          The radius above rounds boxes. This rounds the drawing inside them —
          stroke joins, line ends, the corners lucide builds into its rectangles,
          and the mock-UI panels in the landing illustrations. It cannot reach a{" "}
          <code className="font-mono text-[10px]">.svg</code> loaded as an image
          file: those are separate documents and inherit nothing.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ICON_SHAPE_MODES.map((m) => (
            <Button
              key={m.id}
              size="sm"
              variant={iconMode === m.id ? "default" : "outline"}
              className="h-8"
              title={m.hint}
              onClick={() => {
                if (!m.values) {
                  for (const n of ICON_SHAPE_TOKENS) clearToken(n, "light");
                  return;
                }
                for (const [n, v] of Object.entries(m.values)) setToken(n, "light", v);
              }}
            >
              {m.label}
            </Button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          {ICON_SHAPE_MODES.find((m) => m.id === iconMode)?.hint ??
            t("pinned_to_values_no_preset_matches")}
        </p>
        {/* Real icons, not a mockup, painted by the three custom properties
            declared right here — the same names the site's own `svg` rules
            read. If the specimens do not move, the site will not either. */}
        <div
          className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
          style={iconVars}
        >
          {ICON_SPECIMENS.map((Specimen, i) => (
            <Specimen key={i} className="h-9 w-9 text-foreground" strokeWidth={2} />
          ))}
        </div>
        <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-subtle-foreground">
          {(
            [
              ["joins", "--icon-join"],
              ["ends", "--icon-cap"],
              ["artwork corners", "--icon-radius-scale"],
            ] as const
          ).map(([label, name]) => (
            <span key={name} className="inline-flex gap-1">
              <dt>{label}</dt>
              <dd className="font-mono text-foreground">
                {effectiveIcon[name] ?? "—"}
                {name === "--icon-radius-scale" ? "×" : ""}
              </dd>
            </span>
          ))}
          {!iconPinned ? <span className="italic">{t("derived_from")} {radius}</span> : null}
        </dl>
      </section>

      <section>
        <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
          <TypeIcon className="h-3 w-3" />
          Typeface
        </h4>
        {FONT_SLOTS.map((slot) => {
          const options = Object.values(FONT_STACKS).filter((f) =>
            slot.categories.includes(f.category as never)
          );
          const current = fonts[slot.key] ?? (slot.key === "sans" ? "geist" : "jetbrains");
          return (
            <div key={slot.key} className="mb-3">
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-xs font-medium text-foreground">{slot.label}</span>
                <span className="text-[11px] text-muted-foreground">{slot.help}</span>
              </div>
              <div className="space-y-1">
                {options.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFont(slot.key, f.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors",
                      current === f.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-border-strong"
                    )}
                    aria-pressed={current === f.id}
                  >
                    <span
                      className="shrink-0 text-base leading-none text-foreground"
                      style={{ fontFamily: f.stack }}
                    >
                      Ag
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {f.label}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {f.note}
                      </span>
                    </span>
                    {current === f.id ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
          Motion
        </h4>
        {/* This copy used to read "a multiplier on every transition and delay in
            the platform", which over-promised. Measured: the scale reaches all
            792 `duration-*` / `delay-*` utilities and every bare `transition`,
            i.e. essentially all hover and state feedback — but NOT the 1,989
            framer-motion elements, which animate from JavaScript numbers and
            cannot read a CSS variable.

            Forcing them into line via `MotionConfig transition={{ duration }}`
            was considered and rejected: framer-motion chooses defaults PER
            PROPERTY (a spring for transforms, a 0.3s ease otherwise, 0.8s for
            multi-keyframe), and a blanket duration replaces all of that, turning
            every spring in the product into a flat tween. That is a much larger
            behavioural change than the inconsistency it would fix. */}
        <p className="mb-2 text-[11px] leading-snug text-muted-foreground">
          {t("multiplies_every_css_transition_and_delay")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SPEED_STOPS.map((s) => (
            <Button
              key={s.value}
              size="sm"
              variant={speed === s.value ? "default" : "outline"}
              className="h-8"
              onClick={() => setToken("--motion-scale", "light", s.value)}
              title={s.hint}
            >
              {s.label}
              <span className="ml-1.5 font-mono text-[10px] opacity-60">{s.value}</span>
            </Button>
          ))}
        </div>
      </section>

    </div>
  );
}
