export interface WalletBalance {
  balance: number;      // Available/spendable balance
  inOrder: number;      // Amount locked in orders
  total: number;        // Total owned (balance + inOrder)
}

export interface WalletData {
  balance: number;
  availableBalance?: number;
  marginBalance?: number;
  unrealizedPnl?: number;
  currency: string;
  currencyBalance?: number | WalletBalance; // BTC balance (can be number or detailed object)
  pairBalance?: number | WalletBalance; // USDT balance (can be number or detailed object)
}

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

export interface OrderFormProps {
  symbol: string;
  currency: string;
  pair: string;
  buyMode: boolean;
  setBuyMode: (value: boolean) => void;
  marketPrice: string;
  pricePrecision: number;
  amountPrecision: number;
  minAmount: number;
  maxAmount: number;
  walletData: WalletData | null;
  priceDirection: "up" | "down" | "neutral";
  onOrderSubmit?: (orderData: any) => Promise<any>;
  fetchWalletData: () => Promise<void>;
  isEco?: boolean;
  takerFee?: number;
  makerFee?: number;
}
