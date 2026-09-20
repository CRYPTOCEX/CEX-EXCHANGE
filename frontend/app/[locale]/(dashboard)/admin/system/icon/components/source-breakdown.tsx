"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

import { count, type IconReport } from "./types";

/**
 * Which resolver in the chain could supply each icon.
 *
 * All bars share one accent on purpose. Seven sources cannot be told apart on a
 * five-slot categorical ramp without two of them colliding, and the resolver
 * name is right there on the row — a colour per bar would be decoration
 * pretending to be data. The bar's LENGTH is the whole message.
 */
export function SourceBreakdown({
  report,
  loading,
}: {
  report: IconReport | null;
  loading: boolean;
}) {
  const t = useTranslations("dashboard_admin");

  const rows = useMemo(() => {
    const entries = Object.entries(report?.bySource || {})
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);
    const max = entries.length ? entries[0][1] : 0;
    return entries.map(([source, n]) => ({ source, n, pct: max ? (n / max) * 100 : 0 }));
  }, [report]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>{t("where_the_icons_came_from")}</CardTitle>
        <CardDescription>{t("which_resolver_can_supply_each_icon")}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : !rows.length ? (
          <EmptyState
            size="sm"
            icon={<Search />}
            title={t("no_source_could_be_matched")}
            description={t("run_a_scan_with_network_sources_enabled")}
          />
        ) : (
          <ul className="space-y-3">
            {rows.map(({ source, n, pct }) => (
              <li key={source} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-mono text-xs text-foreground">{source}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {count(n)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
