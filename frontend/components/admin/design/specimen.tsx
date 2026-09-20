"use client";

/**
 * THE COMPONENT SPECIMEN — every restylable component, in every state it ships.
 * ============================================================================
 *
 * WHY THIS EXISTS
 *
 * The design studio previews the site in an iframe, and that iframe can only
 * load PUBLIC routes — `/`, `/blog`, `/market` (see `site-preview.tsx`). None
 * of them contains a DataTable, a dialog, a form field or a KPI tile, which is
 * most of what an operator looks at all day and all of what the component token
 * layer moves. So an owner dragging "row height" had nothing to watch.
 *
 * ONE FAMILY AT A TIME. The studio passes `?only=<group>` and this page renders
 * that family alone. Rendering all five at once meant pressing "Cards" left you
 * looking at a table — the thing you had just stopped editing — with the cards
 * below the fold. A preview you have to hunt for is not a preview.
 *
 * IT MUST SHOW THE REAL THING, EXHAUSTIVELY
 * -----------------------------------------
 * The point of a swatch is to answer "what will this do to my site", and it can
 * only answer that for what is ON it. A single default button cannot tell you
 * that a radius change makes your `soft` badges look wrong beside your outlined
 * buttons, or that a heavier control weight collides with a `2xs` size, or that
 * a compact table breaks the alignment of a numeric column.
 *
 * So every family here renders its FULL matrix — every variant, every tone,
 * every size, and the states that are usually invisible (disabled, invalid,
 * empty, loading, selected, sorted). If a component ships it, it is on this
 * page. The rule for adding: a component belongs here when a component token
 * moves it, and every state of it belongs here when that state looks
 * meaningfully different.
 *
 * WHY THE FIXTURE ROWS ARE INVENTED RATHER THAN FETCHED
 *
 * A real endpoint would make row height and striping judgeable only on an
 * install whose database happens to have rows today — and unjudgeable on a
 * fresh one, which is exactly when an owner is choosing a look. The rows below
 * are shaped like real ones (a long name that truncates, a negative number,
 * several status words) because a fixture of "Item 1 / Item 2" hides the
 * truncation and alignment problems a density change causes.
 */

import * as React from "react";
import {
  CalendarIcon,
  CircleDollarSign,
  Hash,
  Tag as TagIcon,
  TrendingUp,
  Wallet,
  Info,
} from "lucide-react";

import DataTable from "@/components/blocks/data-table";
import type { ColumnDefinition, FormConfig } from "@/components/blocks/data-table/types/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DonutChart, SeriesChart, Sparkline } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricTile } from "@/components/ui/metric-tile";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";

/* ==========================================================================
   FIXTURES
   ========================================================================== */

const ROWS = [
  { id: "a1", name: "Aurora Capital Holdings Ltd", symbol: "AURA", status: "ACTIVE", balance: 128450.25, createdAt: "2026-01-14T09:12:00Z" },
  { id: "b2", name: "Meridian", symbol: "MRD", status: "PENDING", balance: 4820.0, createdAt: "2026-02-03T14:44:00Z" },
  { id: "c3", name: "Northwind Exchange", symbol: "NWX", status: "SUSPENDED", balance: -1250.75, createdAt: "2026-02-19T08:05:00Z" },
  { id: "d4", name: "Solstice Markets", symbol: "SOL", status: "ACTIVE", balance: 76200.5, createdAt: "2026-03-08T17:30:00Z" },
  { id: "e5", name: "Vantage", symbol: "VNT", status: "COMPLETED", balance: 310.0, createdAt: "2026-03-22T11:58:00Z" },
  { id: "f6", name: "Harbour & Finch Securities", symbol: "HFS", status: "ACTIVE", balance: 58900.1, createdAt: "2026-04-01T06:20:00Z" },
  { id: "g7", name: "Cobalt", symbol: "CBT", status: "FAILED", balance: 0, createdAt: "2026-04-17T19:41:00Z" },
  { id: "h8", name: "Everline Trading Company", symbol: "EVL", status: "ACTIVE", balance: 219075.9, createdAt: "2026-05-02T13:15:00Z" },
];

