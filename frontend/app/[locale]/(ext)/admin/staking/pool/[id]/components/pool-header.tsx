import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  Clock,
  Coins,
  ExternalLink,
  Percent,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface PoolHeaderProps {
  pool: StakingPool;
}

export function PoolHeader({ pool }: PoolHeaderProps) {
  const t = useTranslations("ext");
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            {t("Active")}
          </Badge>
        );
      case "INACTIVE":
        return (
          <Badge
            variant="outline"
            className="border-muted-foreground/50 text-muted-foreground"
          >
            {t("Inactive")}
          </Badge>
        );
      case "COMING_SOON":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
            {t("coming_soon")}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-background rounded-xl p-6 border shadow-sm">
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center text-primary text-2xl font-bold shadow-inner">
            {pool.symbol.substring(0, 2)}
          </div>
          {pool.isPromoted && (
            <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1 shadow-md">
              <Zap className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{pool.name}</h1>
            {getStatusBadge(pool.status)}
            {pool.isPromoted && (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-500 border-amber-500/30"
              >
                {t("Promoted")}
              </Badge>
            )}
            {pool.autoCompound && (
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-500 border-green-500/30"
              >
                {t("Auto-Compound")}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 mt-3 text-muted-foreground flex-wrap">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1 rounded-md shadow-sm">
                    <Coins className="h-4 w-4 text-primary" />
                    <span className="font-medium">{pool.symbol}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("token_symbol")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1 rounded-md shadow-sm">
                    <Percent className="h-4 w-4 text-green-500" />
                    <span className="font-medium">
                      {pool.apr}
                      % APR
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("annual_percentage_rate")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1 rounded-md shadow-sm">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">
                      {pool.lockPeriod}
                      {t("days_lock")}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("lock_period_duration")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1 rounded-md shadow-sm">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">
                      {pool.earningFrequency}
                      {t("earnings")}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("earnings_distribution_frequency")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {pool.externalPoolUrl && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={pool.externalPoolUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1 rounded-md shadow-sm text-primary hover:bg-background"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="font-medium">{t("external_pool")}</span>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("view_on_external_platform")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <div
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm",
            "bg-background/70 backdrop-blur-sm border"
          )}
        >
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>
            {t("order")}
            {pool.order}
          </span>
        </div>
      </div>
    </div>
  );
}
