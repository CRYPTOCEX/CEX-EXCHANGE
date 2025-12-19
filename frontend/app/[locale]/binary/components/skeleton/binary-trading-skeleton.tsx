"use client";

// Pre-defined candlestick data to avoid hydration mismatch
const CANDLE_DATA = [
  { height: 45, isGreen: true, wickTop: 12, wickBottom: 8 },
  { height: 62, isGreen: false, wickTop: 15, wickBottom: 10 },
  { height: 38, isGreen: true, wickTop: 8, wickBottom: 14 },
  { height: 55, isGreen: false, wickTop: 18, wickBottom: 6 },
  { height: 70, isGreen: true, wickTop: 10, wickBottom: 12 },
  { height: 42, isGreen: false, wickTop: 14, wickBottom: 9 },
  { height: 58, isGreen: true, wickTop: 11, wickBottom: 15 },
  { height: 35, isGreen: false, wickTop: 16, wickBottom: 7 },
  { height: 65, isGreen: true, wickTop: 9, wickBottom: 11 },
  { height: 48, isGreen: false, wickTop: 13, wickBottom: 8 },
  { height: 52, isGreen: true, wickTop: 7, wickBottom: 16 },
  { height: 40, isGreen: false, wickTop: 12, wickBottom: 10 },
  { height: 68, isGreen: true, wickTop: 14, wickBottom: 9 },
  { height: 44, isGreen: false, wickTop: 10, wickBottom: 13 },
  { height: 56, isGreen: true, wickTop: 8, wickBottom: 11 },
  { height: 50, isGreen: false, wickTop: 15, wickBottom: 7 },
  { height: 60, isGreen: true, wickTop: 11, wickBottom: 14 },
  { height: 36, isGreen: false, wickTop: 9, wickBottom: 12 },
  { height: 72, isGreen: true, wickTop: 13, wickBottom: 8 },
  { height: 46, isGreen: false, wickTop: 16, wickBottom: 10 },
  { height: 54, isGreen: true, wickTop: 10, wickBottom: 15 },
  { height: 42, isGreen: false, wickTop: 8, wickBottom: 11 },
  { height: 66, isGreen: true, wickTop: 14, wickBottom: 9 },
  { height: 38, isGreen: false, wickTop: 12, wickBottom: 13 },
  { height: 58, isGreen: true, wickTop: 9, wickBottom: 10 },
  { height: 48, isGreen: false, wickTop: 11, wickBottom: 8 },
  { height: 64, isGreen: true, wickTop: 15, wickBottom: 12 },
  { height: 40, isGreen: false, wickTop: 7, wickBottom: 14 },
  { height: 52, isGreen: true, wickTop: 13, wickBottom: 9 },
  { height: 44, isGreen: false, wickTop: 10, wickBottom: 11 },
  { height: 70, isGreen: true, wickTop: 8, wickBottom: 15 },
  { height: 36, isGreen: false, wickTop: 14, wickBottom: 7 },
  { height: 62, isGreen: true, wickTop: 11, wickBottom: 10 },
  { height: 46, isGreen: false, wickTop: 9, wickBottom: 13 },
  { height: 56, isGreen: true, wickTop: 16, wickBottom: 8 },
  { height: 50, isGreen: false, wickTop: 12, wickBottom: 12 },
  { height: 68, isGreen: true, wickTop: 10, wickBottom: 14 },
  { height: 42, isGreen: false, wickTop: 8, wickBottom: 9 },
  { height: 60, isGreen: true, wickTop: 13, wickBottom: 11 },
  { height: 38, isGreen: false, wickTop: 15, wickBottom: 10 },
];

/**
 * Skeleton loading component for Binary Trading page
 * Uses CSS media queries for responsive design (no JS detection)
 * This ensures proper rendering during SSR and hydration
 */