const SERIES_DATA = [
  { date: "2026-03-01", volume: 4200, fees: 320 },
  { date: "2026-03-08", volume: 5100, fees: 410 },
  { date: "2026-03-15", volume: 3800, fees: 290 },
  { date: "2026-03-22", volume: 6400, fees: 505 },
  { date: "2026-03-29", volume: 7250, fees: 590 },
  { date: "2026-04-05", volume: 6900, fees: 545 },
  { date: "2026-04-12", volume: 8300, fees: 660 },
];

const DONUT: { name: string; value: number }[] = [
  { name: "Spot", value: 4820 },
  { name: "Futures", value: 3110 },
  { name: "Staking", value: 1740 },
  { name: "P2P", value: 620 },
];

const SPARK = [12, 18, 15, 22, 19, 27, 24, 31, 29, 36];

const COLUMNS: ColumnDefinition[] = [
  { key: "id", title: "ID", type: "text", icon: Hash, sortable: true, priority: 3, expandedOnly: true },
  { key: "name", title: "Account", type: "text", icon: TagIcon, sortable: true, priority: 1 },
  { key: "symbol", title: "Symbol", type: "text", icon: Hash, sortable: true, priority: 2 },
  { key: "status", title: "Status", type: "select", sortable: true, priority: 1, render: { type: "badge", config: {} } },
  { key: "balance", title: "Balance", type: "number", icon: CircleDollarSign, sortable: true, priority: 1, render: { type: "number", format: { style: "currency", currency: "USD" } } },
  { key: "createdAt", title: "Created", type: "date", icon: CalendarIcon, sortable: true, priority: 3, render: { type: "date", format: "PP" } },
];

/**
 * Present so the Create and Edit dialogs open onto real fields instead of an
 * empty panel. Those dialogs are themselves a form specimen — field rhythm,
 * label weight and dialog padding, in the container they actually ship in.
 */
const FORM_CONFIG: FormConfig = {
  create: {
    title: "New account",
    description: "Nothing here is saved — this table has no endpoint behind it.",
    groups: [
      {
        id: "specimen-basic",
        title: "Account",
        icon: Wallet,
        priority: 1,
        fields: [
          { key: "name", required: true, maxLength: 120 },
          { key: "symbol", required: true, maxLength: 12 },
          { key: "balance" },
        ],
      },
    ],
  },
  edit: {
    title: "Edit account",
    description: "Nothing here is saved — this table has no endpoint behind it.",
    groups: [
      {
        id: "specimen-basic",
        title: "Account",
        icon: Wallet,
        priority: 1,
        fields: [
          { key: "name", required: true, maxLength: 120 },
          { key: "symbol", required: true, maxLength: 12 },
          { key: "balance" },
        ],
      },
    ],
  },
};

/* The full axes of each primitive, named once so a new variant added to a
   component shows up here by editing one array rather than by hand-writing
   another block — and so a specimen that has fallen behind is a short diff. */
const BUTTON_SHAPES = ["default", "outline", "ghost", "soft", "secondary", "destructive", "link"] as const;
const BUTTON_TONES = ["primary", "secondary", "success", "warning", "destructive", "info", "neutral"] as const;
const BUTTON_SIZES = ["2xs", "xs", "sm", "default", "md", "lg", "xl"] as const;
const ICON_SIZES = ["icon-xs", "icon-sm", "icon"] as const;
const BADGE_TONES = ["primary", "secondary", "success", "warning", "destructive", "info", "neutral"] as const;
const BADGE_APPEARANCES = ["solid", "soft", "outline"] as const;
const BADGE_SIZES = ["xs", "sm", "md", "lg"] as const;
const CARD_VARIANTS = ["default", "muted", "ghost", "outline", "dashed", "elevated", "glass"] as const;
const CARD_TONES = ["primary", "success", "warning", "destructive", "info"] as const;
const CARD_PADDINGS = ["sm", "md", "lg", "xl"] as const;
const ALERT_TONES = ["primary", "success", "warning", "destructive", "info", "neutral"] as const;
const ALERT_APPEARANCES = ["soft", "solid"] as const;
const CHART_TYPES = ["line", "area", "bar", "stackedBar"] as const;

