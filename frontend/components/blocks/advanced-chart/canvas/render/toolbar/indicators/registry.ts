"use client";

import { v4 as uuidv4 } from "uuid";
import { SMAIndicator } from "./sma";
import { RSIIndicator } from "./rsi";
import type { LucideIcon } from "lucide-react";
import {
  TrendingUp,
  Activity,
  BarChart,
  BarChart2,
  Settings,
} from "lucide-react";

// Define indicator category interface
export interface IndicatorCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  lightColor?: string; // Optional light theme color
}

// Define indicator categories with icons
export const indicatorCategories: IndicatorCategory[] = [
  {
    id: "added",
    name: "Added",
    icon: Settings,
    color: "#f97316",
    lightColor: "#ea580c",
  }, // Orange
  {
    id: "popular",
    name: "Popular",
    icon: TrendingUp,
    color: "#ef4444",
    lightColor: "#dc2626",
  }, // Red
  {
    id: "trend",
    name: "Trend",
    icon: TrendingUp,
    color: "#3b82f6",
    lightColor: "#2563eb",
  }, // Blue
  {
    id: "momentum",
    name: "Momentum",
    icon: Activity,
    color: "#8b5cf6",
    lightColor: "#7c3aed",
  }, // Purple
  {
    id: "volatility",
    name: "Volatility",
    icon: BarChart,
    color: "#f59e0b",
    lightColor: "#d97706",
  }, // Amber
  {
    id: "volume",
    name: "Volume",
    icon: BarChart2,
    color: "#10b981",
    lightColor: "#059669",
  }, // Emerald
];

// Define the indicator types
export type IndicatorType = "sma" | "rsi"; // Add more as needed

// Define the indicator data structure
export interface CandleData {
  time: number;
  timestamp: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  color: string;
}

// Define the indicator interface
export interface Indicator {
  id: string;
  type: IndicatorType;
  name: string;
  description?: string;
  params: Record<string, any>;
  visible: boolean;
  color: string;
  lineStyle?: "solid" | "dashed" | "dotted";
  separatePanel: boolean;
  category?: string;
  data?: number[];
}

// Define the indicator definition interface
export interface IndicatorDefinition {
  defaultSettings: Indicator;
  calculate: (data: CandleData[], params: Record<string, any>) => number[];
  render?: (
    ctx: CanvasRenderingContext2D,
    indicator: Indicator,
    data: CandleData[],
    chartWidth: number,
    chartHeight: number,
    chartTop: number,
    priceRange: { min: number; max: number }
  ) => void;
  renderPanel?: (
    ctx: CanvasRenderingContext2D,
    indicator: Indicator,
    data: CandleData[],
    chartWidth: number,
    chartHeight: number,
    chartTop: number,
    priceScaleWidth: number,
    isDarkTheme: boolean,
    globalCandleData: CandleData[],
    visibleRange: { start: number; end: number },
    totalVisibleRange: number,
    startOffset: number
  ) => void;
  getSettings?: () => Array<{
    name: string;
    label: string;
    type: string;
    min?: number;
    max?: number;
    step?: number;
    default: any;
    options?: Array<{ value: string; label: string }>;
  }>;
  icon?: LucideIcon;
  getLightThemeColor?: () => string;
  getDarkThemeColor?: () => string;
}

// Registry of available indicators
export const indicatorRegistry: Record<IndicatorType, IndicatorDefinition> = {
  sma: SMAIndicator,
  rsi: RSIIndicator,
};

// Function to create a new indicator instance
export function createIndicator(
  type: IndicatorType,
  customSettings = {}
): Indicator {
  const definition = indicatorRegistry[type];
  if (!definition) {
    throw new Error(`Indicator type ${type} not found in registry`);
  }

  // Create a deep copy of the default settings
  const defaultSettings = JSON.parse(
    JSON.stringify(definition.defaultSettings)
  );

  // Generate a unique ID
  const id = `${type}-${uuidv4().slice(0, 8)}`;

  // Merge default settings with custom settings
  return {
    ...defaultSettings,
    ...customSettings,
    id,
    params: {
      ...defaultSettings.params,
      ...(customSettings as any).params,
    },
  };
}

// Function to get all available indicators
export function getAllIndicators(): Indicator[] {
  return Object.entries(indicatorRegistry).map(([type, definition]) => {
    const defaultSettings = definition.defaultSettings;
    const id = `${type}-${uuidv4().slice(0, 8)}`;
    return {
      ...defaultSettings,
      id,
    };
  });
}

// Function to get indicator by type
export function getIndicatorByType(
  type: IndicatorType
): IndicatorDefinition | undefined {
  return indicatorRegistry[type];
}

// Function to get theme-specific color for an indicator
export function getIndicatorThemeColor(
  indicator: Indicator,
  isDarkTheme: boolean
): string {
  const definition = indicatorRegistry[indicator.type as IndicatorType];

  if (isDarkTheme && definition?.getDarkThemeColor) {
    return definition.getDarkThemeColor();
  } else if (!isDarkTheme && definition?.getLightThemeColor) {
    return definition.getLightThemeColor();
  }

  return indicator.color;
}

// Function to get category color based on theme
export function getCategoryThemeColor(
  categoryId: string,
  isDarkTheme: boolean
): string {
  const category = indicatorCategories.find((cat) => cat.id === categoryId);
  if (!category) return isDarkTheme ? "#3b82f6" : "#2563eb";

  return isDarkTheme ? category.color : category.lightColor || category.color;
}
