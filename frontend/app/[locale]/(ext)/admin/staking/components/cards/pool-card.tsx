"use client";

import { Link } from "@/i18n/routing";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface PoolCardProps {
  pool: StakingPool;
  onEdit?: (pool: StakingPool) => void;
  onDelete?: (id: string) => void;
}

export function PoolCard({ pool, onEdit, onDelete }: PoolCardProps) {
  const t = useTranslations("ext");
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-500">{t("Active")}</Badge>;
      case "INACTIVE":
        return <Badge variant="secondary">{t("Inactive")}</Badge>;
      case "COMING_SOON":
        return <Badge className="bg-blue-500">{t("coming_soon")}</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="flex items-center gap-4 p-6 md:w-2/3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {pool.symbol.substring(0, 2)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{pool.name}</h3>
              {getStatusBadge(pool.status)}
              {pool.isPromoted && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-500 border-amber-500/20"
                >
                  {t("Promoted")}
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {pool.symbol}
              {t("•_lock_period")}
              {pool.lockPeriod}
              {t("days")}
            </div>
            <p className="text-sm mt-2 line-clamp-2">{pool.description}</p>
          </div>
        </div>

        <div className="bg-muted/30 p-6 flex flex-row md:flex-col justify-between md:w-1/3 border-t md:border-t-0 md:border-l">
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              {t("APR")}
            </div>
            <div className="text-2xl font-bold text-primary">{pool.apr}%</div>
          </div>
          <div className="flex flex-col md:flex-row gap-2 mt-auto">
            <Link href={`/admin/staking/${pool.id}`} className="w-full">
              <Button variant="outline" size="sm" className="w-full">
                {t("View")}
              </Button>
            </Link>
            {onEdit && onDelete && (
              <div className="flex gap-2">
                <Link href={`/admin/staking/edit/${pool.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onDelete(pool.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
