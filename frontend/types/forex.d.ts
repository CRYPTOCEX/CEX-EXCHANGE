// Forex Account Types
interface ForexAccount {
  id: string;
  userId?: string;
  accountId?: string;
  password?: string;
  broker?: string;
  mt?: number;
  balance: number;
  leverage?: number;
  type: "DEMO" | "LIVE";
  status?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  
  // Relations
  user?: User;
  forexAccountSignals?: ForexAccountSignal[];
  accountSignals?: ForexSignal[];
}

// Forex Plan Types
interface ForexPlan {
  id: string;
  name: string;
  title?: string;
  description?: string;
  image?: string;
  currency: string;
  walletType: string;
  minProfit: number;
  maxProfit: number;
  minAmount?: number;
  maxAmount?: number;
  profitPercentage: number;
  status?: boolean;
  defaultProfit: number;
  defaultResult: "WIN" | "LOSS" | "DRAW";
  trending?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  
  // Relations
  investments?: ForexInvestment[];
  durations?: ForexDuration[];
  totalInvestors?: number;
  invested?: number;
}

// Forex Duration Types
interface ForexDuration {
  id: string;
  duration: number;
  timeframe: "HOUR" | "DAY" | "WEEK" | "MONTH";
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  
  // Relations
  investments?: ForexInvestment[];
  plans?: ForexPlan[];
}

// Forex Investment Types
interface ForexInvestment {
  id: string;
  userId: string;
  planId?: string;
  durationId?: string;
  amount?: number;
  profit?: number;
  result?: "WIN" | "LOSS" | "DRAW";
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  
  // Relations
  user?: User;
  plan?: ForexPlan;
  duration?: ForexDuration;
}

// Forex Signal Types
interface ForexSignal {
  id: string;
  title: string;
  image?: string;
  status?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  
  // Relations
  accounts?: ForexAccount[];
  forexAccountSignals?: ForexAccountSignal[];
}

// Forex Account Signal Types (Join Table)
interface ForexAccountSignal {
  id: string;
  forexAccountId?: string;
  forexSignalId?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Relations
  forexAccount?: ForexAccount;
  forexSignal?: ForexSignal;
}

// Forex Plan Duration Types (Join Table)
interface ForexPlanDuration {
  id: string;
  planId?: string;
  durationId?: string;
  
  // Relations
  plan?: ForexPlan;
  duration?: ForexDuration;
}

// API Response Types
interface ForexDashboardData {
  overview: {
    totalInvested: number;
    totalProfit: number;
    profitPercentage: number;
    activeInvestments: number;
    completedInvestments: number;
  };
  chartData: Array<{ name: string; value: number }>;
  planDistribution: Array<{ name: string; value: number; percentage: number }>;
  recentInvestments: Array<{
    id: string;
    plan: string;
    amount: number;
    createdAt: string;
    status: string;
  }>;
}

interface ForexStats {
  totalPlans: number;
  activePlans: number;
  totalInvestments: number;
  activeInvestments: number;
  totalInvested: number;
  totalProfit: number;
  totalUsers: number;
}

// Transaction Types for Forex
interface ForexTransaction {
  id: string;
  userId: string;
  walletId: string;
  type: "FOREX_DEPOSIT" | "FOREX_WITHDRAW" | "FOREX_INVESTMENT_ROI";
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "REJECTED";
  amount: number;
  fee?: number;
  description?: string;
  metadata?: {
    id: string;
    accountId: string;
    type: string;
    currency: string;
    chain?: string;
    price: number;
  };
  createdAt?: string;
  updatedAt?: string;
  
  // Relations
  wallet?: Wallet;
  user?: User;
}

// Form Input Types
interface CreateForexInvestmentInput {
  planId: string;
  durationId: string;
  amount: number;
}

interface ForexDepositInput {
  type: string;
  currency: string;
  chain?: string;
  amount: number;
}

interface ForexWithdrawInput {
  type: string;
  currency: string;
  chain?: string;
  amount: number;
}

// Store State Types
interface ForexUserStoreState {
  plans: (ForexPlan & {
    totalInvestors: number;
    invested: number;
    durations: ForexDuration[];
  })[];
  durations: ForexDuration[];
  investments: ForexInvestment[];
  accounts: ForexAccount[];
  signals: ForexSignal[];
  
  hasFetchedPlans: boolean;
  hasFetchedInvestments: boolean;
  hasFetchedAccounts: boolean;
  
  dashboardData: ForexDashboardData | null;
  
  selectedPlan: ForexPlan | null;
  selectedDuration: ForexDuration | null;
  investmentAmount: number;
  
  isLoading: boolean;
}

// Paginated Response Types
interface ForexPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}