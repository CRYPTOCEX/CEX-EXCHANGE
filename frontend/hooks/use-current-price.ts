"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/routing";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import { tickersWs } from "@/services/tickers-ws";
import type { TickerData } from "@/app/[locale]/trade/components/markets/types";

export function useCurrentPrice(): void {
  const pathname = usePathname();
  const isBinaryPage = pathname.startsWith("/binary");
  
  // Only use binary store on binary pages
  const binaryStore = isBinaryPage ? useBinaryStore() : { 
    currentSymbol: "", 
    setCurrentPrice: () => {}, 
    updateActiveMarketsFromTicker: () => {},
    binaryMarkets: []
  };
  const { currentSymbol, setCurrentPrice, updateActiveMarketsFromTicker, binaryMarkets } = binaryStore;
  
  const [tickerData, setTickerData] = useState<Record<string, TickerData>>({});

  // Subscribe to ticker data
  useEffect(() => {
    tickersWs.initialize();

    const unsubscribe = tickersWs.subscribeToSpotData((data) => {
      setTickerData(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Update current price and active markets when ticker data changes (only on binary pages)
  useEffect(() => {
    if (isBinaryPage && currentSymbol && tickerData && binaryMarkets) {
      // Find the corresponding binary market to get currency and pair
      const binaryMarket = binaryMarkets.find(m => 
        m.symbol === currentSymbol || 
        `${m.currency}${m.pair}` === currentSymbol ||
        `${m.currency}/${m.pair}` === currentSymbol
      );
      
      if (!binaryMarket) {
        console.log(`No binary market found for symbol: ${currentSymbol}`);
        return;
      }
      
      // Try different ticker data key formats using the actual market data
      let marketData: TickerData | undefined = undefined;
      
      // Format 1: Use the label from binary market (e.g., "TRX/USDT")
      if (binaryMarket.label) {
        marketData = tickerData[binaryMarket.label];
      }
      
      // Format 2: Use symbol from binary market
      if (!marketData && binaryMarket.symbol) {
        marketData = tickerData[binaryMarket.symbol];
      }
      
      // Format 3: Construct from currency/pair (e.g., "TRX/USDT")
      if (!marketData) {
        const symbolKey = `${binaryMarket.currency}/${binaryMarket.pair}`;
        marketData = tickerData[symbolKey];
      }
      
      // Format 4: Try without slash (e.g., "TRXUSDT")
      if (!marketData) {
        const noSlashSymbol = `${binaryMarket.currency}${binaryMarket.pair}`;
        marketData = tickerData[noSlashSymbol];
      }
      
      // Update price if found
      if (marketData?.last) {
        setCurrentPrice(marketData.last);
      } else {
        console.log(`No price data found for ${binaryMarket.currency}/${binaryMarket.pair} (${currentSymbol}), available symbols:`, Object.keys(tickerData));
      }
      
      // Update all active markets with ticker data
      updateActiveMarketsFromTicker(tickerData);
    }
  }, [isBinaryPage, currentSymbol, tickerData, setCurrentPrice, updateActiveMarketsFromTicker, binaryMarkets]);
}
