export interface Plan {
  id: string;
  title: string;
  description: string;
  profitPercentage: number;
  minAmount: number;
  maxAmount: number;
  invested: number;
  trending: boolean;
  durations?: Duration[];
}

export interface Duration {
  id: string;
  duration: number;
  timeframe: string;
}

export interface InvestmentFormData {
  planId: string;
  durationId?: string;
  amount: number;
  currency: string;
  pair: string;
  type: "ECO" | "SPOT";
}

export interface InvestmentResult {
  success: boolean;
  error?: string;
  data?: any;
}
