"use client";
import { useAiInvestmentStore } from "@/store/ai/investment/use-ai-investment-store";
import { useTranslations } from "next-intl";

interface Duration {
  id: string;
  duration: number;
  timeframe: string;
}

interface DurationSelectorProps {
  durations: Duration[];
  selectedDurationId: string | null;
}

export default function DurationSelector({
  durations,
  selectedDurationId,
}: DurationSelectorProps) {
  const t = useTranslations(
    "trade/components/trading/ai-investment/duration-selector"
  );
  const setSelectedDuration = useAiInvestmentStore(
    (state) => state.setSelectedDuration
  );

  // Format duration for display
  const formatDuration = (duration: Duration) => {
    const { duration: value, timeframe } = duration;

    // Handle different timeframe formats
    const formattedTimeframe =
      timeframe.toUpperCase() === "DAY"
        ? value === 1
          ? "day"
          : "days"
        : timeframe.toLowerCase();

    return `${value} ${formattedTimeframe}`;
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {t("investment_duration")}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {durations.map((duration) => (
          <button
            key={duration.id}
            onClick={() => setSelectedDuration(duration.id)}
            className={`p-2 rounded-sm border text-xs flex items-center justify-center h-8 transition-colors ${
              selectedDurationId === duration.id
                ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-primary/10 dark:border-primary/30 dark:text-primary"
                : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700 dark:bg-zinc-800/30 dark:border-zinc-700/50 dark:hover:bg-zinc-800/50 dark:text-zinc-300"
            }`}
          >
            {formatDuration(duration)}
          </button>
        ))}
      </div>
    </div>
  );
}
