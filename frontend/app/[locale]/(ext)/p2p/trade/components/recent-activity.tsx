import { Link } from "@/i18n/routing";
import { Plus, Wallet, CheckCircle2, Star } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

// Constants
const ACTIVITY_TYPE = {
  TRADE_CREATED: "TRADE_CREATED",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
  TRADE_COMPLETED: "TRADE_COMPLETED",
  FEEDBACK_RECEIVED: "FEEDBACK_RECEIVED",
};

interface RecentActivityProps {
  recentActivity: any[];
}

export function RecentActivity({ recentActivity }: RecentActivityProps) {
  const t = useTranslations("ext");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recent_activity")}</CardTitle>
        <CardDescription>{t("latest_updates_on_your_trades")}</CardDescription>
      </CardHeader>
      <CardContent>
        {recentActivity && recentActivity.length > 0 ? (
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      activity.type === ACTIVITY_TYPE.TRADE_CREATED
                        ? "bg-blue-100 text-blue-600"
                        : activity.type === ACTIVITY_TYPE.PAYMENT_CONFIRMED
                          ? "bg-yellow-100 text-yellow-600"
                          : activity.type === ACTIVITY_TYPE.TRADE_COMPLETED
                            ? "bg-green-100 text-green-600"
                            : "bg-purple-100 text-purple-600"
                    }`}
                  >
                    {activity.type === ACTIVITY_TYPE.TRADE_CREATED ? (
                      <Plus className="h-4 w-4" />
                    ) : activity.type === ACTIVITY_TYPE.PAYMENT_CONFIRMED ? (
                      <Wallet className="h-4 w-4" />
                    ) : activity.type === ACTIVITY_TYPE.TRADE_COMPLETED ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Star className="h-4 w-4" />
                    )}
                  </div>
                  {activity.id !==
                    recentActivity[recentActivity.length - 1].id && (
                    <div className="w-0.5 h-full bg-border" />
                  )}
                </div>
                <div className="space-y-1 pb-4">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {activity.tradeId}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              {t("no_recent_activity_to_display")}.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/p2p/dashboard" className="w-full">
          <Button variant="ghost" size="sm">
            {t("view_all_activity")}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