/* ==========================================================================
   LAYOUT
   ========================================================================== */

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-0.5 mb-4 text-xs text-muted-foreground">{hint}</p>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

/** A labelled band. The label is what tells you WHICH state you are looking at. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium tracking-wide text-subtle-foreground uppercase">
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium tracking-wide text-subtle-foreground uppercase">
        {label}
      </div>
      {children}
    </div>
  );
}

/* ==========================================================================
   FAMILIES
   ========================================================================== */

/**
 * EXACTLY ONE `<DataTable>` MAY EXIST ON THIS PAGE.
 * ----------------------------------------------------------------------------
 * `useTableStore` is a module-level singleton (`store/index.ts`) — there is no
 * per-instance provider — so every DataTable in a tree shares one store. A
 * second one mounts, its effect calls `reset()`, and the first table's columns,
 * rows and config are gone. This page had a populated table above an empty-state
 * one and rendered TWO empty tables with no headers, because the empty table's
 * init won.
 *
 * That is why there is no empty-state specimen here. It is worth seeing and it
 * cannot be shown this way; a second store instance would have to exist first.
 *
 * WHY EVERY CAPABILITY IS ON. `canCreate`/`canEdit`/`canDelete` gate the toolbar
 * buttons, the row-action menu AND the selection checkbox column
 * (`content/index.tsx` derives `showSelectColumn` from them), and each ALSO
 * needs its permission string — `initializePermissions` defaults an unnamed
 * create/edit/delete permission to FALSE, so passing the flag alone leaves the
 * button hidden. All five point at `access.design`: anyone who can open this
 * screen can see the swatch, and nothing here writes.
 */
function TableSpecimen() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Section
      title="Tables"
      hint={t("row_height_header_height_cell_padding")}
    >
      <DataTable
        model="specimen"
        apiEndpoint="/api/admin/design/specimen"
        staticRows={ROWS}
        columns={COLUMNS}
        formConfig={FORM_CONFIG}
        pageSize={5}
        /* `title` is what renders the hero. Without it the whole heading block
           — badge, icon, title, description, stats, the Create button — does
           not render at all (see `header/index.tsx`: `if (!title) return null`),
           which is why the heading variant was missing. */
        title="Accounts"
        description={t("every_table_on_the_site_is")}
        itemTitle="Account"
        design={{
          icon: Wallet,
          badge: "Specimen",
          stats: [
            { icon: TrendingUp, label: tCommon("volume"), value: "$1.28M" },
            { icon: CircleDollarSign, label: tCommon("balance"), value: "$486K" },
          ],
        }}
        canCreate
        canEdit
        canDelete
        canView
        isParanoid={false}
        permissions={{
          access: "access.design",
          view: "access.design",
          create: "access.design",
          edit: "access.design",
          delete: "access.design",
        }}
      />
    </Section>
  );
}

