import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

interface FundingInfoProps {
  currentPrice: number | null;
  formatPrice: (price: number | null) => string;
  fundingRate: number | null;
  fundingTime: string;
}

export default function FundingInfo({
  currentPrice,
  formatPrice,
  fundingRate,
  fundingTime,
}: FundingInfoProps) {
  const t = useTranslations("trade/components/trading/futures/funding-info");
  return (
    <div className="flex justify-between items-center mb-4 p-2 bg-muted/50 dark:bg-zinc-900/50 rounded-md">
      <div>
        <div className="text-xs text-muted-foreground">
          {t("current_price")}
        </div>
        <div className="text-lg font-semibold">
          {currentPrice ? (
            formatPrice(currentPrice)
          ) : (
            <span className="animate-pulse">{t("Loading")}.</span>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-muted-foreground flex items-center justify-end">
          {t("funding_rate")}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 ml-1 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {t("funding_rate_is_paid_every_8_hours")}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div
          className={cn(
            "text-sm font-medium flex items-center justify-end",
            fundingRate && fundingRate >= 0
              ? "text-emerald-600 dark:text-green-500"
              : "text-red-600 dark:text-red-500"
          )}
        >
          {fundingRate ? `${(fundingRate * 100).toFixed(4)}%` : "-"}
          <span className="text-xs text-muted-foreground ml-1">
            {t("in")}
            {fundingTime}
          </span>
        </div>
      </div>
    </div>
  );
}
