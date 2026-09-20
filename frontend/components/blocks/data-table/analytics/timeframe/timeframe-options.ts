export interface TimeframeOption {
  label: string;
  shortLabel: string;
  value: string;
}

export const timeframes: TimeframeOption[] = [
  { label: "1 Year", shortLabel: "1y", value: "1y" },
  { label: "6 Months", shortLabel: "6m", value: "6m" },
  { label: "3 Months", shortLabel: "3m", value: "3m" },
  { label: "30 Days", shortLabel: "30d", value: "30d" },
  { label: "7 Days", shortLabel: "7d", value: "7d" },
  { label: "24 Hours", shortLabel: "24h", value: "24h" },
];
