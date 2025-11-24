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
  const t = useTranslations("trade/components/markets/watchlist-header");
  return (
    <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 bg-muted/80 dark:bg-zinc-900/80">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Sparkles className="h-3 w-3 text-yellow-400 mr-1.5" />
          <span className="text-xs font-medium">{t("your_watchlist")}</span>
        </div>
        <div className="text-xs text-muted-foreground dark:text-zinc-500">
          {marketCount} {t("markets")}
        </div>
      </div>
      <WatchlistSortButtons sortCriteria={sortCriteria} onSort={onSort} />
    </div>
  );
}
