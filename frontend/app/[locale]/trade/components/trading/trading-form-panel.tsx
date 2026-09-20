"use client";
import SpotTradingForm from "./spot";
import FuturesTradingForm from "./futures";

interface TradingFormPanelProps {
  symbol?: string;
  isEco?: boolean;
  onOrderSubmit?: (orderData: any) => Promise<any>;
  isFutures?: boolean;
}

export default function TradingFormPanel({
  symbol = "BTCUSDT",
  isEco = false,
  onOrderSubmit,
  isFutures = false,
}: TradingFormPanelProps) {
  return (
    <div className="h-full">
      {isFutures ? (
        <FuturesTradingForm symbol={symbol} onOrderSubmit={onOrderSubmit} />
      ) : (
        <SpotTradingForm
          symbol={symbol}
          isEco={isEco}
          onOrderSubmit={onOrderSubmit}
        />
      )}
    </div>
  );
}
