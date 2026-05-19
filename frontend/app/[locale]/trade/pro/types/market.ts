export interface TickerData {
  symbol: string;
  timestamp: number;
  datetime: string;
  high: number;
  low: number;
  bid: number;
  ask: number;
  last: number;
  change: number;
  percentage: number;
  baseVolume: number;
  quoteVolume: number;
  fundingRate?: number;
  nextFundingTime?: number;
}

export interface MarketData {
  symbol: string;
  currency: string;
  pair: string;
  marketType: "spot" | "futures" | "eco";
  isActive: boolean;
  metadata?: {
    precision?: {
      price: number;
      amount: number;
    };
    limits?: {
      price: { min: number; max: number };
      amount: { min: number; max: number };
    };
  };
}

export interface MarketItem {
  symbol: string;
  currency: string;
  pair: string;
  marketType: "spot" | "futures" | "eco";
  price?: number;
  change?: number;
  isFavorite?: boolean;
}
