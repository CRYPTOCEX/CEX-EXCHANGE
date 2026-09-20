/**
 * The home page's editable surface, declared as data.
 * ============================================================================
 *
 * WHY A SCHEMA AND NOT NINE HAND-WRITTEN EDITORS
 *
 * There were nine, 2,461 lines between them, and they had drifted from each
 * other and from the page in every way a set of parallel files can:
 *
 *  - Six were `React.memo`-wrapped and three were not, and the memo did nothing
 *    on any of them because the callbacks they received were rebuilt every
 *    render anyway.
 *  - Each carried its own hand-drawn "preview" of the band it edited. All nine
 *    had gone stale. The Market editor previewed a "Live Markets" panel that
 *    exists nowhere on the site; the Hero editor previewed prices out of a
 *    `MOCK_ASSETS` constant. The workspace now frames the real page, so a
 *    drawing of the page is not merely redundant — it is a second, wrong
 *    answer to the question the screen exists to answer.
 *  - The Features editor silently padded to exactly four entries and sliced the
 *    rest away, while the seed ships six. Opening that tab and touching
 *    anything destroyed two.
 *
 * A schema makes the shape of the page reviewable in one screenful, makes
 * adding a field one line, and makes the question below answerable at a glance.
 *
 * ONLY WHAT THE PAGE RENDERS IS HERE
 * ----------------------------------
 * Roughly half the old editor wrote to keys nothing reads. `marketSection` (all
 * five fields, and its own tab), `globalSection`'s heading and its whole stats
 * CRUD, `mobileApp`'s copy, every `gradient` and `bg` picker, `cta.subtitle`
 * and `variables.seo` were edited, saved, and then not rendered by anything —
 * an owner changed the Market Section headings, saved, saw no change, and had
 * no way to find out why. Controls that write to nothing are worse than absent
 * controls, because they cost trust in the ones that work.
 *
 * Every path below was traced to a read in `app/[locale]/home.tsx`. Anything
 * that could not be is gone. Where a value is still stored but unread, the
 * stored data is left alone — this removes the CONTROL, never the record.
 */

