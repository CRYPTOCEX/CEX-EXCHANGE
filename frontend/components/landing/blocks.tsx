"use client";

/**
 * Composed blocks built on the kit.
 *
 * Each addon landing page used to hand-configure the generic page-builder
 * sections through ~200 lines of props (orbs, particles, grid patterns, scroll
 * indicators, per-section themes). Those props are how nine different pages
 * ended up nine different designs while claiming to share components. Here the
 * arrangement is fixed and only the content varies, which is what "the same
 * design logic" actually requires.
 */

import React from "react";
import { m, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { SkeletonText } from "@/components/ui/skeleton";
import { Eyebrow, Headline, Panel, PrimaryCta, SecondaryCta, Section, SectionHeading } from "./kit";

// ---------------------------------------------------------------------------

export interface LandingAction {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
}

export interface LandingStat {
  icon?: any;
  /**
   * `ReactNode`, not `string`, so a figure that is still being fetched can be
   * passed as `<Loadable loading={…} placeholder="12,345"/>`.
   *
   * It was `string`, and that one word was blocking the pending state of every
   * landing hero and metric strip in the app: the copy-trading hero could not
   * skeleton its figures without editing this file, so it kept a whole-page
   * swap instead. The value is only ever rendered as a child — see the two
   * sites below — so nothing here treats it as text.
   *
   * A plain string still satisfies this, so all existing call sites are
   * unaffected.
   */
  value: React.ReactNode;
  label: string;
}

/**
 * One cell of the hero's figures row, in the shape the row actually renders.
 *
 * Local on purpose. The pending row needs a `label` that is a placeholder
 * rather than a string, and widening `LandingStat.label` to `ReactNode` to say
 * that would push a pending-state concern into the type 13 landing pages use to
 * declare their real content. The row maps over THIS, and `LandingStat` maps
 * into it — so there is still exactly one piece of cell markup.
 */
interface HeroStatCell {
  key: string;
  value: React.ReactNode;
  label: React.ReactNode;
  /** Announced by the `<dt>`. Absent while pending — there is nothing to say. */
  srLabel?: string;
}

/**
 * The figures row's PENDING cells.
 *
 * THREE, and the count is not a guess. The settled row is a single line at every
 * count the layout supports — `grid-cols-3` up to three figures,
 * `grid-cols-2 sm:grid-cols-4` from four — so at `sm` and above its height is
 * the height of ONE cell no matter how many figures arrive. Three placeholders
 * therefore reserve exactly what one, two, three or four real figures will
 * occupy. Only below `sm` does a four-figure row wrap to two lines, and no
 * landing page in this repo declares four.
 *
 * The placeholder STRINGS are real-shaped rather than lorem: `SkeletonText`
 * lays them out for real at `visibility:hidden` and measures the box from that,
 * so "12.3M+" against `text-2xl md:text-3xl` produces the same 36px line the
 * arriving figure will, and "Total raised" the same 16px caption line. Frozen
 * because it is a constant, not per-render state.
 */
const PENDING_STAT_CELLS: readonly HeroStatCell[] = Object.freeze(
  [0, 1, 2].map((i) => ({
    key: `pending-${i}`,
    value: <SkeletonText placeholder="12.3M+" />,
    label: <SkeletonText placeholder="Total raised" />,
  }))
);

/**
 * THE COLUMN COUNT FOLLOWS THE FIGURE COUNT.
 *
 * This was a flat `grid-cols-3` for anything under four, on the reasoning that
 * every landing page in the repo declared three. Two of them do not — a figure
 * is omitted rather than printed as a confident zero when the platform has no
 * value for it (see the `investment` hero, where `activeInvestors` and
 * `totalInvested` both drop out on an unpopulated install). Those pages then
 * rendered TWO figures into THREE tracks: the pair sat in columns 1 and 2 with
 * an empty third, so a centred hero read as visibly left-hung under its own
 * buttons, and the gap looked like a figure that had failed to load.
 *
 * Written as whole literal class strings and NOT as `grid-cols-${n}`. Tailwind
 * scans source text; a class name assembled at runtime is never emitted, so the
 * interpolated form compiles to nothing and every count silently falls back to
 * the browser default of one column.
 *
 * Four or more still wraps to two rows on mobile — that is a real constraint of
 * the viewport, not a count problem.
 */
function HERO_STAT_COLUMNS(count: number): string {
  if (count >= 4) return "grid-cols-2 sm:grid-cols-4";
  if (count === 3) return "grid-cols-3";
  if (count === 2) return "grid-cols-2";
  return "grid-cols-1";
}

/**
 * The hero. Text left, illustration right; centred when there is no
 * illustration. No particles, no scroll indicator, no orb array — the ground
 * behind it is `PageBackground`, which every landing page now shares.
 */
export function LandingHero({
  eyebrow,
  eyebrowIcon,
  title,
  highlight,
  subtitle,
  actions = [],
  stats = [],
  visual,
  footnote,
}: {
  eyebrow?: string;
  eyebrowIcon?: any;
  title: string;
  highlight?: string;
  subtitle?: string;
  actions?: LandingAction[];
  /**
   * The figures under the copy. THREE STATES, and the third one is the point.
   * ==========================================================================
   *
   *   omitted / `[]`  this hero has no figures. Nothing is reserved.
   *   `LandingStat[]` the figures. Rendered.
   *   `null`          THE FIGURES ARE STILL LOADING. The row is reserved and
   *                   filled with text-measured placeholders.
   *
   * WHY `null` HAD TO EXIST. An empty array is two completely different facts
   * wearing the same shape: "this install genuinely has no figures to show"
   * (`showStats` false on a fresh install with no data) and "the fetch has not
   * come back yet". The hero cannot tell them apart, and it has to, because the
   * two demand opposite renders — draw nothing, versus draw a reserved row.
   *
   * WHAT IT COST TO NOT HAVE IT, measured by `scripts/measure-layout-shift.mjs`
   * on /en/ico, /en/ecommerce and /en/staking: the callers pass `[]` while their
   * stats fetch is in flight, so the whole `<dl>` was absent from the first
   * paint and appeared 104px tall a second later (`mt-12` = 48px, plus a 56px
   * cell: a 36px `md:text-3xl` figure over a 20px caption). Because the hero's
   * two columns are `items-center` against each other, and the illustration is
   * the taller of the two, that 104px of growth was split in half and read as
   * the ENTIRE text column — eyebrow, headline, subtitle and both CTAs — sliding
   * 52px up the page. The harness reported it as `div [dy -52]`, scoring 0.008
   * on /en/ico and 0.0086 on /en/ecommerce.
   *
   * Note the sign, because it inverts the usual reading: a centred box that
   * GROWS moves UP. `dy -52` here is 104px of under-reservation, not 52px of
   * over-reservation, and reserving LESS would have made it worse.
   *
   * THE CALLER'S SIDE OF THIS is one word — `stats={isLoading ? null : heroStats}`
   * — and it is not optional. A caller that keeps passing `[]` while loading
   * gets exactly the shift described above; this prop only gives it somewhere to
   * say so. `null` is deliberately NOT the default: defaulting to "pending"
   * would leave a permanent pulsing skeleton in the hero of every install whose
   * figures legitimately resolve to nothing.
   */
  stats?: LandingStat[] | null;
  visual?: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();
  const hasVisual = Boolean(visual);

  /* `null` is the pending signal; anything else is content. See `stats` above. */
  const statsPending = stats === null;
  const statItems = stats ?? [];
  const statCells: readonly HeroStatCell[] = statsPending
    ? PENDING_STAT_CELLS
    : statItems.map((stat) => ({
        key: stat.label,
        value: stat.value,
        label: stat.label,
        srLabel: stat.label,
      }));

  /**
   * `animate` is unconditional; only `initial` is dropped.
   *
   * Spreading `{}` for reduced motion looked equivalent and was not. The server
   * renders with `prefersReducedMotion` unknown — so framer-motion writes
   * `opacity: 0` into the HTML — and the client then re-rendered with no
   * `animate` prop at all, leaving nothing to drive the value back up. The whole
   * hero (headline, subtitle, buttons, stats, illustration) stayed at zero
   * opacity for anyone browsing with reduced motion on. `initial={false}` starts
   * at the animate values instead, and keeping `animate` means the element is
   * driven to them either way.
   */
  const rise = {
    initial: prefersReducedMotion ? (false as const) : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <section className="relative overflow-hidden pb-16 pt-28 lg:pb-24 lg:pt-36">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div
          className={cn(
            "grid items-center gap-12 lg:gap-16",
            hasVisual ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]" : "mx-auto max-w-3xl text-center"
          )}
        >
          <m.div {...rise} transition={{ duration: 0.5, ease: "easeOut" }}>
            {eyebrow && <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>}

            <h1
              className={cn(
                "text-balance text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl",
                eyebrow ? "mt-6" : ""
              )}
            >
              <Headline title={title} highlight={highlight} />
            </h1>

            {subtitle && (
              <p
                className={cn(
                  "mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl",
                  !hasVisual && "mx-auto max-w-2xl"
                )}
              >
                {subtitle}
              </p>
            )}

            {actions.length > 0 && (
              <div className={cn("mt-9 flex flex-wrap gap-3", !hasVisual && "justify-center")}>
                {actions.map((action) =>
                  action.variant === "secondary" ? (
                    <SecondaryCta key={action.href + action.label} href={action.href}>
                      {action.label}
                    </SecondaryCta>
                  ) : (
                    <PrimaryCta key={action.href + action.label} href={action.href}>
                      {action.label}
                    </PrimaryCta>
                  )
                )}
              </div>
            )}

            {/* ONE figures row, rendered from `statCells`, whose only pending
                concession is what is INSIDE the `<dd>` and the caption. The
                grid, the `mt-12`, the cell wrapper and both typography elements
                are identical in both states — which is why the reserved box is
                the settled box rather than a second guess at it. */}
            {statCells.length > 0 && (
              <dl
                className={cn(
                  "mt-12 grid gap-x-8 gap-y-6",
                  HERO_STAT_COLUMNS(statCells.length),
                  !hasVisual && "mx-auto max-w-xl"
                )}
              >
                {statCells.map((cell) => (
                  <div key={cell.key} className={cn(!hasVisual && "text-center")}>
                    {/* Nothing to announce while pending — `SkeletonText` is
                        already `aria-busy` and its ruler is hidden from the
                        a11y tree, so an invented `<dt>` would be the only thing
                        in here asserting a fact we do not have. */}
                    {cell.srLabel && <dt className="sr-only">{cell.srLabel}</dt>}
                    <dd className="text-2xl font-bold tabular-nums tracking-tight text-foreground md:text-3xl">
                      {cell.value}
                    </dd>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{cell.label}</p>
                  </div>
                ))}
              </dl>
            )}

            {footnote && <div className={cn("mt-8", !hasVisual && "flex justify-center")}>{footnote}</div>}
          </m.div>

          {hasVisual && (
            <m.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.12 }}
              className="relative"
            >
              {visual}
            </m.div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * The numbers strip under a hero. One row, hairline dividers, no cards — a
 * figure is the most important thing on the line, so nothing else on it is
 * allowed to carry weight.
 */
export function MetricStrip({ stats, className }: { stats: LandingStat[]; className?: string }) {
  if (!stats.length) return null;
  return (
    <div className={cn("container mx-auto px-4 md:px-6", className)}>
      <Panel className="divide-y divide-border sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center gap-4 px-6 py-6">
              {Icon && (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
              )}
              <div className="min-w-0">
                <div className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{stat.value}</div>
                <div className="truncate text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

/**
 * Alternating narrative row: pitch on one side, illustration on the other.
 * `flip` swaps them so a run of rows reads as a rhythm rather than a list.
 */
export function FeatureRow({
  eyebrow,
  eyebrowIcon,
  title,
  highlight,
  description,
  bullets = [],
  action,
  visual,
  flip = false,
  bordered = true,
}: {
  eyebrow?: string;
  eyebrowIcon?: any;
  title: string;
  highlight?: string;
  description: string;
  bullets?: string[];
  action?: LandingAction;
  visual?: React.ReactNode;
  flip?: boolean;
  bordered?: boolean;
}) {
  const hasVisual = Boolean(visual);
  return (
    <Section bordered={bordered}>
      <div
        className={cn(
          "grid items-center gap-12 lg:gap-16",
          hasVisual ? "grid-cols-1 lg:grid-cols-2" : "mx-auto max-w-3xl grid-cols-1 text-center"
        )}
      >
        <div className={cn(flip && hasVisual && "lg:order-2")}>
          {eyebrow && <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>}

          <h2
            className={cn(
              "text-balance text-3xl font-bold leading-[1.15] tracking-tight md:text-4xl lg:text-[2.75rem]",
              eyebrow ? "mt-6" : ""
            )}
          >
            <Headline title={title} highlight={highlight} />
          </h2>

          <p className={cn("mt-5 text-lg leading-relaxed text-muted-foreground", !hasVisual && "mx-auto max-w-xl")}>
            {description}
          </p>

          {bullets.length > 0 && (
            <ul className={cn("mt-8 space-y-3", !hasVisual && "mx-auto max-w-md text-left")}>
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-[0.95rem] text-foreground">
                  <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {bullet}
                </li>
              ))}
            </ul>
          )}

          {action && (
            <div className={cn("mt-9", !hasVisual && "flex justify-center")}>
              <PrimaryCta href={action.href}>{action.label}</PrimaryCta>
            </div>
          )}
        </div>

        {hasVisual && <div className={cn(flip && "lg:order-1")}>{visual}</div>}
      </div>
    </Section>
  );
}

export interface Capability {
  icon?: any;
  title: string;
  description: string;
  href?: string;
}

/** The everything-else grid. Icon tiles carry the accent; the copy stays ink. */
export function CapabilityGrid({
  eyebrow,
  eyebrowIcon,
  title,
  highlight,
  subtitle,
  items,
  columns = 3,
  bordered = true,
}: {
  eyebrow?: string;
  eyebrowIcon?: any;
  title: string;
  highlight?: string;
  subtitle?: string;
  items: Capability[];
  columns?: 2 | 3 | 4;
  bordered?: boolean;
}) {
  if (!items.length) return null;
  return (
    <Section bordered={bordered}>
      <SectionHeading
        eyebrow={eyebrow}
        eyebrowIcon={eyebrowIcon}
        title={title}
        highlight={highlight}
        subtitle={subtitle}
      />
      <div
        className={cn(
          "grid gap-5",
          columns === 2 && "sm:grid-cols-2",
          columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
          columns === 4 && "sm:grid-cols-2 lg:grid-cols-4"
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const body = (
            <>
              {Icon && (
                <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              {item.href && (
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Explore
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </>
          );

          return item.href ? (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40 hover:bg-surface-2"
            >
              {body}
            </Link>
          ) : (
            <Panel key={item.title} hover className="p-6">
              {body}
            </Panel>
          );
        })}
      </div>
    </Section>
  );
}

export interface LandingStep {
  title: string;
  description: string;
  icon?: any;
}

/**
 * How it works. Numbering is real information here — these are ordered — so the
 * index is shown; nothing else in the kit numbers itself for decoration.
 */
export function StepRail({
  eyebrow,
  eyebrowIcon,
  title,
  highlight,
  subtitle,
  steps,
  action,
  bordered = true,
}: {
  eyebrow?: string;
  eyebrowIcon?: any;
  title: string;
  highlight?: string;
  subtitle?: string;
  steps: LandingStep[];
  action?: LandingAction;
  bordered?: boolean;
}) {
  if (!steps.length) return null;

  /**
   * The row is as wide as there are steps. It was pinned to four columns, so a
   * three-step page rendered a fourth empty cell with the rail running on into
   * it — which reads as a step that failed to load rather than as a rail.
   * Runtime-built class names never reach the compiler, so the count maps onto
   * literal classes.
   */
  const columnClass =
    steps.length === 1
      ? ""
      : steps.length === 2
        ? "sm:grid-cols-2"
        : steps.length === 3
          ? "sm:grid-cols-2 lg:grid-cols-3"
          : "sm:grid-cols-2 lg:grid-cols-4";

  /**
   * The rail was one absolute hairline drawn across the whole row, which meant
   * it ran *through* the "Step n" labels (they sit in the same flex line as the
   * icon, so nothing can be centred on the icon without crossing them) and kept
   * going past the last icon to the edge. It is a connector between steps, so
   * it is drawn as one: a `flex-1` segment after each label, bleeding into the
   * grid gap to meet the next tile. It cannot cross text, cannot outrun the
   * last step, and does not care how wide "Step" is in another language.
   * Above four steps the row wraps and a connector no longer describes it.
   */
  const showConnectors = steps.length > 1 && steps.length <= 4;

  return (
    <Section bordered={bordered}>
      <SectionHeading
        eyebrow={eyebrow}
        eyebrowIcon={eyebrowIcon}
        title={title}
        highlight={highlight}
        subtitle={subtitle}
      />
      <div className={cn("relative grid gap-6", columnClass)}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative">
              <div className="relative z-10 mb-6 flex items-center gap-3">
                <span className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                  {Icon ? (
                    <Icon className="h-5 w-5 text-primary" />
                  ) : (
                    <span className="text-sm font-bold tabular-nums text-primary">{index + 1}</span>
                  )}
                </span>
                {/* `subtle-foreground` measured 4.35:1 in light — under the 4.5
                    floor for 12px semibold. `muted` clears it at 5.63. */}
                <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {index + 1}
                </span>
                {showConnectors && index < steps.length - 1 && (
                  <span aria-hidden="true" className="hidden h-px flex-1 bg-border lg:-mr-6 lg:block" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          );
        })}
      </div>
      {action && (
        <div className="mt-14 flex justify-center">
          <PrimaryCta href={action.href}>{action.label}</PrimaryCta>
        </div>
      )}
    </Section>
  );
}

/** Reassurance row. Icons at accent, labels at ink — never a coloured label. */
export function TrustRow({ items, className }: { items: { icon?: any; label: string; detail?: string }[]; className?: string }) {
  if (!items.length) return null;
  return (
    <div className={cn("container mx-auto px-4 md:px-6", className)}>
      <div className="grid gap-6 border-y border-border py-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3">
              {Icon && <Icon className="h-5 w-5 shrink-0 text-primary" />}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{item.label}</div>
                {item.detail && <div className="truncate text-xs text-muted-foreground">{item.detail}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Closing panel. The one full-accent surface on the page, so it ends on it. */
export function ClosingCta({
  eyebrow,
  eyebrowIcon,
  title,
  highlight,
  subtitle,
  actions = [],
  note,
}: {
  eyebrow?: string;
  eyebrowIcon?: any;
  title: string;
  highlight?: string;
  subtitle?: string;
  actions?: LandingAction[];
  note?: string;
}) {
  return (
    <Section bordered className="pb-28">
      <Panel className="overflow-hidden px-6 py-16 text-center md:px-16">
        {/* Same single-hue wash as the page ground, kept inside the panel. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-1/2 left-1/2 h-[120%] w-[120%] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
        />
        <div className="relative mx-auto max-w-2xl">
          {eyebrow && <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>}
          <h2 className="mt-6 text-balance text-3xl font-bold leading-[1.15] tracking-tight md:text-4xl lg:text-5xl">
            <Headline title={title} highlight={highlight} />
          </h2>
          {subtitle && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{subtitle}</p>}
          {actions.length > 0 && (
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {actions.map((action) =>
                action.variant === "secondary" ? (
                  <SecondaryCta key={action.href + action.label} href={action.href}>
                    {action.label}
                  </SecondaryCta>
                ) : (
                  <PrimaryCta key={action.href + action.label} href={action.href}>
                    {action.label}
                  </PrimaryCta>
                )
              )}
            </div>
          )}
          {note && <p className="mt-6 text-sm text-subtle-foreground">{note}</p>}
        </div>
      </Panel>
    </Section>
  );
}
