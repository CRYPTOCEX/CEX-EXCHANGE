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
import { useTranslations } from "next-intl";

export function PendingTradesTab() {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("pending_trades")}</CardTitle>
        <CardDescription>
          {t("trades_that_are_waiting_to_be_started_or_accepted")}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center py-8">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium">{t("no_pending_trades")}</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          {t("you_dont_have_any_pending_trades_at_the_moment")}.{" "}
          {t("browse_offers_to_start_trading")}.
        </p>
        <Link className="mt-4" href="/p2p/offer">
          <Button>{t("find_offers")}</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
