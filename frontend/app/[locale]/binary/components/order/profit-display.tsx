import { useTranslations } from "next-intl";
interface ProfitDisplayProps {
  profitPercentage: number;
  profitAmount: number;
  amount: number;
  symbol: string;
  darkMode?: boolean;
}

export default function ProfitDisplay({
  profitPercentage,
  profitAmount,
  amount,
  symbol,
  darkMode = true,
}: ProfitDisplayProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");

  // Extract currency from symbol (e.g., "BTC/USDT" -> "USDT")
  const getCurrency = (symbol: string) => {
    const parts = symbol.split("/");
    return parts[1] || "USDT"; // Default to USDT if parsing fails
  };

  return (
    <div
      className={`${darkMode ? "bg-zinc-900" : "bg-gray-100"} p-2 rounded-md ${darkMode ? "border border-zinc-800" : "border border-gray-200"}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span
            className={`${darkMode ? "text-gray-400" : "text-gray-500"} text-xs`}
          >
            {tCommon("profit")}
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
          +{profitAmount.toFixed(2)} {getCurrency(symbol)}
        </div>
      </div>
      <div
        className={`mt-1 pt-1 border-t ${darkMode ? "border-zinc-800" : "border-gray-200"} flex justify-between items-center`}
      >
        <div
          className={`${darkMode ? "text-gray-400" : "text-gray-500"} text-xs`}
        >
          {tCommon("loss")}
        </div>
        <div className="text-[#FF4D4F] text-xs font-bold">
          -{amount.toFixed(2)} {getCurrency(symbol)}
        </div>
      </div>
    </div>
  );
}
