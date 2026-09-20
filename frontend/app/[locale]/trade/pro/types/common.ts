export type MarketType = "spot" | "futures" | "eco";

export interface MarketMetadata {
  /**
   * Maker/taker trading fees, in PERCENT — `taker: 1` means 1%, not 0.01.
   *
   * This is the same field the backend charges from (`placeOrder` computes
   * `amount * price * rate / 100`), so anything quoting a fee to the user must
   * read it from here. Tickets that hardcoded a default instead quoted 0.100%
   * on markets running the 1% default and were wrong by 10x.
   */
  maker?: number;
  taker?: number;
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

