/**
 * COMPONENT VARIANTS — plans/COMPONENT-SYSTEM.md §4.
 * ============================================================================
 *
 * A variant here is a NAMED BUNDLE OF TOKEN VALUES. Nothing more.
 *
 * WHY THAT IS THE WHOLE DESIGN, AND WHY IT IS NOT HOW THE NAVBAR WORKS
 *
 * The navbar and footer pickers store a variant ID, ship a component per ID,
 * and need a `postMessage` into the preview plus a `router.refresh()` on save —
 * because a navbar layout genuinely IS a different component tree, and no CSS
 * property swaps one.
 *
 * A table style is not. "Compact", "Striped" and "Ruled" are the same DOM
 * painted differently, and every difference between them is expressible in the
 * tokens the components already read. So a variant needs no storage of its own,
 * no ID in the saved theme, no server round-trip and no refresh: applying one
 * writes token values, exactly as `PresetGallery` writes a palette. Live
 * preview, dirty tracking, import/export and Save all work because there is
 * nothing new for them to understand.
 *
 * The consequence — and it is a feature — is that a variant is a STARTING
 * POINT, not a mode. Apply "Compact" and then drag row height, and you have a
 * modified Compact; the panel says "Custom" and the site renders what you set.
 * A stored variant ID would have had to decide whether the ID or the slider
 * wins, and every answer to that is confusing.
 *
 * WHAT IS NOT HERE: anything needing different markup — card-rows instead of
 * table-rows, a different column set. Those are configuration, they are not
 * expressible as tokens, and putting them in this list would mean half the
 * entries silently worked differently from the other half.
 *
 * EVERY VALUE MUST PASS `isValidTokenValue`. `setToken` drops what fails, in
 * silence — so a bundle with one illegal value applies partially and leaves the
 * component in a state no preset describes. The ranges that matter: a `scale`
 * is 0-5 with at most 3 decimals, a `length` needs a unit, a `weight` is
 * 100-900 in hundreds.
 */

export interface ComponentPreset {
  id: string;
  label: string;
  hint: string;
  /**
   * Tokens to write. An EMPTY object means "clear every token in this group",
   * which is what "As shipped" is — and it is deliberately not a snapshot of
   * the current defaults. Clearing lets a future improvement to a default reach
   * a site that has pressed this button; storing the values would freeze it.
   */
  values: Record<string, string>;
}

export const COMPONENT_PRESETS: Record<string, ComponentPreset[]> = {
  table: [
    {
      id: "shipped",
      label: "As shipped",
      hint: "Spacious rows, no lines, no striping.",
      values: {},
    },
    {
      id: "compact",
      label: "Compact",
      hint: "More rows on screen. Shorter rows, tighter cells, slightly smaller text.",
      values: {
        "--table-row-height": "2.25rem",
        "--table-header-height": "2.5rem",
        "--table-cell-padding-x": "0.75rem",
        "--table-font-scale": "0.925",
      },
    },
    {
      id: "roomy",
      label: "Roomy",
      hint: "Fewer rows, easier to scan. Good for short tables and touch.",
      values: {
        "--table-row-height": "3.5rem",
        "--table-header-height": "3.5rem",
        "--table-cell-padding-x": "1.5rem",
      },
    },
    {
      id: "striped",
      label: "Striped",
      hint: "Alternating row fill instead of space. Easiest to track across many columns.",
      values: {
        "--table-stripe-opacity": "1",
        "--table-row-height": "2.5rem",
      },
    },
    {
      id: "ruled",
      label: "Ruled",
      hint: "A hairline under every row. The spreadsheet look.",
      values: {
        "--table-row-border-width": "1px",
        "--table-row-height": "2.5rem",
      },
    },
  ],

  control: [
    {
      id: "shipped",
      label: "As shipped",
      hint: "Medium weight, small corners, 1px outlines.",
      values: {},
    },
    {
      id: "rounded",
      label: "Rounded",
      hint: "Softer corners on buttons and inputs, fully rounded badges.",
      values: {
        "--control-radius-scale": "4",
        "--badge-radius-scale": "5",
      },
    },
    {
      id: "square",
      label: "Square",
      hint: "No corner rounding at all. Technical and dense.",
      values: {
        "--control-radius-scale": "0",
        "--badge-radius-scale": "0",
      },
    },
    {
      id: "heavy",
      label: "Heavy",
      hint: "Bolder labels and 2px outlines. Higher contrast at a glance.",
      values: {
        "--control-font-weight": "600",
        "--control-border-width": "2px",
      },
    },
    {
      id: "compact",
      label: "Compact",
      hint: "Shorter, tighter controls. Pairs with a compact table.",
      values: {
        "--control-height-scale": "0.9",
        "--control-padding-scale": "0.85",
      },
    },
  ],

  card: [
    {
      id: "shipped",
      label: "As shipped",
      hint: "Bordered, unelevated, standard padding.",
      values: {},
    },
    {
      id: "flat",
      label: "Flat",
      hint: "No shadow anywhere. Elevation reads from the surface ramp alone.",
      values: { "--card-shadow-strength": "0" },
    },
    {
      id: "outlined",
      label: "Outlined",
      hint: "A heavier 2px edge instead of a shadow.",
      values: { "--card-border-width": "2px", "--card-shadow-strength": "0" },
    },
    {
      id: "roomy",
      label: "Roomy",
      hint: "More air inside every card.",
      values: { "--card-padding-scale": "1.35" },
    },
    {
      id: "tight",
      label: "Tight",
      hint: "Less padding — fits more on a dashboard.",
      values: { "--card-padding-scale": "0.75" },
    },
  ],

  form: [
    {
      id: "shipped",
      label: "As shipped",
      hint: "Standard rhythm, medium labels, 80% scrim.",
      values: {},
    },
    {
      id: "dense",
      label: "Dense",
      hint: "Tighter field rhythm and less dialog padding. Long forms fit on one screen.",
      values: { "--field-gap": "0.875rem", "--dialog-padding": "1.125rem" },
    },
    {
      id: "airy",
      label: "Airy",
      hint: "Generous spacing. Short forms feel less like paperwork.",
      values: { "--field-gap": "1.75rem", "--dialog-padding": "2rem" },
    },
    {
      id: "emphatic",
      label: "Emphatic labels",
      hint: "Bolder field labels and a darker scrim behind dialogs.",
      values: { "--field-label-weight": "600", "--dialog-overlay-opacity": "1.15" },
    },
  ],

  dataviz: [
    {
      id: "shipped",
      label: "As shipped",
      hint: "2px series, faint grid, small points.",
      values: {},
    },
    {
      id: "fine",
      label: "Fine",
      hint: "Hairline series and a barely-there grid. Best for dense, multi-series charts.",
      values: {
        "--chart-line-width": "1px",
        "--chart-point-radius": "2px",
        "--chart-grid-opacity": "0.5",
      },
    },
    {
      id: "bold",
      label: "Bold",
      hint: "Thick series and larger points. Reads from across a room.",
      values: {
        "--chart-line-width": "3px",
        "--chart-point-radius": "4px",
      },
    },
    {
      id: "gridless",
      label: "No grid",
      hint: "Drops the gridlines entirely and leans on the axis labels.",
      values: { "--chart-grid-opacity": "0" },
    },
  ],
};