import {
  Blocks,
  Layers,
  Megaphone,
  Rocket,
  Settings,
  Smartphone,
  Sparkles,
  Tag,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";

/* ==========================================================================
   FIELDS
   ========================================================================== */

export interface FieldBase {
  /** Dotted path inside `variables`. */
  path: string;
  label: string;
  hint?: string;
}

export interface TextField extends FieldBase {
  kind: "text";
  placeholder?: string;
  /** Advisory character count — the page truncates nothing, layouts just suffer. */
  soft?: number;
}

export interface TextareaField extends FieldBase {
  kind: "textarea";
  rows?: number;
  soft?: number;
}

export interface SwitchField extends FieldBase {
  kind: "switch";
  /**
   * What an ABSENT value means — the reading the control must show for every
   * document stored before the switch existed.
   *
   * Defaults to `true` because the first two switches here both hide a band
   * that was previously always on, so absent has to read as on or every
   * existing site loses the band the day the control ships. A switch that ADDS
   * behaviour is the mirror case and must declare `defaultOn: false`, or it
   * would turn itself on everywhere for the same reason.
   */
  defaultOn?: boolean;
}

export interface IconField extends FieldBase {
  kind: "icon";
}

/** A `string[]` — the hero's bullet list, the CTA's tick list. */
export interface StringsField extends FieldBase {
  kind: "strings";
  itemLabel: string;
  /** Beyond this the page renders nothing. Shown, never enforced destructively. */
  rendered?: number;
}

/** One field inside a repeater row. `path` is relative to the row. */
export type RowField = Omit<TextField, "path"> & { path: string } |
  (Omit<TextareaField, "path"> & { path: string }) |
  (Omit<IconField, "path"> & { path: string });

/** An array of objects — feature cards, onboarding steps. */
export interface RepeaterField extends FieldBase {
  kind: "repeater";
  itemLabel: string;
  /** Which row field to show in the collapsed header. */
  titleFrom: string;
  fields: RowField[];
  blank: Record<string, unknown>;
  /**
   * How many the page actually draws. Rows past this are kept and editable —
   * destroying an owner's data to match a render limit is what the old editor
   * did — but they are marked as not appearing.
   */
  rendered?: number;
}

export type EditorField =
  | TextField
  | TextareaField
  | SwitchField
  | IconField
  | StringsField
  | RepeaterField;

/* ==========================================================================
   SECTIONS
   ========================================================================== */

export interface EditorSection {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Rail grouping — same string, drawn together. */
  /**
   * `content` — a band that appears on the page, in the order it appears.
   * `page`    — the record itself: how it is found, what it is called.
   *
   * Only those two, and the rail's one divider therefore means something. An
   * earlier cut gave the modules band its own group and the rail grew three
   * dividers that drew a distinction the page does not make.
   */
  group: "content" | "page";
  /**
   * The `data-preview-section` the public page emits for this band. Choosing
   * the section scrolls the preview to it; without one the preview stays put.
   */
  preview?: string;
  hint?: string;
  fields: EditorField[];
  /** Sections whose control is bespoke rather than a field list. */
  custom?: "extensions" | "seo" | "settings";
  /**
   * Why this band might not be in the preview at all.
   *
   * Several of them are conditional on something other than their own content —
   * the ticker needs spot trading enabled and a market to quote, the mobile
   * band renders nothing unless a store link is configured in settings. When
   * the marker is absent the editor scrolls nowhere, which reads as a broken
   * rail rather than as a page that currently has no such band. Saying so is
   * the difference between "this is broken" and "here is what to do about it".
   */
  absentHint?: string;
}

const ICON_HINT = "Only the names the page can draw are offered — anything else falls back to a generic glyph.";

export const HOME_SECTIONS: readonly EditorSection[] = [
  {
    id: "hero",
    label: "Hero",
    icon: Sparkles,
    group: "content",
    preview: "hero",
    hint: "The first screen. The market panel beside it is live data and is not editable.",
    fields: [
      { kind: "text", path: "hero.badge", label: "Badge", soft: 40, hint: "The small pill above the headline." },
      { kind: "text", path: "hero.title", label: "Headline", soft: 60 },
      { kind: "text", path: "hero.subtitle", label: "Second line", soft: 60 },
      { kind: "textarea", path: "hero.description", label: "Description", rows: 3, soft: 200 },
      { kind: "text", path: "hero.cta", label: "Button", soft: 24 },
      { kind: "strings", path: "hero.features", label: "Bullets", itemLabel: "bullet" },
    ],
  },
  {
    id: "ticker",
    label: "Ticker",
    icon: TrendingUp,
    group: "content",
    preview: "ticker",
    hint: "The scrolling price strip. Its contents are live market data, so this is on or off.",
    absentHint:
      "The ticker also needs spot trading enabled and at least one market with a price — with none, it renders nothing even when this is on.",
    fields: [{ kind: "switch", path: "ticker.enabled", label: "Show the ticker" }],
  },
  {
    id: "extensions",
    label: "Modules",
    icon: Blocks,
    group: "content",
    preview: "extensions",
    custom: "extensions",
    hint: "Which installed modules appear, and in what order. Their copy comes from the module itself.",
    fields: [],
  },
  {
    id: "features",
    label: "Why choose us",
    icon: Zap,
    group: "content",
    preview: "features",
    fields: [
      { kind: "text", path: "featuresSection.badge", label: "Badge", soft: 40 },
      { kind: "text", path: "featuresSection.title", label: "Heading", soft: 60 },
      { kind: "text", path: "featuresSection.subtitle", label: "Second line", soft: 60 },
      { kind: "textarea", path: "featuresSection.description", label: "Description", rows: 3, soft: 200 },
      {
        kind: "repeater",
        path: "features",
        label: "Cards",
        itemLabel: "card",
        titleFrom: "title",
        rendered: 4,
        blank: { title: "", description: "", icon: "Zap" },
        fields: [
          { kind: "text", path: "title", label: "Title", soft: 40 },
          { kind: "textarea", path: "description", label: "Description", rows: 2, soft: 140 },
          { kind: "icon", path: "icon", label: "Icon", hint: ICON_HINT },
        ],
      },
    ],
  },
  {
    id: "platform-features",
    label: "Platform list",
    icon: Layers,
    group: "content",
    preview: "platform-features",
    hint: "The tick-list panel inside the Why-choose-us band.",
    fields: [
      { kind: "text", path: "globalSection.platformFeatures.title", label: "Heading", soft: 60 },
      {
        kind: "strings",
        path: "globalSection.platformFeatures.items",
        label: "Items",
        itemLabel: "item",
      },
    ],
  },
  {
    id: "getting-started",
    label: "Getting started",
    icon: Rocket,
    group: "content",
    preview: "getting-started",
    fields: [
      { kind: "text", path: "gettingStarted.badge", label: "Badge", soft: 40 },
      { kind: "text", path: "gettingStarted.title", label: "Heading", soft: 60 },
      { kind: "text", path: "gettingStarted.subtitle", label: "Second line", soft: 80 },
      {
        kind: "repeater",
        path: "gettingStarted.steps",
        label: "Steps",
        itemLabel: "step",
        titleFrom: "title",
        blank: { step: "", title: "", description: "", icon: "Users" },
        fields: [
          { kind: "text", path: "step", label: "Number", soft: 4, hint: "Shown as the step marker — usually 01, 02, 03." },
          { kind: "text", path: "title", label: "Title", soft: 40 },
          { kind: "textarea", path: "description", label: "Description", rows: 2, soft: 140 },
          { kind: "icon", path: "icon", label: "Icon", hint: ICON_HINT },
        ],
      },
    ],
  },
  {
    id: "mobile-app",
    label: "Mobile app",
    icon: Smartphone,
    group: "content",
    preview: "mobile-app",
    absentHint:
      "This band renders nothing until an App Store or Google Play link is set in system settings, or Coming Soon is switched on below — Show the section cannot bring it back on its own.",
    fields: [
      { kind: "switch", path: "mobileApp.enabled", label: "Show the section" },
      {
        kind: "switch",
        path: "mobileApp.comingSoon",
        label: "Show Coming Soon",
        defaultOn: false,
        hint: "Replaces the two store buttons with one plate, and drops the QR line. The band then shows with no store link set — and stays this way even if one is.",
      },
      {
        kind: "text",
        path: "mobileApp.comingSoonLabel",
        label: "Coming Soon text",
        soft: 24,
        placeholder: "Coming Soon",
        hint: "What that plate reads. Only used while the switch above is on; blank falls back to Coming Soon.",
      },
      { kind: "text", path: "mobileApp.badge", label: "Badge", soft: 40 },
      { kind: "text", path: "mobileApp.title", label: "Heading", soft: 60 },
      { kind: "text", path: "mobileApp.subtitle", label: "Second line", soft: 60 },
      { kind: "textarea", path: "mobileApp.description", label: "Description", rows: 3, soft: 200 },
      {
        kind: "repeater",
        path: "mobileApp.features",
        label: "Points",
        itemLabel: "point",
        titleFrom: "title",
        /* The blank has to be a name the PICKER offers, not merely one the page
           can draw — otherwise every freshly added point opens reading
           "Smartphone — not available", which is the picker correctly reporting
           that it cannot vouch for a value this file chose. */
        blank: { title: "", description: "", icon: "Zap" },
        fields: [
          { kind: "text", path: "title", label: "Title", soft: 40 },
          { kind: "textarea", path: "description", label: "Description", rows: 2, soft: 140 },
          { kind: "icon", path: "icon", label: "Icon", hint: ICON_HINT },
        ],
      },
    ],
  },
  {
    id: "cta",
    label: "Closing CTA",
    icon: Megaphone,
    group: "content",
    preview: "cta",
    hint: "The last band. It reads differently for signed-out and signed-in visitors.",
    fields: [
      { kind: "text", path: "cta.badge", label: "Badge", soft: 40 },
      { kind: "text", path: "cta.title", label: "Heading", soft: 60 },
      { kind: "textarea", path: "cta.description", label: "Description", rows: 3, soft: 200 },
      { kind: "text", path: "cta.button", label: "Button — signed out", soft: 24 },
      { kind: "text", path: "cta.buttonUser", label: "Button — signed in", soft: 24 },
      { kind: "strings", path: "cta.features", label: "Bullets — signed out", itemLabel: "bullet" },
      { kind: "strings", path: "cta.featuresUser", label: "Bullets — signed in", itemLabel: "bullet" },
    ],
  },
  {
    id: "seo",
    label: "Search & sharing",
    icon: Tag,
    group: "page",
    custom: "seo",
    fields: [],
  },
  {
    id: "settings",
    label: "Page settings",
    icon: Settings,
    group: "page",
    custom: "settings",
    fields: [],
  },
];

/* ==========================================================================
   MODULES

   `id` must match the feature id pushed by /api/content/landing-stats — an id
   here but not there is a row an owner can toggle to no effect. The list is
   deliberately the full catalogue rather than what is installed, because a
   module appears only if its extension is installed AND enabled here, and an
   owner needs to see the switch before the extension arrives.
   ========================================================================== */

export interface ModuleEntry {
  id: string;
  name: string;
  description: string;
}

export const HOME_MODULES: readonly ModuleEntry[] = [
  { id: "spot", name: "Spot Trading", description: "Exchange-based cryptocurrency trading" },
  { id: "binary", name: "Binary Options", description: "Fixed-risk short-term price predictions" },
  { id: "futures", name: "Futures Trading", description: "Leveraged perpetual trading" },
  { id: "forexTrading", name: "Forex & Multi-Asset", description: "Currencies, metals, indices and equities" },
  { id: "ecosystem", name: "Native Tokens", description: "Blockchain native token trading" },
  { id: "staking", name: "Staking Pools", description: "Earn passive income by staking" },
  { id: "ico", name: "Token Offerings", description: "Participate in token sales" },
  { id: "ai", name: "AI Investment", description: "Managed investment plans" },
  { id: "forex", name: "Managed Forex", description: "MT4/MT5 accounts and forex plans" },
  { id: "copyTrading", name: "Copy Trading", description: "Follow successful traders" },
  { id: "tradingBot", name: "Trading Bots", description: "Strategy marketplace and automation" },
  { id: "p2p", name: "P2P Marketplace", description: "Peer-to-peer trading with escrow" },
  { id: "nft", name: "NFT Marketplace", description: "Mint, list and auction NFTs" },
  { id: "ecommerce", name: "Crypto Store", description: "Sell goods and digital keys for crypto" },
  { id: "gateway", name: "Payment Gateway", description: "Merchant crypto checkout and API" },
  { id: "affiliate", name: "Affiliate Program", description: "Multi-level referral rewards" },
];

/* ==========================================================================
   PATH HELPERS
   ========================================================================== */

export function readPath(source: unknown, path: string): unknown {
  let cursor: unknown = source;
  for (const key of path.split(".")) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return cursor;
}

/** Every dotted path a section touches, for the "edited here" markers. */
export function sectionPaths(section: EditorSection): string[] {
  const out: string[] = [];
  for (const field of section.fields) {
    out.push(field.path);
  }
  return out;
}

/**
 * How many fields in this section differ from what is saved.
 *
 * Per-section, because the old editor's single global "unsaved changes" badge
 * could not tell an owner WHERE the change was — with nine sections behind a
 * rail that is the difference between "review it" and "save and hope".
 */
export function countSectionChanges(
  section: EditorSection,
  draftVars: unknown,
  savedVars: unknown
): number {
  let n = 0;
  for (const path of sectionPaths(section)) {
    if (JSON.stringify(readPath(draftVars, path) ?? null) !== JSON.stringify(readPath(savedVars, path) ?? null)) {
      n += 1;
    }
  }
  return n;
}
