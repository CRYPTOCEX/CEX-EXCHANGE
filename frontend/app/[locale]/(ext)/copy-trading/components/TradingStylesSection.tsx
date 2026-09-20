"use client";

/**
 * Trading styles grid.
 *
 * Rebuilt on the landing kit. What was here before predated the Obsidian
 * migration and failed on its own terms:
 *
 *  - the stat tiles were `bg-muted/80 dark:bg-muted/50` sitting on a
 *    `bg-card/80 dark:bg-surface-2/80` card. In dark that composites to ~10.5%
 *    lightness on ~8.4% — a two-point difference, so "Leaders" and "Avg. ROI"
 *    read as loose text floating on the card rather than as panels. The ramp
 *    (`surface-2` + a hairline) is opaque and therefore deterministic wherever
 *    the card lands;
 *  - nothing in the chain was `h-full`, so each card stopped at its own content
 *    and a two-line description made one card taller than the row;
 *  - the hover arrow was absolutely positioned into the stats block;
 *  - the heading took the accent (R2 reserves it for what is interactive or the
 *    one figure that matters — the icon tile and the hover state already carry
 *    it here).
 */

import { m } from "framer-motion";
import { Zap, BarChart3, TrendingUp, Shield, ChevronRight, Sparkles } from "lucide-react";
import { Section, SectionHeading, SecondaryCta } from "@/components/landing";
import { Loadable } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface StyleStats {
  count: number;
  avgRoi: number;
  topRoi: number;
}

interface TradingStylesSectionProps {
  byTradingStyle: Record<string, StyleStats>;
  isLoading?: boolean;
}

const styleConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    description: string;
  }
> = {
  SCALPING: {
    icon: Zap,
    label: "Scalping",
    description: "Quick trades, small profits, high frequency",
  },
  DAY_TRADING: {
    icon: BarChart3,
    label: "Day Trading",
    description: "Intraday positions, closed before market end",
  },
  SWING: {
    icon: TrendingUp,
    label: "Swing Trading",
    description: "Multi-day holds, capture larger moves",
  },
  POSITION: {
    icon: Shield,
    label: "Position Trading",
    description: "Long-term holds, fundamental focus",
  },
};

/**
 * One style card, in BOTH states.
 *
 * Almost everything on this card is STATIC — the icon, the label, the
 * description, the two stat captions, the CTA — because it all comes from the
 * local `styleConfig` table keyed by a style this component already knows. The
 * old `LoadingCard` threw all of it away and drew six grey boxes instead, so a
 * visitor spent the fetch unable to read four headings that were sitting in the
 * bundle. Only `count`, `avgRoi` and `topRoi` are actually in flight.
 */
function StyleCard({
  style,
  stats,
  index,
  loading = false,
}: {
  style: string;
  stats: StyleStats;
  index: number;
  loading?: boolean;
}) {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const config = styleConfig[style] || styleConfig.DAY_TRADING;
  const IconComponent = config.icon;

  /**
   * `up`/`down` are the direction of money (R5). A style with no leaders yet
   * has an average of exactly zero, which is neither — it was printing a green
   * "+0.0%" as though the flat line were a gain.
   */
  const roiInk =
    stats.avgRoi > 0 ? "text-up" : stats.avgRoi < 0 ? "text-down" : "text-foreground";
  const roiSign = stats.avgRoi > 0 ? "+" : "";

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group h-full"
    >
      <Link
        href={`/copy-trading/leader?tradingStyle=${style}`}
        className="flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40 hover:bg-surface-2"
      >
        <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
          <IconComponent className="h-5 w-5 text-primary" />
        </span>

        <h3 className="text-lg font-semibold text-foreground">{config.label}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{config.description}</p>

        {/* Pinned to the bottom so the figures line up across the row whatever
            the description does above them. */}
        <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
          <div className="rounded-md border border-border bg-surface-2 px-3 py-2.5">
            <div className="text-xs text-muted-foreground">Leaders</div>
            <div className="mt-1 text-base font-semibold tabular-nums text-foreground">
              <Loadable loading={loading} chars={2}>
                {stats.count}
              </Loadable>
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface-2 px-3 py-2.5">
            <div className="text-xs text-muted-foreground">{t("avg_roi")}</div>
            <div className={`mt-1 text-base font-semibold tabular-nums ${roiInk}`}>
              <Loadable loading={loading} placeholder="+12.3%">
                {`${roiSign}${stats.avgRoi.toFixed(1)}%`}
              </Loadable>
            </div>
          </div>
        </div>

        {/* The top-performer row is ~20px plus its margin. Withholding it until
            the fetch resolved pushed the "View leaders" CTA — and, because these
            cards are `h-full` in a stretch row, every sibling card — down by
            that much the moment the data landed. */}
        {(loading || stats.topRoi > 0) && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{tExt("top_performer")}</span>
            <span className="font-semibold tabular-nums text-up">
              <Loadable loading={loading} placeholder="+45.6%">
                {`+${stats.topRoi.toFixed(1)}%`}
              </Loadable>
            </span>
          </div>
        )}

        <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          {t("view_leaders")}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </m.div>
  );
}

export default function TradingStylesSection({
  byTradingStyle,
  isLoading,
}: TradingStylesSectionProps) {
  const t = useTranslations("ext_copy-trading");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  const styles = ["SCALPING", "DAY_TRADING", "SWING", "POSITION"];

  // Check if we have any data
  const hasData = Object.values(byTradingStyle).some((s) => s.count > 0);

  if (!isLoading && !hasData) {
    return null;
  }

  return (
    <Section bordered>
      <SectionHeading
        eyebrow={tExt("trading_styles") || "Trading Styles"}
        eyebrowIcon={Sparkles}
        title={t("find_your_trading_style") || t("find_your_trading_style")}
        subtitle={
          t("choose_leaders_that_match") ||
          t("choose_leaders_that_match_your_preferred")
        }
      />

      <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {styles.map((style, index) => (
          <StyleCard
            key={style}
            style={style}
            stats={byTradingStyle[style] || { count: 0, avgRoi: 0, topRoi: 0 }}
            index={index}
            loading={isLoading}
          />
        ))}
      </div>

      <div className="mt-14 flex justify-center">
        <SecondaryCta href="/copy-trading/leader">{tCommon("view_all_leaders")}</SecondaryCta>
      </div>
    </Section>
  );
}
