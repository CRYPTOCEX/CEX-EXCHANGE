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
  updatedAt?: string;
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
  paymentWindow?: number; // Payment window in minutes from offer settings
  priceCurrency?: string;
  currency?: string;
  completedAt?: string;
  cancelledAt?: string;
  dispute?: any;
  paymentMethodDetails?: {
    name?: string;
    [key: string]: any;
  };
  offer?: {
    id?: string;
    priceCurrency?: string;
    tradeSettings?: {
      autoCancel?: number;
      paymentWindow?: number;
    };
  };
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

/**
 * ONE PARTY, AS THE ADJUDICATION SCREEN NEEDS THEM.
 *
 * `P2PAdminTradeUser` above carries `reputation?: number` and
 * `verificationLevel?: string`, neither of which any P2P endpoint has ever
 * returned — so anything typed against it could read two fields that are
 * permanently `undefined` and the compiler would agree it was fine.
 */
interface P2PAdminCaseParty {
  id: string | null;
  name: string;
  initials: string;
  avatar: string | null;
  email: string | null;
  joinedAt: string | null;
  completedTrades: number;
  finishedTrades: number;
  /** Null when there is nothing to divide by — never defaulted to 100. */
  completionRate: number | null;
  isNewTrader: boolean;
  disputesFiled: number;
  disputesAgainst: number;
}

interface P2PAdminCaseEvent {
  /** Raw event key, e.g. "ADMIN_RESOLVED" — what the icon lookup keys on. */
  key: string;
  /** Humanised label, e.g. "Admin Resolved". */
  event: string;
  timestamp: string | null;
  details: string;
  userId: string | null;
  adminName: string | null;
}

interface P2PAdminCaseNote {
  note: string;
  adminId: string | null;
  adminName: string | null;
  timestamp: string | null;
}

interface P2PAdminCaseMessage {
  id: string;
  senderId: string | null;
  sender: string;
  content: string;
  /** ISO, formatted by the client — never a server-locale string. */
  timestamp: string | null;
  avatar: string | null;
  isAdmin: boolean;
  attachments: string[];
}

/**
 * The admin trade detail payload.
 *
 * Deliberately NOT an extension of `P2PAdminTrade`: that interface describes a
 * LIST row, where `amount` is a string and `fiatValue` is a pre-formatted
 * `"500000 USD"` the server built by concatenation. Money on this screen decides
 * who gets paid, so every figure here is a number and its currency travels
 * separately — including as `null`, which is what an offer with no recorded
 * price currency honestly has.
 */
interface P2PAdminTradeCase {
  id: string;
  status: string;
  type: "BUY" | "SELL";
  terms: string | null;

  currency: string;
  /** Alias of `currency`, the word the admin list and its filters use. */
  crypto: string;
  /** Null when the offer never recorded one. Never defaulted to USD. */
  priceCurrency: string | null;
  amount: number;
  price: number;
  total: number;

  escrowAmount: number;
  escrowStatus: "NONE" | "HELD" | "RELEASED" | "REFUNDED";
  escrowFee: number;
  escrowTime: string | null;

  /** Minutes. Resolved through the same policy the auto-cancel cron uses. */
  paymentWindow: number;
  /** False when auto-cancel is switched off, i.e. the window is not enforced. */
  paymentWindowEnforced: boolean;
  paymentReference: string | null;
  paymentConfirmedAt: string | null;

  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  disputedAt: string | null;
  cancelledBy: string | null;
  cancelledByName: string | null;
  cancellationReason: string | null;

  buyer: P2PAdminCaseParty;
  seller: P2PAdminCaseParty;

  offer: {
    id: string;
    userId: string;
    type: "BUY" | "SELL";
    currency: string;
    priceCurrency: string | null;
    walletType: "FIAT" | "SPOT" | "ECO";
    status: string;
  } | null;

  paymentMethod: string | null;
  paymentMethodDetails: {
    id?: string;
    name?: string;
    icon?: string;
    instructions?: string;
    processingTime?: string;
  } | null;
  paymentDetails: Record<string, any> | null;

  /** Public chronology: no chat messages, no internal notes. */
  timeline: P2PAdminCaseEvent[];
  /** Staff-only. Never served to a participant. */
  adminNotes: P2PAdminCaseNote[];
  messages: P2PAdminCaseMessage[];

