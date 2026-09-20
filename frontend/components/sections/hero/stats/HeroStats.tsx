"use client";

import { m } from "framer-motion";
import { Loadable } from "@/components/ui/skeleton";
import { StatsConfig, StatConfig } from "../types";
import AnimatedCounter from "./AnimatedCounter";

interface HeroStatsProps {
  config: StatsConfig;
  theme?: {
    primary?: string;
    secondary?: string;
  };
  animate?: boolean;
  loading?: boolean;
}

const layoutClasses = {
  row: "flex flex-wrap justify-center gap-3 md:gap-8",
  column: "flex flex-col gap-4",
  grid: "grid grid-cols-2 md:grid-cols-4 gap-4",
};

// Color map for common theme colors
/**
 * Stat colours -> design tokens.
 *
 * Was a hand-tuned light/dark hex PAIR per hue, which is the JS-level theme
 * fork the design system exists to remove: the value is chosen in JavaScript,
 * so it cannot follow a theme change and it renders the wrong half for a frame
 * before hydration. Worse, only `colors.light` was ever read — every `dark`
 * entry here has been dead, and these stats have been showing their light-mode
 * hex on the dark hero all along.
 *
 * A token carries both themes on its own, so one value per name is enough.
 */
const colorMap: Record<string, string> = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  teal: "hsl(var(--primary))",
  cyan: "hsl(var(--primary))",
  blue: "hsl(var(--primary))",
  purple: "hsl(var(--primary))",
  pink: "hsl(var(--primary))",
  indigo: "hsl(var(--primary))",
  violet: "hsl(var(--primary))",
  red: "hsl(var(--destructive))",
  orange: "hsl(var(--warning))",
  yellow: "hsl(var(--warning))",
  green: "hsl(var(--success))",
  emerald: "hsl(var(--success))",
};

