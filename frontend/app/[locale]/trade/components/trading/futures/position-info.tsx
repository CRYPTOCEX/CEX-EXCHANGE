import { useTranslations } from "next-intl";
interface PositionInfoProps {
  positionValue: number;
  amount: number;
  estimatedLiquidationPrice: number | null;
  formatPrice: (price: number | null) => string;
}

export default function PositionInfo({
  positionValue,
  amount,
  estimatedLiquidationPrice,
  formatPrice,
}: PositionInfoProps) {
  const t = useTranslations("trade/components/trading/futures/position-info");
  return (
    <div className="mb-4 p-3 bg-muted/50 dark:bg-zinc-900/50 rounded-md">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("position_value")}</span>
          <span className="font-medium">
            $
            {positionValue.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("margin")}</span>
          <span className="font-medium">
            $
            {amount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {t("liquidation_price")}
          </span>
          <span className="font-medium">
            {estimatedLiquidationPrice
              ? formatPrice(estimatedLiquidationPrice)
              : "-"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("fees")}</span>
          <span className="font-medium">
            $
            {(amount * 0.0004).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
