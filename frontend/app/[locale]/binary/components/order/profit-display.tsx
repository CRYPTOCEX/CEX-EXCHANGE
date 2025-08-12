import { useTranslations } from "next-intl";
interface ProfitDisplayProps {
  profitPercentage: number;
  profitAmount: number;
  amount: number;
  darkMode?: boolean;
}

export default function ProfitDisplay({
  profitPercentage,
  profitAmount,
  amount,
  darkMode = true,
}: ProfitDisplayProps) {
  const t = useTranslations("binary/components/order/profit-display");
  return (
    <div
      className={`${darkMode ? "bg-zinc-900" : "bg-gray-100"} p-2 rounded-md ${darkMode ? "border border-zinc-800" : "border border-gray-200"}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span
            className={`${darkMode ? "text-gray-400" : "text-gray-500"} text-xs`}
          >
            {t("Profit")}
          </span>
        </div>
        <div className="text-[#00C896] text-sm font-bold">
          +{profitPercentage}%
        </div>
      </div>
      <div className="flex justify-between items-center mt-1">
        <div
          className={`${darkMode ? "text-gray-400" : "text-gray-500"} text-xs`}
        >
          {t("potential")}
        </div>
        <div className="text-[#00C896] text-sm font-bold">
          +$
          {profitAmount.toFixed(2)}
        </div>
      </div>
      <div
        className={`mt-1 pt-1 border-t ${darkMode ? "border-zinc-800" : "border-gray-200"} flex justify-between items-center`}
      >
        <div
          className={`${darkMode ? "text-gray-400" : "text-gray-500"} text-xs`}
        >
          {t("loss")}
        </div>
        <div className="text-[#FF4D4F] text-xs font-bold">
          -$
          {amount.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