  /** The settlement record written by the resolve route, plus the admin's name. */
  resolution: {
    outcome?: string;
    notes?: string;
    resolvedBy?: string;
    resolvedByName?: string | null;
    resolvedAt?: string;
    escrowSettled?: boolean;
    escrowConsumed?: number;
    buyerCredited?: number;
    sellerRefunded?: number;
    platformFee?: number;
  } | null;

  /** The full dispute row, including the internal activity log. */
  dispute: Record<string, any> | null;
  disputeId: string | null;
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
  // Additional properties for admin views
  firstName?: string;
  lastName?: string;
  kycStatus?: string;
  createdAt?: string;
  stats?: P2PUserStats;
}

interface P2PUserStats {
  completedTrades?: number;
  totalVolume?: number;
  avgRating?: number;
  responseTime?: number;
  totalOffers?: number;
  rating?: number;
  disputes?: number;
}

interface P2PPaymentMethodDetail {
  id: string;
  name: string;
  icon?: string;
  details?: Record<string, any>;
}

interface P2POffer {
  id: string;
  type: string;
  crypto: string;
  price: string;
  marketDiff: string;
  user: P2POfferUser;
  paymentMethods: (string | P2PPaymentMethodDetail)[];
  limits: string;
  createdAt: string;
  status: string;
  timeLimit?: string;
  location?: string;
  /**
   * The real column is a JSON object. List endpoints sometimes project it to a
   * human-readable summary string, so both shapes are accepted here.
   */
  userRequirements?:
    | string
    | {
        minCompletedTrades?: number;
        minSuccessRate?: number;
        minAccountAge?: number;
        trustedOnly?: boolean;
        verifiedOnly?: boolean;
      };
  matchScore?: number;
  activityLog?: {
    type: string;
    action: string;
    timestamp: string;
    details: string;
    notes?: string;
    createdAt?: string;
    adminName?: string;
  }[];
  // Additional properties for admin views
  currency?: string;
  fiatCurrency?: string;
  availableAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  margin?: number;
  paymentTimeLimit?: number;
  autoReplyMessage?: string;
  terms?: string;
  adminNotes?: string;
  stats?: P2POfferStats;

  // Real p2p_offers columns. The fields above are a display shape assembled by
  // list endpoints; admin detail screens read the model directly, and rendering
  // only the display shape is what produced "undefined undefined" on that page.
  userId?: string;
  walletType?: "FIAT" | "SPOT" | "ECO";
  priceCurrency?: string;
  escrowAmount?: number;
  views?: number;
  amountConfig?: {
    total: number;
    min?: number;
    max?: number;
    availableBalance?: number;
    originalTotal?: number;
  };
  priceConfig?: {
    model: "FIXED" | "MARGIN";
    value: number;
    marketPrice?: number;
    finalPrice: number;
    currency?: string;
    marginType?: "percentage" | "fixed";
  };
  tradeSettings?: {
    autoCancel: number;
    kycRequired: boolean;
    visibility?: "PUBLIC" | "PRIVATE";
    termsOfTrade?: string;
    additionalNotes?: string;
  };
  locationSettings?: {
    country?: string;
    region?: string;
    city?: string;
    restrictions?: string[];
  };
  systemTags?: string[];
  updatedAt?: string;
}

interface P2POfferStats {
  total: number;
  active: number;
  pending: number;
  flagged: number;
  disabled: number;
  weeklyChange: number;
  avgCompletionRate: string;
  totalTrades?: number;
  completedTrades?: number;
  avgCompletionTime?: string;
  successRate?: number;
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

/**
 * A dashboard tile from `/api/p2p/dashboard` or `/api/p2p/dashboard/stats`.
 *
 * `value` is NULLABLE and the type used to deny it. Both routes emit null for a
 * figure they could not determine — an unreadable wallet query, or a money total
 * where nothing could be priced — and null must reach the screen as "unknown",
 * never as a zero: "$0.00" tells a trader holding funds that they hold none.
 *
 * `partial` marks a money total as a LOWER BOUND: the currencies in
 * `unpricedCurrencies` were held but had no USD rate, so they contributed
 * nothing to it. The server names them in `change` as well, so a renderer that
 * only draws the caption still says which denominations are missing.
 */
interface P2PStatData {
  title: string;
  value: string | null;
  change: string | null;
  changeType: string;
  icon: string;
  gradient: string;
  partial?: boolean;
  unpricedCurrencies?: string[];
  error?: string | null;
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
  cancelledTrades: any[];
  pendingTrades?: any[];
  availableCurrencies?: string[];
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
