import { TypeIcon as type, LucideIcon } from "lucide-react";

export type ChartTimeframe = "d" | "w" | "m" | "y";

export interface ChartTimeframeOption {
  value: ChartTimeframe;
  label: string;
}

export interface KpiConfig {
  id: string;
  title: string;
  metric: string;
  model: string;
  filter?: Record<string, any>;
  timeframe?: string;
  icon?: string;
}

export interface StatusConfig {
  value: string;
  label: string;
  color: string;
  icon: string;
}

export interface ChartConfig {
  title: string;
  type: "line" | "pie" | "bar";
  model: string;
  metric?: string;
  metrics?: string[];
  timeframes?: string[];
  labels?: Record<string, string>;
  config?: {
    status?: StatusConfig[];
  };
}

export interface ChartDataPoint {
  date: string;
  [key: string]: number | string;
}

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}

export interface KpiData {
  id: string;
  title: string;
  value: number;
  change: number;
  trend: ChartDataPoint[];
  icon?: string;
}

export interface ChartData {
  kpis: KpiData[];
  [key: string]: any;
}

export interface ChartColors {
  primary: string;
  secondary: string;
  muted: string;
  accent: string;
  background: string;
  border: string;
  ring: string;
  card: string;
  variants: {
    silver: {
      light: string;
      DEFAULT: string;
      dark: string;
    };
    blue: {
      light: string;
      DEFAULT: string;
      dark: string;
    };
    purple: {
      light: string;
      DEFAULT: string;
      dark: string;
    };
    emerald: {
      light: string;
      DEFAULT: string;
      dark: string;
    };
    gold: {
      light: string;
      DEFAULT: string;
      dark: string;
    };
    rose: {
      light: string;
      DEFAULT: string;
      dark: string;
    };
  };
  statusColors: string[];
  roleColors: string[];
}
