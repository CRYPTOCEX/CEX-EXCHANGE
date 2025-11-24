import { AlertTriangle, Clock, Sparkles, Star } from "lucide-react";
import { useTranslations } from "next-intl";

export function WatchlistEmptyState() {
  const t = useTranslations("trade/components/markets/watchlist-empty-state");
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-xs">
          {/* Star icon with sparkle */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-muted/80 dark:bg-zinc-900/80 flex items-center justify-center">
                <Star className="h-10 w-10 text-muted-foreground/30 dark:text-zinc-700" />
              </div>
              <Sparkles className="absolute bottom-1 right-1 h-5 w-5 text-yellow-400" />
            </div>
          </div>

          {/* Main card */}
          <div className="bg-muted/80 dark:bg-zinc-900/80 rounded-lg p-5">
            <h3 className="text-center text-xl font-bold text-foreground dark:text-white mb-2">
              {t("create_your_watchlist")}
            </h3>
            <p className="text-center text-muted-foreground dark:text-zinc-400 text-sm mb-6">
              {t("track_your_favorite_and_trading")}
            </p>

            {/* Subtle hint */}
            <p className="text-center text-muted-foreground/70 dark:text-zinc-500 text-xs mt-2">
              {t("switch_to_markets_tab_to_add_symbols")}
            </p>

            {/* Updates in real-time */}
            <div className="flex items-center justify-center mt-4 space-x-1.5 text-xs text-muted-foreground/70 dark:text-zinc-500">
              <Clock className="h-3.5 w-3.5" />
              <span>{t("updates_in_real-time")}</span>
            </div>
          </div>

          {/* Market volatility warning */}
          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center space-x-2 bg-muted/70 dark:bg-zinc-900/70 px-4 py-2 rounded-full">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground dark:text-zinc-400">
                {t("market_volatility_may_affect_prices")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
