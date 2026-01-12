"use client";

/**
 * Chart Engine Stub
 *
 * This stub is used when the chart-engine addon is not installed.
 * It exports a null component and empty exports to prevent import errors.
 *
 * The actual chart-engine code is NOT included in this stub.
 * When the addon is installed, webpack/turbopack will use the real module instead.
 */

import type { FC } from "react";

// Stub component that returns null - proper React FC type
const ChartEngineStub: FC<any> & { __isStub?: boolean } = () => null;

// Mark as stub for detection
ChartEngineStub.__isStub = true;

// Default export
export default ChartEngineStub;

// Named exports that might be imported
export const TradingChart = ChartEngineStub;
export const BinaryChart = ChartEngineStub;

// Re-export empty types
export type TradingChartProps = Record<string, any>;
export type BinaryChartProps = Record<string, any>;
export type TimeFrame = string;
export type ChartType = string;
