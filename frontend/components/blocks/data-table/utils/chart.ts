import { format } from "date-fns";
import { ChartTimeframe } from "../types/chart";
import { ChartColors, ChartTimeframeOption } from "../types/chart";

export const CHART_COLORS: ChartColors = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  muted: "hsl(var(--muted-foreground))",
  accent: "hsl(var(--accent))",
  background: "hsl(var(--background))",
  border: "hsl(var(--border))",
  ring: "hsl(var(--ring))",
  card: "hsl(var(--card))",
  variants: {
    silver: {
      light: "hsl(220 13% 91%)",
      DEFAULT: "hsl(220 13% 91%)",
      dark: "hsl(220 13% 71%)",
    },
    blue: {
      light: "hsl(206 100% 70%)",
      DEFAULT: "hsl(206 100% 50%)",
      dark: "hsl(206 100% 40%)",
    },
    purple: {
      light: "hsl(270 100% 70%)",
      DEFAULT: "hsl(270 100% 50%)",
      dark: "hsl(270 100% 40%)",
    },
    emerald: {
      light: "hsl(152 76% 60%)",
      DEFAULT: "hsl(152 76% 44%)",
      dark: "hsl(152 76% 34%)",
    },
    gold: {
      light: "hsl(43 96% 70%)",
      DEFAULT: "hsl(43 96% 50%)",
      dark: "hsl(43 96% 40%)",
    },
    rose: {
      light: "hsl(340 100% 70%)",
      DEFAULT: "hsl(340 100% 50%)",
      dark: "hsl(340 100% 40%)",
    },
  },
  statusColors: [
    "hsl(152 76% 44%)", // emerald
    "hsl(43 96% 50%)", // gold
    "hsl(340 100% 50%)", // rose
    "hsl(220 13% 91%)", // silver
  ],
  roleColors: [
    "hsl(206 100% 50%)", // blue
    "hsl(270 100% 50%)", // purple
    "hsl(152 76% 44%)", // emerald
  ],
};

export const TIMEFRAME_OPTIONS: ChartTimeframeOption[] = [
  { value: "d", label: "Last 24 hours" },
  { value: "w", label: "Last 7 days" },
  { value: "m", label: "Last 30 days" },
  { value: "y", label: "Last 12 months" },
];

export const formatChartDate = (
  value: string,
  timeframe: ChartTimeframe
): string => {
  try {
    const date = new Date(value);
    return timeframe === "d"
      ? format(date, "HH:mm")
      : timeframe === "w"
        ? format(date, "EEE")
        : timeframe === "m"
          ? format(date, "MMM dd")
          : timeframe === "y"
            ? format(date, "yyyy MMM")
            : format(date, "MMM");
  } catch {
    return value;
  }
};

export const getCommonAxisProps = (muted: string) => ({
  stroke: muted,
  tick: { fill: muted },
});

export const getChartMargin = () => ({
  top: 5,
  right: 10,
  bottom: 20,
  left: 10,
});
