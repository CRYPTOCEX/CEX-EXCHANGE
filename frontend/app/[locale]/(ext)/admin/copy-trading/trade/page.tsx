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
import { $fetch } from "@/lib/api";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";

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
  const tCommon = useTranslations("common");
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
      <StatsCard
        label={tCommon("total_trades")}
        value={stats.totalTrades}
        icon={Activity}
        index={0}
        {...statsCardColors.blue}
      />
      <StatsCard
        label={t("leader_trades")}
        value={stats.leaderTrades}
        icon={TrendingUp}
        index={1}
        {...statsCardColors.purple}
      />
      <StatsCard
        label={t("follower_trades")}
        value={stats.followerTrades}
        icon={TrendingDown}
        index={2}
        {...statsCardColors.purple}
      />
      <StatsCard
        label={tCommon("total_volume")}
        value={stats.totalVolume}
        icon={BarChart3}
        index={3}
        isCurrency
        {...statsCardColors.orange}
      />
      <StatsCard
        label={t("total_pnl")}
        value={`${stats.totalPnl >= 0 ? "+" : ""}$${stats.totalPnl.toLocaleString()}`}
        icon={DollarSign}
        index={4}
        {...(stats.totalPnl >= 0 ? statsCardColors.green : statsCardColors.red)}
      />
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
