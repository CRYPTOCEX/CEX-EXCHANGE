/**
 * The site palette, expressed as TradingView widget overrides.
 * ============================================================================
 *
 * THE RULE THIS FILE ENFORCES
 * ---------------------------
 * The charting library is VENDORED (`public/lib/chart/charting_library/`), and
 * its colour parser predates CSS Color 4: named colours, `#rgb`/`#rrggbb`,
 * `rgb(r, g, b)` and `rgba(r, g, b, a)` — comma-separated, integer channels —
 * and nothing else. There is no `hsl()` branch, let alone `oklch()`.
 *
 * Every design token is a bare HSL triple, so handing one over raw, or wrapped
 * as `hsl(<triple>)`, produces a string the library cannot read. That is not a
 * cosmetic failure: `PaneModel._getBackgroundCounterColor()` calls `parseRgb()`
 * on the pane background inside the constructor, so an unparseable colour THROWS
 * out of `new TradingView.widget(...)` and the chart never renders at all.
 *
 * So every value here goes through `readTokenColor`, which resolves the live
 * token and re-serialises it into the library's dialect. A token that cannot be
 * resolved yields `null` and the key is DROPPED rather than sent — the chart
 * then keeps TradingView's own theme-matched default for that one property,
 * which is always better than taking the widget down.
 *
 * Because the resolution happens in the browser, this survives the site designer
 * changing anything: a new palette, a new colour scheme, or the tokens being
 * re-expressed in a different colour syntax entirely.
 *
 * WHY THE OVERRIDES ARE A SNAPSHOT
 * --------------------------------
 * These are plain strings handed across an iframe boundary, so `var(--card)` is
 * meaningless on the other side and nothing repaints on its own. The values have
 * to be re-read and re-applied whenever the tokens move — see the
 * `onDesignTokensChanged` subscription in `index.tsx`.
 */

import { readTokenColor, toLegacyColor } from "@/lib/color-interop";

/**
 * Assign `key` only when the token actually resolved.
 *
 * Dropping the key is the entire safety property of this module: TradingView
 * treats a missing override as "use the theme default", and treats an
 * unparseable one as a fatal error.
 */
function put(
  target: Record<string, string>,
  key: string,
  token: string,
  alpha?: number
): void {
  const color = readTokenColor(token, alpha);
  if (color !== null) target[key] = color;
}

/**
 * Chart-surface overrides: the pane, the grid, the scales, the crosshair and
 * every series style that carries a price direction.
 *
 * `--up` / `--down` are the design system's price-direction tokens and are
 * deliberately distinct from `--success` / `--destructive`, which are operation
 * status. Candles are direction, so they follow the former — the same choice the
 * chart-engine canvas makes in `styles/design-tokens.ts`.
 */