function ControlSpecimen() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Section
      title={t("buttons_inputs")}
      hint={t("control_height_padding_corners_label_weight")}
    >
      <Panel label={t("shape_tone_the_full_matrix")}>
        <div className="flex flex-col gap-1.5">
          {BUTTON_SHAPES.map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-2">
              <span className="w-16 shrink-0 text-[10px] text-subtle-foreground">{variant}</span>
              {BUTTON_TONES.map((tone) => (
                <Button key={tone} variant={variant} tone={tone} size="sm">
                  {tone}
                </Button>
              ))}
            </div>
          ))}
        </div>
      </Panel>

      <Row label={t("size_ramp_every_step")}>
        {BUTTON_SIZES.map((size) => (
          <Button key={size} size={size}>
            {size}
          </Button>
        ))}
      </Row>

      <Row label={t("icon_only_square_at_every_step")}>
        {BUTTON_SIZES.map((size) => (
          <Button key={size} size={size} iconOnly aria-label={tCommon("icon_size", { size: String(size) })}>
            <TrendingUp />
          </Button>
        ))}
        {ICON_SIZES.map((size) => (
          <Button key={size} size={size} variant="outline" aria-label={t("legacy", { size: String(size) })}>
            <Wallet />
          </Button>
        ))}
      </Row>

      <Row label="States">
        <Button disabled>Disabled</Button>
        <Button variant="outline" disabled>
          {t("disabled_outline")}
        </Button>
        <Button variant="ghost" disabled>
          {t("disabled_ghost")}
        </Button>
        <Button aria-invalid>Invalid</Button>
      </Row>

      {/* `glass` is legible only over media or a scrim — on flat ground it is a
          near-invisible pane, so previewing it on the page background would
          libel it. Its own ground travels with it. */}
      <Panel label={t("glass_over_media_which_is_the")}>
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-linear-to-br from-primary via-info to-secondary p-4">
          <Button variant="glass">Glass</Button>
          <Button variant="glass" size="sm">
            Small
          </Button>
          <Button variant="glass" iconOnly aria-label={t("glass_icon")}>
            <TrendingUp />
          </Button>
        </div>
      </Panel>

      <Row label={t("full_width")}>
        <div className="w-full max-w-sm">
          <Button fullWidth>{t("full_width")}</Button>
        </div>
      </Row>

      <Panel label={t("badges_appearance_tone")}>
        <div className="flex flex-col gap-1.5">
          {BADGE_APPEARANCES.map((appearance) => (
            <div key={appearance} className="flex flex-wrap items-center gap-2">
              <span className="w-16 shrink-0 text-[10px] text-subtle-foreground">{appearance}</span>
              {BADGE_TONES.map((tone) => (
                <Badge key={tone} appearance={appearance} tone={tone}>
                  {tone}
                </Badge>
              ))}
            </div>
          ))}
        </div>
      </Panel>

      <Row label={t("badge_sizes")}>
        {BADGE_SIZES.map((size) => (
          <Badge key={size} size={size} tone="primary" appearance="soft">
            {size}
          </Badge>
        ))}
      </Row>

      <Panel label={t("inputs_and_selects_every_state")}>
        <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
          <Input placeholder="Placeholder" />
          <Input defaultValue="With a value" />
          <Input disabled placeholder="Disabled" />
          <Input aria-invalid defaultValue="Invalid value" />
          <Select>
            <SelectTrigger>
              <SelectValue placeholder={t("select_an_option")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">{t("first_option")}</SelectItem>
              <SelectItem value="b">{t("second_option")}</SelectItem>
            </SelectContent>
          </Select>
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder={t("disabled_select")} />
            </SelectTrigger>
            <SelectContent />
          </Select>
          <Textarea placeholder="Textarea" rows={2} className="sm:col-span-2" />
        </div>
      </Panel>

      <Row label={t("toggles_and_ranges")}>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox defaultChecked /> Checked
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox /> Unchecked
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox disabled /> Disabled
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch defaultChecked /> On
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch /> Off
        </label>
        <RadioGroup defaultValue="one" className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm">
            <RadioGroupItem value="one" /> One
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <RadioGroupItem value="two" /> Two
          </label>
        </RadioGroup>
        <div className="w-40">
          <Slider defaultValue={[40]} max={100} step={1} />
        </div>
        <div className="w-40">
          <Progress value={62} />
        </div>
      </Row>
    </Section>
  );
}

