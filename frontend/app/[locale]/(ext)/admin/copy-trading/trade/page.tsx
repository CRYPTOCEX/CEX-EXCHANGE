"use client";
import { useEffect, useState } from "react";
import DataTable from "@/components/blocks/data-table";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import { $fetch } from "@/lib/api";

interface Stats {
  totalTrades: number;
  leaderTrades: number;
  followerTrades: number;
  totalVolume: number;
  totalPnl: number;
}

export default function TradePage() {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();
  const [stats, setStats] = useState<Stats>({
    totalTrades: 0,
    leaderTrades: 0,
    followerTrades: 0,
    totalVolume: 0,
    totalPnl: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await $fetch({
        url: "/api/admin/copy-trading/trade",
        method: "GET",
        params: { page: 1, limit: 1 },
        silent: true,
      });
      if (data?.stats) {
        setStats(data.stats);
      }
    };
    fetchStats();
  }, []);

  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tExt("total_trades")}</p>
              <p className="text-xl font-bold">
                {stats.totalTrades.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("leader_trades")}</p>
              <p className="text-xl font-bold">
                {stats.leaderTrades.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
              <TrendingDown className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("follower_trades")}</p>
              <p className="text-xl font-bold">
                {stats.followerTrades.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tExt("total_volume")}</p>
              <p className="text-xl font-bold">
                ${stats.totalVolume.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                stats.totalPnl >= 0
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-red-100 dark:bg-red-900/30"
              }`}
            >
              <DollarSign
                className={`h-5 w-5 ${
                  stats.totalPnl >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("total_pnl")}</p>
              <p
                className={`text-xl font-bold ${
                  stats.totalPnl >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {stats.totalPnl >= 0 ? "+" : ""}$
                {stats.totalPnl.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DataTable
      apiEndpoint="/api/admin/copy-trading/trade"
      model="copyTradingTrade"
      permissions={{
        access: "access.copy_trading",
        view: "view.copy_trading",
        create: "create.copy_trading",
        edit: "edit.copy_trading",
        delete: "delete.copy_trading",
      }}
      pageSize={20}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={false}
      title={t("trades_management")}
      description={t("view_all_copy_trading_trades")}
      itemTitle="Trade"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      alertContent={<StatsCards />}
      design={{
        animation: "orbs",
        primaryColor: "indigo",
        secondaryColor: "violet",
        icon: Activity,
      }}
      extraRowActions={(row: any) => (
        <>
          {row.leader?.id && (
            <DropdownMenuItem
              onClick={() =>
                router.push(`/admin/copy-trading/leader/${row.leader.id}`)
              }
            >
              <ExternalLink className="mr-2 h-4 w-4 text-indigo-500" />
              {tExt("view_leader")}
            </DropdownMenuItem>
          )}
          {row.subscription?.id && (
            <DropdownMenuItem
              onClick={() =>
                router.push(`/admin/copy-trading/follower/${row.subscription.id}`)
              }
            >
              <ExternalLink className="mr-2 h-4 w-4 text-violet-500" />
              {tExt("view_subscription")}
            </DropdownMenuItem>
          )}
        </>
      )}
    />
  );
}
