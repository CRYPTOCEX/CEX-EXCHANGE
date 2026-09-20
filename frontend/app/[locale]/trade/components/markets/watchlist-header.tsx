import { Sparkles } from "lucide-react";
import { WatchlistSortButtons } from "./watchlist-sort-buttons";
import type { SortCriteria, SortField } from "./types";
import { useTranslations } from "next-intl";

interface WatchlistHeaderProps {
  marketCount: number;
  sortCriteria: SortCriteria;
  onSort: (field: SortField) => void;
}

export function WatchlistHeader({
  marketCount,
  sortCriteria,
  onSort,
}: WatchlistHeaderProps) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
  return (
    <div className="border-b border-border bg-surface-2 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center">
          <Sparkles className="mr-1.5 h-3 w-3 shrink-0 text-primary" />
          <span className="truncate text-xs font-medium text-foreground">
            {t("your_watchlist")}
          </span>
        </div>
        <div className="shrink-0 text-xs text-muted-foreground">
          {marketCount} {tCommon("markets")}
        </div>
      </div>
      <WatchlistSortButtons sortCriteria={sortCriteria} onSort={onSort} />
    </div>
  );
}