export default function HeroStats({
  config,
  theme = { primary: "primary" },
  animate = true,
  loading = false,
}: HeroStatsProps) {
  const { items, layout = "row", style = "badges", className } = config;
  const accent = colorMap[theme.primary || "primary"] || colorMap.primary;

  /**
   * THE PENDING HERO IS THE REAL HERO WITH THE FIGURES OUT.
   * ==========================================================================
   *
   * What was here was `if (loading) return <div className="flex gap-4">` holding
   * N `h-12 w-32` blocks, and it matched none of the three layouts or three
   * styles this component actually renders:
   *
   *   - CONTAINER. The pending row was always `flex gap-4`. The real container
   *     is `layoutClasses[layout]` — `flex flex-wrap justify-center gap-3
   *     md:gap-8` for `row`, `flex flex-col gap-4` for `column`, `grid
   *     grid-cols-2 md:grid-cols-4 gap-4` for `grid`. So a `column` hero laid
   *     its skeleton out sideways and then stacked it, and a `grid` hero
   *     skipped the grid entirely. It also ignored `config.className`, which is
   *     the override every custom hero uses.
   *   - HEIGHT. 48px, against a `badges` item that measures about 34px
   *     (`py-1.5` + a 20px `text-sm` line + 2px of border) and a `cards` item
   *     that measures about 138px (`p-4` + a 32px icon + `mb-3` + a 36px
   *     `text-3xl` line + `mb-1` + a 20px `text-sm` line + border). One style
   *     shrank 14px on arrival, another grew 90px — under the fold-line of a
   *     hero, which is the most-measured region of the site.
   *   - WIDTH. `w-32` for every item, where a real badge is sized by its label.
   *
   * `label` and `icon` are CONFIG. They are in hand before the counter fetch
   * resolves and there is no reason to withhold them, so every layout renders
   * its own real chrome and only the figure waits.
   */
  const hasItems = Boolean(items && items.length > 0);
  if (!loading && !hasItems) return null;

  /* Nothing to draw chrome from yet: a hero whose stat CONFIG is itself in
     flight has no labels or icons to render, so three generic pending items
     stand in — the same count the old skeleton defaulted to, now in the real
     shell for the real layout. */
  const renderItems: StatConfig[] = hasItems
    ? items
    : [0, 1, 2].map(() => ({ value: 0, label: "" }));

  /**
   * The figure, for all three styles.
   *
   * It was written out three times — once per style — which is why the pending
   * state could only ever have been a fourth copy. Wrapping it once means the
   * placeholder is laid out by whichever of `text-sm`, `text-3xl` or `text-2xl`
   * the enclosing style carries, with no size table to keep in step.
   *
   * `prefix`/`suffix` wait WITH the value even though they are config: "$" and
   * "+" read as part of one number, and painting them either side of a pulse
   * makes the placeholder look like a broken value rather than a pending one.
   */
  const renderFigure = (stat: StatConfig) => (
    <Loadable loading={loading} placeholder="000,000">
      {stat.animate !== false ? (
        <AnimatedCounter
          value={stat.value}
          suffix={stat.suffix}
          prefix={stat.prefix || ""}
          decimals={stat.decimals || 0}
        />
      ) : (
        <>
          {stat.prefix}
          {stat.value.toFixed(stat.decimals || 0)}
          {stat.suffix}
        </>
      )}
    </Loadable>
  );

  /* A label is config and renders immediately. It only ever waits when the
     stat CONFIG itself has not arrived, i.e. for the synthesized items above. */
  const renderLabel = (stat: StatConfig) => (
    <Loadable loading={loading && !stat.label} chars={9}>
      {stat.label}
    </Loadable>
  );

  const renderStatBadge = (stat: StatConfig, index: number) => {
    const Icon = stat.icon;

    const content = (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 md:gap-2 md:px-4 md:py-2 rounded-lg bg-card border border-border cursor-default">
        {Icon && (
          <Icon
            className="w-3.5 h-3.5 md:w-4 md:h-4"
            style={{ color: accent }}
          />
        )}
        <span className="font-mono tabular-nums font-bold text-sm md:text-base text-foreground">
          {renderFigure(stat)}
        </span>
        <span className="text-xs md:text-sm text-subtle-foreground">
          {renderLabel(stat)}
        </span>
      </div>
    );

    if (!animate) return <div key={index}>{content}</div>;

    return (
      <m.div
        key={index}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
      >
        {content}
      </m.div>
    );
  };

  const renderStatCard = (stat: StatConfig, index: number) => {
    const Icon = stat.icon;

    const content = (
      <div className="flex flex-col items-center p-4 rounded-lg bg-card border border-border">
        {Icon && (
          <Icon
            className="w-8 h-8 mb-3"
            style={{ color: accent }}
          />
        )}
        <span className="font-mono tabular-nums text-3xl font-bold text-foreground mb-1">
          {renderFigure(stat)}
        </span>
        <span className="text-sm text-subtle-foreground">
          {renderLabel(stat)}
        </span>
      </div>
    );

    if (!animate) return <div key={index}>{content}</div>;

    return (
      <m.div
        key={index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
      >
        {content}
      </m.div>
    );
  };

  const renderStatMinimal = (stat: StatConfig, index: number) => {
    const Icon = stat.icon;

    const content = (
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon
            className="w-5 h-5"
            style={{ color: accent }}
          />
        )}
        <div>
          <span className="font-mono tabular-nums text-2xl font-bold text-foreground">
            {renderFigure(stat)}
          </span>
          <span className="ml-2 text-sm text-subtle-foreground">
            {renderLabel(stat)}
          </span>
        </div>
      </div>
    );

    if (!animate) return <div key={index}>{content}</div>;

    return (
      <m.div
        key={index}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
      >
        {content}
      </m.div>
    );
  };

  const renderStat = (stat: StatConfig, index: number) => {
    switch (style) {
      case "badges":
        return renderStatBadge(stat, index);
      case "cards":
        return renderStatCard(stat, index);
      case "minimal":
        return renderStatMinimal(stat, index);
      default:
        return renderStatBadge(stat, index);
    }
  };

  return (
    <div className={className || layoutClasses[layout]}>
      {renderItems.map((stat, index) => renderStat(stat, index))}
    </div>
  );
}