export default function BinaryTradingSkeleton() {
  return (
    <>
      {/* Mobile Layout - shown on screens < 768px */}
      <div className="md:hidden flex flex-col w-full h-screen overflow-hidden relative bg-[#131722]">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-black border-b border-zinc-800/50">
          {/* Back button */}
          <div className="w-6 h-6 bg-zinc-800/50 rounded animate-pulse" />

          {/* Market selector */}
          <div className="flex items-center space-x-2">
            <div className="w-20 h-5 bg-zinc-800 rounded animate-pulse" />
            <div className="w-16 h-4 bg-zinc-800/50 rounded animate-pulse" />
            <div className="w-3 h-3 bg-zinc-700 rounded animate-pulse" />
          </div>

          {/* Right side - Demo badge and balance */}
          <div className="flex items-center space-x-2">
            <div className="w-12 h-5 bg-orange-900/50 rounded animate-pulse" />
            <div className="w-16 h-5 bg-zinc-800 rounded animate-pulse" />
            <div className="w-3 h-3 bg-zinc-700 rounded animate-pulse" />
          </div>

          {/* Theme toggle */}
          <div className="w-8 h-8 bg-zinc-800 rounded animate-pulse" />
        </div>

        {/* Chart Toolbar */}
        <div className="flex items-center justify-between px-2 py-1 bg-black/80 border-b border-zinc-800/30">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-5 bg-zinc-800/50 rounded animate-pulse" />
            <div className="w-6 h-6 bg-zinc-800/50 rounded animate-pulse" />
            <div className="w-14 h-5 bg-zinc-800/50 rounded animate-pulse" />
            <div className="w-5 h-5 bg-zinc-800/50 rounded animate-pulse" />
            <div className="w-5 h-5 bg-zinc-800/50 rounded animate-pulse" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-zinc-800/50 rounded animate-pulse" />
            <div className="w-6 h-6 bg-zinc-800/50 rounded animate-pulse" />
            <div className="w-6 h-6 bg-zinc-800/50 rounded animate-pulse" />
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 min-h-0 relative bg-[#131722] overflow-hidden">
          {/* OHLC Info */}
          <div className="absolute top-2 left-2 z-10">
            <div className="flex items-center space-x-2">
              <div className="w-28 h-4 bg-zinc-800/50 rounded animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-teal-500/50 animate-pulse" />
            </div>
            <div className="flex space-x-2 mt-1">
              <div className="w-14 h-3 bg-zinc-800/30 rounded animate-pulse" />
              <div className="w-14 h-3 bg-zinc-800/30 rounded animate-pulse" />
              <div className="w-14 h-3 bg-zinc-800/30 rounded animate-pulse" />
              <div className="w-14 h-3 bg-zinc-800/30 rounded animate-pulse" />
            </div>
          </div>

          {/* High label */}
          <div className="absolute top-16 right-2 z-10">
            <div className="flex items-center space-x-1">
              <div className="w-8 h-4 bg-teal-900/50 rounded animate-pulse" />
              <div className="w-14 h-4 bg-zinc-800/50 rounded animate-pulse" />
            </div>
          </div>

          {/* Candlesticks */}
          <div className="absolute inset-0 flex items-end justify-center px-1 pb-12 pt-20">
            <div className="flex items-end space-x-0.5 h-full w-full justify-center">
              {CANDLE_DATA.map((candle, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className={`w-px ${candle.isGreen ? 'bg-teal-800/40' : 'bg-red-800/40'}`}
                    style={{ height: `${candle.wickTop}px` }}
                  />
                  <div
                    className={`w-1.5 ${candle.isGreen ? 'bg-teal-600/60' : 'bg-red-600/60'} rounded-sm`}
                    style={{ height: `${candle.height}px` }}
                  />
                  <div
                    className={`w-px ${candle.isGreen ? 'bg-teal-800/40' : 'bg-red-800/40'}`}
                    style={{ height: `${candle.wickBottom}px` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Current price line */}
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 w-full">
            <div className="flex items-center justify-end">
              <div className="flex-1 h-px bg-red-500/30" />
              <div className="bg-red-600 px-2 py-0.5 rounded-l">
                <div className="w-14 h-4 bg-red-500/50 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Price scale */}
          <div className="absolute right-0 top-0 bottom-12 w-14 flex flex-col justify-between py-8 z-10">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-12 h-3 bg-zinc-800/30 rounded animate-pulse ml-auto mr-1" />
            ))}
          </div>

          {/* Time scale */}
          <div className="absolute bottom-0 left-0 right-14 h-6 flex items-center justify-between px-4 z-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-6 h-3 bg-zinc-800/30 rounded animate-pulse" />
            ))}
          </div>

          {/* Low label */}
          <div className="absolute bottom-16 right-2 z-10">
            <div className="flex items-center space-x-1">
              <div className="w-8 h-4 bg-zinc-700/50 rounded animate-pulse" />
              <div className="w-14 h-4 bg-zinc-800/50 rounded animate-pulse" />
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 flex space-x-1 z-10">
            <div className="w-8 h-8 bg-zinc-800/50 rounded animate-pulse" />
            <div className="w-8 h-8 bg-zinc-800/50 rounded animate-pulse" />
          </div>
        </div>

        {/* Quick Trade Buttons */}
        <div className="shrink-0 p-4 bg-zinc-900/50 border-t border-zinc-800">
          <div className="flex gap-3">
            <div className="flex-1 h-12 bg-green-700/50 rounded-md flex items-center justify-center space-x-2 animate-pulse">
              <div className="w-4 h-4 bg-green-500/50 rounded" />
              <div className="w-10 h-4 bg-green-500/50 rounded" />
            </div>
            <div className="flex-1 h-12 bg-red-700/50 rounded-md flex items-center justify-center space-x-2 animate-pulse">
              <div className="w-4 h-4 bg-red-500/50 rounded" />
              <div className="w-10 h-4 bg-red-500/50 rounded" />
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="shrink-0 bg-black border-t border-zinc-800 px-4 py-2">
          <div className="flex items-center justify-around">
            {/* Chart tab - active */}
            <div className="flex flex-col items-center space-y-1">
              <div className="w-5 h-0.5 bg-blue-500 rounded" />
              <div className="w-6 h-6 bg-zinc-700/50 rounded animate-pulse" />
              <div className="w-8 h-2 bg-zinc-700/50 rounded animate-pulse" />
            </div>
            {/* Trade tab */}
            <div className="flex flex-col items-center space-y-1">
              <div className="w-6 h-6 bg-zinc-800/50 rounded animate-pulse" />
              <div className="w-8 h-2 bg-zinc-800/50 rounded animate-pulse" />
            </div>
            {/* Positions tab */}
            <div className="flex flex-col items-center space-y-1">
              <div className="w-6 h-6 bg-zinc-800/50 rounded animate-pulse" />
              <div className="w-14 h-2 bg-zinc-800/50 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - shown on screens >= 768px */}
      <div className="hidden md:flex h-screen bg-zinc-950 flex-col overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex-shrink-0 flex items-center justify-between px-2 py-1 bg-black border-b border-zinc-800/50">
          <div className="flex items-center">
            {/* Back button */}
            <div className="w-7 h-7 rounded-full bg-zinc-800/50 animate-pulse mr-2" />

            {/* Logo */}
            <div className="w-16 h-5 bg-zinc-800/50 rounded animate-pulse mr-2" />

            {/* Market selector */}
            <div className="flex items-center space-x-1">
              <div className="flex items-center bg-zinc-900 px-2 py-1.5 rounded-md border border-zinc-800/50">
                <div className="w-6 h-6 rounded-full bg-zinc-800 animate-pulse mr-2" />
                <div className="w-20 h-4 bg-zinc-800 rounded animate-pulse mr-2" />
                <div className="w-16 h-4 bg-zinc-800 rounded animate-pulse mr-1" />
                <div className="w-12 h-3 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800/50 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <div className="w-9 h-9 rounded-md bg-zinc-800 animate-pulse" />
            <div className="flex items-center bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800/50">
              <div className="mr-1.5">
                <div className="w-20 h-5 bg-zinc-800 rounded animate-pulse mb-1" />
                <div className="flex items-center space-x-1">
                  <div className="w-10 h-3 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="w-8 h-3 bg-zinc-800/50 rounded animate-pulse" />
                </div>
              </div>
              <div className="w-2 h-2 bg-zinc-700 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 min-h-0 w-full overflow-hidden">
          {/* Chart Area */}
          <div className="flex-1 min-w-0 relative bg-zinc-950 overflow-hidden">
            {/* Chart toolbar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-black/80 border-b border-zinc-800/30">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-6 bg-zinc-800/50 rounded animate-pulse" />
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="w-16 h-4 bg-zinc-800/50 rounded animate-pulse" />
                </div>
                <div className="w-6 h-6 bg-zinc-800/50 rounded animate-pulse" />
                <div className="w-6 h-6 bg-zinc-800/50 rounded animate-pulse" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-zinc-800/50 rounded animate-pulse" />
                <div className="w-6 h-6 bg-zinc-800/50 rounded animate-pulse" />
                <div className="w-6 h-6 bg-zinc-800/50 rounded animate-pulse" />
                <div className="w-6 h-6 bg-zinc-800/50 rounded animate-pulse" />
              </div>
            </div>

            {/* Chart tools sidebar */}
            <div className="absolute left-0 top-10 bottom-0 w-10 bg-black/50 border-r border-zinc-800/30 flex flex-col items-center py-2 space-y-2 z-10">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-6 h-6 bg-zinc-800/40 rounded animate-pulse" />
              ))}
            </div>

            {/* Chart canvas area */}
            <div className="absolute inset-0 ml-10 mt-10 overflow-hidden">
              {/* OHLC info */}
              <div className="absolute top-2 left-2 flex items-center space-x-4 z-10 max-w-full">
                <div className="flex items-center space-x-1">
                  <div className="w-24 h-4 bg-zinc-800/50 rounded animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-zinc-700 animate-pulse" />
                </div>
                <div className="flex space-x-3">
                  <div className="w-16 h-3 bg-zinc-800/30 rounded animate-pulse" />
                  <div className="w-16 h-3 bg-zinc-800/30 rounded animate-pulse" />
                  <div className="w-16 h-3 bg-zinc-800/30 rounded animate-pulse" />
                  <div className="w-16 h-3 bg-zinc-800/30 rounded animate-pulse" />
                </div>
              </div>

              {/* High/Low labels */}
              <div className="absolute top-20 right-20 z-10">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-4 bg-teal-900/50 rounded animate-pulse" />
                  <div className="w-16 h-4 bg-zinc-800/50 rounded animate-pulse" />
                </div>
              </div>

              {/* Chart candlesticks skeleton - deterministic */}
              <div className="absolute inset-0 flex items-end justify-center px-4 pb-16 pt-16 mr-16 overflow-hidden">
                <div className="flex items-end space-x-1 h-full w-full justify-center overflow-hidden">
                  {CANDLE_DATA.concat(CANDLE_DATA.slice(0, 20)).map((candle, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div
                        className={`w-px ${candle.isGreen ? 'bg-teal-800/40' : 'bg-red-800/40'}`}
                        style={{ height: `${candle.wickTop}px` }}
                      />
                      <div
                        className={`w-2 ${candle.isGreen ? 'bg-teal-700/50' : 'bg-red-700/50'} rounded-sm`}
                        style={{ height: `${candle.height}px` }}
                      />
                      <div
                        className={`w-px ${candle.isGreen ? 'bg-teal-800/40' : 'bg-red-800/40'}`}
                        style={{ height: `${candle.wickBottom}px` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Current price line */}
              <div className="absolute right-16 top-1/2 -translate-y-1/2 z-10 left-0">
                <div className="flex items-center">
                  <div className="flex-1 h-px bg-red-500/30" />
                  <div className="bg-red-500/80 px-2 py-0.5 rounded-l text-xs text-white">
                    <div className="w-16 h-4 bg-red-400/50 rounded animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Price scale */}
              <div className="absolute right-0 top-0 bottom-16 w-16 bg-zinc-950/80 border-l border-zinc-800/30 flex flex-col justify-between py-4 z-10">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-12 h-3 bg-zinc-800/30 rounded animate-pulse mx-auto" />
                ))}
              </div>

              {/* Time scale */}
              <div className="absolute bottom-0 left-0 right-16 h-6 bg-zinc-950/80 border-t border-zinc-800/30 flex items-center justify-between px-8 z-10">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="w-8 h-3 bg-zinc-800/30 rounded animate-pulse" />
                ))}
              </div>

              {/* Timeframe buttons */}
              <div className="absolute bottom-8 left-2 flex items-center space-x-1 z-10">
                {['5y', '1y', '3m', '1m', '5d', '1d'].map((tf) => (
                  <div key={tf} className="w-6 h-5 bg-zinc-800/50 rounded text-[10px] flex items-center justify-center animate-pulse" />
                ))}
              </div>

              {/* TradingView logo placeholder */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                <div className="w-8 h-8 bg-zinc-800/30 rounded animate-pulse" />
              </div>

              {/* Low label */}
              <div className="absolute bottom-24 right-20 z-10">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-4 bg-zinc-700/50 rounded animate-pulse" />
                  <div className="w-16 h-4 bg-zinc-800/50 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Order Panel Skeleton */}
          <div className="w-[300px] flex-shrink-0 bg-black border-l border-zinc-800 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Amount and Expiry row */}
              <div className="flex gap-2 min-w-0">
                {/* Amount selector */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-zinc-500 mb-1">Amount</div>
                  <div className="flex items-center bg-zinc-900 rounded-md border border-zinc-800 p-1 min-w-0">
                    <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse shrink-0" />
                    <div className="flex-1 mx-1 min-w-0">
                      <div className="w-14 h-4 bg-zinc-800 rounded animate-pulse mx-auto" />
                      <div className="w-10 h-3 bg-zinc-800/50 rounded animate-pulse mx-auto mt-1" />
                    </div>
                    <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse shrink-0" />
                  </div>
                </div>

                {/* Expiry selector */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-zinc-500 mb-1">Expiry</div>
                  <div className="flex items-center bg-zinc-900 rounded-md border border-zinc-800 p-1 min-w-0">
                    <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse shrink-0" />
                    <div className="flex-1 mx-1 min-w-0">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-3 h-3 bg-zinc-800 rounded animate-pulse shrink-0" />
                        <div className="w-10 h-4 bg-zinc-800 rounded animate-pulse" />
                      </div>
                      <div className="w-8 h-3 bg-zinc-800/50 rounded animate-pulse mx-auto mt-1" />
                    </div>
                    <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse shrink-0" />
                  </div>
                </div>
              </div>

              {/* Profit display */}
              <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                <div className="flex justify-between items-center mb-2">
                  <div className="w-12 h-3 bg-zinc-800 rounded animate-pulse" />
                  <div className="w-12 h-5 bg-green-900/50 rounded animate-pulse" />
                </div>
                <div className="flex justify-between items-center mb-2">
                  <div className="w-16 h-3 bg-zinc-800 rounded animate-pulse" />
                  <div className="w-20 h-5 bg-green-900/50 rounded animate-pulse" />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                  <div className="w-10 h-3 bg-zinc-800 rounded animate-pulse" />
                  <div className="w-24 h-5 bg-red-900/50 rounded animate-pulse" />
                </div>
              </div>

              {/* Templates */}
              <div>
                <div className="text-[10px] text-zinc-500 mb-1">Templates</div>
                <div className="flex space-x-1">
                  {['Conservative', 'Balanced', 'Aggressive'].map((t) => (
                    <div key={t} className="flex-1 h-7 bg-zinc-900 border border-zinc-800 rounded-md animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Shortcuts and Risk */}
              <div className="flex space-x-2">
                <div className="flex-1 h-9 bg-zinc-900 border border-zinc-800 rounded-md animate-pulse" />
                <div className="flex-1 h-9 bg-zinc-900 border border-zinc-800 rounded-md animate-pulse" />
              </div>

              {/* Next expiry */}
              <div className="flex justify-between items-center p-2 bg-zinc-900 rounded-md">
                <div className="w-20 h-3 bg-zinc-800 rounded animate-pulse" />
                <div className="w-12 h-4 bg-zinc-800 rounded animate-pulse font-mono" />
              </div>
            </div>

            {/* Trading buttons */}
            <div className="flex-shrink-0 p-3 border-t border-zinc-800">
              <div className="flex space-x-2">
                <div className="flex-1 h-14 bg-teal-900/50 rounded-lg animate-pulse flex flex-col items-center justify-center">
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-teal-700/50 rounded animate-pulse" />
                    <div className="w-10 h-4 bg-teal-700/50 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex-1 h-14 bg-red-900/50 rounded-lg animate-pulse flex flex-col items-center justify-center">
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-red-700/50 rounded animate-pulse" />
                    <div className="w-10 h-4 bg-red-700/50 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trading History Bar */}
        <div className="flex-shrink-0 h-6 bg-black border-t border-zinc-800/50 flex items-center px-4 space-x-4">
          <div className="w-24 h-3 bg-zinc-800/50 rounded animate-pulse" />
          <div className="w-20 h-3 bg-red-900/50 rounded animate-pulse" />
          <div className="w-24 h-3 bg-zinc-800/50 rounded animate-pulse" />
        </div>
      </div>
    </>
  );
}
