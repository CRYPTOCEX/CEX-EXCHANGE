import { CandleData } from "../../types";

// Helper function to get global candle data
let globalCandleData: CandleData[] = [];

// Render volume
export function renderVolume(
  ctx: CanvasRenderingContext2D,
  data: CandleData[],
  chartWidth: number,
  volumeHeight: number,
  volumeTop: number,
  volumeRange: { min: number; max: number },
  candleWidth: number,
  spacing: number,
  darkMode: boolean,
  totalVisibleRange: number,
  startOffset: number
) {
  const bullColor = "rgba(34, 197, 94, 0.5)"; // Semi-transparent green
  const bearColor = "rgba(239, 68, 68, 0.5)"; // Semi-transparent red

  // Find the position of each candle in the global dataset
  const candlePositions = data.map((candle, i) => {
    if (globalCandleData.length > 0 && candle.time) {
      const dataIndex = globalCandleData.findIndex(
        (c) => c.time === candle.time
      );
      return dataIndex >= 0 ? dataIndex : i;
    }
    return i;
  });

  // Calculate the x position for each candle
  data.forEach((candle, i) => {
    const position = candlePositions[i];
    // Calculate the center position of the candle
    const x = ((position - startOffset) / totalVisibleRange) * chartWidth;

    // Skip if outside visible area
    if (x < -candleWidth || x > chartWidth) return;

    const isBullish = candle.close >= candle.open;

    // Calculate volume bar height
    const volumeHeight2 = (candle.volume / volumeRange.max) * volumeHeight;
    const volumeY = volumeTop + volumeHeight - volumeHeight2;

    // Draw volume bar - center it like we do with candles
    ctx.fillStyle = isBullish ? bullColor : bearColor;
    // Adjust x position to center the volume bar (subtract half the width)
    ctx.fillRect(
      x - (candleWidth - spacing) / 2,
      volumeY,
      candleWidth - spacing,
      volumeHeight2
    );
  });
}

// Update the ChartVolumeRenderer to pass the correct parameters
export const ChartVolumeRenderer = {
  render({
    ctx,
    candleData,
    visibleRange,
    chartWidth,
    volumeHeight,
    volumeTop,
    theme,
    isDragging,
  }: any) {
    if (!ctx || !candleData || candleData.length === 0) return;

    // Use the global candle data from main renderer
    globalCandleData = candleData;

    // Calculate visible data
    const start = Math.max(0, Math.floor(visibleRange.start));
    const end = Math.min(candleData.length, Math.ceil(visibleRange.end));
    const visibleData = candleData.slice(start, end);

    // Add a buffer to prevent popping at edges
    const bufferSize = Math.min(20, Math.floor((end - start) * 0.1));
    const bufferedStart = Math.max(0, start - bufferSize);
    const bufferedEnd = Math.min(candleData.length, end + bufferSize);
    const bufferedVisibleData = candleData.slice(bufferedStart, bufferedEnd);

    if (bufferedVisibleData.length === 0) return;

    // Calculate volume range
    const maxVolume = Math.max(
      ...bufferedVisibleData.map((d: any) => d.volume)
    );
    const volumeRange = { min: 0, max: maxVolume * 1.1 };

    // Calculate candle width and spacing
    const totalCandleWidth =
      chartWidth / (visibleRange.end - visibleRange.start);
    const candleWidth = Math.max(1, totalCandleWidth * 0.8);
    const spacing = totalCandleWidth * 0.2;

    // Make the volume panel background transparent as well
    ctx.fillStyle =
      theme === "dark" ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.5)";
    ctx.fillRect(0, volumeTop, chartWidth, volumeHeight);

    // Render volume
    renderVolume(
      ctx,
      bufferedVisibleData,
      chartWidth,
      volumeHeight,
      volumeTop,
      volumeRange,
      candleWidth,
      spacing,
      theme,
      visibleRange.end - visibleRange.start,
      visibleRange.start
    );
  },
};
