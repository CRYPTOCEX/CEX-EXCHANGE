import { MarketDataWebSocketService } from "./market-data-ws";
import { TickersWebSocketManager } from "./tickers-ws";
import type { OrderbookData, TradeData } from "./market-data-ws";
import type { TickerData } from "@/app/[locale]/trade/components/markets/types";

export interface MarketTickerData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: number;
}

class WebSocketService {
  private static instance: WebSocketService;
  private marketDataWs: MarketDataWebSocketService;
  private tickersWs: TickersWebSocketManager;
  private tickerData: Map<string, MarketTickerData> = new Map();
  private orderbookData: Map<string, OrderbookData> = new Map();
  private tradeData: Map<string, TradeData[]> = new Map();

  private constructor() {
    this.marketDataWs = MarketDataWebSocketService.getInstance();
    this.tickersWs = TickersWebSocketManager.getInstance();
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public subscribeTicker(
    symbol: string,
    callback: (symbol: string, price: number, change: number) => void
  ): () => void {
    return this.tickersWs.subscribeToSpotData((data) => {
      const tickerData = data[symbol];
      if (
        tickerData &&
        tickerData.last !== undefined &&
        tickerData.change !== undefined
      ) {
        const marketTickerData: MarketTickerData = {
          symbol,
          price: tickerData.last,
          change: tickerData.change,
          changePercent: tickerData.change,
          lastUpdated: Date.now(),
        };
        this.tickerData.set(symbol, marketTickerData);
        callback(symbol, tickerData.last, tickerData.change);
      }
    });
  }

  public subscribeOrderbook(
    symbol: string,
    callback: (symbol: string, data: OrderbookData) => void
  ): () => void {
    return this.marketDataWs.subscribe<OrderbookData>(
      {
        symbol,
        type: "orderbook",
        marketType: "spot",
      },
      (data) => {
        this.orderbookData.set(symbol, data);
        callback(symbol, data);
      }
    );
  }

  public subscribeTrades(
    symbol: string,
    callback: (symbol: string, data: TradeData) => void
  ): () => void {
    return this.marketDataWs.subscribe<TradeData>(
      {
        symbol,
        type: "trades",
        marketType: "spot",
      },
      (data) => {
        const trades = this.tradeData.get(symbol) || [];
        trades.unshift(data);
        if (trades.length > 50) {
          trades.pop();
        }
        this.tradeData.set(symbol, trades);
        callback(symbol, data);
      }
    );
  }

  public getMarketTickerData(symbol: string): MarketTickerData | null {
    return this.tickerData.get(symbol) || null;
  }

  public getOrderbookData(symbol: string): OrderbookData | null {
    return this.orderbookData.get(symbol) || null;
  }

  public getTradeData(symbol: string): TradeData[] | null {
    return this.tradeData.get(symbol) || null;
  }
}

export const websocketService = WebSocketService.getInstance();
export type { OrderbookData, TradeData };
