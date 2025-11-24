"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Coins,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface AdditionalMetricsProps {
  avgLockPeriod: number;
  pendingWithdrawals: number;
  analytics: any;
}

export default function AdditionalMetrics({
  avgLockPeriod,
  pendingWithdrawals,
  analytics,
}: AdditionalMetricsProps) {
  const t = useTranslations("ext");
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("retention_metrics")}</CardTitle>
          <CardDescription>
            {t("user_retention_and_withdrawal_rates")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{t("retention_rate")}</span>
              </div>
              <span className="font-medium">
                {analytics?.retentionRate?.toFixed(0) || "0"}%
              </span>
            </div>
            <Progress value={analytics?.retentionRate || 0} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>{t("early_withdrawal_rate")}</span>
              </div>
              <span className="font-medium">
                {analytics?.earlyWithdrawalRate?.toFixed(0) || "0"}%
              </span>
            </div>
            <Progress
              value={analytics?.earlyWithdrawalRate || 0}
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>
                  {t("Avg")}. {t("lock_period")}
                </span>
              </div>
              <span className="font-medium">
                {avgLockPeriod.toFixed(0)}
                {t("days")}
              </span>
            </div>
            <Progress value={(avgLockPeriod / 90) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("pending_actions")}</CardTitle>
          <CardDescription>{t("items_requiring_attention")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">{t("withdrawal_requests")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t("pending_approval")}
                  </p>
                </div>
              </div>
              <div className="text-2xl font-bold">{pendingWithdrawals}</div>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">{t("earnings_distribution")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t("scheduled_for_today")}
                  </p>
                </div>
              </div>
              <div className="text-2xl font-bold">
                {analytics?.totalAdminEarnings?.toLocaleString() || "0"}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">{t("total_earnings")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t("distributed_to_users")}
                  </p>
                </div>
              </div>
              <div className="text-2xl font-bold">
                {analytics?.totalRewardsDistributed?.toLocaleString() || "0"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
