import type { Section, Row, Column, Element } from "@/types/builder";
import { generateId } from "@/store/builder-store";

/**
 * Deep-clone a section template and regenerate every internal id so the same
 * template can be inserted multiple times into a page without id collisions.
 * The top-level `section.id` is preserved as the stable template slug for
 * bookkeeping, but a fresh runtime id is set on the returned copy.
 */
export function freshenIds(section: Section): Section {
  const freshElement = (el: Element): Element => ({
    ...el,
    id: generateId("element"),
    children: el.children?.map(freshElement),
  });

  const freshColumn = (col: Column): Column => ({
    ...col,
    id: generateId("column"),
    elements: col.elements.map(freshElement),
    rows: col.rows?.map(freshRow),
  });

  const freshRow = (row: Row): Row => ({
    ...row,
    id: generateId("row"),
    columns: row.columns.map(freshColumn),
  });

  return {
    ...section,
    id: generateId("section"),
    rows: section.rows.map(freshRow),
  };
}

/* ==========================================================================
   COLOUR — how these values actually reach the DOM
   ==========================================================================

   Everything below is copied verbatim into page content and persisted, then
   read back by TWO different renderers with DIFFERENT capabilities:

     - edit canvas   components/canvas/structure/{section,row,column}.tsx
     - published     components/renderers/section-renderer.tsx  (also used by
                     app/[locale]/page.tsx and app/[locale]/[pageId]/page.tsx)

   Both decide what to do with a colour by asking `value.includes("-")`:
   a hyphen means "Tailwind class name", no hyphen means "literal CSS colour".
   That single heuristic dictates every choice in this file:

   1. `hsl(var(--token))` as a section/row/column/element colour is DROPPED.
      It contains a hyphen, so it is routed to the class branch and emitted as
      `bg-hsl(var(--token))` — not a class Tailwind will ever generate. Do not
      use that form here. (The button renderer is the exception, see 4.)

   2. A `{ light, dark }` object is DROPPED on elements. `getComprehensiveElementStyle`
      only reads `settings.color` / `settings.backgroundColor` when they are
      STRINGS, and `getComprehensiveClasses` only emits a class when the value
      contains a hyphen — a hex pair satisfies neither. Every
      `color: { light: "#ffffff", dark: "#ffffff" }` in these templates painted
      NOTHING: the text inherited `--foreground` and went near-black on hero
      gradients in light mode. That was the real "theme-locked" bug.

   3. A `{ light, dark }` object is also dropped on SECTIONS in the published
      renderer: `getStructureStyle()` is spread AFTER the resolved value and
      re-assigns the raw object, so the style lands as `[object Object]` and
      CSSOM discards it. Rows and columns spread it first, so they survive.

   4. So the one form that is theme-following AND paints in both renderers is
      a Tailwind ARBITRARY-VALUE FRAGMENT: `"[hsl(var(--card))]"`, which the
      renderer turns into `bg-[hsl(var(--card))]` / `text-[hsl(var(--card))]`.
      It is a class, so the `.dark` fork happens in CSS — which also sidesteps
      the renderers' `theme === "dark"` checks, wrong whenever the site theme
      is "system". Tailwind only compiles a class it has SEEN, and the class is
      assembled at runtime, so every one of them is listed in
      `tailwindSafelist` below. Delete an entry and that colour silently stops
      painting.

   5. Exceptions, both verified against the renderers:
        - buttons (`ButtonElement`) pass strings straight to inline style, so
          they need REAL css: use the `css*` values below.
        - element `borderColor` has no class branch at all, and `DividerElement`
          interpolates `color` into a `border-bottom` shorthand. Both are
          literal-only — hence the translucent hairline in `border`.

   Palette is Obsidian (plans/DESIGN-SYSTEM.md). Nothing here re-steps a
   token; the literals that remain are for grounds that are deliberately the
   same in both themes, and are chosen so their pinned ink clears 4.5:1.
   ========================================================================== */

/**
 * Classes the renderers assemble at runtime (`bg-${value}` / `text-${value}`).
 * Tailwind's scanner never sees those interpolations, so the finished class
 * names have to appear literally somewhere it does look — here. This array is
 * intentionally unused at runtime; it exists to be scanned.
 */
