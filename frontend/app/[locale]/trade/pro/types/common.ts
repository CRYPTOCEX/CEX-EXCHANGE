export type MarketType = "spot" | "futures" | "eco";

export interface MarketMetadata {
  precision?: {
    price?: number;
    amount?: number;
  };
  limits?: {
    amount?: { min?: number; max?: number };
    price?: { min?: number; max?: number };
    cost?: { min?: number; max?: number };
  };
}

export interface TPMarket {
  symbol: string;
  currency: string;
  pair: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  category?: string;
  isNew?: boolean;
  metadata?: MarketMetadata;
}

export interface TPTicker {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

export interface TPOrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export interface TPOrderBook {
  symbol: string;
  bids: TPOrderBookEntry[];
  asks: TPOrderBookEntry[];
  timestamp: number;
}

export interface TPTrade {
  id: string;
  symbol: string;
  price: number;
  amount: number;
  side: "buy" | "sell";
  timestamp: number;
}

