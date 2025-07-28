import { Link } from "@/i18n/routing";
import { Clock } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActiveTrades } from "./active-trades";
import { useTranslations } from "next-intl";

interface ActiveTradesTabProps {
  activeTrades: any[];
  currentTime: string;
}

export function ActiveTradesTab({
  activeTrades,
  currentTime,
}: ActiveTradesTabProps) {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{t("active_trades")}</CardTitle>
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            {t("updated")}
            {currentTime}
          </div>
        </div>
        <CardDescription>{t("trades_that_are_require_action")}</CardDescription>
      </CardHeader>
      <CardContent>
        {activeTrades && activeTrades.length > 0 ? (
          <ActiveTrades trades={activeTrades} />
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">{t("no_active_trades")}</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {t("you_dont_have_any_active_trades_at_the_moment")}.{" "}
              {t("browse_offers_to_start_trading")}.
            </p>
            <Link href="/p2p/offer" className="mt-4">
              <Button>{t("find_offers")}</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
