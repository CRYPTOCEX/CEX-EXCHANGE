import { Clock } from "lucide-react";
import { formatNumber } from "@/lib/ico/utils";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";

interface TokenPhaseCardProps {
  phase: {
    name: string;
    tokenPrice: number;
    allocation: number;
    remaining: number;
    duration: number;
    endsIn: number;
  };
  symbol: string;
  isNext?: boolean;
}

export function TokenPhaseCard({
  phase,
  symbol,
  isNext = false,
}: TokenPhaseCardProps) {
  const t = useTranslations("ext");
  const soldTokens = phase.allocation - phase.remaining;
  const percentageSold = (soldTokens / phase.allocation) * 100;
  const percentageTimeLeft = (phase.endsIn / phase.duration) * 100;

  return (
    <div
      className={`rounded-lg border p-4 ${isNext ? "bg-muted/20" : "bg-primary/5"}`}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">{phase.name}</h3>
        <div className="text-sm font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
          / $
          {phase.tokenPrice}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">{t("Allocation")}</span>
            <span className="font-medium">
              {formatNumber(soldTokens)}
              _
              {formatNumber(phase.allocation)} {symbol}
            </span>
          </div>
          <Progress value={percentageSold} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {percentageSold.toFixed(1)}
            {t("%_sold")}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <span className="text-muted-foreground">
              {t("time_remaining")}
            </span>
            <span className="font-medium">
              {phase.endsIn}
              {t("days")}
            </span>
          </div>
        </div>

        <div>
          <Progress value={percentageTimeLeft} className="h-1.5 bg-muted" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{t("0_days")}</span>
            <span>
              {phase.duration}
              {t("days")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