export const tailwindSafelist = [
  // grounds — section / row / column / element backgroundColor
  "bg-[hsl(var(--background))]",
  "bg-[hsl(var(--card))]",
  "bg-[hsl(var(--surface-2))]",
  "bg-[hsl(var(--surface-3))]",
  "bg-[hsl(var(--popover))]",
  "bg-[hsl(var(--primary))]",
  "bg-[hsl(var(--primary)/0.10)]",
  "bg-[hsl(var(--success))]",
  "bg-[hsl(var(--warning))]",
  "bg-[hsl(var(--destructive))]",
  "bg-[hsl(var(--info))]",
  "bg-[hsl(var(--chart-4))]",
  "bg-[hsl(var(--card)/0.72)]",
  // ink — element color
  "text-card-foreground",
  "text-muted-foreground",
  "text-subtle-foreground",
  "text-primary-foreground",
  "text-[hsl(var(--background))]",
  "text-[hsl(var(--primary))]",
  "text-[hsl(var(--success))]",
  "text-[hsl(var(--warning))]",
  "text-[hsl(var(--destructive))]",
  "text-[hsl(var(--info))]",
  "text-[hsl(var(--chart-4))]",
] as const;

export const theme = {
  /* ---- Grounds. Theme-following; emitted as `bg-<value>`. ---------------- */
  bgBase: "[hsl(var(--background))]",
  bgSubtle: "[hsl(var(--surface-2))]",
  bgMuted: "[hsl(var(--surface-3))]",
  bgCard: "[hsl(var(--card))]",
  bgElevated: "[hsl(var(--popover))]",
  /** Soft brand tint. Ink on it must stay `text`/`textMuted`, never pinned. */
  primarySoft: "[hsl(var(--primary)/0.10)]",
  glass: "[hsl(var(--card)/0.72)]",

  /* ---- Ink. Theme-following; emitted as `text-<value>`. ------------------
     `card-foreground` is byte-identical to `--foreground` in both themes and
     is used because the renderer's hyphen test rejects the single-word
     `foreground`. Ratios on `--background` / `--card`:
       text       17.29 / 18.75 light   16.85 / 16.03 dark
       textMuted   5.63 /  6.10 light    7.84 /  7.46 dark
       textDim     4.35 /  4.72 light    5.54 /  5.27 dark
     The accent inks below inherit the platform's own token contrast; see the
     note on `--success`/`--warning` in DESIGN-SYSTEM.md. Use them for large
     text, numerals and UI graphics (>=3:1 everywhere), not for body copy. */
  text: "card-foreground",
  textMuted: "muted-foreground",
  textDim: "subtle-foreground",
  primary: "[hsl(var(--primary))]",
  emerald: "[hsl(var(--success))]",
  amber: "[hsl(var(--warning))]",
  rose: "[hsl(var(--destructive))]",
  sky: "[hsl(var(--info))]",
  violet: "[hsl(var(--chart-4))]",
  /** Ink for a `primary` ground — forks white -> near-black with the theme. */
  primaryText: "primary-foreground",
  /** Ink for an inverted (page-background) chip sitting on a dark band. */
  bgBaseInk: "[hsl(var(--background))]",

  /* ---- Borders. Literal only (no class branch exists). -------------------
     A translucent slate hairline resolves to #dadfe6 on white (token
     `--border` is #dce4ee) and #2b333e on the dark card (token
     `--border-strong` is #2a3542), so it reads as the intended hairline in
     both themes without a theme fork the renderer would ignore. */
  border: "rgba(124,141,166,0.28)",
  borderStrong: "rgba(124,141,166,0.45)",

  /* ---- Real CSS colours. ONLY for buttons + dividers, which bypass the
     class branch and put the string straight into inline style. ----------- */
  cssPrimary: "hsl(var(--primary))",
  cssPrimaryInk: "hsl(var(--primary-foreground))",
  cssSuccess: "hsl(var(--success))",
  cssSuccessInk: "hsl(var(--success-foreground))",
  cssWarning: "hsl(var(--warning))",
  cssDestructive: "hsl(var(--destructive))",
  cssInfo: "hsl(var(--info))",
  cssViolet: "hsl(var(--chart-4))",
  cssForeground: "hsl(var(--foreground))",
  cssMutedInk: "hsl(var(--muted-foreground))",
  cssDimInk: "hsl(var(--subtle-foreground))",
  cssBackground: "hsl(var(--background))",
  cssCard: "hsl(var(--card))",
  cssSurface2: "hsl(var(--surface-2))",
  cssSurface3: "hsl(var(--surface-3))",
  cssPopover: "hsl(var(--popover))",
  cssPrimarySoft: "hsl(var(--primary) / 0.10)",
  cssBorder: "hsl(var(--border))",

  /* ---- Deliberate bands. Identical in both themes ON PURPOSE (a dark CTA
     slab stays a dark slab on a light page), so their ink is pinned below.
     `bandInk` is `--overlay`; every `band*` hue is the Obsidian token's own
     hue/saturation held at the lightness where the DIMMEST pinned ink
     (`onBandDim`) still clears 4.5:1 — see the ratios on `onBand*`. ------- */
  bandInk: "#0a1220",
  bandPrimary: "#1050b0",
  bandSuccess: "#086043",
  bandWarning: "#714c13",
  bandDestructive: "#a31f2c",
  bandInfo: "#095c71",
  bandViolet: "#6c3e9b",

  /* ---- Pinned ink for the bands and gradients above. Ratios are the WORST
     case across every `band*` value (bandDestructive):
       onBand       7.51 – 20.04
       onBandMuted  5.50 – 13.32
       onBandDim    4.55 – 10.30
     All three clear 4.5:1 on every band, in both themes, because the ground
     does not move. `onBandFill` / `onBandBorder` are decorative surfaces, not
     ink.

     These five stay LITERAL, and it is worth writing down why, because the
     names invite the opposite conclusion. The ground was checked: every
     consumer does sit on a pinned dark band or gradient, so the white is
     correct and the only thing missing is a token — `--overlay-foreground` is
     white in both themes and would be an exact swap. It still cannot be used,
     for a structural reason, not a stylistic one:

       every `var(--x)` reference contains a hyphen, and rule 1 at the top of
       this file is decided on exactly that character.

     Concretely, in components/renderers/elements/index.tsx:
       - `borderColor` has NO class branch — line 210 only assigns the inline
         style when `!value.includes("-")`, so `hsl(var(--overlay-foreground)/
         0.20)` is dropped outright and the border disappears. `onBandBorder`
         and `onBandFill` are both used as `borderColor` (glass-cards,
         live-chart-hero, api-documentation-cta, start-staking-cta, …).
       - `color` / `backgroundColor` DO have a class branch, but it emits
         `text-${value}` — i.e. `text-hsl(var(--overlay-foreground)/0.82)`,
         which Tailwind never generates, and the inline branch has already
         skipped it for the same hyphen. `onBandMuted` / `onBandDim` are used
         as element `color` throughout.
       - the bracket-fragment escape hatch (rule 4, `"[hsl(var(--card))]"`)
         fixes the class branch but breaks the OTHER call sites: these same
         four constants are interpolated raw into `style="color:${…}"` /
         `border:1px solid ${…}` inside HTML content strings (terminal-code,
         api-documentation-cta, become-a-master-trader, live-copying-counter,
         one-click-follow-cta), where `[hsl(…)]` is not a CSS value.

     One constant, two branches with opposite requirements: no single string
     satisfies both. Making these panel-reachable means changing the renderer's
     hyphen heuristic (or splitting each name into a class form and a CSS
     form and updating ~40 templates), not editing this line.
     ------------------------------------------------------------------ */
  onBand: "#ffffff",
  onBandMuted: "rgba(255,255,255,0.82)",
  onBandDim: "rgba(255,255,255,0.72)",
  onBandBorder: "rgba(255,255,255,0.20)",
  onBandFill: "rgba(255,255,255,0.12)",

  /* The INVERSE pairing: a bright button or chip sitting ON a dark band, and
     the ink that goes on it. `onBand*` covers light-ink-on-dark; this covers
     dark-ink-on-light, which the CTA sections need for their primary button and
     which previously had no name — so every one of them carried a raw
     `backgroundColor: "#ffffff"` / `color: "#0f172a"` pair.

     These stay literal CSS on purpose. `ButtonElement` passes settings straight
     into an inline style with no class branch, and the band they sit on is
     pinned dark in both themes, so a theme-following token here would go light
     on light. Measured: #0f172a on #ffffff is 17.4:1. */
  onBandSurface: "#ffffff",
  onBandSurfaceInk: "#0f172a",

  overlay: "rgba(10,18,32,0.60)",
} as const;