export function buildChartOverrides(): Record<string, string> {
  const o: Record<string, string> = {};

  /* --- Pane -------------------------------------------------------------
     The chart is mounted inside a card, so its ground is `--card`, not
     `--background`. `backgroundType` has to be set alongside it: with the
     gradient type selected the library reads the two gradient stops instead and
     the solid colour is ignored. */
  o["paneProperties.backgroundType"] = "solid";
  put(o, "paneProperties.background", "card");
  put(o, "paneProperties.vertGridProperties.color", "border");
  put(o, "paneProperties.horzGridProperties.color", "border");
  put(o, "paneProperties.separatorColor", "border");
  put(o, "crossHairProperties.color", "border-strong");

  /* --- Scales -----------------------------------------------------------
     There is deliberately no background key here: the library has none for the
     scales, they sit on the pane ground set above. */
  put(o, "scalesProperties.lineColor", "border");
  put(o, "scalesProperties.textColor", "muted-foreground");
  put(o, "scalesProperties.axisHighlightColor", "primary", 0.15);

  /* --- Price direction --------------------------------------------------
     Applied to every candle-shaped style, not just `candleStyle`: the style
     picker is reachable from the chart header, and a user who switches to Heikin
     Ashi or bars should not drop back to TradingView's stock green/red. */
  for (const style of [
    "candleStyle",
    "hollowCandleStyle",
    "haStyle",
    "barStyle",
    "columnStyle",
  ]) {
    put(o, `mainSeriesProperties.${style}.upColor`, "up");
    put(o, `mainSeriesProperties.${style}.downColor`, "down");
  }
  for (const style of ["candleStyle", "hollowCandleStyle", "haStyle"]) {
    put(o, `mainSeriesProperties.${style}.borderUpColor`, "up");
    put(o, `mainSeriesProperties.${style}.borderDownColor`, "down");
    put(o, `mainSeriesProperties.${style}.wickUpColor`, "up");
    put(o, `mainSeriesProperties.${style}.wickDownColor`, "down");
  }

  /* --- Directionless series styles --------------------------------------
     A line or an area plots close only, so there is no up/down to encode and the
     accent is the right colour. The area's two stops are the accent faded to
     nothing; the fade is done with alpha rather than `color-mix(…, transparent)`
     because premultiplied interpolation would drag the low stop towards black
     and put a grey fringe over a light card. */
  put(o, "mainSeriesProperties.lineStyle.color", "primary");
  put(o, "mainSeriesProperties.areaStyle.linecolor", "primary");
  put(o, "mainSeriesProperties.areaStyle.color1", "primary", 0.28);
  put(o, "mainSeriesProperties.areaStyle.color2", "primary", 0.02);
  put(o, "mainSeriesProperties.baselineStyle.topLineColor", "up");
  put(o, "mainSeriesProperties.baselineStyle.bottomLineColor", "down");
  put(o, "mainSeriesProperties.baselineStyle.topFillColor1", "up", 0.28);
  put(o, "mainSeriesProperties.baselineStyle.topFillColor2", "up", 0.02);
  put(o, "mainSeriesProperties.baselineStyle.bottomFillColor1", "down", 0.02);
  put(o, "mainSeriesProperties.baselineStyle.bottomFillColor2", "down", 0.28);

  /* --- Price lines ------------------------------------------------------
     `enabled_features` turns the high/low lines on, so they are ours to theme. */
  put(o, "mainSeriesProperties.highLowAvgPrice.highLowPriceLinesColor", "muted-foreground");
  put(o, "mainSeriesProperties.highLowAvgPrice.averagePriceLineColor", "primary");

  return o;
}

/**
 * Overrides for the studies the widget creates on its own.
 *
 * `create_volume_indicator_by_default` is enabled, so a volume pane exists on
 * every chart and is the one study worth theming from here. Its two slots are
 * indexed rather than named: `.0` is the down bar, `.1` is the up bar.
 */
export function buildStudiesOverrides(): Record<string, string> {
  const o: Record<string, string> = {};
  put(o, "volume.volume.color.0", "down");
  put(o, "volume.volume.color.1", "up");
  return o;
}

/**
 * Widget-construction options that take a colour but are NOT overrides — they
 * are read once, before the chart model exists, and cannot be changed later.
 *
 * Same parser, so the same normalisation applies. The keys are omitted when a
 * token does not resolve.
 */
export function buildChromeOptions(): {
  toolbar_bg?: string;
  loading_screen?: { backgroundColor?: string; foregroundColor?: string };
} {
  const toolbar = readTokenColor("card");
  const spinner = readTokenColor("primary");

  const loading: { backgroundColor?: string; foregroundColor?: string } = {};
  if (toolbar !== null) loading.backgroundColor = toolbar;
  if (spinner !== null) loading.foregroundColor = spinner;

  return {
    ...(toolbar !== null ? { toolbar_bg: toolbar } : {}),
    ...(Object.keys(loading).length > 0 ? { loading_screen: loading } : {}),
  };
}

/* ==========================================================================
   REPAIRING A CHART THAT WAS ALREADY POISONED
   ========================================================================== */

/**
 * The four forms the library's parser accepts. Anything else throws out of
 * `parseRgb`, so anything else is a chart that does not render.
 */
