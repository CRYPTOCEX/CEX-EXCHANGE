export interface FuturesMarket {
  id: string;
  currency: string;
  pair: string;
  /**
   * Resolved funding config from `/api/futures/market` (`parseFundingConfig`).
   * Null when the market is unfunded — no rate, or a rate of exactly zero.
   * `rate` is the CLAMPED fraction per interval that settlement will charge.
   */
  funding?: { rate: number; intervalHours: number } | null;
  isTrending?: boolean;
  isHot?: boolean;
  status: boolean;
  metadata?: {
    precision: {
      price: number;
      amount: number;
    };
    limits: {
      amount: {
        min: number;
        max: number;
      };
      price?: {
        min: number;
        max: number;
      };
      cost?: {
        min: number;
        max: number;
      };
      leverage: string; // This is the max leverage value as string
    };
    taker?: number;
    maker?: number;
    contractSize?: number;
    fundingRate?: number;
    fundingInterval?: number;
  };
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

// Ticker data interface
export interface TickerData {
  symbol: string;
  timestamp: number;
  datetime: string;
  high: number;
  low: number;
  bid: number;
  bidVolume: number;
  ask: number;
  askVolume: number;
  vwap: number;
  open: number;
  close: number;
  last: number;
  previousClose: number;
  change: number;
  percentage: number;
  average: number;
  baseVolume: number;
  quoteVolume: number;
}

// Wallet data interface for futures
export interface WalletData {
  balance: number;
  availableBalance: number;
  currency: string;
  margin?: number;
  unrealizedPnl?: number;
}