/* -------------------------------------------------------------------------- */
/* Gradients — deliberately dark bands                                        */
/* -------------------------------------------------------------------------- */

/**
 * Gradients are the one colour form that survives BOTH renderers intact:
 * `gradientToCss()` accepts any explicit CSS colour and emits a real inline
 * `background-image: linear-gradient(...)`, which nothing downstream clobbers.
 *
 * They are pinned — identical in light and dark — on purpose. A hero band is a
 * design element, not page surface, and pinning the ground is what makes it
 * safe to pin the ink on top of it (`theme.onBand*`). The previous light/dark
 * forks were pointless anyway: the renderers pick the fork from
 * `useTheme().theme`, which is the literal string "system" whenever the site
 * theme is System, and every one of them then silently fell back to `light`.
 *
 * Every stop is dark enough that `onBandDim` (the dimmest pinned ink) still
 * clears 4.5:1 over it.
 */
export const gradients = {
  /** Brand. `--primary` hue, deepened toward `--overlay`. */
  indigoViolet: {
    type: "gradient" as const,
    gradient: {
      direction: "to-br",
      from: "#0a1220",
      via: "#0d3470",
      to: "#1050b0",
    },
  },
  /** Growth / staking. `--info` -> `--success` hues. */
  skyEmerald: {
    type: "gradient" as const,
    gradient: {
      direction: "to-br",
      from: "#095c71",
      to: "#086043",
    },
  },
  /** Alert / sale. `--warning` -> `--destructive` hues. */
  amberRose: {
    type: "gradient" as const,
    gradient: {
      direction: "to-br",
      from: "#714c13",
      to: "#a31f2c",
    },
  },
  /** Neutral slab — the Obsidian surface ramp, held dark in both themes. */
  nightSky: {
    type: "gradient" as const,
    gradient: {
      direction: "to-br",
      from: "#06080c",
      via: "#12181f",
      to: "#06080c",
    },
  },
  /** Multi-hue accent. `--success` -> `--info` -> `--chart-4`. */
  aurora: {
    type: "gradient" as const,
    gradient: {
      direction: "to-tr",
      from: "#086043",
      via: "#095c71",
      to: "#6c3e9b",
    },
  },
} as const;

