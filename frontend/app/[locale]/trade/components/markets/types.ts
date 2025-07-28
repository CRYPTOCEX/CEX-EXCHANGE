import type { Symbol } from "@/store/trade/use-binary-store";

// Define the futures market interface locally to avoid import issues
export interface FuturesMarket {
  id: string;
  currency: string;
  pair: string;
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
      leverage: {
        min: number;
        max: number;
      };
    };
    contractSize?: number;
    fundingRate?: number;
    fundingInterval?: number;
  };
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

// Define ticker data interface
export interface TickerData {
  last?: number;
  baseVolume?: number;
  quoteVolume?: number;
  change?: number;
  fundingRate?: number;
}

// Define sort types
export type SortField = "name" | "price" | "change" | "volume" | "funding";
export type SortDirection = "asc" | "desc";
export type SortCriteria = Array<{
  field: SortField;
  direction: SortDirection;
}>;

// Update the MarketsPanelProps interface to include metadata
export interface MarketsPanelProps {
  onMarketSelect?: (symbol: Symbol, marketType?: "spot" | "futures") => void;
  currentSymbol?: Symbol;
  defaultMarketType?: "spot" | "futures";
}

// Update the market interface to include metadata
export interface Market {
  symbol: Symbol;
  displaySymbol: string;
  currency: string;
  pair: string;
  price: string | null;
  rawPrice: number;
  change: string | null;
  rawChange: number;
  volume: string | null;
  rawVolume: number;
  isPositive: boolean;
  isTrending: boolean;
  isHot: boolean;
  isEco?: boolean;

  metadata: {
    precision: {
      price: number;
      amount: number;
    };
    [key: string]: any;
  };
  hasData: boolean;
  fundingRate?: string;
  rawFundingRate?: number;
  leverage?: number;
  type?: "spot" | "futures";
}
