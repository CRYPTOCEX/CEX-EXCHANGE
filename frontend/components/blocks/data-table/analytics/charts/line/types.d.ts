import { ChartConfig } from "../../../types/chart";

export interface ChartCardProps {
  chartKey: string;
  config: ChartConfig;
  data: ChartDataPoint[];
  formatXAxis: (value: string) => string;
  width?: "full" | "half" | "third";
  className?: string;
  loading?: boolean;
  timeframe?: string;
}

export interface ChartContentProps {
  chartKey: string;
  config: ChartConfig;
  data: ChartDataPoint[];
  formatXAxis: (value: string) => string;
  timeframe?: string;
}

export interface LegendProps {
  config: ChartConfig;
}

export interface ChartDataPoint {
  date: string;
  [key: string]: number | string;
}
