import { Link } from "@/i18n/routing";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";

interface PoolCardProps {
  pool: StakingPool;
}

export default function PoolCard({ pool }: PoolCardProps) {
  const t = useTranslations("ext");
  // Calculate percentage of total staked vs available
  const totalStaked = pool.totalStaked ?? 0;
  const availableToStake = pool.availableToStake ?? 0;
  const totalAvailable = totalStaked + availableToStake;
  const percentageStaked =
    totalAvailable > 0 ? (totalStaked / totalAvailable) * 100 : 0;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md dark:hover:shadow-zinc-800/50 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 mr-3 flex items-center justify-center">
              {pool.icon ? (
                <img
                  src={pool.icon || "/img/placeholder.svg"}
                  alt={pool.name}
                  className="w-6 h-6"
                />
              ) : (
                <span className="font-bold text-primary dark:text-primary">
                  {pool.symbol.substring(0, 1)}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
                {pool.name}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {pool.symbol}
              </p>
            </div>
          </div>
          <Badge
            variant={pool.isPromoted ? "default" : "outline"}
            className="dark:border-zinc-700"
          >
            {pool.isPromoted ? "Featured" : getStatusDisplay(pool.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 dark:text-zinc-400">{t("APR")}</span>
            <span className="text-xl font-bold text-green-500 dark:text-green-400">
              {pool.apr}%
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">
                {t("lock_period")}
              </span>
              <span className="text-zinc-900 dark:text-zinc-100">
                {pool.lockPeriod}
                {t("days")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">
                {t("Min")}. {t("Stake")}
              </span>
              <span className="text-zinc-900 dark:text-zinc-100">
                {pool.minStake} {pool.symbol}
              </span>
            </div>
            {pool.maxStake && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {t("Max")}. {t("Stake")}
                </span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {pool.maxStake} {pool.symbol}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">
                {t("total_staked")}
              </span>
              <span className="text-zinc-900 dark:text-zinc-100">
                {totalStaked.toLocaleString()} {pool.symbol}
              </span>
            </div>
            <Progress value={percentageStaked} className="h-2" />
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                0
                {pool.symbol}
              </span>
              <span>
                {totalAvailable.toLocaleString()} {pool.symbol}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Link href={`/staking/pool/${pool.id}`} className="w-full">
          <Button className="w-full">
            {t("view_details")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

// Helper function to display status in a user-friendly format
function getStatusDisplay(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "COMING_SOON":
      return "Coming Soon";
    default:
      return status;
  }
}
