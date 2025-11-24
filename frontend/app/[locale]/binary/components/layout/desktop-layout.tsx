"use client";

import { useTheme } from "next-themes";
import ChartContainer from "../chart/chart-container";
import OrderPanel from "../order/order-panel";
import ActivePositions from "../positions/active-positions";
import type {
  Symbol,
  TimeFrame,
  Order,
  OrderSide,
  PriceMovement,
} from "@/store/trade/use-binary-store";
import Header from "../header/header";

interface DesktopLayoutProps {
  balance: number;
  realBalance: number | null;
  demoBalance: number;
  netPL: number;
  activeMarkets: Array<{ symbol: Symbol; price: number; change: number }>;
  symbol: Symbol;
  handleSymbolChange: (symbol: Symbol) => void;
  addMarket: (symbol: Symbol) => void;
  removeMarket: (symbol: Symbol) => void;
  orders: Order[];
  currentPrice: number;
  tradingMode: "demo" | "real";
  handleTradingModeChange: (mode: "demo" | "real") => void;
  isLoadingWallet: boolean;
  handlePositionsChange: (positions: any[]) => void;
  completedPositionsCount: number;
  activePositionsCount: number;
  placeOrder: (
    side: OrderSide,
    amount: number,
    expiryMinutes: number
  ) => Promise<boolean>;
  handleExpiryChange: (minutes: number) => void;
  selectedExpiryMinutes: number;
  isInSafeZone: boolean;
  candleData: any[];
  priceMovements: Record<Symbol, PriceMovement>;
  setChartContextRef: (ref: any) => void;
  isMarketSwitching: boolean;
  timeFrame: TimeFrame;
  timeframeDurations: Array<{ value: TimeFrame; label: string }>;
  showExpiry: boolean;
  positionMarkers: any[];
  handleMarketSelect?: (marketSymbol: string) => void;
  bottomSpacing?: number;
}

export default function DesktopLayout({
  balance = 0,
  realBalance = null,
  demoBalance = 10000,
  netPL = 0,
  activeMarkets = [],
  symbol,
  handleSymbolChange = () => {},
  addMarket = () => {},
  removeMarket = () => {},
  orders = [],
  currentPrice = 0,
  tradingMode = "demo",
  handleTradingModeChange = () => {},
  isLoadingWallet = false,
  handlePositionsChange = () => {},
  completedPositionsCount = 0,
  activePositionsCount = 0,
  placeOrder = async () => false,
  handleExpiryChange = () => {},
  selectedExpiryMinutes = 1,
  isInSafeZone = true,
  candleData = [],
  priceMovements = {},
  setChartContextRef = () => {},
  isMarketSwitching = false,
  timeFrame = "1m",
  timeframeDurations = [],
  showExpiry = true,
  positionMarkers = [],
  handleMarketSelect,
  bottomSpacing = 0,
}: DesktopLayoutProps) {
  // Get theme from next-themes
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  // Default price movement if not available for the current symbol
  const defaultPriceMovement = {
    direction: "neutral" as const,
    percent: 0,
    strength: "weak" as const,
  };

  return (
    <div className="flex flex-col" style={{ height: `calc(100vh - ${bottomSpacing}px)`, transition: 'height 0.3s ease-in-out' }}>
      <Header
        balance={balance}
        realBalance={realBalance}
        demoBalance={demoBalance}
        netPL={netPL}
        activeMarkets={activeMarkets}
        currentSymbol={symbol}
        onSelectSymbol={handleSymbolChange}
        onAddMarket={addMarket}
        onRemoveMarket={removeMarket}
        orders={orders}
        currentPrice={currentPrice}
        isMobile={false}
        tradingMode={tradingMode}
        onTradingModeChange={handleTradingModeChange}
        isLoadingWallet={isLoadingWallet}
        handleMarketSelect={handleMarketSelect}
      />

      <div className="flex flex-1 min-h-0 w-full overflow-hidden h-full">
        {/* Positions sidebar - only on desktop */}
        {activePositionsCount > 0 && (
          <ActivePositions
            orders={(orders || []).filter(
              (order) => order.status === "PENDING"
            )}
            currentPrice={currentPrice}
            onPositionsChange={handlePositionsChange}
            className="relative z-40 h-full"
            hasCompletedPositions={completedPositionsCount > 0}
            theme={isDarkMode ? "dark" : "light"}
          />
        )}

        {/* Chart area */}
        <div className="flex-1 min-w-0 relative z-0 h-full">
          <ChartContainer
            key={`binary-desktop-chart-${symbol}-${timeFrame}-${isMarketSwitching ? 'switching' : 'stable'}`}
            symbol={symbol}
            timeFrame={timeFrame}
            orders={(orders || []).filter((order) => order.symbol === symbol)}
            expiryMinutes={selectedExpiryMinutes}
            showExpiry={showExpiry}
            timeframeDurations={timeframeDurations}
            onChartContextReady={setChartContextRef}
            positions={positionMarkers}
            isMarketSwitching={isMarketSwitching}
          />
        </div>

        {/* Order panel - fixed width on desktop with full height */}
        <div className="h-full">
          <OrderPanel
            currentPrice={currentPrice}
            symbol={symbol}
            onPlaceOrder={placeOrder}
            onExpiryChange={handleExpiryChange}
            balance={balance}
            candleData={candleData}
            priceMovement={
              priceMovements && symbol in priceMovements
                ? priceMovements[symbol]
                : defaultPriceMovement
            }
            isInSafeZone={isInSafeZone}
            tradingMode={tradingMode}
            darkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  );
}
