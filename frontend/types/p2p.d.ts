// User related types
interface P2PUser {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  email?: string;
  reputation?: number;
  verificationLevel?: string;
  completedTrades?: number;
  completionRate?: number;
  trades?: number;
  successfulTrades?: number;
  previousDisputes?: number;
  accountStatus?: string;
}

// Trade related types
interface P2PTradeCounterparty {
  id: string;
  name: string;
  avatar?: string;
  completedTrades: number;
  completionRate: number;
}

interface P2PTimelineEvent {
  title: string;
  description: string;
  time: string;
}

interface P2PPaymentDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
}

interface P2PTrade {
  id: string;
  type: "buy" | "sell";
  coin: string;
  amount: number;
  price: number;
  total: number;
  status: string;
  createdAt: string;
  lastUpdated?: string;
  paymentMethod: string;
  paymentDetails?: P2PPaymentDetails;
  counterparty: P2PTradeCounterparty;
  timeline: P2PTimelineEvent[];
  terms?: string;
  escrowFee?: string;
  escrowTime?: string;
  paymentConfirmedAt?: string;
  paymentReference?: string;
}

// Admin Trade types
interface P2PTradeFilters {
  status?: string;
  type?: string;
  crypto?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: string;
  search?: string;
}

interface P2PAdminTradeUser {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  email?: string;
  reputation?: number;
  verificationLevel?: string;
}

interface P2PAdminTrade {
  id: string;
  type: "BUY" | "SELL";
  crypto: string;
  amount: string;
  fiatValue: string;
  buyer: P2PAdminTradeUser;
  seller: P2PAdminTradeUser;
  status: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  paymentMethod?: string;
  escrowFee?: string;
  timeRemaining?: string;
  disputeReason?: string;
  disputeDetails?: string;
  timeline?: {
    event: string;
    timestamp: string;
  }[];
  messages?: {
    sender: string;
    content: string;
    timestamp: string;
  }[];
}

interface P2PAdminTradeDetails extends P2PAdminTrade {
  paymentDetails?: {
    method: string;
    accountNumber?: string;
    bankName?: string;
    reference?: string;
  };
  escrowDetails?: {
    amount: string;
    fee: string;
    releaseDate?: string;
  };
  disputeHistory?: {
    openedBy: string;
    reason: string;
    openedAt: string;
    status: string;
    resolution?: string;
    resolvedAt?: string;
    adminNotes?: string;
  }[];
}

interface P2PAdminTradeStats {
  total: number;
  active: number;
  completed: number;
  disputed: number;
  cancelled: number;
  volume24h: string;
  volumeTotal: string;
  avgTradeSize: string;
  avgCompletionTime: string;
  disputeRate: string;
}

// Offer related types
interface P2POfferUser {
  id: string;
  name: string;
  avatar: string;
  initials: string;
  trades: number;
  successfulTrades?: number;
  previousDisputes?: number;
  accountStatus?: string;
  reputation?: number;
  email?: string;
}

interface P2POffer {
  id: string;
  type: string;
  crypto: string;
  price: string;
  marketDiff: string;
  user: P2POfferUser;
  paymentMethods: string[];
  limits: string;
  createdAt: string;
  status: string;
  timeLimit?: string;
  location?: string;
  userRequirements?: string;
  matchScore?: number;
  activityLog?: {
    type: string;
    action: string;
    timestamp: string;
    details: string;
  }[];
}

interface P2POfferStats {
  total: number;
  active: number;
  pending: number;
  flagged: number;
  disabled: number;
  weeklyChange: number;
  avgCompletionRate: string;
}

interface P2POfferFilters {
  status?: string;
  search?: string;
  type?: string;
  crypto?: string;
  paymentMethod?: string;
  dateRange?: {
    from: string;
    to: string;
  };
}

interface P2PPaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Dispute related types
interface P2PDisputeUser {
  id?: string;
  name: string;
  avatar?: string;
  initials: string;
}

interface P2PDisputeResolution {
  outcome: string;
  notes: string;
  resolvedOn?: string;
}

interface P2PDisputeEvidence {
  id: string;
  type: string;
  title: string;
  submittedBy: string;
  timestamp: string;
  url: string;
}

interface P2PDisputeMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  senderAvatar?: string;
  senderInitials?: string;
}

interface P2PDispute {
  id: string;
  tradeId: string;
  amount: string;
  reportedBy: P2PDisputeUser;
  against: P2PDisputeUser;
  reason: string;
  details?: string;
  filedOn: string;
  status: string;
  priority: string;
  resolution?: P2PDisputeResolution;
  resolvedOn?: string;
  messages?: P2PDisputeMessage[];
  evidence?: P2PDisputeEvidence[];
}

