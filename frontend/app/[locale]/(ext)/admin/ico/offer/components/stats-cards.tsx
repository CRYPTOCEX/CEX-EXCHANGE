import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IcoAdminStats } from "./status-chart";
import { useTranslations } from "next-intl";

interface StatsCardsProps {
  stats: IcoAdminStats | null;
  isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const t = useTranslations("ext");
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_offerings")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <div className="text-2xl font-bold">
              {stats?.totalOfferings || 0}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("pending_approval")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <div className="text-2xl font-bold">
              {stats?.pendingOfferings || 0}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_raised")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <div className="text-2xl font-bold">
              / $
              {((stats?.totalRaised || 0) / 1000000).toFixed(2)}
              M
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("success_rate")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <div className="text-2xl font-bold">{stats?.successRate || 0}%</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
