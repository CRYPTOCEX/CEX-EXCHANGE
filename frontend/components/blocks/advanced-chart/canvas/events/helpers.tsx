"use client";

// Helper function to check if a point is in the main chart area
export function isInMainChartArea(
  x: number,
  y: number,
  chartTop: number,
  chartHeight: number,
  chartWidth: number,
  priceScaleWidth: number
): boolean {
  return (
    x >= 0 &&
    x <= chartWidth - priceScaleWidth &&
    y >= chartTop &&
    y <= chartTop + chartHeight
  );
}