interface P2PDisputeStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  avgResolutionTime: string;
  disputeChange: string;
  avgResolutionTimeChange: string;
}

interface P2PDisputeFilters {
  status?: string;
  priority?: string;
  search?: string;
  dateRange?: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

// Market data types
interface P2PMarketHighlight {
  title: string;
  coin: string;
  change?: string;
  price?: string;
  volume?: string;
  trades?: string;
  mentions?: string;
  sentiment?: string;
}

interface P2PStats {
  totalOffers: number;
  totalTrades: number;
  totalVolume: number;
  successRate: number;
  countries: number;
  activeTrades: number;
}

interface P2PCryptoPrice {
  name: string;
  symbol: string;
  price: number;
  change24h: number;
}

// Dashboard data types
interface P2PPortfolioData {
  totalValue: number;
  change24h: number;
  changePercentage: number;
  return30d: number;
  assets: Array<{
    symbol: string;
    amount: number;
    value: number;
    change24h: number;
  }>;
  chartData: Array<{
    date: string;
    value: number;
  }>;
}

interface P2PStatData {
  title: string;
  value: string;
  change: string;
  changeType: string;
  icon: string;
  gradient: string;
}

interface P2PTradeActivity {
  id: string;
  type: string;
  amount: string;
  value: string;
  user: string;
  userRating: number;
  status: string;
  createdAt: Date;
  timestamp: string;
  paymentMethod: string;
  avatar: string;
}

interface P2PTransaction {
  id: string;
  type: string;
  amount: string;
  value: string;
  createdAt: Date;
  date: string;
  timestamp: string;
  status: string;
  change: string;
}

interface P2PDashboardData {
  notifications: number;
  username: string;
  portfolio: P2PPortfolioData;
  stats: P2PStatData[];
  tradingActivity: P2PTradeActivity[];
  transactions: P2PTransaction[];
}

// Trade dashboard data types
interface P2PTradeStats {
  activeCount: number;
  completedCount: number;
  totalVolume: number;
  avgCompletionTime: string;
  successRate: number;
}

interface P2PRecentActivity {
  id: string;
  type: string;
  message: string;
  tradeId: string;
  createdAt: Date;
}

interface P2PTradeDashboardData {
  tradeStats: {
    activeCount?: number;
    completedCount?: number;
    totalVolume?: number;
    avgCompletionTime?: string;
    successRate?: number;
    [key: string]: any;
  };
  recentActivity: any[];
  activeTrades: any[];
  completedTrades: any[];
  disputedTrades: any[];
}

// Trade offer types
interface P2PTradeOffer {
  id: string;
  type: string;
  crypto: string;
  price: string;
  marketDiff: string;
  user: string;
  rating: number;
  trades: number;
  paymentMethods: string[];
  limits: string;
  matchScore: number;
  createdAt: Date;
}

interface P2PMarketStats {
  topGainer: {
    symbol: string;
    change: number;
  };
  marketData: Record<
    string,
    {
      price: number;
      change24h: number;
      volume24h: number;
    }
  >;
  trendingCoins: string[];
  recentTrades: number;
}

interface P2POfferFormData {
  tradeType: string;
  cryptocurrency: {
    symbol: string;
    name: string;
  };
  amount: number;
  price: {
    model: string;
    value: number;
    margin: number;
  };
  paymentMethods: string[];
  tradeSettings: {
    autoCancel: number;
    kycRequired: boolean;
    termsOfTrade: string;
    visibility: string;
  };
}

// Guided Matching types
interface P2PMatchingCriteria {
  tradeType: string;
  cryptocurrency: string;
  amount: string;
  paymentMethods: string[];
  pricePreference: string;
  traderPreference: string;
  minAmount?: string;
  maxAmount?: string;
  location: string;
}

interface P2PMatchedOffer {
  id: string;
  trader: {
    id: string;
    username: string;
    rating: string;
    completedTrades: number;
    verificationLevel: number;
    joinedDate: string;
    avatar?: string;
  };
  offer: {
    id: string;
    type: string;
    cryptocurrency: string;
    price: number;
    minAmount: number;
    maxAmount: number;
    paymentMethods: string[];
    completionRate: number;
    completionTime: string;
    createdAt: Date;
  };
  matchScore: number;
  estimatedSavings: string;
  benefits: string[];
}

interface P2PMatchingResults {
  matches: P2PMatchedOffer[];
  matchCount: number;
  estimatedSavings: string;
  bestPrice: string;
}

interface P2PCryptocurrency {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  available: boolean;
}

interface P2PPaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  processingTime: string;
  fees: string;
  available: boolean;
  popularityRank: number;
}

interface P2PLocation {
  id: string;
  name: string;
  countries?: string[];
  available: boolean;
}