/* -------------------------------------------------------------------------- */
/* Common settings presets                                                    */
/* -------------------------------------------------------------------------- */

export const sectionPresets = {
  /** Generous hero padding */
  hero: {
    paddingTop: 120,
    paddingBottom: 120,
    paddingLeft: 24,
    paddingRight: 24,
  } as Record<string, number>,
  /** Standard content section padding */
  standard: {
    paddingTop: 96,
    paddingBottom: 96,
    paddingLeft: 24,
    paddingRight: 24,
  } as Record<string, number>,
  /** Compact band (CTA, logo-cloud) */
  compact: {
    paddingTop: 64,
    paddingBottom: 64,
    paddingLeft: 24,
    paddingRight: 24,
  } as Record<string, number>,
  /** Header/footer */
  bar: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 24,
    paddingRight: 24,
  } as Record<string, number>,
};

export const rowPresets = {
  contained: {
    gutter: 24,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    maxWidth: "1200px",
    verticalAlign: "middle" as const,
  },
  wide: {
    gutter: 32,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    maxWidth: "1440px",
    verticalAlign: "middle" as const,
  },
  narrow: {
    gutter: 24,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    maxWidth: "960px",
    verticalAlign: "middle" as const,
  },
};

/* -------------------------------------------------------------------------- */
/* Lightweight SVG snapshots for instant previews (no html-to-image needed)   */
/* -------------------------------------------------------------------------- */

