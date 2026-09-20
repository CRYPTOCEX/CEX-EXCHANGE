import { AlertTriangle, Clock, Sparkles, Star } from "lucide-react";
import { useTranslations } from "next-intl";

export function WatchlistEmptyState() {
  const t = useTranslations("trade_components");
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-xs">
          {/* Star icon with sparkle */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-surface-2">
                <Star className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <Sparkles className="absolute bottom-1 right-1 h-5 w-5 text-primary" />
            </div>
          </div>

          {/* Main card — a ramp step plus a hairline, not a tint (R3) */}
          <div className="rounded-lg border border-border bg-surface-2 p-5">
            <h3 className="mb-2 text-center text-xl font-semibold tracking-tight text-foreground">
              {t("create_your_watchlist")}
            </h3>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              {t("track_your_favorite_and_trading")}
            </p>

            {/* Subtle hint */}
            <p className="mt-2 text-center text-xs text-subtle-foreground">
              {t("switch_to_markets_tab_to_add_symbols")}
            </p>

            {/* Updates in real-time */}
            <div className="mt-4 flex items-center justify-center space-x-1.5 text-xs text-subtle-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{t("updates_in_real_time")}</span>
            </div>
          </div>

          {/* Market volatility warning — genuinely a caution, so the status
              token, and the hue sits on the icon while the copy stays
              foreground ink. */}
          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center space-x-2 rounded-full bg-surface-3 px-4 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
              <span className="text-xs text-muted-foreground">
                {t("market_volatility_may_affect_prices")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
