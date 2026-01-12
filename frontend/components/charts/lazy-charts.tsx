"use client";

/**
 * Lazy-loaded Recharts Components
 *
 * These components dynamically import recharts only when needed,
 * reducing initial bundle size by ~5MB.
 *
 * Usage:
 * import { LazyAreaChart, LazyLineChart, LazyPieChart } from "@/components/charts/lazy-charts";
 *
 * <LazyAreaChart>
 *   <Area dataKey="value" />
 * </LazyAreaChart>
 */

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// Loading placeholder for charts
function ChartLoading() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-50 bg-muted/20 animate-pulse rounded-md">
      <span className="text-muted-foreground text-sm">Loading chart...</span>
    </div>
  );
}

// Helper to convert recharts components to compatible types for dynamic import
// Uses double assertion through unknown to bypass strict type checking
 
const toComponent = <T,>(component: T): ComponentType<any> => component as unknown as ComponentType<any>;

// ResponsiveContainer - commonly used wrapper
export const LazyResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.ResponsiveContainer)),
  { ssr: false, loading: ChartLoading }
);

// Area Chart
export const LazyAreaChart = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.AreaChart)),
  { ssr: false, loading: ChartLoading }
);

export const LazyArea = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.Area)),
  { ssr: false }
);

// Line Chart
export const LazyLineChart = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.LineChart)),
  { ssr: false, loading: ChartLoading }
);

export const LazyLine = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.Line)),
  { ssr: false }
);

// Bar Chart
export const LazyBarChart = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.BarChart)),
  { ssr: false, loading: ChartLoading }
);

export const LazyBar = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.Bar)),
  { ssr: false }
);

// Pie Chart
export const LazyPieChart = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.PieChart)),
  { ssr: false, loading: ChartLoading }
);

export const LazyPie = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.Pie)),
  { ssr: false }
);

export const LazyCell = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.Cell)),
  { ssr: false }
);

// Radar Chart
export const LazyRadarChart = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.RadarChart)),
  { ssr: false, loading: ChartLoading }
);

export const LazyRadar = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.Radar)),
  { ssr: false }
);

export const LazyPolarGrid = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.PolarGrid)),
  { ssr: false }
);

export const LazyPolarAngleAxis = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.PolarAngleAxis)),
  { ssr: false }
);

export const LazyPolarRadiusAxis = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.PolarRadiusAxis)),
  { ssr: false }
);

// Common Components
export const LazyXAxis = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.XAxis)),
  { ssr: false }
);

export const LazyYAxis = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.YAxis)),
  { ssr: false }
);

export const LazyCartesianGrid = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.CartesianGrid)),
  { ssr: false }
);

export const LazyTooltip = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.Tooltip)),
  { ssr: false }
);

export const LazyLegend = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.Legend)),
  { ssr: false }
);

// Composed Chart (for mixed chart types)
export const LazyComposedChart = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.ComposedChart)),
  { ssr: false, loading: ChartLoading }
);

// Radial Bar Chart
export const LazyRadialBarChart = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.RadialBarChart)),
  { ssr: false, loading: ChartLoading }
);

export const LazyRadialBar = dynamic(
  () => import("recharts").then((mod) => toComponent(mod.RadialBar)),
  { ssr: false }
);