function CardSpecimen() {
  const t = useTranslations("components");
  return (
    <Section
      title="Cards"
      hint={t("padding_scale_border_width_and_elevation")}
    >
      <Panel label={t("every_variant")}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CARD_VARIANTS.map((variant) => (
            <Card key={variant} variant={variant} padding="md">
              <p className="text-sm font-medium">{variant}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("the_surface_ramp_carries_elevation_never")}
              </p>
            </Card>
          ))}
        </div>
      </Panel>

      <Panel label={t("status_rails_the_leading_edge_tone")}>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CARD_TONES.map((tone) => (
            <Card key={tone} tone={tone} padding="md">
              <p className="text-sm font-medium">{tone}</p>
            </Card>
          ))}
        </div>
      </Panel>

      <Panel label={t("padding_ramp_the_steps_must_stay")}>
        <div className="grid gap-3 sm:grid-cols-4">
          {CARD_PADDINGS.map((padding) => (
            <Card key={padding} padding={padding}>
              <p className="text-sm font-medium">{padding}</p>
            </Card>
          ))}
        </div>
      </Panel>

      <Panel label={t("with_header_content_footer_and_interactive")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("composed_card")}</CardTitle>
              <CardDescription>{t("header_content_and_footer_sections")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t("section_padding_is_shared_so_a")}
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="outline">
                Action
              </Button>
            </CardFooter>
          </Card>
          <Card interactive padding="md" tabIndex={0} role="button">
            <p className="text-sm font-medium">Interactive</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("hover_and_focus_states_live_on_the_card_itself")}
            </p>
          </Card>
        </div>
      </Panel>
    </Section>
  );
}

function FormSpecimen() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Section
      title={t("forms_dialogs")}
      hint={t("field_spacing_label_weight_dialog_padding")}
    >
      <Panel label={t("a_real_form_two_columns_labels_help_text_an_error")}>
        <div className="grid max-w-3xl grid-cols-1 gap-x-6 gap-y-[var(--field-gap)] sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="sp-name">{tCommon("account_name")}</Label>
            <Input id="sp-name" placeholder={t("aurora_capital")} />
            <p className="text-[11px] text-muted-foreground">{t("the_name_shown_to_the_customer")}</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sp-symbol">Symbol</Label>
            <Input id="sp-symbol" defaultValue="AURA" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sp-type">{tCommon("account_type")}</Label>
            <Select>
              <SelectTrigger id="sp-type">
                <SelectValue placeholder={t("choose_a_type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spot">Spot</SelectItem>
                <SelectItem value="margin">Margin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sp-limit">{tCommon("daily_limit")}</Label>
            <Input id="sp-limit" aria-invalid defaultValue="-100" />
            <p className="text-[11px] text-destructive-ink">{t("must_be_a_positive_amount")}</p>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="sp-notes">Notes</Label>
            <Textarea id="sp-notes" rows={3} placeholder={t("internal_notes")} />
          </div>
        </div>
      </Panel>

      {/* The dialog BODY, rendered inline rather than in a real dialog. A
          portalled Radix dialog mounts outside this page's flow and could not be
          seen next to everything else — and a specimen the owner has to open is
          one they will not check. */}
      <Panel label={t("dialog_body_shown_inline_with_the_scrim_behind_it")}>
        {/* Same inline style as `DialogOverlay`, for the same reason: the
            `bg-overlay/[calc(…)]` class this replaces emits no CSS, so the
            preview of "Scrim strength" showed no scrim and never responded to
            the control it exists to demonstrate. */}
        <div
          className="rounded-lg p-6"
          style={{
            backgroundColor:
              "hsl(var(--overlay) / calc(0.8 * var(--dialog-overlay-opacity, 1)))",
          }}
        >
          <div className="mx-auto max-w-md rounded-lg border border-border bg-background p-[var(--dialog-padding)]">
            <p className="text-sm font-semibold">{t("delete_this_account")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("this_cannot_be_undone_the_balance")}
            </p>
            <div className="mt-4 flex flex-col gap-[var(--field-gap)]">
              <div className="grid gap-1.5">
                <Label htmlFor="sp-confirm">{t("type_the_symbol_to_confirm")}</Label>
                <Input id="sp-confirm" placeholder="AURA" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm">
                Cancel
              </Button>
              <Button size="sm" tone="destructive">
                Delete
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      <Panel label={t("alerts_every_tone_soft_and_solid")}>
        <div className="grid gap-2 lg:grid-cols-2">
          {ALERT_APPEARANCES.map((appearance) =>
            ALERT_TONES.map((tone) => (
              <Alert key={`${appearance}-${tone}`} tone={tone} appearance={appearance}>
                <Info aria-hidden="true" />
                <AlertTitle className="capitalize">
                  {tone} · {appearance}
                </AlertTitle>
                <AlertDescription>{t("what_this_alert_would_say_in_context")}</AlertDescription>
              </Alert>
            ))
          )}
        </div>
      </Panel>
    </Section>
  );
}