const TV_PARSEABLE =
  /^(?:#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|rgb\(\s*-?\d{1,10}\s*,\s*-?\d{1,10}\s*,\s*-?\d{1,10}\s*\)|rgba\(\s*-?\d{1,10}\s*,\s*-?\d{1,10}\s*,\s*-?\d{1,10}\s*,\s*-?\d{0,10}(?:\.\d+)?\s*\))$/;

/** Colour-valued property names. `…Type` is excluded: it holds `"solid"`. */
const COLOUR_KEY = /colou?r|background/i;
const NOT_A_COLOUR_KEY = /type$/i;

/**
 * The widget's persisted property tree, in localStorage.
 *
 * `TVSettings` prefixes every key with `"tradingview."` — or
 * `"tradingview-widget."` when the library is embedded as a widget — and the
 * chart's own tree is saved under `chartproperties` because that is the name
 * `ChartWidget` passes to `DefaultProperty`.
 */
const SAVED_PROPERTY_KEY = /^tradingview(?:-widget)?\..*(?:chartproperties|properties)$/i;

function repairColors(node: unknown, key: string): { value: unknown; changed: boolean; drop: boolean } {
  if (Array.isArray(node)) {
    let changed = false;
    const next = node.map((item) => {
      const r = repairColors(item, key);
      if (r.changed) changed = true;
      return r.drop ? null : r.value;
    });
    return { value: next, changed, drop: false };
  }

  if (node !== null && typeof node === "object") {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const r = repairColors(v, k);
      if (r.changed) changed = true;
      if (!r.drop) next[k] = r.value;
    }
    return { value: next, changed, drop: false };
  }

  if (
    typeof node !== "string" ||
    !COLOUR_KEY.test(key) ||
    NOT_A_COLOUR_KEY.test(key) ||
    TV_PARSEABLE.test(node)
  ) {
    return { value: node, changed: false, drop: false };
  }

  /* A colour the library cannot read. Re-serialising it keeps whatever the user
     or a previous build actually meant; dropping it is the last resort and only
     costs that one property its saved value. */
  const repaired = toLegacyColor(node);
  return repaired === null
    ? { value: node, changed: true, drop: true }
    : { value: repaired, changed: true, drop: false };
}

/**
 * Scrub unparseable colours out of the chart's saved properties.
 *
 * This exists because widget `overrides` are NOT the last word. The library
 * merges them into `TradingView.defaultProperties` — they are DEFAULTS — and
 * then `DefaultProperty("chartproperties")` layers the user's saved tree on top.
 * `enabled_features` turns that persistence on here, so a colour written by an
 * earlier build outranks everything this module produces and keeps throwing out
 * of the pane constructor on every load, for that browser, forever. Clearing
 * site data was the only way out.
 *
 * Runs once before the widget is constructed. It writes only when it actually
 * repaired something, so the normal case costs one parse and no write.
 */
export function repairPersistedChartColors(): void {
  if (typeof window === "undefined") return;

  let storage: Storage;
  try {
    storage = window.localStorage;
    if (!storage) return;
  } catch {
    /* Blocked by the privacy settings of the browser — nothing to repair. */
    return;
  }

  try {
    /* Indexed access rather than `Object.keys`: `Storage` exposes its keys as
       named properties through a proxy, and not every implementation makes them
       own-enumerable. `length`/`key(i)` is the interface every one of them has.
       Snapshot the keys first — the loop writes back into the same store. */
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null) keys.push(key);
    }

    for (const key of keys) {
      if (!SAVED_PROPERTY_KEY.test(key)) continue;

      const raw = storage.getItem(key);
      if (!raw || raw[0] !== "{") continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }

      const result = repairColors(parsed, "");
      if (result.changed) storage.setItem(key, JSON.stringify(result.value));
    }
  } catch (error) {
    /* Never let housekeeping be the reason the chart does not mount. */
    console.warn("TradingView saved-colour repair skipped:", error);
  }
}
