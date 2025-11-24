import {
  ArrowUp,
  ArrowDown,
  Wallet,
  CheckCircle2,
  BarChart3,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";

interface StatsOverviewProps {
  tradeStats: {
    activeCount?: number;
    completedCount?: number;
    totalVolume?: number;
    avgCompletionTime?: string;
    successRate?: number;
  };
  activeTrades: any[];
  completedTrades: any[];
}

export function StatsOverview({
  tradeStats,
  activeTrades,
  completedTrades,
}: StatsOverviewProps) {
  const t = useTranslations("ext");
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-card overflow-hidden border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Wallet className="h-4 w-4 mr-2 text-primary" />
            {t("active_trades")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {tradeStats.activeCount || 0}
          </div>
          {/* Only show this if we have data */}
          {activeTrades && activeTrades.length > 0 && (
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <ArrowUp className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500 font-medium">{t("Active")}</span>
            </div>
          )}
          <Progress
            value={
              activeTrades
                ? (activeTrades.length / (tradeStats.activeCount || 1)) * 100
                : 0
            }
            className="h-1 mt-3"
          />
        </CardContent>
      </Card>

      <Card className="bg-card overflow-hidden border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
            {t("completed_trades")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {tradeStats.completedCount || 0}
          </div>
          {completedTrades && completedTrades.length > 0 && (
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <ArrowUp className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500 font-medium">
                {t("Completed")}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 mt-3">
            <Badge
              variant="outline"
              className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
            >
              {tradeStats.successRate || 0}
              {t("%_success_rate")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card overflow-hidden border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <BarChart3 className="h-4 w-4 mr-2 text-primary" />
            {t("trading_volume")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {tradeStats.totalVolume?.toLocaleString() || "0"}
          </div>
          {(tradeStats.totalVolume ?? 0) > 0 && (
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <ArrowUp className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500 font-medium">{t("Active")}</span>
            </div>
          )}
          {/* Only show chart if we have completed trades */}
          {completedTrades && completedTrades.length > 0 && (
            <div className="grid grid-cols-7 gap-1 h-8 mt-3">
              {completedTrades.slice(0, 7).map((trade, i) => {
                // Calculate a percentage based on trade amount relative to the largest trade
                const maxAmount = Math.max(
                  ...completedTrades.map((t) => t.fiatAmount)
                );
                const percentage = (trade.fiatAmount / maxAmount) * 100;

                return (
                  <div
                    key={i}
                    className="bg-primary/20 rounded-sm relative overflow-hidden"
                    style={{ height: "100%" }}
                  >
                    <div
                      className="absolute bottom-0 w-full bg-primary rounded-sm"
                      style={{ height: `${percentage}%` }}
                    ></div>
                  </div>
                );
              })}

              {/* Fill in remaining slots if we have fewer than 7 trades */}
              {Array(Math.max(0, 7 - completedTrades.length))
                .fill(0)
                .map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="bg-primary/20 rounded-sm relative overflow-hidden"
                    style={{ height: "100%" }}
                  >
                    <div
                      className="absolute bottom-0 w-full bg-primary rounded-sm"
                      style={{ height: "10%" }}
                    ></div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card overflow-hidden border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Clock className="h-4 w-4 mr-2 text-primary" />
            {t("average_completion")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {tradeStats.avgCompletionTime || "0"}
          </div>
          {tradeStats.avgCompletionTime && (
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <ArrowDown className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500 font-medium">
                {t("Efficient")}
              </span>
            </div>
          )}
          {(tradeStats.successRate ?? 0) > 90 && (
            <div className="flex items-center gap-1 mt-3">
              <Badge
                variant="outline"
                className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
              >
                {t("top_trader")}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