function DatavizSpecimen() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <Section
      title={t("charts_metrics")}
      hint={t("series_width_gridlines_data_points_and")}
    >
      <Panel label={t("metric_tiles_every_arrangement_including_pending")}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile label="Volume (24h)" value="$1.28M" icon={<TrendingUp className="size-4" />} />
          <MetricTile label={t("open_accounts")} value="8,412" icon={<Wallet className="size-4" />} />
          <MetricTile label={tCommon("fees_collected")} value="$40,210" valueFirst />
          <MetricTile label="Pending" value="12" loading valuePlaceholder="1,234" />
          <MetricTile label={t("left_aligned")} value="$920" align="start" />
          <MetricTile label="Tight" value="$310" padding="sm" />
          <MetricTile label="Square" value="$44" radius="none" />
          <MetricTile
            label="Headline"
            value="$219,075"
            valueFirst
            valueClassName="text-2xl"
          />
        </div>
      </Panel>

      <Panel label={t("series_charts_every_shape_the_kit_draws")}>
        <div className="grid gap-3 lg:grid-cols-2">
          {CHART_TYPES.map((type) => (
            <Card key={type} padding="md">
              <p className="mb-2 text-xs font-medium text-muted-foreground capitalize">{type}</p>
              <div className="h-44">
                <SeriesChart
                  data={SERIES_DATA}
                  series={[
                    { key: "volume", label: tCommon("volume") },
                    { key: "fees", label: tCommon("fees") },
                  ]}
                  type={type}
                  xKey="date"
                />
              </div>
            </Card>
          ))}
        </div>
      </Panel>

      <Panel label={t("donut_and_sparkline")}>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card padding="md">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Donut</p>
            <DonutChart data={DONUT} height={180} centerLabel="Total volume" />
          </Card>
          <Card padding="md">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {t("sparkline_deliberately_finer_than_a_full_chart")}
            </p>
            <div className="h-12 text-primary">
              <Sparkline data={SPARK} label="Volume" />
            </div>
            <div className="mt-4 h-12 text-success">
              <Sparkline data={[...SPARK].reverse()} label="Fees" />
            </div>
          </Card>
        </div>
      </Panel>
    </Section>
  );
}

/* ==========================================================================
   THE PAGE
   ========================================================================== */

const FAMILIES: Record<string, () => React.JSX.Element> = {
  table: TableSpecimen,
  control: ControlSpecimen,
  card: CardSpecimen,
  form: FormSpecimen,
  dataviz: DatavizSpecimen,
};

const ORDER = ["table", "control", "card", "form", "dataviz"];

export function DesignSpecimen({ only }: { only?: string }) {
  /* An unknown or absent `only` falls back to everything rather than to
     nothing. A blank preview reads as a broken page, and this route is also
     openable by hand. */
  const keys = only && FAMILIES[only] ? [only] : ORDER;

  return (
    <div className="min-h-dvh bg-background px-5 py-6 text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        {keys.map((k) => {
          const Family = FAMILIES[k];
          return <Family key={k} />;
        })}
      </div>
    </div>
  );
}

export default DesignSpecimen;
