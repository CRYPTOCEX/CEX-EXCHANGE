/**
 * The shared chart kit.
 * ============================================================================
 *
 * Import everything chart-related from here:
 *
 *     import {
 *       ChartCard, ChartTooltipContent, ChartLegend, DonutChart, Sparkline,
 *       chartGrid, chartXAxis, chartYAxis, chartLineCursor, chartBarCursor,
 *       seriesColor, chartColor, formatAxisDate, formatTooltipDate,
 *     } from "@/components/ui/chart"
 *
 * THE ONE RULE THAT IS NOT OBVIOUS: the axis and grid exports are PROP
 * OBJECTS, not components — `<CartesianGrid {...chartGrid} />`. Recharts finds
 * its children by matching on component identity, so a `<ChartGrid/>` wrapper
 * would be invisible to the chart and simply never draw. See `./chart-axis`.
 */
export { ChartCard, type ChartCardProps } from "./chart-card"
export {
  ChartTooltipContent,
  type ChartTooltipContentProps,
  type ChartTooltipPayloadItem,
} from "./chart-tooltip"
export { ChartLegend, type ChartLegendItem, type ChartLegendProps } from "./chart-legend"
export { DonutChart, type DonutChartProps, type DonutSegment } from "./donut-chart"
export {
  SeriesChart,
  seriesLegendItems,
  type SeriesChartProps,
  type SeriesChartType,
  type SeriesDef,
} from "./series-chart"
export {
  Sparkline,
  hasSparklineShape,
  normalizeSparkline,
  type SparklinePoint,
  type SparklineProps,
} from "./sparkline"

export {
  chartActiveDot,
  chartBarCursor,
  chartBarRadius,
  chartGrid,
  chartLineCursor,
  chartXAxis,
  chartYAxis,
  chartYDomain,
  formatAxisDate,
  formatTooltipDate,
  toChartDate,
  type ChartTimeframe,
} from "./chart-axis"

export {
  CHART_COLOR_NAMES,
  CHART_RAMP,
  STATUS_COLORS,
  chartColor,
  formatAxisNumber,
  formatExactNumber,
  seriesColor,
  statusSeriesColor,
  type StatusColorName,
} from "./tokens"
