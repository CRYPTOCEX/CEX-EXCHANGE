import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export interface IcoAdminStats {
  totalOfferings: number;
  activeOfferings: number;
  pendingOfferings: number;
  completedOfferings: number;
  rejectedOfferings: number;
  totalRaised: number;
  successRate: number;
}

interface OfferingStatusChartProps {
  stats: IcoAdminStats | null;
  isLoading: boolean;
}

export function OfferingStatusChart({
  stats,
  isLoading,
}: OfferingStatusChartProps) {
  const t = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const totalOfferings = stats?.totalOfferings || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tExtAdmin("offering_status")}</CardTitle>
        <CardDescription>
          {tExtAdmin("distribution_of_offerings_by_status")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">{t("active")}</div>
                <div className="text-sm font-medium">
                  {stats?.activeOfferings || 0}
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${
                      totalOfferings
                        ? ((stats?.activeOfferings || 0) / totalOfferings) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">{t("pending")}</div>
                <div className="text-sm font-medium">
                  {stats?.pendingOfferings || 0}
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full"
                  style={{
                    width: `${
                      totalOfferings
                        ? ((stats?.pendingOfferings || 0) / totalOfferings) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">{t("completed")}</div>
                <div className="text-sm font-medium">
                  {stats?.completedOfferings || 0}
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${
                      totalOfferings
                        ? ((stats?.completedOfferings || 0) / totalOfferings) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">{t("rejected")}</div>
                <div className="text-sm font-medium">
                  {stats?.rejectedOfferings || 0}
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{
                    width: `${
                      totalOfferings
                        ? ((stats?.rejectedOfferings || 0) / totalOfferings) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
