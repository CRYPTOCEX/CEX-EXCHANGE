import { Skeleton } from "@/components/ui/skeleton";
import { IcoAdminStats } from "./status-chart";
import { useTranslations } from "next-intl";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Layers, Clock, DollarSign, TrendingUp } from "lucide-react";

interface StatsCardsProps {
  stats: IcoAdminStats | null;
  isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        label={t("total_offerings")}
        value={stats?.totalOfferings || 0}
        icon={Layers}
        index={0}
        {...statsCardColors.purple}
      />
      <StatsCard
        label={t("pending_approval")}
        value={stats?.pendingOfferings || 0}
        icon={Clock}
        index={1}
        {...statsCardColors.amber}
      />
      <StatsCard
        label={t("total_raised")}
        value={`$${((stats?.totalRaised || 0) / 1000000).toFixed(2)}M`}
        icon={DollarSign}
        index={2}
        {...statsCardColors.green}
      />
      <StatsCard
        label={tCommon("success_rate")}
        value={`${stats?.successRate || 0}%`}
        icon={TrendingUp}
        index={3}
        {...statsCardColors.blue}
      />
    </div>
  );
}
