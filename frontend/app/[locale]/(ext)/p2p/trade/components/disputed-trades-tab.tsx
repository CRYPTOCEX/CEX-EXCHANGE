import { Link } from "@/i18n/routing";
import { Shield } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";

// Constants
const TRADE_TYPE = {
  BUY: "BUY",
  SELL: "SELL",
};
interface DisputedTradesTabProps {
  disputedTrades: any[];
}
export function DisputedTradesTab({ disputedTrades }: DisputedTradesTabProps) {
  const t = useTranslations("ext_p2p");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("disputed_trades")}</CardTitle>
        <CardDescription>
          {t("trades_that_have_been_disputed_and")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {disputedTrades && disputedTrades.length > 0 ? (
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-4 text-left text-xs font-medium">
                      {tExt("trade_id")}
                    </th>
                    <th className="h-10 px-4 text-left text-xs font-medium">
                      Type
                    </th>
                    <th className="h-10 px-4 text-left text-xs font-medium">
                      Amount
                    </th>
                    <th className="h-10 px-4 text-left text-xs font-medium">
                      Counterparty
                    </th>
                    <th className="h-10 px-4 text-left text-xs font-medium">
                      Status
                    </th>
                    <th className="h-10 px-4 text-left text-xs font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {disputedTrades.map((trade) => {
                    return (
                      <tr
                        key={trade.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-2 align-middle text-xs">{trade.id}</td>
                        <td className="p-2 align-middle text-xs">
                          <Badge
                            variant="outline"
                            className={
                              trade.type === TRADE_TYPE.BUY
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            }
                          >
                            {trade.type === TRADE_TYPE.BUY ? "Buy" : "Sell"}
                          </Badge>
                        </td>
                        <td className="p-2 align-middle text-xs">
                          {trade.amount} {trade.coin}
                          <div className="text-muted-foreground">
                            ${trade.fiatAmount?.toLocaleString()}
                          </div>
                        </td>
                        <td className="p-2 align-middle text-xs">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback>
                                {trade.counterparty
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{trade.counterparty}</span>
                          </div>
                        </td>
                        <td className="p-2 align-middle text-xs">
                          <Badge variant="destructive">{tCommon("under_review")}</Badge>
                        </td>
                        <td className="p-2 align-middle text-xs">
                          <Link href={`/p2p/trade/${trade.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">{t("no_disputed_trades")}</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {t("you_dont_have_any_disputed_trades")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
