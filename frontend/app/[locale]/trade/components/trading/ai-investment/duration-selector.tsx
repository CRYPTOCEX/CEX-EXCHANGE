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
  const t = useTranslations("common");
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
      <label className="text-xs font-medium text-muted-foreground">
        {t("investment_duration")}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {durations.map((duration) => (
          <button
            key={duration.id}
            onClick={() => setSelectedDuration(duration.id)}
            className={`p-2 rounded-sm border text-xs flex items-center justify-center h-8 transition-colors ${
              selectedDurationId === duration.id
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-surface-3 border-border hover:bg-surface-3/70 text-muted-foreground"
            }`}
          >
            {formatDuration(duration)}
          </button>
        ))}
      </div>
    </div>
  );
}