/**
 * Produce a data URI for a gradient-coloured placeholder snapshot. Keeps
 * the Add-Section modal responsive without running `html-to-image` for every
 * tile on mount.
 */
export function makeSnapshot(opts: {
  from: string;
  to: string;
  label: string;
  width?: number;
  height?: number;
}): string {
  const { from, to, label, width = 400, height = 250 } = opts;
  const safeLabel = label.replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, 40);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" opacity="0.9" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600">${safeLabel}</text>
</svg>`;
  // Use encodeURIComponent for broad compatibility (svg data URIs)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Default snapshot pair. Returns empty strings so that the builder's
 * `SectionSnapshot` component (which uses `html-to-image` to produce a REAL
 * visual preview of the template) will take over. Callers may still pass
 * explicit values, or call `makeSnapshot()` directly when a forced gradient
 * placeholder is desired.
 */
export function snapshotPair(_label: string, _from = "#0a1220", _to = "#1050b0") {
  return {
    card: "",
    preview: "",
  };
}

/* -------------------------------------------------------------------------- */
/* Element factories — every template composes these                          */
/* -------------------------------------------------------------------------- */

type Settings = Record<string, unknown>;

export const el = {
  heading(content: string, settings: Settings = {}): Element {
    return {
      id: generateId("element"),
      type: "heading",
      content,
      settings: {
        level: "h2",
        fontSize: 48,
        fontWeight: "700",
        lineHeight: "1.15",
        letterSpacing: "-0.02em",
        marginBottom: 16,
        textAlign: "left",
        color: theme.text,
        ...settings,
      },
    };
  },

  text(content: string, settings: Settings = {}): Element {
    return {
      id: generateId("element"),
      type: "text",
      content,
      settings: {
        fontSize: 18,
        lineHeight: "1.6",
        color: theme.textMuted,
        marginBottom: 16,
        ...settings,
      },
    };
  },

  button(content: string, link = "#", settings: Settings = {}): Element {
    return {
      id: generateId("element"),
      type: "button",
      content,
      settings: {
        variant: "primary",
        size: "lg",
        link,
        // Buttons are the ONE renderer that puts these strings straight into
        // inline style, so they take real CSS rather than class fragments.
        backgroundColor: theme.cssPrimary,
        color: theme.cssPrimaryInk,
        borderRadius: 10,
        paddingTop: 14,
        paddingBottom: 14,
        paddingLeft: 28,
        paddingRight: 28,
        fontWeight: "600",
        marginRight: 12,
        marginTop: 8,
        ...settings,
      },
    };
  },

  image(src: string, alt: string, settings: Settings = {}): Element {
    return {
      id: generateId("element"),
      type: "image",
      content: "",
      settings: {
        src,
        alt,
        width: "100%",
        height: "auto",
        borderRadius: 12,
        ...settings,
      },
    };
  },

  icon(iconName: string, settings: Settings = {}): Element {
    return {
      id: generateId("element"),
      type: "icon",
      content: "",
      settings: {
        iconName,
        size: 40,
        color: theme.primary,
        marginBottom: 16,
        display: "inline-block",
        ...settings,
      },
    };
  },

  divider(settings: Settings = {}): Element {
    return {
      id: generateId("element"),
      type: "divider",
      content: "",
      settings: {
        marginTop: 24,
        marginBottom: 24,
        // `DividerElement` interpolates `color` (NOT `borderColor`) into a
        // `border-bottom` shorthand and defaults it to the literal "gray", so
        // every divider in every template rendered grey. It takes real CSS,
        // which means it can carry the token directly. `borderColor` is kept
        // in step so the settings panel's colour field agrees with the paint.
        color: theme.cssBorder,
        borderColor: theme.border,
        ...settings,
        /* A caller that sets only `borderColor` — which reads as the natural
           name for a divider — would otherwise be overridden by the `color`
           default above and paint the neutral border token instead. That is how
           the on-band dividers (e.g. footer/split-cta, which asks for
           `theme.onBandFill`) ended up invisible against their dark band. Let
           the caller's intent win, while still allowing an explicit `color`. */
        ...(settings.borderColor && !settings.color
          ? { color: settings.borderColor as string }
          : ({} as Settings)),
      },
    };
  },

  spacer(height = 48): Element {
    return {
      id: generateId("element"),
      type: "spacer",
      content: "",
      settings: { height: `${height}px` },
    };
  },

  list(items: string[], settings: Settings = {}): Element {
    return {
      id: generateId("element"),
      type: "list",
      content: `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`,
      settings: {
        fontSize: 16,
        lineHeight: "1.7",
        color: theme.textMuted,
        marginBottom: 16,
        listStyle: "check",
        ...settings,
      },
    };
  },

  /**
   * Card element. Accepts mixed children — Element children are serialized
   * into `content`, while Row children are stored on the returned Element's
   * `children` field for renderers that can descend into nested structure.
   * (The current card renderer reads `content`; nested rows are informational
   * and used as a structural hint by templates.)
   */
  card(
    settings: Settings = {},
    children: Array<Element | Row> = []
  ): Element {
    const elementChildren = children.filter(
      (c): c is Element => (c as Row).columns === undefined
    );
    return {
      id: generateId("element"),
      type: "card",
      content: JSON.stringify({
        elements: elementChildren.map((e) => ({ type: e.type, content: e.content })),
      }),
      children: elementChildren,
      settings: {
        backgroundColor: theme.bgCard,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 32,
        ...settings,
      },
    };
  },

  link(content: string, href: string, settings: Settings = {}): Element {
    return {
      id: generateId("element"),
      type: "link",
      content,
      settings: {
        link: href,
        target: "_self",
        color: theme.primary,
        fontSize: 15,
        fontWeight: "500",
        display: "inline-block",
        ...settings,
      },
    };
  },

  quote(content: string, attribution: string, settings: Settings = {}): Element {
    return {
      id: generateId("element"),
      type: "quote",
      content,
      settings: {
        fontSize: 22,
        lineHeight: "1.5",
        color: theme.text,
        attribution,
        marginBottom: 16,
        ...settings,
      },
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Structure factories — rows / columns                                       */
/* -------------------------------------------------------------------------- */

/**
 * Create a Column. Accepts mixed children: `Element`s go into `elements`,
 * `Row`s (detected by `.columns`) are routed into `Column.rows` so columns
 * can host nested row layouts.
 */
export function col(
  width: number,
  children: Array<Element | Row>,
  settings: Settings = {}
): Column {
  const elements: Element[] = [];
  const rows: Row[] = [];
  for (const child of children) {
    if ((child as Row).columns !== undefined) rows.push(child as Row);
    else elements.push(child as Element);
  }
  return {
    id: generateId("column"),
    width,
    elements,
    ...(rows.length ? { rows } : {}),
    settings: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 12,
      paddingRight: 12,
      ...settings,
    },
    nestingLevel: 1,
  };
}

export function row(columns: Column[], settings: Settings = {}): Row {
  return {
    id: generateId("row"),
    columns,
    settings: {
      ...rowPresets.contained,
      ...settings,
    },
    nestingLevel: 1,
  };
}

export function section(
  rows: Row[],
  opts: {
    name: string;
    description: string;
    category: string;
    settings?: Settings;
    snapshots?: { card: string; preview: string };
    type?: "regular" | "specialty" | "fullwidth";
    slug?: string;
  }
): Section {
  return {
    id: opts.slug ?? generateId("section"),
    type: opts.type ?? "regular",
    name: opts.name,
    description: opts.description,
    category: opts.category,
    rows,
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
      ...(opts.settings || {}),
    },
    snapshots: opts.snapshots,
  };
}

/* Single-column wrapper — the most common pattern. Accepts mixed children
   (Elements go into the column's elements, Rows into its nested rows). */
export function singleColumnRow(
  children: Array<Element | Row>,
  settings: Settings = {}
): Row {
  return row([col(100, children)], settings);
}
