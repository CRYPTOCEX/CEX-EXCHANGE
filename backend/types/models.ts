/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Generated: 2026-03-05T23:30:12.637Z
 * Hash: 00d5f4e77cb8c4ee7a6892527cd4863b
 * Models: 181
 *
 * Run 'pnpm types:generate' to regenerate this file.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import type { Model, ModelStatic, Optional } from "sequelize";
import type * as Sequelize from "sequelize";

declare global {

  // ========================================
  // Exported Types from Model Files
  // ========================================

  type ABTestStatus = "DRAFT" | "RUNNING" | "COMPLETED" | "CANCELLED" | "STOPPED" | "PAUSED";

  type ABTestWinner = "CONTROL" | "VARIANT" | "TIE" | "INCONCLUSIVE";

  type AiBotPersonality = "SCALPER" | "SWING" | "ACCUMULATOR" | "DISTRIBUTOR" | "MARKET_MAKER";

  type AiBotStatus = "ACTIVE" | "PAUSED" | "COOLDOWN";

  type AiBotTradeFrequency = "HIGH" | "MEDIUM" | "LOW";

  type AiMarketMakerAggressionLevel = "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";

  type AiMarketMakerBias = "BULLISH" | "BEARISH" | "NEUTRAL";

  type AiMarketMakerHistoryAction = "TRADE" | "PAUSE" | "RESUME" | "REBALANCE" | "TARGET_CHANGE" | "DEPOSIT" | "WITHDRAW" | "START" | "STOP" | "CONFIG_CHANGE" | "EMERGENCY_STOP" | "AUTO_PAUSE" | "PHASE_CHANGE" | "BIAS_CHANGE" | "MOMENTUM_EVENT";

  export interface AiMarketMakerHistoryDetails {
    // For TRADE actions
    botId?: string;
    botName?: string;
    side?: "BUY" | "SELL";
    amount?: number;
    price?: number;
    orderId?: string;
  
    // For DEPOSIT/WITHDRAW actions
    currency?: string;
    depositAmount?: number;
    withdrawAmount?: number;
    balanceBefore?: number;
    balanceAfter?: number;
  
    // For TARGET_CHANGE actions
    previousTarget?: number;
    newTarget?: number;
  
    // For CONFIG_CHANGE actions
    field?: string;
    previousValue?: any;
    newValue?: any;
  
    // For PAUSE/AUTO_PAUSE actions
    reason?: string;
    volatility?: number;
  
    // For PHASE_CHANGE actions
    previousPhase?: "ACCUMULATION" | "MARKUP" | "DISTRIBUTION" | "MARKDOWN";
    newPhase?: "ACCUMULATION" | "MARKUP" | "DISTRIBUTION" | "MARKDOWN";
    phaseDuration?: number; // Expected duration in hours
    phaseTargetPrice?: number;
  
    // For BIAS_CHANGE actions
    previousBias?: "BULLISH" | "BEARISH" | "NEUTRAL";
    newBias?: "BULLISH" | "BEARISH" | "NEUTRAL";
    previousBiasStrength?: number;
    newBiasStrength?: number;
  
    // For MOMENTUM_EVENT actions
    eventType?: "SURGE" | "DUMP" | "SPIKE" | "FLASH_CRASH";
    magnitude?: number;
    eventDuration?: number; // Expected duration in seconds
  
    // General
    triggeredBy?: "ADMIN" | "SYSTEM" | "BOT";
    adminId?: string;
    note?: string;
  }

  type AiMarketMakerPhase = "ACCUMULATION" | "MARKUP" | "DISTRIBUTION" | "MARKDOWN";

  type AiMarketMakerPriceMode = "AUTONOMOUS" | "FOLLOW_EXTERNAL" | "HYBRID";

  type AiMarketMakerStatus = "ACTIVE" | "PAUSED" | "STOPPED";

  type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

  export interface AllowedWalletTypesConfig {
    [walletType: string]: {
      enabled: boolean;
      currencies: string[];
    };
  }

  type AuditAction = string;

  type AuditEntityType = string;

  type BinaryAiEngineStatus = "ACTIVE" | "PAUSED" | "STOPPED";

  type CohortType = "SIGNUP_DATE" | "DEPOSIT_AMOUNT" | "TRADE_FREQUENCY" | "CUSTOM";

  type CooldownReason = "BIG_WIN" | "STREAK" | "MANUAL";

  type CopyMode = "PROPORTIONAL" | "FIXED_AMOUNT" | "FIXED_RATIO";

  type EngineActionType = "PRICE_ADJUSTMENT" | "OUTCOME_OVERRIDE" | "PERIOD_RESET" | "CONFIG_CHANGE" | "ENGINE_CREATED" | "ENGINE_START" | "ENGINE_STOP" | "ENGINE_PAUSE" | "EMERGENCY_STOP" | "MANUAL_OVERRIDE" | "TIER_ADJUSTMENT" | "COOLDOWN_APPLIED" | "COOLDOWN_REMOVED" | "WHALE_DETECTED" | "WHALE_HANDLED" | "SIMULATION_RUN" | "ROLLBACK_EXECUTED" | "CORRELATION_ALERT" | "AB_TEST_STARTED" | "AB_TEST_ENDED";

  type FollowerStatus = "ACTIVE" | "PAUSED" | "STOPPED";

  type GatewayApiKeyMode = "LIVE" | "TEST";

  type GatewayApiKeyType = "PUBLIC" | "SECRET";

  type GatewayBalanceWalletType = "FIAT" | "SPOT" | "ECO";

  export interface GatewayBillingAddress {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  }

  type GatewayFeeType = "PERCENTAGE" | "FIXED" | "BOTH";

  export interface GatewayLineItem {
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string;
  }

  type GatewayMerchantStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";

  export interface GatewayPaymentAllocation {
    walletId: string;
    walletType: "FIAT" | "SPOT" | "ECO";
    currency: string;
    amount: number;
    equivalentInPaymentCurrency: number;
  }

  type GatewayPaymentStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUNDED" | "PARTIALLY_REFUNDED";

  type GatewayPayoutSchedule = "INSTANT" | "DAILY" | "WEEKLY" | "MONTHLY";

  type GatewayPayoutStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

  type GatewayRefundReason = "REQUESTED_BY_CUSTOMER" | "DUPLICATE" | "FRAUDULENT" | "OTHER";

  type GatewayRefundStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";

  type GatewayVerificationStatus = "PENDING" | "UNVERIFIED" | "VERIFIED";

  type GatewayWalletType = "FIAT" | "SPOT" | "ECO";

  type GatewayWebhookEvent = "payment.created" | "payment.completed" | "payment.failed" | "payment.cancelled" | "payment.expired" | "refund.created" | "refund.completed" | "refund.failed";

  type GatewayWebhookStatus = "PENDING" | "SENT" | "FAILED" | "RETRYING";

  type LeaderStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED" | "INACTIVE";

  type OptimizationStrategy = "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";

  type OrderPurpose = "ENTRY" | "EXIT" | "STOP_LOSS" | "TAKE_PROFIT" | "GRID_BUY" | "GRID_SELL" | "DCA";

  type OrderSide = "BUY" | "SELL";

  type OrderStatus = "PENDING" | "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED" | "EXPIRED" | "FAILED";

  type OrderType = "LIMIT" | "STOP_LIMIT";

  type PositionOutcome = "PENDING" | "WIN" | "LOSS" | "DRAW";

  type PositionSide = "RISE" | "FALL";

  type PositionStatus = "ACTIVE" | "SETTLED" | "CANCELLED";

  type PracticeModeOption = "DISABLED" | "SAME_AS_LIVE" | "CUSTOM";

  type PurchaseStatus = "PENDING" | "COMPLETED" | "REFUNDED" | "FAILED";

  type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

  type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

  type SimulationStatus = "RUNNING" | "COMPLETED" | "CANCELLED";

  type SnapshotReason = "AUTO" | "MANUAL" | "PRE_CHANGE";

  type StrategyStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";

  type StrategyType = "DCA" | "GRID" | "INDICATOR" | "TRAILING_STOP" | "CUSTOM";

  type StrategyVisibility = "PRIVATE" | "PUBLIC";

  export interface SupportMessage {
    type: string;
    text: string;
    time: string | Date;
    userId?: string;
    attachments?: string[];
  }

  type TierCalculationMethod = "VOLUME" | "DEPOSIT" | "MANUAL";

  type TradeSide = "BUY" | "SELL";

  type TradeStatus = "PENDING" | "PENDING_REPLICATION" | "REPLICATED" | "REPLICATION_FAILED" | "OPEN" | "CLOSED" | "PARTIALLY_FILLED" | "FAILED" | "CANCELLED";

  type TradeType = "MARKET" | "LIMIT";

  type TradingBotMode = "LIVE" | "PAPER";

  type TradingBotStatus = "DRAFT" | "RUNNING" | "PAUSED" | "STOPPED" | "ERROR" | "LIMIT_REACHED";

  type TradingBotType = "DCA" | "GRID" | "INDICATOR" | "TRAILING_STOP" | "CUSTOM";

  type TradingStyle = "SCALPING" | "DAY_TRADING" | "SWING" | "POSITION";

  type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED";

  type TransactionType = "ALLOCATION" | "DEALLOCATION" | "PROFIT_SHARE" | "TRADE_PROFIT" | "TRADE_LOSS" | "FEE" | "REFUND";

  type WhaleStrategy = "REDUCE_EXPOSURE" | "ALERT_ONLY" | "FORCE_LOSS";

  type exchangeOrderId = string;

  type exchangeOrderPk = "id";

  // ========================================
  // AdminProfit
  // ========================================

  interface AdminProfitAttributes {
    id: string;
    transactionId: string;
    type: | "DEPOSIT"
    | "WITHDRAW"
    | "TRANSFER"
    | "BINARY_ORDER"
    | "EXCHANGE_ORDER"
    | "INVESTMENT"
    | "AI_INVESTMENT"
    | "FOREX_DEPOSIT"
    | "FOREX_WITHDRAW"
    | "FOREX_INVESTMENT"
    | "ICO_CONTRIBUTION"
    | "STAKING"
    | "P2P_TRADE"
    | "NFT_SALE"
    | "NFT_AUCTION"
    | "NFT_OFFER"
    | "GATEWAY_PAYMENT"
    | "TRADE";
    amount: number;
    currency: string;
    chain?: string | null;
    description?: string | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type AdminProfitCreationAttributes = Optional<AdminProfitAttributes, "id" | "chain" | "description" | "createdAt" | "deletedAt" | "updatedAt">;

  interface AdminProfitInstance extends Model<AdminProfitAttributes, AdminProfitCreationAttributes>, AdminProfitAttributes {
    transaction?: TransactionInstance;
    getTransaction: Sequelize.BelongsToGetAssociationMixin<TransactionInstance>;
    setTransaction: Sequelize.BelongsToSetAssociationMixin<TransactionInstance, string>;
    createTransaction: Sequelize.BelongsToCreateAssociationMixin<TransactionInstance>;
  }

  // ========================================
  // AiBot
  // ========================================

  interface AiBotAttributes {
    id: string;
    marketMakerId: string;
    name: string;
    personality: AiBotPersonality;
    riskTolerance: number;
    tradeFrequency: AiBotTradeFrequency;
    avgOrderSize: number;
    orderSizeVariance: number;
    preferredSpread: number;
    status: AiBotStatus;
    lastTradeAt?: Date | null;
    dailyTradeCount: number;
    maxDailyTrades: number;
    realTradesExecuted: number;
    profitableTrades: number;
    totalRealizedPnL: number;
    totalVolume: number;
    currentPosition: number;
    avgEntryPrice: number;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiBotCreationAttributes = Optional<AiBotAttributes, "id" | "lastTradeAt" | "totalRealizedPnL" | "totalVolume" | "currentPosition" | "avgEntryPrice" | "createdAt" | "updatedAt">;

  interface AiBotInstance extends Model<AiBotAttributes, AiBotCreationAttributes>, AiBotAttributes {
    marketMaker?: AiMarketMakerInstance;
    getMarketMaker: Sequelize.BelongsToGetAssociationMixin<AiMarketMakerInstance>;
    setMarketMaker: Sequelize.BelongsToSetAssociationMixin<AiMarketMakerInstance, string>;
    createMarketMaker: Sequelize.BelongsToCreateAssociationMixin<AiMarketMakerInstance>;
  }

  // ========================================
  // AiInvestment
  // ========================================

  interface AiInvestmentAttributes {
    id: string;
    userId: string;
    planId: string;
    durationId?: string | null;
    symbol: string;
    type: "SPOT" | "ECO";
    amount: number;
    profit?: number;
    result?: "WIN" | "LOSS" | "DRAW" | null;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type AiInvestmentCreationAttributes = Optional<AiInvestmentAttributes, "id" | "durationId" | "profit" | "result" | "createdAt" | "deletedAt" | "updatedAt">;

  interface AiInvestmentInstance extends Model<AiInvestmentAttributes, AiInvestmentCreationAttributes>, AiInvestmentAttributes {
    plan?: AiInvestmentPlanInstance;
    duration?: AiInvestmentDurationInstance;
    user?: UserInstance;
    getPlan: Sequelize.BelongsToGetAssociationMixin<AiInvestmentPlanInstance>;
    setPlan: Sequelize.BelongsToSetAssociationMixin<AiInvestmentPlanInstance, string>;
    createPlan: Sequelize.BelongsToCreateAssociationMixin<AiInvestmentPlanInstance>;
    getDuration: Sequelize.BelongsToGetAssociationMixin<AiInvestmentDurationInstance>;
    setDuration: Sequelize.BelongsToSetAssociationMixin<AiInvestmentDurationInstance, string>;
    createDuration: Sequelize.BelongsToCreateAssociationMixin<AiInvestmentDurationInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // AiInvestmentDuration
  // ========================================

  interface AiInvestmentDurationAttributes {
    id: string;
    duration: number;
    timeframe: "HOUR" | "DAY" | "WEEK" | "MONTH";
  }

  type AiInvestmentDurationCreationAttributes = Optional<AiInvestmentDurationAttributes, "id">;

  interface AiInvestmentDurationInstance extends Model<AiInvestmentDurationAttributes, AiInvestmentDurationCreationAttributes>, AiInvestmentDurationAttributes {
    investments?: AiInvestmentInstance[];
    aiInvestmentPlanDurations?: AiInvestmentPlanDurationInstance[];
    plans?: AiInvestmentPlanInstance[];
    getInvestments: Sequelize.HasManyGetAssociationsMixin<AiInvestmentInstance>;
    setInvestments: Sequelize.HasManySetAssociationsMixin<AiInvestmentInstance, string>;
    addAiInvestment: Sequelize.HasManyAddAssociationMixin<AiInvestmentInstance, string>;
    addInvestments: Sequelize.HasManyAddAssociationsMixin<AiInvestmentInstance, string>;
    removeAiInvestment: Sequelize.HasManyRemoveAssociationMixin<AiInvestmentInstance, string>;
    removeInvestments: Sequelize.HasManyRemoveAssociationsMixin<AiInvestmentInstance, string>;
    hasAiInvestment: Sequelize.HasManyHasAssociationMixin<AiInvestmentInstance, string>;
    hasInvestments: Sequelize.HasManyHasAssociationsMixin<AiInvestmentInstance, string>;
    countInvestments: Sequelize.HasManyCountAssociationsMixin;
    createAiInvestment: Sequelize.HasManyCreateAssociationMixin<AiInvestmentInstance>;
    getAiInvestmentPlanDurations: Sequelize.HasManyGetAssociationsMixin<AiInvestmentPlanDurationInstance>;
    setAiInvestmentPlanDurations: Sequelize.HasManySetAssociationsMixin<AiInvestmentPlanDurationInstance, string>;
    addAiInvestmentPlanDuration: Sequelize.HasManyAddAssociationMixin<AiInvestmentPlanDurationInstance, string>;
    addAiInvestmentPlanDurations: Sequelize.HasManyAddAssociationsMixin<AiInvestmentPlanDurationInstance, string>;
    removeAiInvestmentPlanDuration: Sequelize.HasManyRemoveAssociationMixin<AiInvestmentPlanDurationInstance, string>;
    removeAiInvestmentPlanDurations: Sequelize.HasManyRemoveAssociationsMixin<AiInvestmentPlanDurationInstance, string>;
    hasAiInvestmentPlanDuration: Sequelize.HasManyHasAssociationMixin<AiInvestmentPlanDurationInstance, string>;
    hasAiInvestmentPlanDurations: Sequelize.HasManyHasAssociationsMixin<AiInvestmentPlanDurationInstance, string>;
    countAiInvestmentPlanDurations: Sequelize.HasManyCountAssociationsMixin;
    createAiInvestmentPlanDuration: Sequelize.HasManyCreateAssociationMixin<AiInvestmentPlanDurationInstance>;
    getPlans: Sequelize.BelongsToManyGetAssociationsMixin<AiInvestmentPlanInstance>;
    setPlans: Sequelize.BelongsToManySetAssociationsMixin<AiInvestmentPlanInstance, string>;
    addAiInvestmentPlan: Sequelize.BelongsToManyAddAssociationMixin<AiInvestmentPlanInstance, string>;
    addPlans: Sequelize.BelongsToManyAddAssociationsMixin<AiInvestmentPlanInstance, string>;
    removeAiInvestmentPlan: Sequelize.BelongsToManyRemoveAssociationMixin<AiInvestmentPlanInstance, string>;
    removePlans: Sequelize.BelongsToManyRemoveAssociationsMixin<AiInvestmentPlanInstance, string>;
    hasAiInvestmentPlan: Sequelize.BelongsToManyHasAssociationMixin<AiInvestmentPlanInstance, string>;
    hasPlans: Sequelize.BelongsToManyHasAssociationsMixin<AiInvestmentPlanInstance, string>;
    countPlans: Sequelize.BelongsToManyCountAssociationsMixin;
    createAiInvestmentPlan: Sequelize.BelongsToManyCreateAssociationMixin<AiInvestmentPlanInstance>;
  }

  // ========================================
  // AiInvestmentPlan
  // ========================================

  interface AiInvestmentPlanAttributes {
    id: string;
    name: string;
    title: string;
    description?: string | null;
    image?: string;
    status?: boolean;
    invested: number;
    profitPercentage: number;
    minProfit: number;
    maxProfit: number;
    minAmount: number;
    maxAmount: number;
    trending?: boolean | null;
    defaultProfit: number;
    defaultResult: "WIN" | "LOSS" | "DRAW";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type AiInvestmentPlanCreationAttributes = Optional<AiInvestmentPlanAttributes, "id" | "description" | "image" | "status" | "trending" | "createdAt" | "deletedAt" | "updatedAt">;

  interface AiInvestmentPlanInstance extends Model<AiInvestmentPlanAttributes, AiInvestmentPlanCreationAttributes>, AiInvestmentPlanAttributes {
    investments?: AiInvestmentInstance[];
    planDurations?: AiInvestmentPlanDurationInstance[];
    durations?: AiInvestmentDurationInstance[];
    getInvestments: Sequelize.HasManyGetAssociationsMixin<AiInvestmentInstance>;
    setInvestments: Sequelize.HasManySetAssociationsMixin<AiInvestmentInstance, string>;
    addAiInvestment: Sequelize.HasManyAddAssociationMixin<AiInvestmentInstance, string>;
    addInvestments: Sequelize.HasManyAddAssociationsMixin<AiInvestmentInstance, string>;
    removeAiInvestment: Sequelize.HasManyRemoveAssociationMixin<AiInvestmentInstance, string>;
    removeInvestments: Sequelize.HasManyRemoveAssociationsMixin<AiInvestmentInstance, string>;
    hasAiInvestment: Sequelize.HasManyHasAssociationMixin<AiInvestmentInstance, string>;
    hasInvestments: Sequelize.HasManyHasAssociationsMixin<AiInvestmentInstance, string>;
    countInvestments: Sequelize.HasManyCountAssociationsMixin;
    createAiInvestment: Sequelize.HasManyCreateAssociationMixin<AiInvestmentInstance>;
    getPlanDurations: Sequelize.HasManyGetAssociationsMixin<AiInvestmentPlanDurationInstance>;
    setPlanDurations: Sequelize.HasManySetAssociationsMixin<AiInvestmentPlanDurationInstance, string>;
    addAiInvestmentPlanDuration: Sequelize.HasManyAddAssociationMixin<AiInvestmentPlanDurationInstance, string>;
    addPlanDurations: Sequelize.HasManyAddAssociationsMixin<AiInvestmentPlanDurationInstance, string>;
    removeAiInvestmentPlanDuration: Sequelize.HasManyRemoveAssociationMixin<AiInvestmentPlanDurationInstance, string>;
    removePlanDurations: Sequelize.HasManyRemoveAssociationsMixin<AiInvestmentPlanDurationInstance, string>;
    hasAiInvestmentPlanDuration: Sequelize.HasManyHasAssociationMixin<AiInvestmentPlanDurationInstance, string>;
    hasPlanDurations: Sequelize.HasManyHasAssociationsMixin<AiInvestmentPlanDurationInstance, string>;
    countPlanDurations: Sequelize.HasManyCountAssociationsMixin;
    createAiInvestmentPlanDuration: Sequelize.HasManyCreateAssociationMixin<AiInvestmentPlanDurationInstance>;
    getDurations: Sequelize.BelongsToManyGetAssociationsMixin<AiInvestmentDurationInstance>;
    setDurations: Sequelize.BelongsToManySetAssociationsMixin<AiInvestmentDurationInstance, string>;
    addAiInvestmentDuration: Sequelize.BelongsToManyAddAssociationMixin<AiInvestmentDurationInstance, string>;
    addDurations: Sequelize.BelongsToManyAddAssociationsMixin<AiInvestmentDurationInstance, string>;
    removeAiInvestmentDuration: Sequelize.BelongsToManyRemoveAssociationMixin<AiInvestmentDurationInstance, string>;
    removeDurations: Sequelize.BelongsToManyRemoveAssociationsMixin<AiInvestmentDurationInstance, string>;
    hasAiInvestmentDuration: Sequelize.BelongsToManyHasAssociationMixin<AiInvestmentDurationInstance, string>;
    hasDurations: Sequelize.BelongsToManyHasAssociationsMixin<AiInvestmentDurationInstance, string>;
    countDurations: Sequelize.BelongsToManyCountAssociationsMixin;
    createAiInvestmentDuration: Sequelize.BelongsToManyCreateAssociationMixin<AiInvestmentDurationInstance>;
  }

  // ========================================
  // AiInvestmentPlanDuration
  // ========================================

  interface AiInvestmentPlanDurationAttributes {
    id: string;
    planId: string;
    durationId: string;
  }

  type AiInvestmentPlanDurationCreationAttributes = Optional<AiInvestmentPlanDurationAttributes, "id">;

  interface AiInvestmentPlanDurationInstance extends Model<AiInvestmentPlanDurationAttributes, AiInvestmentPlanDurationCreationAttributes>, AiInvestmentPlanDurationAttributes {
    duration?: AiInvestmentDurationInstance;
    plan?: AiInvestmentPlanInstance;
    getDuration: Sequelize.BelongsToGetAssociationMixin<AiInvestmentDurationInstance>;
    setDuration: Sequelize.BelongsToSetAssociationMixin<AiInvestmentDurationInstance, string>;
    createDuration: Sequelize.BelongsToCreateAssociationMixin<AiInvestmentDurationInstance>;
    getPlan: Sequelize.BelongsToGetAssociationMixin<AiInvestmentPlanInstance>;
    setPlan: Sequelize.BelongsToSetAssociationMixin<AiInvestmentPlanInstance, string>;
    createPlan: Sequelize.BelongsToCreateAssociationMixin<AiInvestmentPlanInstance>;
  }

  // ========================================
  // AiMarketMaker
  // ========================================

  interface AiMarketMakerAttributes {
    id: string;
    marketId: string;
    status: AiMarketMakerStatus;
    targetPrice: number;
    priceRangeLow: number;
    priceRangeHigh: number;
    aggressionLevel: AiMarketMakerAggressionLevel;
    maxDailyVolume: number;
    currentDailyVolume: number;
    volatilityThreshold: number;
    pauseOnHighVolatility: boolean;
    realLiquidityPercent: number;
    priceMode: AiMarketMakerPriceMode;
    externalSymbol: string | null;
    correlationStrength: number;
    marketBias: AiMarketMakerBias;
    biasStrength: number;
    currentPhase: AiMarketMakerPhase;
    phaseStartedAt: Date | null;
    nextPhaseChangeAt: Date | null;
    phaseTargetPrice: number | null;
    baseVolatility: number;
    volatilityMultiplier: number;
    momentumDecay: number;
    lastKnownPrice: number | null;
    trendMomentum: number;
    lastMomentumUpdate: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiMarketMakerCreationAttributes = Optional<AiMarketMakerAttributes, "id" | "pauseOnHighVolatility" | "externalSymbol" | "phaseStartedAt" | "nextPhaseChangeAt" | "phaseTargetPrice" | "lastKnownPrice" | "lastMomentumUpdate" | "createdAt" | "updatedAt">;

  interface AiMarketMakerInstance extends Model<AiMarketMakerAttributes, AiMarketMakerCreationAttributes>, AiMarketMakerAttributes {
    pool?: AiMarketMakerPoolInstance;
    bots?: AiBotInstance[];
    history?: AiMarketMakerHistoryInstance[];
    market?: EcosystemMarketInstance;
    getPool: Sequelize.HasOneGetAssociationMixin<AiMarketMakerPoolInstance>;
    setPool: Sequelize.HasOneSetAssociationMixin<AiMarketMakerPoolInstance, string>;
    createPool: Sequelize.HasOneCreateAssociationMixin<AiMarketMakerPoolInstance>;
    getBots: Sequelize.HasManyGetAssociationsMixin<AiBotInstance>;
    setBots: Sequelize.HasManySetAssociationsMixin<AiBotInstance, string>;
    addAiBot: Sequelize.HasManyAddAssociationMixin<AiBotInstance, string>;
    addBots: Sequelize.HasManyAddAssociationsMixin<AiBotInstance, string>;
    removeAiBot: Sequelize.HasManyRemoveAssociationMixin<AiBotInstance, string>;
    removeBots: Sequelize.HasManyRemoveAssociationsMixin<AiBotInstance, string>;
    hasAiBot: Sequelize.HasManyHasAssociationMixin<AiBotInstance, string>;
    hasBots: Sequelize.HasManyHasAssociationsMixin<AiBotInstance, string>;
    countBots: Sequelize.HasManyCountAssociationsMixin;
    createAiBot: Sequelize.HasManyCreateAssociationMixin<AiBotInstance>;
    getHistory: Sequelize.HasManyGetAssociationsMixin<AiMarketMakerHistoryInstance>;
    setHistory: Sequelize.HasManySetAssociationsMixin<AiMarketMakerHistoryInstance, string>;
    addAiMarketMakerHistory: Sequelize.HasManyAddAssociationMixin<AiMarketMakerHistoryInstance, string>;
    addHistory: Sequelize.HasManyAddAssociationsMixin<AiMarketMakerHistoryInstance, string>;
    removeAiMarketMakerHistory: Sequelize.HasManyRemoveAssociationMixin<AiMarketMakerHistoryInstance, string>;
    removeHistory: Sequelize.HasManyRemoveAssociationsMixin<AiMarketMakerHistoryInstance, string>;
    hasAiMarketMakerHistory: Sequelize.HasManyHasAssociationMixin<AiMarketMakerHistoryInstance, string>;
    hasHistory: Sequelize.HasManyHasAssociationsMixin<AiMarketMakerHistoryInstance, string>;
    countHistory: Sequelize.HasManyCountAssociationsMixin;
    createAiMarketMakerHistory: Sequelize.HasManyCreateAssociationMixin<AiMarketMakerHistoryInstance>;
    getMarket: Sequelize.BelongsToGetAssociationMixin<EcosystemMarketInstance>;
    setMarket: Sequelize.BelongsToSetAssociationMixin<EcosystemMarketInstance, string>;
    createMarket: Sequelize.BelongsToCreateAssociationMixin<EcosystemMarketInstance>;
  }

  // ========================================
  // AiMarketMakerHistory
  // ========================================

  interface AiMarketMakerHistoryAttributes {
    id: string;
    marketMakerId: string;
    action: AiMarketMakerHistoryAction;
    details?: AiMarketMakerHistoryDetails;
    priceAtAction: number;
    poolValueAtAction: number;
    createdAt?: Date;
  }

  type AiMarketMakerHistoryCreationAttributes = Optional<AiMarketMakerHistoryAttributes, "id" | "details" | "createdAt">;

  interface AiMarketMakerHistoryInstance extends Model<AiMarketMakerHistoryAttributes, AiMarketMakerHistoryCreationAttributes>, AiMarketMakerHistoryAttributes {
    marketMaker?: AiMarketMakerInstance;
    getMarketMaker: Sequelize.BelongsToGetAssociationMixin<AiMarketMakerInstance>;
    setMarketMaker: Sequelize.BelongsToSetAssociationMixin<AiMarketMakerInstance, string>;
    createMarketMaker: Sequelize.BelongsToCreateAssociationMixin<AiMarketMakerInstance>;
  }

  // ========================================
  // AiMarketMakerPool
  // ========================================

  interface AiMarketMakerPoolAttributes {
    id: string;
    marketMakerId: string;
    baseCurrencyBalance: number;
    quoteCurrencyBalance: number;
    initialBaseBalance: number;
    initialQuoteBalance: number;
    totalValueLocked: number;
    unrealizedPnL: number;
    realizedPnL: number;
    lastRebalanceAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiMarketMakerPoolCreationAttributes = Optional<AiMarketMakerPoolAttributes, "id" | "lastRebalanceAt" | "createdAt" | "updatedAt">;

  interface AiMarketMakerPoolInstance extends Model<AiMarketMakerPoolAttributes, AiMarketMakerPoolCreationAttributes>, AiMarketMakerPoolAttributes {
    marketMaker?: AiMarketMakerInstance;
    getMarketMaker: Sequelize.BelongsToGetAssociationMixin<AiMarketMakerInstance>;
    setMarketMaker: Sequelize.BelongsToSetAssociationMixin<AiMarketMakerInstance, string>;
    createMarketMaker: Sequelize.BelongsToCreateAssociationMixin<AiMarketMakerInstance>;
  }

  // ========================================
  // Announcement
  // ========================================

  interface AnnouncementAttributes {
    id: string;
    type: "GENERAL" | "EVENT" | "UPDATE";
    title: string;
    message: string;
    link?: string | null;
    status?: boolean | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type AnnouncementCreationAttributes = Optional<AnnouncementAttributes, "id" | "link" | "status" | "createdAt" | "updatedAt" | "deletedAt">;

  interface AnnouncementInstance extends Model<AnnouncementAttributes, AnnouncementCreationAttributes>, AnnouncementAttributes {
  }

  // ========================================
  // ApiKey
  // ========================================

  interface ApiKeyAttributes {
    id: string;
    userId?: string;
    name: string;
    key: string;
    type: "user" | "plugin";
    permissions: string[];
    ipRestriction: boolean;
    ipWhitelist: string[];
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type ApiKeyCreationAttributes = Optional<ApiKeyAttributes, "id" | "userId" | "type" | "permissions" | "ipRestriction" | "ipWhitelist" | "createdAt" | "deletedAt" | "updatedAt">;

  interface ApiKeyInstance extends Model<ApiKeyAttributes, ApiKeyCreationAttributes>, ApiKeyAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // Author
  // ========================================

  interface AuthorAttributes {
    id: string;
    userId: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type AuthorCreationAttributes = Optional<AuthorAttributes, "id" | "createdAt" | "deletedAt" | "updatedAt">;

  interface AuthorInstance extends Model<AuthorAttributes, AuthorCreationAttributes>, AuthorAttributes {
    posts?: PostInstance[];
    user?: UserInstance;
    getPosts: Sequelize.HasManyGetAssociationsMixin<PostInstance>;
    setPosts: Sequelize.HasManySetAssociationsMixin<PostInstance, string>;
    addPost: Sequelize.HasManyAddAssociationMixin<PostInstance, string>;
    addPosts: Sequelize.HasManyAddAssociationsMixin<PostInstance, string>;
    removePost: Sequelize.HasManyRemoveAssociationMixin<PostInstance, string>;
    removePosts: Sequelize.HasManyRemoveAssociationsMixin<PostInstance, string>;
    hasPost: Sequelize.HasManyHasAssociationMixin<PostInstance, string>;
    hasPosts: Sequelize.HasManyHasAssociationsMixin<PostInstance, string>;
    countPosts: Sequelize.HasManyCountAssociationsMixin;
    createPost: Sequelize.HasManyCreateAssociationMixin<PostInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // BinaryAiEngine
  // ========================================

  interface BinaryAiEngineAttributes {
    id: string;
    marketMakerId: string;
    status: "ACTIVE" | "PAUSED" | "STOPPED";
    targetUserWinRate: number;
    winRateVariance: number;
    winRateResetHours: number;
    practiceMode: "DISABLED" | "SAME_AS_LIVE" | "CUSTOM";
    practiceTargetWinRate: number;
    practiceWinRateVariance: number;
    optimizationStrategy: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
    maxPriceAdjustmentPercent: number;
    adjustmentLeadTimeSeconds: number;
    volatilityMaskingEnabled: boolean;
    volatilityNoisePercent: number;
    enableUserTiers: boolean;
    tierCalculationMethod: "VOLUME" | "DEPOSIT" | "MANUAL";
    enableBigWinCooldown: boolean;
    bigWinThreshold: number;
    cooldownDurationMinutes: number;
    cooldownWinRateReduction: number;
    enableWhaleDetection: boolean;
    whaleThreshold: number;
    whaleStrategy: "REDUCE_EXPOSURE" | "ALERT_ONLY" | "FORCE_LOSS";
    whaleWinRateCap: number;
    whaleProfitMultiplier: number;
    payoutMultiplier: number;
    emergencyStopLoss: number;
    correlationConfig?: Record<string, any> | null;
    simulationMode: boolean;
    logSimulatedActions: boolean;
    enableExternalCorrelation: boolean;
    externalPriceSource: string | null;
    maxDeviationPercent: number;
    allowedOrderTypes: string[];
    minPositionForOptimization: number;
    maxDailyLoss: number;
    maxSingleOrderExposure: number;
    currentPeriodWins: number;
    currentPeriodLosses: number;
    currentPeriodPlatformProfit: number;
    lastPeriodResetAt: Date;
    practicePeriodWins: number;
    practicePeriodLosses: number;
    lastPracticePeriodResetAt: Date;
    lastSnapshotId: string | null;
    mlModelWeights?: Record<string, any> | null;
    enableWhaleAlerts?: boolean | null;
    createdAt?: Date;
    updatedAt?: Date;
    marketMaker?: any;
    positions?: any[];
    actions?: any[];
    dailyStats?: any[];
    userTiers?: any[];
    userCooldowns?: any[];
    snapshots?: any[];
    simulations?: any[];
    abTests?: any[];
    cohorts?: any[];
    correlationAlerts?: any[];
  }

  type BinaryAiEngineCreationAttributes = Optional<BinaryAiEngineAttributes, "id" | "status" | "winRateVariance" | "winRateResetHours" | "practiceMode" | "practiceTargetWinRate" | "practiceWinRateVariance" | "optimizationStrategy" | "maxPriceAdjustmentPercent" | "adjustmentLeadTimeSeconds" | "volatilityMaskingEnabled" | "volatilityNoisePercent" | "enableUserTiers" | "tierCalculationMethod" | "enableBigWinCooldown" | "bigWinThreshold" | "cooldownDurationMinutes" | "cooldownWinRateReduction" | "enableWhaleDetection" | "whaleThreshold" | "whaleStrategy" | "whaleWinRateCap" | "whaleProfitMultiplier" | "payoutMultiplier" | "emergencyStopLoss" | "correlationConfig" | "simulationMode" | "logSimulatedActions" | "enableExternalCorrelation" | "externalPriceSource" | "maxDeviationPercent" | "allowedOrderTypes" | "minPositionForOptimization" | "maxDailyLoss" | "maxSingleOrderExposure" | "currentPeriodWins" | "currentPeriodLosses" | "currentPeriodPlatformProfit" | "lastPeriodResetAt" | "practicePeriodWins" | "practicePeriodLosses" | "lastPracticePeriodResetAt" | "lastSnapshotId" | "mlModelWeights" | "enableWhaleAlerts" | "createdAt" | "updatedAt" | "marketMaker" | "positions" | "actions" | "dailyStats" | "userTiers" | "userCooldowns" | "snapshots" | "simulations" | "abTests" | "cohorts" | "correlationAlerts">;

  interface BinaryAiEngineInstance extends Model<BinaryAiEngineAttributes, BinaryAiEngineCreationAttributes>, BinaryAiEngineAttributes {
    positions?: BinaryAiEnginePositionInstance[];
    actions?: BinaryAiEngineActionInstance[];
    dailyStats?: BinaryAiEngineDailyStatsInstance[];
    userTiers?: BinaryAiEngineUserTierInstance[];
    userCooldowns?: BinaryAiEngineUserCooldownInstance[];
    snapshots?: BinaryAiEngineSnapshotInstance[];
    simulations?: BinaryAiEngineSimulationInstance[];
    abTests?: BinaryAiEngineABTestInstance[];
    cohorts?: BinaryAiEngineCohortInstance[];
    correlationAlerts?: BinaryAiEngineCorrelationAlertInstance[];
    marketMaker?: AiMarketMakerInstance;
    getPositions: Sequelize.HasManyGetAssociationsMixin<BinaryAiEnginePositionInstance>;
    setPositions: Sequelize.HasManySetAssociationsMixin<BinaryAiEnginePositionInstance, string>;
    addBinaryAiEnginePosition: Sequelize.HasManyAddAssociationMixin<BinaryAiEnginePositionInstance, string>;
    addPositions: Sequelize.HasManyAddAssociationsMixin<BinaryAiEnginePositionInstance, string>;
    removeBinaryAiEnginePosition: Sequelize.HasManyRemoveAssociationMixin<BinaryAiEnginePositionInstance, string>;
    removePositions: Sequelize.HasManyRemoveAssociationsMixin<BinaryAiEnginePositionInstance, string>;
    hasBinaryAiEnginePosition: Sequelize.HasManyHasAssociationMixin<BinaryAiEnginePositionInstance, string>;
    hasPositions: Sequelize.HasManyHasAssociationsMixin<BinaryAiEnginePositionInstance, string>;
    countPositions: Sequelize.HasManyCountAssociationsMixin;
    createBinaryAiEnginePosition: Sequelize.HasManyCreateAssociationMixin<BinaryAiEnginePositionInstance>;
    getActions: Sequelize.HasManyGetAssociationsMixin<BinaryAiEngineActionInstance>;
    setActions: Sequelize.HasManySetAssociationsMixin<BinaryAiEngineActionInstance, string>;
    addBinaryAiEngineAction: Sequelize.HasManyAddAssociationMixin<BinaryAiEngineActionInstance, string>;
    addActions: Sequelize.HasManyAddAssociationsMixin<BinaryAiEngineActionInstance, string>;
    removeBinaryAiEngineAction: Sequelize.HasManyRemoveAssociationMixin<BinaryAiEngineActionInstance, string>;
    removeActions: Sequelize.HasManyRemoveAssociationsMixin<BinaryAiEngineActionInstance, string>;
    hasBinaryAiEngineAction: Sequelize.HasManyHasAssociationMixin<BinaryAiEngineActionInstance, string>;
    hasActions: Sequelize.HasManyHasAssociationsMixin<BinaryAiEngineActionInstance, string>;
    countActions: Sequelize.HasManyCountAssociationsMixin;
    createBinaryAiEngineAction: Sequelize.HasManyCreateAssociationMixin<BinaryAiEngineActionInstance>;
    getDailyStats: Sequelize.HasManyGetAssociationsMixin<BinaryAiEngineDailyStatsInstance>;
    setDailyStats: Sequelize.HasManySetAssociationsMixin<BinaryAiEngineDailyStatsInstance, string>;
    addBinaryAiEngineDailyStats: Sequelize.HasManyAddAssociationMixin<BinaryAiEngineDailyStatsInstance, string>;
    addDailyStats: Sequelize.HasManyAddAssociationsMixin<BinaryAiEngineDailyStatsInstance, string>;
    removeBinaryAiEngineDailyStats: Sequelize.HasManyRemoveAssociationMixin<BinaryAiEngineDailyStatsInstance, string>;
    removeDailyStats: Sequelize.HasManyRemoveAssociationsMixin<BinaryAiEngineDailyStatsInstance, string>;
    hasBinaryAiEngineDailyStats: Sequelize.HasManyHasAssociationMixin<BinaryAiEngineDailyStatsInstance, string>;
    hasDailyStats: Sequelize.HasManyHasAssociationsMixin<BinaryAiEngineDailyStatsInstance, string>;
    countDailyStats: Sequelize.HasManyCountAssociationsMixin;
    createBinaryAiEngineDailyStats: Sequelize.HasManyCreateAssociationMixin<BinaryAiEngineDailyStatsInstance>;
    getUserTiers: Sequelize.HasManyGetAssociationsMixin<BinaryAiEngineUserTierInstance>;
    setUserTiers: Sequelize.HasManySetAssociationsMixin<BinaryAiEngineUserTierInstance, string>;
    addBinaryAiEngineUserTier: Sequelize.HasManyAddAssociationMixin<BinaryAiEngineUserTierInstance, string>;
    addUserTiers: Sequelize.HasManyAddAssociationsMixin<BinaryAiEngineUserTierInstance, string>;
    removeBinaryAiEngineUserTier: Sequelize.HasManyRemoveAssociationMixin<BinaryAiEngineUserTierInstance, string>;
    removeUserTiers: Sequelize.HasManyRemoveAssociationsMixin<BinaryAiEngineUserTierInstance, string>;
    hasBinaryAiEngineUserTier: Sequelize.HasManyHasAssociationMixin<BinaryAiEngineUserTierInstance, string>;
    hasUserTiers: Sequelize.HasManyHasAssociationsMixin<BinaryAiEngineUserTierInstance, string>;
    countUserTiers: Sequelize.HasManyCountAssociationsMixin;
    createBinaryAiEngineUserTier: Sequelize.HasManyCreateAssociationMixin<BinaryAiEngineUserTierInstance>;
    getUserCooldowns: Sequelize.HasManyGetAssociationsMixin<BinaryAiEngineUserCooldownInstance>;
    setUserCooldowns: Sequelize.HasManySetAssociationsMixin<BinaryAiEngineUserCooldownInstance, string>;
    addBinaryAiEngineUserCooldown: Sequelize.HasManyAddAssociationMixin<BinaryAiEngineUserCooldownInstance, string>;
    addUserCooldowns: Sequelize.HasManyAddAssociationsMixin<BinaryAiEngineUserCooldownInstance, string>;
    removeBinaryAiEngineUserCooldown: Sequelize.HasManyRemoveAssociationMixin<BinaryAiEngineUserCooldownInstance, string>;
    removeUserCooldowns: Sequelize.HasManyRemoveAssociationsMixin<BinaryAiEngineUserCooldownInstance, string>;
    hasBinaryAiEngineUserCooldown: Sequelize.HasManyHasAssociationMixin<BinaryAiEngineUserCooldownInstance, string>;
    hasUserCooldowns: Sequelize.HasManyHasAssociationsMixin<BinaryAiEngineUserCooldownInstance, string>;
    countUserCooldowns: Sequelize.HasManyCountAssociationsMixin;
    createBinaryAiEngineUserCooldown: Sequelize.HasManyCreateAssociationMixin<BinaryAiEngineUserCooldownInstance>;
    getSnapshots: Sequelize.HasManyGetAssociationsMixin<BinaryAiEngineSnapshotInstance>;
    setSnapshots: Sequelize.HasManySetAssociationsMixin<BinaryAiEngineSnapshotInstance, string>;
    addBinaryAiEngineSnapshot: Sequelize.HasManyAddAssociationMixin<BinaryAiEngineSnapshotInstance, string>;
    addSnapshots: Sequelize.HasManyAddAssociationsMixin<BinaryAiEngineSnapshotInstance, string>;
    removeBinaryAiEngineSnapshot: Sequelize.HasManyRemoveAssociationMixin<BinaryAiEngineSnapshotInstance, string>;
    removeSnapshots: Sequelize.HasManyRemoveAssociationsMixin<BinaryAiEngineSnapshotInstance, string>;
    hasBinaryAiEngineSnapshot: Sequelize.HasManyHasAssociationMixin<BinaryAiEngineSnapshotInstance, string>;
    hasSnapshots: Sequelize.HasManyHasAssociationsMixin<BinaryAiEngineSnapshotInstance, string>;
    countSnapshots: Sequelize.HasManyCountAssociationsMixin;
    createBinaryAiEngineSnapshot: Sequelize.HasManyCreateAssociationMixin<BinaryAiEngineSnapshotInstance>;
    getSimulations: Sequelize.HasManyGetAssociationsMixin<BinaryAiEngineSimulationInstance>;
    setSimulations: Sequelize.HasManySetAssociationsMixin<BinaryAiEngineSimulationInstance, string>;
    addBinaryAiEngineSimulation: Sequelize.HasManyAddAssociationMixin<BinaryAiEngineSimulationInstance, string>;
    addSimulations: Sequelize.HasManyAddAssociationsMixin<BinaryAiEngineSimulationInstance, string>;
    removeBinaryAiEngineSimulation: Sequelize.HasManyRemoveAssociationMixin<BinaryAiEngineSimulationInstance, string>;
    removeSimulations: Sequelize.HasManyRemoveAssociationsMixin<BinaryAiEngineSimulationInstance, string>;
    hasBinaryAiEngineSimulation: Sequelize.HasManyHasAssociationMixin<BinaryAiEngineSimulationInstance, string>;
    hasSimulations: Sequelize.HasManyHasAssociationsMixin<BinaryAiEngineSimulationInstance, string>;
    countSimulations: Sequelize.HasManyCountAssociationsMixin;
    createBinaryAiEngineSimulation: Sequelize.HasManyCreateAssociationMixin<BinaryAiEngineSimulationInstance>;
    getAbTests: Sequelize.HasManyGetAssociationsMixin<BinaryAiEngineABTestInstance>;
    setAbTests: Sequelize.HasManySetAssociationsMixin<BinaryAiEngineABTestInstance, string>;
    addBinaryAiEngineABTest: Sequelize.HasManyAddAssociationMixin<BinaryAiEngineABTestInstance, string>;
    addAbTests: Sequelize.HasManyAddAssociationsMixin<BinaryAiEngineABTestInstance, string>;
    removeBinaryAiEngineABTest: Sequelize.HasManyRemoveAssociationMixin<BinaryAiEngineABTestInstance, string>;
    removeAbTests: Sequelize.HasManyRemoveAssociationsMixin<BinaryAiEngineABTestInstance, string>;
    hasBinaryAiEngineABTest: Sequelize.HasManyHasAssociationMixin<BinaryAiEngineABTestInstance, string>;
    hasAbTests: Sequelize.HasManyHasAssociationsMixin<BinaryAiEngineABTestInstance, string>;
    countAbTests: Sequelize.HasManyCountAssociationsMixin;
    createBinaryAiEngineABTest: Sequelize.HasManyCreateAssociationMixin<BinaryAiEngineABTestInstance>;
    getCohorts: Sequelize.HasManyGetAssociationsMixin<BinaryAiEngineCohortInstance>;
    setCohorts: Sequelize.HasManySetAssociationsMixin<BinaryAiEngineCohortInstance, string>;
    addBinaryAiEngineCohort: Sequelize.HasManyAddAssociationMixin<BinaryAiEngineCohortInstance, string>;
    addCohorts: Sequelize.HasManyAddAssociationsMixin<BinaryAiEngineCohortInstance, string>;
    removeBinaryAiEngineCohort: Sequelize.HasManyRemoveAssociationMixin<BinaryAiEngineCohortInstance, string>;
    removeCohorts: Sequelize.HasManyRemoveAssociationsMixin<BinaryAiEngineCohortInstance, string>;
    hasBinaryAiEngineCohort: Sequelize.HasManyHasAssociationMixin<BinaryAiEngineCohortInstance, string>;
    hasCohorts: Sequelize.HasManyHasAssociationsMixin<BinaryAiEngineCohortInstance, string>;
    countCohorts: Sequelize.HasManyCountAssociationsMixin;
    createBinaryAiEngineCohort: Sequelize.HasManyCreateAssociationMixin<BinaryAiEngineCohortInstance>;
    getCorrelationAlerts: Sequelize.HasManyGetAssociationsMixin<BinaryAiEngineCorrelationAlertInstance>;
    setCorrelationAlerts: Sequelize.HasManySetAssociationsMixin<BinaryAiEngineCorrelationAlertInstance, string>;
    addBinaryAiEngineCorrelationAlert: Sequelize.HasManyAddAssociationMixin<BinaryAiEngineCorrelationAlertInstance, string>;
    addCorrelationAlerts: Sequelize.HasManyAddAssociationsMixin<BinaryAiEngineCorrelationAlertInstance, string>;
    removeBinaryAiEngineCorrelationAlert: Sequelize.HasManyRemoveAssociationMixin<BinaryAiEngineCorrelationAlertInstance, string>;
    removeCorrelationAlerts: Sequelize.HasManyRemoveAssociationsMixin<BinaryAiEngineCorrelationAlertInstance, string>;
    hasBinaryAiEngineCorrelationAlert: Sequelize.HasManyHasAssociationMixin<BinaryAiEngineCorrelationAlertInstance, string>;
    hasCorrelationAlerts: Sequelize.HasManyHasAssociationsMixin<BinaryAiEngineCorrelationAlertInstance, string>;
    countCorrelationAlerts: Sequelize.HasManyCountAssociationsMixin;
    createBinaryAiEngineCorrelationAlert: Sequelize.HasManyCreateAssociationMixin<BinaryAiEngineCorrelationAlertInstance>;
    getMarketMaker: Sequelize.BelongsToGetAssociationMixin<AiMarketMakerInstance>;
    setMarketMaker: Sequelize.BelongsToSetAssociationMixin<AiMarketMakerInstance, string>;
    createMarketMaker: Sequelize.BelongsToCreateAssociationMixin<AiMarketMakerInstance>;
  }

  // ========================================
  // BinaryAiEngineABTest
  // ========================================

  interface BinaryAiEngineABTestAttributes {
    id: string;
    engineId: string;
    name: string;
    description?: string | null;
    status: "DRAFT" | "RUNNING" | "COMPLETED" | "CANCELLED" | "STOPPED" | "PAUSED";
    startedAt: Date | null;
    endedAt: Date | null;
    controlConfig: Record<string, any>;
    variantConfig: Record<string, any>;
    trafficSplit: number;
    controlOrders: number;
    controlWins: number;
    controlProfit: number;
    variantOrders: number;
    variantWins: number;
    variantProfit: number;
    winningVariant: "CONTROL" | "VARIANT" | "TIE" | "INCONCLUSIVE" | null;
    confidenceLevel: number | null;
    results?: Record<string, any> | null;
    variants?: Record<string, any>[] | null;
    primaryMetric?: string | null;
    targetSampleSize?: number | null;
    durationDays?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
    engine?: any;
  }

  type BinaryAiEngineABTestCreationAttributes = Optional<BinaryAiEngineABTestAttributes, "id" | "description" | "status" | "startedAt" | "endedAt" | "controlOrders" | "controlWins" | "controlProfit" | "variantOrders" | "variantWins" | "variantProfit" | "winningVariant" | "confidenceLevel" | "results" | "variants" | "primaryMetric" | "targetSampleSize" | "durationDays" | "createdAt" | "updatedAt" | "engine">;

  interface BinaryAiEngineABTestInstance extends Model<BinaryAiEngineABTestAttributes, BinaryAiEngineABTestCreationAttributes>, BinaryAiEngineABTestAttributes {
    engine?: BinaryAiEngineInstance;
    getEngine: Sequelize.BelongsToGetAssociationMixin<BinaryAiEngineInstance>;
    setEngine: Sequelize.BelongsToSetAssociationMixin<BinaryAiEngineInstance, string>;
    createEngine: Sequelize.BelongsToCreateAssociationMixin<BinaryAiEngineInstance>;
  }

  // ========================================
  // BinaryAiEngineABTestAssignment
  // ========================================

  interface BinaryAiEngineABTestAssignmentAttributes {
    id: string;
    testId: string;
    userId: string;
    variant: "CONTROL" | "TREATMENT";
    assignedAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
    test?: any;
    user?: any;
  }

  type BinaryAiEngineABTestAssignmentCreationAttributes = Optional<BinaryAiEngineABTestAssignmentAttributes, "id" | "assignedAt" | "createdAt" | "updatedAt" | "test" | "user">;

  interface BinaryAiEngineABTestAssignmentInstance extends Model<BinaryAiEngineABTestAssignmentAttributes, BinaryAiEngineABTestAssignmentCreationAttributes>, BinaryAiEngineABTestAssignmentAttributes {
    test?: BinaryAiEngineABTestInstance;
    user?: UserInstance;
    getTest: Sequelize.BelongsToGetAssociationMixin<BinaryAiEngineABTestInstance>;
    setTest: Sequelize.BelongsToSetAssociationMixin<BinaryAiEngineABTestInstance, string>;
    createTest: Sequelize.BelongsToCreateAssociationMixin<BinaryAiEngineABTestInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // BinaryAiEngineAction
  // ========================================

  interface BinaryAiEngineActionAttributes {
    id: string;
    engineId: string;
    actionType: "PRICE_ADJUSTMENT" | "OUTCOME_OVERRIDE" | "PERIOD_RESET" | "CONFIG_CHANGE" | "ENGINE_CREATED" | "ENGINE_START" | "ENGINE_STOP" | "ENGINE_PAUSE" | "EMERGENCY_STOP" | "MANUAL_OVERRIDE" | "TIER_ADJUSTMENT" | "COOLDOWN_APPLIED" | "COOLDOWN_REMOVED" | "WHALE_DETECTED" | "WHALE_HANDLED" | "SIMULATION_RUN" | "ROLLBACK_EXECUTED" | "CORRELATION_ALERT" | "AB_TEST_STARTED" | "AB_TEST_ENDED";
    symbol: string | null;
    details: Record<string, any> | null;
    previousValue: Record<string, any> | null;
    newValue: Record<string, any> | null;
    triggeredBy: string;
    isDemo: boolean;
    isSimulated: boolean;
    affectedUserId: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    engine?: any;
  }

  type BinaryAiEngineActionCreationAttributes = Optional<BinaryAiEngineActionAttributes, "id" | "symbol" | "details" | "previousValue" | "newValue" | "triggeredBy" | "isDemo" | "isSimulated" | "affectedUserId" | "createdAt" | "updatedAt" | "engine">;

  interface BinaryAiEngineActionInstance extends Model<BinaryAiEngineActionAttributes, BinaryAiEngineActionCreationAttributes>, BinaryAiEngineActionAttributes {
    engine?: BinaryAiEngineInstance;
    getEngine: Sequelize.BelongsToGetAssociationMixin<BinaryAiEngineInstance>;
    setEngine: Sequelize.BelongsToSetAssociationMixin<BinaryAiEngineInstance, string>;
    createEngine: Sequelize.BelongsToCreateAssociationMixin<BinaryAiEngineInstance>;
  }

  // ========================================
  // BinaryAiEngineCohort
  // ========================================

  interface BinaryAiEngineCohortAttributes {
    id: string;
    engineId: string;
    name: string;
    type: "SIGNUP_DATE" | "DEPOSIT_AMOUNT" | "TRADE_FREQUENCY" | "CUSTOM";
    startDate: Date | null;
    endDate: Date | null;
    minValue: number | null;
    maxValue: number | null;
    criteria: Record<string, any> | null;
    userCount: number;
    totalOrders: number;
    totalWins: number;
    avgWinRate: number;
    totalProfit: number;
    lastCalculatedAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    engine?: any;
  }

  type BinaryAiEngineCohortCreationAttributes = Optional<BinaryAiEngineCohortAttributes, "id" | "startDate" | "endDate" | "minValue" | "maxValue" | "criteria" | "userCount" | "totalOrders" | "totalWins" | "avgWinRate" | "totalProfit" | "lastCalculatedAt" | "createdAt" | "updatedAt" | "engine">;

  interface BinaryAiEngineCohortInstance extends Model<BinaryAiEngineCohortAttributes, BinaryAiEngineCohortCreationAttributes>, BinaryAiEngineCohortAttributes {
    engine?: BinaryAiEngineInstance;
    getEngine: Sequelize.BelongsToGetAssociationMixin<BinaryAiEngineInstance>;
    setEngine: Sequelize.BelongsToSetAssociationMixin<BinaryAiEngineInstance, string>;
    createEngine: Sequelize.BelongsToCreateAssociationMixin<BinaryAiEngineInstance>;
  }

  // ========================================
  // BinaryAiEngineCorrelationAlert
  // ========================================

  interface BinaryAiEngineCorrelationAlertAttributes {
    id: string;
    engineId: string;
    symbol: string;
    internalPrice: number;
    externalPrice: number;
    deviationPercent: number;
    priceSource: string | null;
    provider: string;
    message?: string | null;
    resolved: boolean;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
    acknowledgedBy: string | null;
    acknowledgedAt: Date | null;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    engine?: any;
  }

  type BinaryAiEngineCorrelationAlertCreationAttributes = Optional<BinaryAiEngineCorrelationAlertAttributes, "id" | "priceSource" | "message" | "resolved" | "severity" | "status" | "acknowledgedBy" | "acknowledgedAt" | "resolvedBy" | "resolvedAt" | "createdAt" | "updatedAt" | "engine">;

  interface BinaryAiEngineCorrelationAlertInstance extends Model<BinaryAiEngineCorrelationAlertAttributes, BinaryAiEngineCorrelationAlertCreationAttributes>, BinaryAiEngineCorrelationAlertAttributes {
    engine?: BinaryAiEngineInstance;
    getEngine: Sequelize.BelongsToGetAssociationMixin<BinaryAiEngineInstance>;
    setEngine: Sequelize.BelongsToSetAssociationMixin<BinaryAiEngineInstance, string>;
    createEngine: Sequelize.BelongsToCreateAssociationMixin<BinaryAiEngineInstance>;
  }

  // ========================================
  // BinaryAiEngineCorrelationHistory
  // ========================================

  interface BinaryAiEngineCorrelationHistoryAttributes {
    id: string;
    engineId: string;
    symbol: string;
    internalPrice: number;
    externalPrice: number;
    deviationPercent: number;
    provider: string;
    timestamp: Date;
    createdAt?: Date;
    updatedAt?: Date;
    engine?: any;
  }

  type BinaryAiEngineCorrelationHistoryCreationAttributes = Optional<BinaryAiEngineCorrelationHistoryAttributes, "id" | "timestamp" | "createdAt" | "updatedAt" | "engine">;

  interface BinaryAiEngineCorrelationHistoryInstance extends Model<BinaryAiEngineCorrelationHistoryAttributes, BinaryAiEngineCorrelationHistoryCreationAttributes>, BinaryAiEngineCorrelationHistoryAttributes {
    engine?: BinaryAiEngineInstance;
    getEngine: Sequelize.BelongsToGetAssociationMixin<BinaryAiEngineInstance>;
    setEngine: Sequelize.BelongsToSetAssociationMixin<BinaryAiEngineInstance, string>;
    createEngine: Sequelize.BelongsToCreateAssociationMixin<BinaryAiEngineInstance>;
  }

  // ========================================
  // BinaryAiEngineDailyStats
  // ========================================

  interface BinaryAiEngineDailyStatsAttributes {
    id: string;
    engineId: string;
    date: string;
    isDemo: boolean;
    totalOrdersProcessed: number;
    totalWins: number;
    totalLosses: number;
    totalDraws: number;
    platformProfit: number;
    effectiveUserWinRate: number;
    targetUserWinRate: number;
    profitMargin: number;
    priceAdjustmentCount: number;
    avgAdjustmentPercent: number;
    largestAdjustmentPercent: number;
    whaleOrdersCount: number;
    cooldownsApplied: number;
    tierBreakdown: Record<string, number> | null;
    createdAt?: Date;
    updatedAt?: Date;
    engine?: any;
  }

  type BinaryAiEngineDailyStatsCreationAttributes = Optional<BinaryAiEngineDailyStatsAttributes, "id" | "isDemo" | "totalOrdersProcessed" | "totalWins" | "totalLosses" | "totalDraws" | "platformProfit" | "effectiveUserWinRate" | "targetUserWinRate" | "profitMargin" | "priceAdjustmentCount" | "avgAdjustmentPercent" | "largestAdjustmentPercent" | "whaleOrdersCount" | "cooldownsApplied" | "tierBreakdown" | "createdAt" | "updatedAt" | "engine">;

  interface BinaryAiEngineDailyStatsInstance extends Model<BinaryAiEngineDailyStatsAttributes, BinaryAiEngineDailyStatsCreationAttributes>, BinaryAiEngineDailyStatsAttributes {
    engine?: BinaryAiEngineInstance;
    getEngine: Sequelize.BelongsToGetAssociationMixin<BinaryAiEngineInstance>;
    setEngine: Sequelize.BelongsToSetAssociationMixin<BinaryAiEngineInstance, string>;
    createEngine: Sequelize.BelongsToCreateAssociationMixin<BinaryAiEngineInstance>;
  }

  // ========================================
  // BinaryAiEnginePosition
  // ========================================

  interface BinaryAiEnginePositionAttributes {
    id: string;
    engineId: string;
    binaryOrderId: string;
    userId: string;
    symbol: string;
    side: "RISE" | "FALL";
    amount: number;
    entryPrice: number;
    expiryTime: Date;
    isDemo: boolean;
    userTier: string | null;
    isWhale: boolean;
    hasCooldown: boolean;
    outcome: "PENDING" | "WIN" | "LOSS" | "DRAW";
    status: "ACTIVE" | "SETTLED" | "CANCELLED";
    settledAt: Date | null;
    wasManipulated: boolean;
    manipulationDetails: Record<string, any> | null;
    createdAt?: Date;
    updatedAt?: Date;
    engine?: any;
    user?: any;
  }

  type BinaryAiEnginePositionCreationAttributes = Optional<BinaryAiEnginePositionAttributes, "id" | "isDemo" | "userTier" | "isWhale" | "hasCooldown" | "outcome" | "status" | "settledAt" | "wasManipulated" | "manipulationDetails" | "createdAt" | "updatedAt" | "engine" | "user">;

  interface BinaryAiEnginePositionInstance extends Model<BinaryAiEnginePositionAttributes, BinaryAiEnginePositionCreationAttributes>, BinaryAiEnginePositionAttributes {
    engine?: BinaryAiEngineInstance;
    user?: UserInstance;
    getEngine: Sequelize.BelongsToGetAssociationMixin<BinaryAiEngineInstance>;
    setEngine: Sequelize.BelongsToSetAssociationMixin<BinaryAiEngineInstance, string>;
    createEngine: Sequelize.BelongsToCreateAssociationMixin<BinaryAiEngineInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // BinaryAiEngineSimulation
  // ========================================

  interface BinaryAiEngineSimulationAttributes {
    id: string;
    engineId: string;
    name?: string | null;
    description?: string | null;
    startedAt: Date;
    endedAt: Date | null;
    status: "RUNNING" | "COMPLETED" | "CANCELLED";
    ordersAnalyzed: number;
    simulatedWins: number;
    simulatedLosses: number;
    simulatedProfit: number;
    priceAdjustmentsWouldHaveMade: number;
    configUsed: Record<string, any> | null;
    summary: Record<string, any> | null;
    createdAt?: Date;
    updatedAt?: Date;
    engine?: any;
  }

  type BinaryAiEngineSimulationCreationAttributes = Optional<BinaryAiEngineSimulationAttributes, "id" | "name" | "description" | "endedAt" | "status" | "ordersAnalyzed" | "simulatedWins" | "simulatedLosses" | "simulatedProfit" | "priceAdjustmentsWouldHaveMade" | "configUsed" | "summary" | "createdAt" | "updatedAt" | "engine">;

  interface BinaryAiEngineSimulationInstance extends Model<BinaryAiEngineSimulationAttributes, BinaryAiEngineSimulationCreationAttributes>, BinaryAiEngineSimulationAttributes {
    engine?: BinaryAiEngineInstance;
    getEngine: Sequelize.BelongsToGetAssociationMixin<BinaryAiEngineInstance>;
    setEngine: Sequelize.BelongsToSetAssociationMixin<BinaryAiEngineInstance, string>;
    createEngine: Sequelize.BelongsToCreateAssociationMixin<BinaryAiEngineInstance>;
  }

  // ========================================
  // BinaryAiEngineSnapshot
  // ========================================

  interface BinaryAiEngineSnapshotAttributes {
    id: string;
    engineId: string;
    name: string | null;
    description: string | null;
    configData: Record<string, any> | null;
    configSnapshot: Record<string, any>;
    performanceSnapshot: Record<string, any> | null;
    tierData: Record<string, any>[] | null;
    reason: "AUTO" | "MANUAL" | "PRE_CHANGE";
    createdBy: string;
    notes: string | null;
    isAutomatic: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    engine?: any;
  }

  type BinaryAiEngineSnapshotCreationAttributes = Optional<BinaryAiEngineSnapshotAttributes, "id" | "name" | "description" | "configData" | "performanceSnapshot" | "tierData" | "reason" | "createdBy" | "notes" | "isAutomatic" | "createdAt" | "updatedAt" | "engine">;

  interface BinaryAiEngineSnapshotInstance extends Model<BinaryAiEngineSnapshotAttributes, BinaryAiEngineSnapshotCreationAttributes>, BinaryAiEngineSnapshotAttributes {
    engine?: BinaryAiEngineInstance;
    getEngine: Sequelize.BelongsToGetAssociationMixin<BinaryAiEngineInstance>;
    setEngine: Sequelize.BelongsToSetAssociationMixin<BinaryAiEngineInstance, string>;
    createEngine: Sequelize.BelongsToCreateAssociationMixin<BinaryAiEngineInstance>;
  }

  // ========================================
  // BinaryAiEngineUserCooldown
  // ========================================

  interface BinaryAiEngineUserCooldownAttributes {
    id: string;
    engineId: string;
    userId: string;
    reason: "BIG_WIN" | "STREAK" | "MANUAL";
    triggerOrderId: string | null;
    triggerAmount: number | null;
    winRateReduction: number;
    startsAt: Date;
    expiresAt: Date;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    engine?: any;
    user?: any;
  }

  type BinaryAiEngineUserCooldownCreationAttributes = Optional<BinaryAiEngineUserCooldownAttributes, "id" | "reason" | "triggerOrderId" | "triggerAmount" | "isActive" | "createdAt" | "updatedAt" | "engine" | "user">;

  interface BinaryAiEngineUserCooldownInstance extends Model<BinaryAiEngineUserCooldownAttributes, BinaryAiEngineUserCooldownCreationAttributes>, BinaryAiEngineUserCooldownAttributes {
    engine?: BinaryAiEngineInstance;
    user?: UserInstance;
    getEngine: Sequelize.BelongsToGetAssociationMixin<BinaryAiEngineInstance>;
    setEngine: Sequelize.BelongsToSetAssociationMixin<BinaryAiEngineInstance, string>;
    createEngine: Sequelize.BelongsToCreateAssociationMixin<BinaryAiEngineInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // BinaryAiEngineUserTier
  // ========================================

  interface BinaryAiEngineUserTierAttributes {
    id: string;
    engineId: string;
    tierName: string;
    tierOrder: number;
    minVolume: number;
    minDeposit: number;
    winRateBonus: number;
    description: string | null;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    engine?: any;
  }

  type BinaryAiEngineUserTierCreationAttributes = Optional<BinaryAiEngineUserTierAttributes, "id" | "tierOrder" | "minVolume" | "minDeposit" | "description" | "isActive" | "createdAt" | "updatedAt" | "engine">;

  interface BinaryAiEngineUserTierInstance extends Model<BinaryAiEngineUserTierAttributes, BinaryAiEngineUserTierCreationAttributes>, BinaryAiEngineUserTierAttributes {
    engine?: BinaryAiEngineInstance;
    getEngine: Sequelize.BelongsToGetAssociationMixin<BinaryAiEngineInstance>;
    setEngine: Sequelize.BelongsToSetAssociationMixin<BinaryAiEngineInstance, string>;
    createEngine: Sequelize.BelongsToCreateAssociationMixin<BinaryAiEngineInstance>;
    // Instance methods
    maxVolume: number;
  }

  // ========================================
  // BinaryMarket
  // ========================================

  interface BinaryMarketAttributes {
    id: string;
    currency: string;
    pair: string;
    minAmount?: number;
    maxAmount?: number;
    isTrending?: boolean | null;
    isHot?: boolean | null;
    status: boolean;
  }

  type BinaryMarketCreationAttributes = Optional<BinaryMarketAttributes, "id" | "minAmount" | "maxAmount" | "isTrending" | "isHot">;

  interface BinaryMarketInstance extends Model<BinaryMarketAttributes, BinaryMarketCreationAttributes>, BinaryMarketAttributes {
  }

  // ========================================
  // BinaryOrder
  // ========================================

  interface BinaryOrderAttributes {
    id: string;
    userId: string;
    symbol: string;
    price: number;
    amount: number;
    profit: number;
    side: | "RISE"
    | "FALL"
    | "HIGHER"
    | "LOWER"
    | "TOUCH"
    | "NO_TOUCH"
    | "CALL"
    | "PUT"
    | "UP"
    | "DOWN";
    type: "RISE_FALL" | "HIGHER_LOWER" | "TOUCH_NO_TOUCH" | "CALL_PUT" | "TURBO";
    durationType: "TIME" | "TICKS";
    barrier?: number;
    strikePrice?: number;
    payoutPerPoint?: number;
    profitPercentage?: number;
    status: "PENDING" | "WIN" | "LOSS" | "DRAW" | "CANCELED" | "ERROR";
    isDemo: boolean;
    closedAt: Date;
    closePrice?: number;
    metadata?: Record<string, any> | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type BinaryOrderCreationAttributes = Optional<BinaryOrderAttributes, "id" | "barrier" | "strikePrice" | "payoutPerPoint" | "profitPercentage" | "isDemo" | "closePrice" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

  interface BinaryOrderInstance extends Model<BinaryOrderAttributes, BinaryOrderCreationAttributes>, BinaryOrderAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // Category
  // ========================================

  interface CategoryAttributes {
    id: string;
    name: string;
    slug: string;
    image?: string;
    description?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type CategoryCreationAttributes = Optional<CategoryAttributes, "id" | "image" | "description" | "createdAt" | "updatedAt" | "deletedAt">;

  interface CategoryInstance extends Model<CategoryAttributes, CategoryCreationAttributes>, CategoryAttributes {
    posts?: PostInstance[];
    getPosts: Sequelize.HasManyGetAssociationsMixin<PostInstance>;
    setPosts: Sequelize.HasManySetAssociationsMixin<PostInstance, string>;
    addPost: Sequelize.HasManyAddAssociationMixin<PostInstance, string>;
    addPosts: Sequelize.HasManyAddAssociationsMixin<PostInstance, string>;
    removePost: Sequelize.HasManyRemoveAssociationMixin<PostInstance, string>;
    removePosts: Sequelize.HasManyRemoveAssociationsMixin<PostInstance, string>;
    hasPost: Sequelize.HasManyHasAssociationMixin<PostInstance, string>;
    hasPosts: Sequelize.HasManyHasAssociationsMixin<PostInstance, string>;
    countPosts: Sequelize.HasManyCountAssociationsMixin;
    createPost: Sequelize.HasManyCreateAssociationMixin<PostInstance>;
  }

  // ========================================
  // Comment
  // ========================================

  interface CommentAttributes {
    id: string;
    content: string;
    userId: string;
    postId: string;
    status: "APPROVED" | "PENDING" | "REJECTED";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type CommentCreationAttributes = Optional<CommentAttributes, "id" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

  interface CommentInstance extends Model<CommentAttributes, CommentCreationAttributes>, CommentAttributes {
    user?: UserInstance;
    post?: PostInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getPost: Sequelize.BelongsToGetAssociationMixin<PostInstance>;
    setPost: Sequelize.BelongsToSetAssociationMixin<PostInstance, string>;
    createPost: Sequelize.BelongsToCreateAssociationMixin<PostInstance>;
  }

  // ========================================
  // CopyTradingAuditLog
  // ========================================

  interface CopyTradingAuditLogAttributes {
    id: string;
    entityType: AuditEntityType;
    entityId: string;
    action: AuditAction;
    oldValue?: string | null;
    newValue?: string | null;
    userId?: string | null;
    adminId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    reason?: string | null;
    metadata?: string | null;
    createdAt?: Date;
  }

  type CopyTradingAuditLogCreationAttributes = Optional<CopyTradingAuditLogAttributes, "id" | "oldValue" | "newValue" | "userId" | "adminId" | "ipAddress" | "userAgent" | "reason" | "metadata" | "createdAt">;

  interface CopyTradingAuditLogInstance extends Model<CopyTradingAuditLogAttributes, CopyTradingAuditLogCreationAttributes>, CopyTradingAuditLogAttributes {
    user?: UserInstance;
    admin?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getAdmin: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setAdmin: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createAdmin: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // CopyTradingFollower
  // ========================================

  interface CopyTradingFollowerAttributes {
    id: string;
    userId: string;
    leaderId: string;
    copyMode: "PROPORTIONAL" | "FIXED_AMOUNT" | "FIXED_RATIO";
    fixedAmount?: number | null;
    fixedRatio?: number | null;
    maxDailyLoss?: number | null;
    maxPositionSize?: number | null;
    stopLossPercent?: number | null;
    takeProfitPercent?: number | null;
    status: "ACTIVE" | "PAUSED" | "STOPPED";
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
  }

  type CopyTradingFollowerCreationAttributes = Optional<CopyTradingFollowerAttributes, "id" | "copyMode" | "fixedAmount" | "fixedRatio" | "maxDailyLoss" | "maxPositionSize" | "stopLossPercent" | "takeProfitPercent" | "status" | "createdAt" | "updatedAt" | "deletedAt">;

  interface CopyTradingFollowerInstance extends Model<CopyTradingFollowerAttributes, CopyTradingFollowerCreationAttributes>, CopyTradingFollowerAttributes {
    trades?: CopyTradingTradeInstance[];
    transactions?: CopyTradingTransactionInstance[];
    allocations?: CopyTradingFollowerAllocationInstance[];
    user?: UserInstance;
    leader?: CopyTradingLeaderInstance;
    getTrades: Sequelize.HasManyGetAssociationsMixin<CopyTradingTradeInstance>;
    setTrades: Sequelize.HasManySetAssociationsMixin<CopyTradingTradeInstance, string>;
    addCopyTradingTrade: Sequelize.HasManyAddAssociationMixin<CopyTradingTradeInstance, string>;
    addTrades: Sequelize.HasManyAddAssociationsMixin<CopyTradingTradeInstance, string>;
    removeCopyTradingTrade: Sequelize.HasManyRemoveAssociationMixin<CopyTradingTradeInstance, string>;
    removeTrades: Sequelize.HasManyRemoveAssociationsMixin<CopyTradingTradeInstance, string>;
    hasCopyTradingTrade: Sequelize.HasManyHasAssociationMixin<CopyTradingTradeInstance, string>;
    hasTrades: Sequelize.HasManyHasAssociationsMixin<CopyTradingTradeInstance, string>;
    countTrades: Sequelize.HasManyCountAssociationsMixin;
    createCopyTradingTrade: Sequelize.HasManyCreateAssociationMixin<CopyTradingTradeInstance>;
    getTransactions: Sequelize.HasManyGetAssociationsMixin<CopyTradingTransactionInstance>;
    setTransactions: Sequelize.HasManySetAssociationsMixin<CopyTradingTransactionInstance, string>;
    addCopyTradingTransaction: Sequelize.HasManyAddAssociationMixin<CopyTradingTransactionInstance, string>;
    addTransactions: Sequelize.HasManyAddAssociationsMixin<CopyTradingTransactionInstance, string>;
    removeCopyTradingTransaction: Sequelize.HasManyRemoveAssociationMixin<CopyTradingTransactionInstance, string>;
    removeTransactions: Sequelize.HasManyRemoveAssociationsMixin<CopyTradingTransactionInstance, string>;
    hasCopyTradingTransaction: Sequelize.HasManyHasAssociationMixin<CopyTradingTransactionInstance, string>;
    hasTransactions: Sequelize.HasManyHasAssociationsMixin<CopyTradingTransactionInstance, string>;
    countTransactions: Sequelize.HasManyCountAssociationsMixin;
    createCopyTradingTransaction: Sequelize.HasManyCreateAssociationMixin<CopyTradingTransactionInstance>;
    getAllocations: Sequelize.HasManyGetAssociationsMixin<CopyTradingFollowerAllocationInstance>;
    setAllocations: Sequelize.HasManySetAssociationsMixin<CopyTradingFollowerAllocationInstance, string>;
    addCopyTradingFollowerAllocation: Sequelize.HasManyAddAssociationMixin<CopyTradingFollowerAllocationInstance, string>;
    addAllocations: Sequelize.HasManyAddAssociationsMixin<CopyTradingFollowerAllocationInstance, string>;
    removeCopyTradingFollowerAllocation: Sequelize.HasManyRemoveAssociationMixin<CopyTradingFollowerAllocationInstance, string>;
    removeAllocations: Sequelize.HasManyRemoveAssociationsMixin<CopyTradingFollowerAllocationInstance, string>;
    hasCopyTradingFollowerAllocation: Sequelize.HasManyHasAssociationMixin<CopyTradingFollowerAllocationInstance, string>;
    hasAllocations: Sequelize.HasManyHasAssociationsMixin<CopyTradingFollowerAllocationInstance, string>;
    countAllocations: Sequelize.HasManyCountAssociationsMixin;
    createCopyTradingFollowerAllocation: Sequelize.HasManyCreateAssociationMixin<CopyTradingFollowerAllocationInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getLeader: Sequelize.BelongsToGetAssociationMixin<CopyTradingLeaderInstance>;
    setLeader: Sequelize.BelongsToSetAssociationMixin<CopyTradingLeaderInstance, string>;
    createLeader: Sequelize.BelongsToCreateAssociationMixin<CopyTradingLeaderInstance>;
  }

  // ========================================
  // CopyTradingFollowerAllocation
  // ========================================

  interface CopyTradingFollowerAllocationAttributes {
    id: string;
    followerId: string;
    symbol: string;
    baseAmount: number;
    baseUsedAmount: number;
    quoteAmount: number;
    quoteUsedAmount: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type CopyTradingFollowerAllocationCreationAttributes = Optional<CopyTradingFollowerAllocationAttributes, "id" | "baseUsedAmount" | "quoteUsedAmount" | "isActive" | "createdAt" | "updatedAt">;

  interface CopyTradingFollowerAllocationInstance extends Model<CopyTradingFollowerAllocationAttributes, CopyTradingFollowerAllocationCreationAttributes>, CopyTradingFollowerAllocationAttributes {
    follower?: CopyTradingFollowerInstance;
    getFollower: Sequelize.BelongsToGetAssociationMixin<CopyTradingFollowerInstance>;
    setFollower: Sequelize.BelongsToSetAssociationMixin<CopyTradingFollowerInstance, string>;
    createFollower: Sequelize.BelongsToCreateAssociationMixin<CopyTradingFollowerInstance>;
  }

  // ========================================
  // CopyTradingLeader
  // ========================================

  interface CopyTradingLeaderAttributes {
    id: string;
    userId: string;
    displayName: string;
    avatar?: string | null;
    bio?: string | null;
    tradingStyle: "SCALPING" | "DAY_TRADING" | "SWING" | "POSITION";
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    profitSharePercent: number;
    minFollowAmount: number;
    maxFollowers: number;
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED" | "INACTIVE";
    isPublic: boolean;
    applicationNote?: string | null;
    rejectionReason?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
  }

  type CopyTradingLeaderCreationAttributes = Optional<CopyTradingLeaderAttributes, "id" | "avatar" | "bio" | "tradingStyle" | "riskLevel" | "status" | "isPublic" | "applicationNote" | "rejectionReason" | "createdAt" | "updatedAt" | "deletedAt">;

  interface CopyTradingLeaderInstance extends Model<CopyTradingLeaderAttributes, CopyTradingLeaderCreationAttributes>, CopyTradingLeaderAttributes {
    followers?: CopyTradingFollowerInstance[];
    trades?: CopyTradingTradeInstance[];
    transactions?: CopyTradingTransactionInstance[];
    markets?: CopyTradingLeaderMarketInstance[];
    user?: UserInstance;
    getFollowers: Sequelize.HasManyGetAssociationsMixin<CopyTradingFollowerInstance>;
    setFollowers: Sequelize.HasManySetAssociationsMixin<CopyTradingFollowerInstance, string>;
    addCopyTradingFollower: Sequelize.HasManyAddAssociationMixin<CopyTradingFollowerInstance, string>;
    addFollowers: Sequelize.HasManyAddAssociationsMixin<CopyTradingFollowerInstance, string>;
    removeCopyTradingFollower: Sequelize.HasManyRemoveAssociationMixin<CopyTradingFollowerInstance, string>;
    removeFollowers: Sequelize.HasManyRemoveAssociationsMixin<CopyTradingFollowerInstance, string>;
    hasCopyTradingFollower: Sequelize.HasManyHasAssociationMixin<CopyTradingFollowerInstance, string>;
    hasFollowers: Sequelize.HasManyHasAssociationsMixin<CopyTradingFollowerInstance, string>;
    countFollowers: Sequelize.HasManyCountAssociationsMixin;
    createCopyTradingFollower: Sequelize.HasManyCreateAssociationMixin<CopyTradingFollowerInstance>;
    getTrades: Sequelize.HasManyGetAssociationsMixin<CopyTradingTradeInstance>;
    setTrades: Sequelize.HasManySetAssociationsMixin<CopyTradingTradeInstance, string>;
    addCopyTradingTrade: Sequelize.HasManyAddAssociationMixin<CopyTradingTradeInstance, string>;
    addTrades: Sequelize.HasManyAddAssociationsMixin<CopyTradingTradeInstance, string>;
    removeCopyTradingTrade: Sequelize.HasManyRemoveAssociationMixin<CopyTradingTradeInstance, string>;
    removeTrades: Sequelize.HasManyRemoveAssociationsMixin<CopyTradingTradeInstance, string>;
    hasCopyTradingTrade: Sequelize.HasManyHasAssociationMixin<CopyTradingTradeInstance, string>;
    hasTrades: Sequelize.HasManyHasAssociationsMixin<CopyTradingTradeInstance, string>;
    countTrades: Sequelize.HasManyCountAssociationsMixin;
    createCopyTradingTrade: Sequelize.HasManyCreateAssociationMixin<CopyTradingTradeInstance>;
    getTransactions: Sequelize.HasManyGetAssociationsMixin<CopyTradingTransactionInstance>;
    setTransactions: Sequelize.HasManySetAssociationsMixin<CopyTradingTransactionInstance, string>;
    addCopyTradingTransaction: Sequelize.HasManyAddAssociationMixin<CopyTradingTransactionInstance, string>;
    addTransactions: Sequelize.HasManyAddAssociationsMixin<CopyTradingTransactionInstance, string>;
    removeCopyTradingTransaction: Sequelize.HasManyRemoveAssociationMixin<CopyTradingTransactionInstance, string>;
    removeTransactions: Sequelize.HasManyRemoveAssociationsMixin<CopyTradingTransactionInstance, string>;
    hasCopyTradingTransaction: Sequelize.HasManyHasAssociationMixin<CopyTradingTransactionInstance, string>;
    hasTransactions: Sequelize.HasManyHasAssociationsMixin<CopyTradingTransactionInstance, string>;
    countTransactions: Sequelize.HasManyCountAssociationsMixin;
    createCopyTradingTransaction: Sequelize.HasManyCreateAssociationMixin<CopyTradingTransactionInstance>;
    getMarkets: Sequelize.HasManyGetAssociationsMixin<CopyTradingLeaderMarketInstance>;
    setMarkets: Sequelize.HasManySetAssociationsMixin<CopyTradingLeaderMarketInstance, string>;
    addCopyTradingLeaderMarket: Sequelize.HasManyAddAssociationMixin<CopyTradingLeaderMarketInstance, string>;
    addMarkets: Sequelize.HasManyAddAssociationsMixin<CopyTradingLeaderMarketInstance, string>;
    removeCopyTradingLeaderMarket: Sequelize.HasManyRemoveAssociationMixin<CopyTradingLeaderMarketInstance, string>;
    removeMarkets: Sequelize.HasManyRemoveAssociationsMixin<CopyTradingLeaderMarketInstance, string>;
    hasCopyTradingLeaderMarket: Sequelize.HasManyHasAssociationMixin<CopyTradingLeaderMarketInstance, string>;
    hasMarkets: Sequelize.HasManyHasAssociationsMixin<CopyTradingLeaderMarketInstance, string>;
    countMarkets: Sequelize.HasManyCountAssociationsMixin;
    createCopyTradingLeaderMarket: Sequelize.HasManyCreateAssociationMixin<CopyTradingLeaderMarketInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // CopyTradingLeaderMarket
  // ========================================

  interface CopyTradingLeaderMarketAttributes {
    id: string;
    leaderId: string;
    symbol: string;
    baseCurrency: string;
    quoteCurrency: string;
    minBase: number;
    minQuote: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type CopyTradingLeaderMarketCreationAttributes = Optional<CopyTradingLeaderMarketAttributes, "id" | "minBase" | "minQuote" | "isActive" | "createdAt" | "updatedAt">;

  interface CopyTradingLeaderMarketInstance extends Model<CopyTradingLeaderMarketAttributes, CopyTradingLeaderMarketCreationAttributes>, CopyTradingLeaderMarketAttributes {
    leader?: CopyTradingLeaderInstance;
    getLeader: Sequelize.BelongsToGetAssociationMixin<CopyTradingLeaderInstance>;
    setLeader: Sequelize.BelongsToSetAssociationMixin<CopyTradingLeaderInstance, string>;
    createLeader: Sequelize.BelongsToCreateAssociationMixin<CopyTradingLeaderInstance>;
  }

  // ========================================
  // CopyTradingLeaderStats
  // ========================================

  interface CopyTradingLeaderStatsAttributes {
    id: string;
    leaderId: string;
    date: string;
    trades: number;
    winningTrades: number;
    losingTrades: number;
    volume: number;
    profit: number;
    fees: number;
    startEquity: number;
    endEquity: number;
    highEquity: number;
    lowEquity: number;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type CopyTradingLeaderStatsCreationAttributes = Optional<CopyTradingLeaderStatsAttributes, "id" | "trades" | "winningTrades" | "losingTrades" | "volume" | "profit" | "fees" | "startEquity" | "endEquity" | "highEquity" | "lowEquity" | "createdAt" | "updatedAt">;

  interface CopyTradingLeaderStatsInstance extends Model<CopyTradingLeaderStatsAttributes, CopyTradingLeaderStatsCreationAttributes>, CopyTradingLeaderStatsAttributes {
    leader?: CopyTradingLeaderInstance;
    getLeader: Sequelize.BelongsToGetAssociationMixin<CopyTradingLeaderInstance>;
    setLeader: Sequelize.BelongsToSetAssociationMixin<CopyTradingLeaderInstance, string>;
    createLeader: Sequelize.BelongsToCreateAssociationMixin<CopyTradingLeaderInstance>;
  }

  // ========================================
  // CopyTradingTrade
  // ========================================

  interface CopyTradingTradeAttributes {
    id: string;
    leaderId: string;
    followerId?: string | null;
    leaderOrderId?: string | null;
    symbol: string;
    side: "BUY" | "SELL";
    type: "MARKET" | "LIMIT";
    amount: number;
    price: number;
    cost: number;
    fee: number;
    feeCurrency: string;
    executedAmount: number;
    executedPrice: number;
    slippage?: number | null;
    latencyMs?: number | null;
    profit?: number | null;
    profitPercent?: number | null;
    profitCurrency?: string | null;
    status: "PENDING" | "PENDING_REPLICATION" | "REPLICATED" | "REPLICATION_FAILED" | "OPEN" | "CLOSED" | "PARTIALLY_FILLED" | "FAILED" | "CANCELLED";
    errorMessage?: string | null;
    isLeaderTrade: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    closedAt?: Date | null;
  }

  type CopyTradingTradeCreationAttributes = Optional<CopyTradingTradeAttributes, "id" | "followerId" | "leaderOrderId" | "type" | "cost" | "fee" | "feeCurrency" | "executedAmount" | "executedPrice" | "slippage" | "latencyMs" | "profit" | "profitPercent" | "profitCurrency" | "status" | "errorMessage" | "isLeaderTrade" | "createdAt" | "updatedAt" | "closedAt">;

  interface CopyTradingTradeInstance extends Model<CopyTradingTradeAttributes, CopyTradingTradeCreationAttributes>, CopyTradingTradeAttributes {
    leader?: CopyTradingLeaderInstance;
    follower?: CopyTradingFollowerInstance;
    getLeader: Sequelize.BelongsToGetAssociationMixin<CopyTradingLeaderInstance>;
    setLeader: Sequelize.BelongsToSetAssociationMixin<CopyTradingLeaderInstance, string>;
    createLeader: Sequelize.BelongsToCreateAssociationMixin<CopyTradingLeaderInstance>;
    getFollower: Sequelize.BelongsToGetAssociationMixin<CopyTradingFollowerInstance>;
    setFollower: Sequelize.BelongsToSetAssociationMixin<CopyTradingFollowerInstance, string>;
    createFollower: Sequelize.BelongsToCreateAssociationMixin<CopyTradingFollowerInstance>;
  }

  // ========================================
  // CopyTradingTransaction
  // ========================================

  interface CopyTradingTransactionAttributes {
    id: string;
    userId: string;
    leaderId?: string | null;
    followerId?: string | null;
    tradeId?: string | null;
    type: "ALLOCATION" | "DEALLOCATION" | "PROFIT_SHARE" | "TRADE_PROFIT" | "TRADE_LOSS" | "FEE" | "REFUND";
    amount: number;
    currency: string;
    fee: number;
    balanceBefore: number;
    balanceAfter: number;
    status: "PENDING" | "COMPLETED" | "FAILED";
    description?: string | null;
    metadata?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type CopyTradingTransactionCreationAttributes = Optional<CopyTradingTransactionAttributes, "id" | "leaderId" | "followerId" | "tradeId" | "currency" | "fee" | "balanceBefore" | "balanceAfter" | "status" | "description" | "metadata" | "createdAt" | "updatedAt">;

  interface CopyTradingTransactionInstance extends Model<CopyTradingTransactionAttributes, CopyTradingTransactionCreationAttributes>, CopyTradingTransactionAttributes {
    user?: UserInstance;
    leader?: CopyTradingLeaderInstance;
    follower?: CopyTradingFollowerInstance;
    trade?: CopyTradingTradeInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getLeader: Sequelize.BelongsToGetAssociationMixin<CopyTradingLeaderInstance>;
    setLeader: Sequelize.BelongsToSetAssociationMixin<CopyTradingLeaderInstance, string>;
    createLeader: Sequelize.BelongsToCreateAssociationMixin<CopyTradingLeaderInstance>;
    getFollower: Sequelize.BelongsToGetAssociationMixin<CopyTradingFollowerInstance>;
    setFollower: Sequelize.BelongsToSetAssociationMixin<CopyTradingFollowerInstance, string>;
    createFollower: Sequelize.BelongsToCreateAssociationMixin<CopyTradingFollowerInstance>;
    getTrade: Sequelize.BelongsToGetAssociationMixin<CopyTradingTradeInstance>;
    setTrade: Sequelize.BelongsToSetAssociationMixin<CopyTradingTradeInstance, string>;
    createTrade: Sequelize.BelongsToCreateAssociationMixin<CopyTradingTradeInstance>;
  }

  // ========================================
  // Currency
  // ========================================

  interface CurrencyAttributes {
    id: string;
    name: string;
    symbol: string;
    precision: number;
    price?: number | null;
    status: boolean;
  }

  type CurrencyCreationAttributes = Optional<CurrencyAttributes, "id" | "price">;

  interface CurrencyInstance extends Model<CurrencyAttributes, CurrencyCreationAttributes>, CurrencyAttributes {
  }

  // ========================================
  // DefaultPage
  // ========================================

  interface DefaultPageAttributes {
    id: string;
    pageId: string;
    pageSource: "default" | "builder";
    type: "variables" | "content";
    title: string;
    variables?: Record<string, any> | null;
    content?: string | null;
    meta?: Record<string, any> | null;
    status: "active" | "draft";
    createdAt?: Date;
    updatedAt?: Date;
  }

  type DefaultPageCreationAttributes = Optional<DefaultPageAttributes, "id" | "pageSource" | "variables" | "content" | "meta" | "status" | "createdAt" | "updatedAt">;

  interface DefaultPageInstance extends Model<DefaultPageAttributes, DefaultPageCreationAttributes>, DefaultPageAttributes {
  }

  // ========================================
  // DepositGateway
  // ========================================

  interface DepositGatewayAttributes {
    id: string;
    name: string;
    title: string;
    description: string;
    image?: string;
    alias?: string | null;
    currencies?: string[] | null;
    fixedFee?: number | Record<string, number>;
    percentageFee?: number | Record<string, number>;
    minAmount?: number | Record<string, number>;
    maxAmount?: number | Record<string, number>;
    type: "FIAT" | "CRYPTO";
    status?: boolean;
    version?: string | null;
    productId?: string;
  }

  type DepositGatewayCreationAttributes = Optional<DepositGatewayAttributes, "id" | "image" | "alias" | "currencies" | "fixedFee" | "percentageFee" | "minAmount" | "maxAmount" | "status" | "version" | "productId">;

  interface DepositGatewayInstance extends Model<DepositGatewayAttributes, DepositGatewayCreationAttributes>, DepositGatewayAttributes {
    // Instance methods
    getFixedFee(CurrencyInstance?: string): number;
    getPercentageFee(CurrencyInstance?: string): number;
    getMinAmount(CurrencyInstance?: string): number;
    getMaxAmount(CurrencyInstance?: string): number | null;
  }

  // ========================================
  // DepositMethod
  // ========================================

  interface DepositMethodAttributes {
    id: string;
    title: string;
    instructions: string;
    image?: string;
    fixedFee: number;
    percentageFee: number;
    minAmount: number;
    maxAmount: number;
    customFields?: string;
    status?: boolean | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type DepositMethodCreationAttributes = Optional<DepositMethodAttributes, "id" | "image" | "customFields" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

  interface DepositMethodInstance extends Model<DepositMethodAttributes, DepositMethodCreationAttributes>, DepositMethodAttributes {
  }

  // ========================================
  // EcommerceCategory
  // ========================================

  interface EcommerceCategoryAttributes {
    id: string;
    name: string;
    slug: string;
    description: string;
    image?: string;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcommerceCategoryCreationAttributes = Optional<EcommerceCategoryAttributes, "id" | "image" | "createdAt" | "deletedAt" | "updatedAt">;

  interface EcommerceCategoryInstance extends Model<EcommerceCategoryAttributes, EcommerceCategoryCreationAttributes>, EcommerceCategoryAttributes {
    ecommerceProducts?: EcommerceProductInstance[];
    getEcommerceProducts: Sequelize.HasManyGetAssociationsMixin<EcommerceProductInstance>;
    setEcommerceProducts: Sequelize.HasManySetAssociationsMixin<EcommerceProductInstance, string>;
    addEcommerceProduct: Sequelize.HasManyAddAssociationMixin<EcommerceProductInstance, string>;
    addEcommerceProducts: Sequelize.HasManyAddAssociationsMixin<EcommerceProductInstance, string>;
    removeEcommerceProduct: Sequelize.HasManyRemoveAssociationMixin<EcommerceProductInstance, string>;
    removeEcommerceProducts: Sequelize.HasManyRemoveAssociationsMixin<EcommerceProductInstance, string>;
    hasEcommerceProduct: Sequelize.HasManyHasAssociationMixin<EcommerceProductInstance, string>;
    hasEcommerceProducts: Sequelize.HasManyHasAssociationsMixin<EcommerceProductInstance, string>;
    countEcommerceProducts: Sequelize.HasManyCountAssociationsMixin;
    createEcommerceProduct: Sequelize.HasManyCreateAssociationMixin<EcommerceProductInstance>;
  }

  // ========================================
  // EcommerceDiscount
  // ========================================

  interface EcommerceDiscountAttributes {
    id: string;
    code: string;
    type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
    percentage: number;
    amount: number;
    maxUses: number;
    validFrom: Date;
    validUntil: Date;
    productId: string;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcommerceDiscountCreationAttributes = Optional<EcommerceDiscountAttributes, "id" | "createdAt" | "deletedAt" | "updatedAt">;

  interface EcommerceDiscountInstance extends Model<EcommerceDiscountAttributes, EcommerceDiscountCreationAttributes>, EcommerceDiscountAttributes {
    ecommerceUserDiscounts?: EcommerceUserDiscountInstance[];
    product?: EcommerceProductInstance;
    getEcommerceUserDiscounts: Sequelize.HasManyGetAssociationsMixin<EcommerceUserDiscountInstance>;
    setEcommerceUserDiscounts: Sequelize.HasManySetAssociationsMixin<EcommerceUserDiscountInstance, string>;
    addEcommerceUserDiscount: Sequelize.HasManyAddAssociationMixin<EcommerceUserDiscountInstance, string>;
    addEcommerceUserDiscounts: Sequelize.HasManyAddAssociationsMixin<EcommerceUserDiscountInstance, string>;
    removeEcommerceUserDiscount: Sequelize.HasManyRemoveAssociationMixin<EcommerceUserDiscountInstance, string>;
    removeEcommerceUserDiscounts: Sequelize.HasManyRemoveAssociationsMixin<EcommerceUserDiscountInstance, string>;
    hasEcommerceUserDiscount: Sequelize.HasManyHasAssociationMixin<EcommerceUserDiscountInstance, string>;
    hasEcommerceUserDiscounts: Sequelize.HasManyHasAssociationsMixin<EcommerceUserDiscountInstance, string>;
    countEcommerceUserDiscounts: Sequelize.HasManyCountAssociationsMixin;
    createEcommerceUserDiscount: Sequelize.HasManyCreateAssociationMixin<EcommerceUserDiscountInstance>;
    getProduct: Sequelize.BelongsToGetAssociationMixin<EcommerceProductInstance>;
    setProduct: Sequelize.BelongsToSetAssociationMixin<EcommerceProductInstance, string>;
    createProduct: Sequelize.BelongsToCreateAssociationMixin<EcommerceProductInstance>;
  }

  // ========================================
  // EcommerceOrder
  // ========================================

  interface EcommerceOrderAttributes {
    id: string;
    userId: string;
    status: "PENDING" | "COMPLETED" | "CANCELLED" | "REJECTED";
    subtotal?: number | null;
    discount?: number | null;
    shippingCost?: number | null;
    tax?: number | null;
    total?: number | null;
    currency?: string | null;
    walletType?: string | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
    shippingId?: string | null;
  }

  type EcommerceOrderCreationAttributes = Optional<EcommerceOrderAttributes, "id" | "subtotal" | "discount" | "shippingCost" | "tax" | "total" | "currency" | "walletType" | "createdAt" | "deletedAt" | "updatedAt" | "shippingId">;

  interface EcommerceOrderInstance extends Model<EcommerceOrderAttributes, EcommerceOrderCreationAttributes>, EcommerceOrderAttributes {
    shippingAddress?: EcommerceShippingAddressInstance;
    ecommerceOrderItems?: EcommerceOrderItemInstance[];
    shipping?: EcommerceShippingInstance;
    user?: UserInstance;
    products?: EcommerceProductInstance[];
    getShippingAddress: Sequelize.HasOneGetAssociationMixin<EcommerceShippingAddressInstance>;
    setShippingAddress: Sequelize.HasOneSetAssociationMixin<EcommerceShippingAddressInstance, string>;
    createShippingAddress: Sequelize.HasOneCreateAssociationMixin<EcommerceShippingAddressInstance>;
    getEcommerceOrderItems: Sequelize.HasManyGetAssociationsMixin<EcommerceOrderItemInstance>;
    setEcommerceOrderItems: Sequelize.HasManySetAssociationsMixin<EcommerceOrderItemInstance, string>;
    addEcommerceOrderItem: Sequelize.HasManyAddAssociationMixin<EcommerceOrderItemInstance, string>;
    addEcommerceOrderItems: Sequelize.HasManyAddAssociationsMixin<EcommerceOrderItemInstance, string>;
    removeEcommerceOrderItem: Sequelize.HasManyRemoveAssociationMixin<EcommerceOrderItemInstance, string>;
    removeEcommerceOrderItems: Sequelize.HasManyRemoveAssociationsMixin<EcommerceOrderItemInstance, string>;
    hasEcommerceOrderItem: Sequelize.HasManyHasAssociationMixin<EcommerceOrderItemInstance, string>;
    hasEcommerceOrderItems: Sequelize.HasManyHasAssociationsMixin<EcommerceOrderItemInstance, string>;
    countEcommerceOrderItems: Sequelize.HasManyCountAssociationsMixin;
    createEcommerceOrderItem: Sequelize.HasManyCreateAssociationMixin<EcommerceOrderItemInstance>;
    getShipping: Sequelize.BelongsToGetAssociationMixin<EcommerceShippingInstance>;
    setShipping: Sequelize.BelongsToSetAssociationMixin<EcommerceShippingInstance, string>;
    createShipping: Sequelize.BelongsToCreateAssociationMixin<EcommerceShippingInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getProducts: Sequelize.BelongsToManyGetAssociationsMixin<EcommerceProductInstance>;
    setProducts: Sequelize.BelongsToManySetAssociationsMixin<EcommerceProductInstance, string>;
    addEcommerceProduct: Sequelize.BelongsToManyAddAssociationMixin<EcommerceProductInstance, string>;
    addProducts: Sequelize.BelongsToManyAddAssociationsMixin<EcommerceProductInstance, string>;
    removeEcommerceProduct: Sequelize.BelongsToManyRemoveAssociationMixin<EcommerceProductInstance, string>;
    removeProducts: Sequelize.BelongsToManyRemoveAssociationsMixin<EcommerceProductInstance, string>;
    hasEcommerceProduct: Sequelize.BelongsToManyHasAssociationMixin<EcommerceProductInstance, string>;
    hasProducts: Sequelize.BelongsToManyHasAssociationsMixin<EcommerceProductInstance, string>;
    countProducts: Sequelize.BelongsToManyCountAssociationsMixin;
    createEcommerceProduct: Sequelize.BelongsToManyCreateAssociationMixin<EcommerceProductInstance>;
    // Instance methods
    orderItems: EcommerceOrderItemInstance[];
  }

  // ========================================
  // EcommerceOrderItem
  // ========================================

  interface EcommerceOrderItemAttributes {
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    key?: string | null;
    filePath?: string | null;
    instructions?: string | null;
  }

  type EcommerceOrderItemCreationAttributes = Optional<EcommerceOrderItemAttributes, "id" | "key" | "filePath" | "instructions">;

  interface EcommerceOrderItemInstance extends Model<EcommerceOrderItemAttributes, EcommerceOrderItemCreationAttributes>, EcommerceOrderItemAttributes {
    product?: EcommerceProductInstance;
    order?: EcommerceOrderInstance;
    getProduct: Sequelize.BelongsToGetAssociationMixin<EcommerceProductInstance>;
    setProduct: Sequelize.BelongsToSetAssociationMixin<EcommerceProductInstance, string>;
    createProduct: Sequelize.BelongsToCreateAssociationMixin<EcommerceProductInstance>;
    getOrder: Sequelize.BelongsToGetAssociationMixin<EcommerceOrderInstance>;
    setOrder: Sequelize.BelongsToSetAssociationMixin<EcommerceOrderInstance, string>;
    createOrder: Sequelize.BelongsToCreateAssociationMixin<EcommerceOrderInstance>;
  }

  // ========================================
  // EcommerceProduct
  // ========================================

  interface EcommerceProductAttributes {
    id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription: string | null;
    type: "DOWNLOADABLE" | "PHYSICAL";
    price: number;
    categoryId: string;
    inventoryQuantity: number;
    status: boolean;
    image?: string;
    currency: string;
    walletType: "FIAT" | "SPOT" | "ECO";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcommerceProductCreationAttributes = Optional<EcommerceProductAttributes, "id" | "shortDescription" | "image" | "createdAt" | "deletedAt" | "updatedAt">;

  interface EcommerceProductInstance extends Model<EcommerceProductAttributes, EcommerceProductCreationAttributes>, EcommerceProductAttributes {
    ecommerceDiscounts?: EcommerceDiscountInstance[];
    ecommerceReviews?: EcommerceReviewInstance[];
    ecommerceOrderItems?: EcommerceOrderItemInstance[];
    wishlistItems?: EcommerceWishlistItemInstance[];
    category?: EcommerceCategoryInstance;
    orders?: EcommerceOrderInstance[];
    wishlists?: EcommerceWishlistInstance[];
    getEcommerceDiscounts: Sequelize.HasManyGetAssociationsMixin<EcommerceDiscountInstance>;
    setEcommerceDiscounts: Sequelize.HasManySetAssociationsMixin<EcommerceDiscountInstance, string>;
    addEcommerceDiscount: Sequelize.HasManyAddAssociationMixin<EcommerceDiscountInstance, string>;
    addEcommerceDiscounts: Sequelize.HasManyAddAssociationsMixin<EcommerceDiscountInstance, string>;
    removeEcommerceDiscount: Sequelize.HasManyRemoveAssociationMixin<EcommerceDiscountInstance, string>;
    removeEcommerceDiscounts: Sequelize.HasManyRemoveAssociationsMixin<EcommerceDiscountInstance, string>;
    hasEcommerceDiscount: Sequelize.HasManyHasAssociationMixin<EcommerceDiscountInstance, string>;
    hasEcommerceDiscounts: Sequelize.HasManyHasAssociationsMixin<EcommerceDiscountInstance, string>;
    countEcommerceDiscounts: Sequelize.HasManyCountAssociationsMixin;
    createEcommerceDiscount: Sequelize.HasManyCreateAssociationMixin<EcommerceDiscountInstance>;
    getEcommerceReviews: Sequelize.HasManyGetAssociationsMixin<EcommerceReviewInstance>;
    setEcommerceReviews: Sequelize.HasManySetAssociationsMixin<EcommerceReviewInstance, string>;
    addEcommerceReview: Sequelize.HasManyAddAssociationMixin<EcommerceReviewInstance, string>;
    addEcommerceReviews: Sequelize.HasManyAddAssociationsMixin<EcommerceReviewInstance, string>;
    removeEcommerceReview: Sequelize.HasManyRemoveAssociationMixin<EcommerceReviewInstance, string>;
    removeEcommerceReviews: Sequelize.HasManyRemoveAssociationsMixin<EcommerceReviewInstance, string>;
    hasEcommerceReview: Sequelize.HasManyHasAssociationMixin<EcommerceReviewInstance, string>;
    hasEcommerceReviews: Sequelize.HasManyHasAssociationsMixin<EcommerceReviewInstance, string>;
    countEcommerceReviews: Sequelize.HasManyCountAssociationsMixin;
    createEcommerceReview: Sequelize.HasManyCreateAssociationMixin<EcommerceReviewInstance>;
    getEcommerceOrderItems: Sequelize.HasManyGetAssociationsMixin<EcommerceOrderItemInstance>;
    setEcommerceOrderItems: Sequelize.HasManySetAssociationsMixin<EcommerceOrderItemInstance, string>;
    addEcommerceOrderItem: Sequelize.HasManyAddAssociationMixin<EcommerceOrderItemInstance, string>;
    addEcommerceOrderItems: Sequelize.HasManyAddAssociationsMixin<EcommerceOrderItemInstance, string>;
    removeEcommerceOrderItem: Sequelize.HasManyRemoveAssociationMixin<EcommerceOrderItemInstance, string>;
    removeEcommerceOrderItems: Sequelize.HasManyRemoveAssociationsMixin<EcommerceOrderItemInstance, string>;
    hasEcommerceOrderItem: Sequelize.HasManyHasAssociationMixin<EcommerceOrderItemInstance, string>;
    hasEcommerceOrderItems: Sequelize.HasManyHasAssociationsMixin<EcommerceOrderItemInstance, string>;
    countEcommerceOrderItems: Sequelize.HasManyCountAssociationsMixin;
    createEcommerceOrderItem: Sequelize.HasManyCreateAssociationMixin<EcommerceOrderItemInstance>;
    getWishlistItems: Sequelize.HasManyGetAssociationsMixin<EcommerceWishlistItemInstance>;
    setWishlistItems: Sequelize.HasManySetAssociationsMixin<EcommerceWishlistItemInstance, string>;
    addEcommerceWishlistItem: Sequelize.HasManyAddAssociationMixin<EcommerceWishlistItemInstance, string>;
    addWishlistItems: Sequelize.HasManyAddAssociationsMixin<EcommerceWishlistItemInstance, string>;
    removeEcommerceWishlistItem: Sequelize.HasManyRemoveAssociationMixin<EcommerceWishlistItemInstance, string>;
    removeWishlistItems: Sequelize.HasManyRemoveAssociationsMixin<EcommerceWishlistItemInstance, string>;
    hasEcommerceWishlistItem: Sequelize.HasManyHasAssociationMixin<EcommerceWishlistItemInstance, string>;
    hasWishlistItems: Sequelize.HasManyHasAssociationsMixin<EcommerceWishlistItemInstance, string>;
    countWishlistItems: Sequelize.HasManyCountAssociationsMixin;
    createEcommerceWishlistItem: Sequelize.HasManyCreateAssociationMixin<EcommerceWishlistItemInstance>;
    getCategory: Sequelize.BelongsToGetAssociationMixin<EcommerceCategoryInstance>;
    setCategory: Sequelize.BelongsToSetAssociationMixin<EcommerceCategoryInstance, string>;
    createCategory: Sequelize.BelongsToCreateAssociationMixin<EcommerceCategoryInstance>;
    getOrders: Sequelize.BelongsToManyGetAssociationsMixin<EcommerceOrderInstance>;
    setOrders: Sequelize.BelongsToManySetAssociationsMixin<EcommerceOrderInstance, string>;
    addEcommerceOrder: Sequelize.BelongsToManyAddAssociationMixin<EcommerceOrderInstance, string>;
    addOrders: Sequelize.BelongsToManyAddAssociationsMixin<EcommerceOrderInstance, string>;
    removeEcommerceOrder: Sequelize.BelongsToManyRemoveAssociationMixin<EcommerceOrderInstance, string>;
    removeOrders: Sequelize.BelongsToManyRemoveAssociationsMixin<EcommerceOrderInstance, string>;
    hasEcommerceOrder: Sequelize.BelongsToManyHasAssociationMixin<EcommerceOrderInstance, string>;
    hasOrders: Sequelize.BelongsToManyHasAssociationsMixin<EcommerceOrderInstance, string>;
    countOrders: Sequelize.BelongsToManyCountAssociationsMixin;
    createEcommerceOrder: Sequelize.BelongsToManyCreateAssociationMixin<EcommerceOrderInstance>;
    getWishlists: Sequelize.BelongsToManyGetAssociationsMixin<EcommerceWishlistInstance>;
    setWishlists: Sequelize.BelongsToManySetAssociationsMixin<EcommerceWishlistInstance, string>;
    addEcommerceWishlist: Sequelize.BelongsToManyAddAssociationMixin<EcommerceWishlistInstance, string>;
    addWishlists: Sequelize.BelongsToManyAddAssociationsMixin<EcommerceWishlistInstance, string>;
    removeEcommerceWishlist: Sequelize.BelongsToManyRemoveAssociationMixin<EcommerceWishlistInstance, string>;
    removeWishlists: Sequelize.BelongsToManyRemoveAssociationsMixin<EcommerceWishlistInstance, string>;
    hasEcommerceWishlist: Sequelize.BelongsToManyHasAssociationMixin<EcommerceWishlistInstance, string>;
    hasWishlists: Sequelize.BelongsToManyHasAssociationsMixin<EcommerceWishlistInstance, string>;
    countWishlists: Sequelize.BelongsToManyCountAssociationsMixin;
    createEcommerceWishlist: Sequelize.BelongsToManyCreateAssociationMixin<EcommerceWishlistInstance>;
  }

  // ========================================
  // EcommerceReview
  // ========================================

  interface EcommerceReviewAttributes {
    id: string;
    productId: string;
    userId: string;
    rating: number;
    comment?: string;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcommerceReviewCreationAttributes = Optional<EcommerceReviewAttributes, "id" | "comment" | "createdAt" | "deletedAt" | "updatedAt">;

  interface EcommerceReviewInstance extends Model<EcommerceReviewAttributes, EcommerceReviewCreationAttributes>, EcommerceReviewAttributes {
    product?: EcommerceProductInstance;
    user?: UserInstance;
    getProduct: Sequelize.BelongsToGetAssociationMixin<EcommerceProductInstance>;
    setProduct: Sequelize.BelongsToSetAssociationMixin<EcommerceProductInstance, string>;
    createProduct: Sequelize.BelongsToCreateAssociationMixin<EcommerceProductInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // EcommerceShipping
  // ========================================

  interface EcommerceShippingAttributes {
    id: string;
    loadId: string;
    loadStatus: "PENDING" | "TRANSIT" | "DELIVERED" | "CANCELLED";
    shipper: string;
    transporter: string;
    goodsType: string;
    weight: number;
    volume: number;
    description: string;
    vehicle: string;
    cost?: number;
    tax?: number;
    deliveryDate?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type EcommerceShippingCreationAttributes = Optional<EcommerceShippingAttributes, "id" | "cost" | "tax" | "deliveryDate" | "createdAt" | "updatedAt">;

  interface EcommerceShippingInstance extends Model<EcommerceShippingAttributes, EcommerceShippingCreationAttributes>, EcommerceShippingAttributes {
    ecommerceOrders?: EcommerceOrderInstance[];
    products?: EcommerceProductInstance[];
    getEcommerceOrders: Sequelize.HasManyGetAssociationsMixin<EcommerceOrderInstance>;
    setEcommerceOrders: Sequelize.HasManySetAssociationsMixin<EcommerceOrderInstance, string>;
    addEcommerceOrder: Sequelize.HasManyAddAssociationMixin<EcommerceOrderInstance, string>;
    addEcommerceOrders: Sequelize.HasManyAddAssociationsMixin<EcommerceOrderInstance, string>;
    removeEcommerceOrder: Sequelize.HasManyRemoveAssociationMixin<EcommerceOrderInstance, string>;
    removeEcommerceOrders: Sequelize.HasManyRemoveAssociationsMixin<EcommerceOrderInstance, string>;
    hasEcommerceOrder: Sequelize.HasManyHasAssociationMixin<EcommerceOrderInstance, string>;
    hasEcommerceOrders: Sequelize.HasManyHasAssociationsMixin<EcommerceOrderInstance, string>;
    countEcommerceOrders: Sequelize.HasManyCountAssociationsMixin;
    createEcommerceOrder: Sequelize.HasManyCreateAssociationMixin<EcommerceOrderInstance>;
    getProducts: Sequelize.BelongsToManyGetAssociationsMixin<EcommerceProductInstance>;
    setProducts: Sequelize.BelongsToManySetAssociationsMixin<EcommerceProductInstance, string>;
    addEcommerceProduct: Sequelize.BelongsToManyAddAssociationMixin<EcommerceProductInstance, string>;
    addProducts: Sequelize.BelongsToManyAddAssociationsMixin<EcommerceProductInstance, string>;
    removeEcommerceProduct: Sequelize.BelongsToManyRemoveAssociationMixin<EcommerceProductInstance, string>;
    removeProducts: Sequelize.BelongsToManyRemoveAssociationsMixin<EcommerceProductInstance, string>;
    hasEcommerceProduct: Sequelize.BelongsToManyHasAssociationMixin<EcommerceProductInstance, string>;
    hasProducts: Sequelize.BelongsToManyHasAssociationsMixin<EcommerceProductInstance, string>;
    countProducts: Sequelize.BelongsToManyCountAssociationsMixin;
    createEcommerceProduct: Sequelize.BelongsToManyCreateAssociationMixin<EcommerceProductInstance>;
  }

  // ========================================
  // EcommerceShippingAddress
  // ========================================

  interface EcommerceShippingAddressAttributes {
    id: string;
    userId: string;
    orderId: string;
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    createdAt?: Date | null;
    updatedAt?: Date | null;
  }

  type EcommerceShippingAddressCreationAttributes = Optional<EcommerceShippingAddressAttributes, "id" | "createdAt" | "updatedAt">;

  interface EcommerceShippingAddressInstance extends Model<EcommerceShippingAddressAttributes, EcommerceShippingAddressCreationAttributes>, EcommerceShippingAddressAttributes {
    order?: EcommerceOrderInstance;
    user?: UserInstance;
    getOrder: Sequelize.BelongsToGetAssociationMixin<EcommerceOrderInstance>;
    setOrder: Sequelize.BelongsToSetAssociationMixin<EcommerceOrderInstance, string>;
    createOrder: Sequelize.BelongsToCreateAssociationMixin<EcommerceOrderInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // EcommerceUserDiscount
  // ========================================

  interface EcommerceUserDiscountAttributes {
    id: string;
    userId: string;
    discountId: string;
    status: boolean;
  }

  type EcommerceUserDiscountCreationAttributes = Optional<EcommerceUserDiscountAttributes, "id">;

  interface EcommerceUserDiscountInstance extends Model<EcommerceUserDiscountAttributes, EcommerceUserDiscountCreationAttributes>, EcommerceUserDiscountAttributes {
    discount?: EcommerceDiscountInstance;
    user?: UserInstance;
    getDiscount: Sequelize.BelongsToGetAssociationMixin<EcommerceDiscountInstance>;
    setDiscount: Sequelize.BelongsToSetAssociationMixin<EcommerceDiscountInstance, string>;
    createDiscount: Sequelize.BelongsToCreateAssociationMixin<EcommerceDiscountInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // EcommerceWishlist
  // ========================================

  interface EcommerceWishlistAttributes {
    id: string;
    userId: string;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type EcommerceWishlistCreationAttributes = Optional<EcommerceWishlistAttributes, "id" | "createdAt" | "updatedAt">;

  interface EcommerceWishlistInstance extends Model<EcommerceWishlistAttributes, EcommerceWishlistCreationAttributes>, EcommerceWishlistAttributes {
    wishlistItems?: EcommerceWishlistItemInstance[];
    user?: UserInstance;
    products?: EcommerceProductInstance[];
    getWishlistItems: Sequelize.HasManyGetAssociationsMixin<EcommerceWishlistItemInstance>;
    setWishlistItems: Sequelize.HasManySetAssociationsMixin<EcommerceWishlistItemInstance, string>;
    addEcommerceWishlistItem: Sequelize.HasManyAddAssociationMixin<EcommerceWishlistItemInstance, string>;
    addWishlistItems: Sequelize.HasManyAddAssociationsMixin<EcommerceWishlistItemInstance, string>;
    removeEcommerceWishlistItem: Sequelize.HasManyRemoveAssociationMixin<EcommerceWishlistItemInstance, string>;
    removeWishlistItems: Sequelize.HasManyRemoveAssociationsMixin<EcommerceWishlistItemInstance, string>;
    hasEcommerceWishlistItem: Sequelize.HasManyHasAssociationMixin<EcommerceWishlistItemInstance, string>;
    hasWishlistItems: Sequelize.HasManyHasAssociationsMixin<EcommerceWishlistItemInstance, string>;
    countWishlistItems: Sequelize.HasManyCountAssociationsMixin;
    createEcommerceWishlistItem: Sequelize.HasManyCreateAssociationMixin<EcommerceWishlistItemInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getProducts: Sequelize.BelongsToManyGetAssociationsMixin<EcommerceProductInstance>;
    setProducts: Sequelize.BelongsToManySetAssociationsMixin<EcommerceProductInstance, string>;
    addEcommerceProduct: Sequelize.BelongsToManyAddAssociationMixin<EcommerceProductInstance, string>;
    addProducts: Sequelize.BelongsToManyAddAssociationsMixin<EcommerceProductInstance, string>;
    removeEcommerceProduct: Sequelize.BelongsToManyRemoveAssociationMixin<EcommerceProductInstance, string>;
    removeProducts: Sequelize.BelongsToManyRemoveAssociationsMixin<EcommerceProductInstance, string>;
    hasEcommerceProduct: Sequelize.BelongsToManyHasAssociationMixin<EcommerceProductInstance, string>;
    hasProducts: Sequelize.BelongsToManyHasAssociationsMixin<EcommerceProductInstance, string>;
    countProducts: Sequelize.BelongsToManyCountAssociationsMixin;
    createEcommerceProduct: Sequelize.BelongsToManyCreateAssociationMixin<EcommerceProductInstance>;
  }

  // ========================================
  // EcommerceWishlistItem
  // ========================================

  interface EcommerceWishlistItemAttributes {
    id: string;
    wishlistId: string;
    productId: string;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type EcommerceWishlistItemCreationAttributes = Optional<EcommerceWishlistItemAttributes, "id" | "createdAt" | "updatedAt">;

  interface EcommerceWishlistItemInstance extends Model<EcommerceWishlistItemAttributes, EcommerceWishlistItemCreationAttributes>, EcommerceWishlistItemAttributes {
    wishlist?: EcommerceWishlistInstance;
    product?: EcommerceProductInstance;
    getWishlist: Sequelize.BelongsToGetAssociationMixin<EcommerceWishlistInstance>;
    setWishlist: Sequelize.BelongsToSetAssociationMixin<EcommerceWishlistInstance, string>;
    createWishlist: Sequelize.BelongsToCreateAssociationMixin<EcommerceWishlistInstance>;
    getProduct: Sequelize.BelongsToGetAssociationMixin<EcommerceProductInstance>;
    setProduct: Sequelize.BelongsToSetAssociationMixin<EcommerceProductInstance, string>;
    createProduct: Sequelize.BelongsToCreateAssociationMixin<EcommerceProductInstance>;
  }

  // ========================================
  // EcosystemBlockchain
  // ========================================

  interface EcosystemBlockchainAttributes {
    id: string;
    productId: string;
    name: string;
    chain?: string | null;
    description?: string | null;
    link?: string;
    status?: boolean;
    version?: string | null;
    image?: string;
  }

  type EcosystemBlockchainCreationAttributes = Optional<EcosystemBlockchainAttributes, "id" | "chain" | "description" | "link" | "status" | "version" | "image">;

  interface EcosystemBlockchainInstance extends Model<EcosystemBlockchainAttributes, EcosystemBlockchainCreationAttributes>, EcosystemBlockchainAttributes {
  }

  // ========================================
  // EcosystemCustodialWallet
  // ========================================

  interface EcosystemCustodialWalletAttributes {
    id: string;
    masterWalletId: string;
    address: string;
    chain: string;
    network: string;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcosystemCustodialWalletCreationAttributes = Optional<EcosystemCustodialWalletAttributes, "id" | "createdAt" | "deletedAt" | "updatedAt">;

  interface EcosystemCustodialWalletInstance extends Model<EcosystemCustodialWalletAttributes, EcosystemCustodialWalletCreationAttributes>, EcosystemCustodialWalletAttributes {
    masterWallet?: EcosystemMasterWalletInstance;
    getMasterWallet: Sequelize.BelongsToGetAssociationMixin<EcosystemMasterWalletInstance>;
    setMasterWallet: Sequelize.BelongsToSetAssociationMixin<EcosystemMasterWalletInstance, string>;
    createMasterWallet: Sequelize.BelongsToCreateAssociationMixin<EcosystemMasterWalletInstance>;
  }

  // ========================================
  // EcosystemMarket
  // ========================================

  interface EcosystemMarketAttributes {
    id: string;
    currency: string;
    pair: string;
    isTrending?: boolean | null;
    isHot?: boolean | null;
    metadata?: string;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcosystemMarketCreationAttributes = Optional<EcosystemMarketAttributes, "id" | "isTrending" | "isHot" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

  interface EcosystemMarketInstance extends Model<EcosystemMarketAttributes, EcosystemMarketCreationAttributes>, EcosystemMarketAttributes {
  }

  // ========================================
  // EcosystemMasterWallet
  // ========================================

  interface EcosystemMasterWalletAttributes {
    id: string;
    chain: string;
    currency: string;
    address: string;
    balance: number;
    data?: string | null;
    status: boolean;
    lastIndex: number;
  }

  type EcosystemMasterWalletCreationAttributes = Optional<EcosystemMasterWalletAttributes, "id" | "data">;

  interface EcosystemMasterWalletInstance extends Model<EcosystemMasterWalletAttributes, EcosystemMasterWalletCreationAttributes>, EcosystemMasterWalletAttributes {
    ecosystemCustodialWallets?: EcosystemCustodialWalletInstance[];
    getEcosystemCustodialWallets: Sequelize.HasManyGetAssociationsMixin<EcosystemCustodialWalletInstance>;
    setEcosystemCustodialWallets: Sequelize.HasManySetAssociationsMixin<EcosystemCustodialWalletInstance, string>;
    addEcosystemCustodialWallet: Sequelize.HasManyAddAssociationMixin<EcosystemCustodialWalletInstance, string>;
    addEcosystemCustodialWallets: Sequelize.HasManyAddAssociationsMixin<EcosystemCustodialWalletInstance, string>;
    removeEcosystemCustodialWallet: Sequelize.HasManyRemoveAssociationMixin<EcosystemCustodialWalletInstance, string>;
    removeEcosystemCustodialWallets: Sequelize.HasManyRemoveAssociationsMixin<EcosystemCustodialWalletInstance, string>;
    hasEcosystemCustodialWallet: Sequelize.HasManyHasAssociationMixin<EcosystemCustodialWalletInstance, string>;
    hasEcosystemCustodialWallets: Sequelize.HasManyHasAssociationsMixin<EcosystemCustodialWalletInstance, string>;
    countEcosystemCustodialWallets: Sequelize.HasManyCountAssociationsMixin;
    createEcosystemCustodialWallet: Sequelize.HasManyCreateAssociationMixin<EcosystemCustodialWalletInstance>;
  }

  // ========================================
  // EcosystemPrivateLedger
  // ========================================

  interface EcosystemPrivateLedgerAttributes {
    id: string;
    walletId: string;
    index: number;
    currency: string;
    chain: string;
    network: string;
    offchainDifference: number;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcosystemPrivateLedgerCreationAttributes = Optional<EcosystemPrivateLedgerAttributes, "id" | "createdAt" | "deletedAt" | "updatedAt">;

  interface EcosystemPrivateLedgerInstance extends Model<EcosystemPrivateLedgerAttributes, EcosystemPrivateLedgerCreationAttributes>, EcosystemPrivateLedgerAttributes {
    wallet?: WalletInstance;
    getWallet: Sequelize.BelongsToGetAssociationMixin<WalletInstance>;
    setWallet: Sequelize.BelongsToSetAssociationMixin<WalletInstance, string>;
    createWallet: Sequelize.BelongsToCreateAssociationMixin<WalletInstance>;
  }

  // ========================================
  // EcosystemToken
  // ========================================

  interface EcosystemTokenAttributes {
    id: string;
    contract: string;
    name: string;
    currency: string;
    chain: string;
    network: string;
    type: string;
    decimals: number;
    status?: boolean;
    precision?: number | null;
    limits?: {
    deposit?: {
      min?: number;
      max?: number;
    };
    withdrawal?: {
      min?: number;
      max?: number;
    };
  } | null;
    fee?: {
    min: number;
    percentage: number;
  } | null;
    icon?: string;
    contractType: "PERMIT" | "NO_PERMIT" | "NATIVE";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcosystemTokenCreationAttributes = Optional<EcosystemTokenAttributes, "id" | "status" | "precision" | "limits" | "fee" | "icon" | "createdAt" | "deletedAt" | "updatedAt">;

  interface EcosystemTokenInstance extends Model<EcosystemTokenAttributes, EcosystemTokenCreationAttributes>, EcosystemTokenAttributes {
  }

  // ========================================
  // EcosystemUtxo
  // ========================================

  interface EcosystemUtxoAttributes {
    id: string;
    walletId: string;
    transactionId: string;
    index: number;
    amount: number;
    script: string;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcosystemUtxoCreationAttributes = Optional<EcosystemUtxoAttributes, "id" | "script" | "createdAt" | "deletedAt" | "updatedAt">;

  interface EcosystemUtxoInstance extends Model<EcosystemUtxoAttributes, EcosystemUtxoCreationAttributes>, EcosystemUtxoAttributes {
    wallet?: WalletInstance;
    getWallet: Sequelize.BelongsToGetAssociationMixin<WalletInstance>;
    setWallet: Sequelize.BelongsToSetAssociationMixin<WalletInstance, string>;
    createWallet: Sequelize.BelongsToCreateAssociationMixin<WalletInstance>;
  }

  // ========================================
  // Exchange
  // ========================================

  interface ExchangeAttributes {
    id: string;
    name: string;
    title: string;
    description?: string | null;
    status?: boolean;
    username?: string;
    licenseStatus?: boolean;
    version?: string;
    productId?: string;
    type?: string;
    link?: string | null;
    proxyUrl?: string | null;
  }

  type ExchangeCreationAttributes = Optional<ExchangeAttributes, "id" | "description" | "status" | "username" | "licenseStatus" | "version" | "productId" | "type" | "link" | "proxyUrl">;

  interface ExchangeInstance extends Model<ExchangeAttributes, ExchangeCreationAttributes>, ExchangeAttributes {
  }

  // ========================================
  // ExchangeCurrency
  // ========================================

  interface ExchangeCurrencyAttributes {
    id: string;
    currency: string;
    name: string;
    precision: number;
    price?: number;
    fee?: number;
    status: boolean;
  }

  type ExchangeCurrencyCreationAttributes = Optional<ExchangeCurrencyAttributes, "id" | "price" | "fee">;

  interface ExchangeCurrencyInstance extends Model<ExchangeCurrencyAttributes, ExchangeCurrencyCreationAttributes>, ExchangeCurrencyAttributes {
  }

  // ========================================
  // ExchangeMarket
  // ========================================

  interface ExchangeMarketAttributes {
    id: string;
    currency: string;
    pair: string;
    isTrending?: boolean | null;
    isHot?: boolean | null;
    metadata?: string;
    status: boolean;
  }

  type ExchangeMarketCreationAttributes = Optional<ExchangeMarketAttributes, "id" | "isTrending" | "isHot" | "metadata">;

  interface ExchangeMarketInstance extends Model<ExchangeMarketAttributes, ExchangeMarketCreationAttributes>, ExchangeMarketAttributes {
  }

  // ========================================
  // ExchangeOrder
  // ========================================

  interface ExchangeOrderAttributes {
    id: string;
    referenceId?: string | null;
    userId: string;
    status: "OPEN" | "CLOSED" | "CANCELED" | "EXPIRED" | "REJECTED";
    symbol: string;
    type: "MARKET" | "LIMIT";
    timeInForce: "GTC" | "IOC" | "FOK" | "PO";
    side: "BUY" | "SELL";
    price: number;
    average?: number | null;
    amount: number;
    filled: number;
    remaining: number;
    cost: number;
    trades?: string | null;
    fee: number;
    feeCurrency: string;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type ExchangeOrderCreationAttributes = Optional<ExchangeOrderAttributes, "id" | "referenceId" | "average" | "trades" | "createdAt" | "deletedAt" | "updatedAt">;

  interface ExchangeOrderInstance extends Model<ExchangeOrderAttributes, ExchangeOrderCreationAttributes>, ExchangeOrderAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // ExchangeWatchlist
  // ========================================

  interface ExchangeWatchlistAttributes {
    id: string;
    userId: string;
    symbol: string;
  }

  type ExchangeWatchlistCreationAttributes = Optional<ExchangeWatchlistAttributes, "id">;

  interface ExchangeWatchlistInstance extends Model<ExchangeWatchlistAttributes, ExchangeWatchlistCreationAttributes>, ExchangeWatchlistAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // Extension
  // ========================================

  interface ExtensionAttributes {
    id: string;
    productId: string;
    name: string;
    title?: string | null;
    description?: string | null;
    link?: string;
    status?: boolean;
    version?: string | null;
    image?: string;
  }

  type ExtensionCreationAttributes = Optional<ExtensionAttributes, "id" | "title" | "description" | "link" | "status" | "version" | "image">;

  interface ExtensionInstance extends Model<ExtensionAttributes, ExtensionCreationAttributes>, ExtensionAttributes {
  }

  // ========================================
  // Faq
  // ========================================

  interface FaqAttributes {
    id: string;
    question: string;
    answer: string;
    image?: string | null;
    category: string;
    tags?: string[] | null;
    status: boolean;
    order: number;
    pagePath: string;
    relatedFaqIds?: string[] | null;
    views?: number;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type FaqCreationAttributes = Optional<FaqAttributes, "id" | "image" | "tags" | "status" | "relatedFaqIds" | "views" | "createdAt" | "updatedAt" | "deletedAt">;

  interface FaqInstance extends Model<FaqAttributes, FaqCreationAttributes>, FaqAttributes {
    feedbacks?: FaqFeedbackInstance[];
    getFeedbacks: Sequelize.HasManyGetAssociationsMixin<FaqFeedbackInstance>;
    setFeedbacks: Sequelize.HasManySetAssociationsMixin<FaqFeedbackInstance, string>;
    addFaqFeedback: Sequelize.HasManyAddAssociationMixin<FaqFeedbackInstance, string>;
    addFeedbacks: Sequelize.HasManyAddAssociationsMixin<FaqFeedbackInstance, string>;
    removeFaqFeedback: Sequelize.HasManyRemoveAssociationMixin<FaqFeedbackInstance, string>;
    removeFeedbacks: Sequelize.HasManyRemoveAssociationsMixin<FaqFeedbackInstance, string>;
    hasFaqFeedback: Sequelize.HasManyHasAssociationMixin<FaqFeedbackInstance, string>;
    hasFeedbacks: Sequelize.HasManyHasAssociationsMixin<FaqFeedbackInstance, string>;
    countFeedbacks: Sequelize.HasManyCountAssociationsMixin;
    createFaqFeedback: Sequelize.HasManyCreateAssociationMixin<FaqFeedbackInstance>;
  }

  // ========================================
  // FaqFeedback
  // ========================================

  interface FaqFeedbackAttributes {
    id: string;
    faqId: string;
    userId: string;
    isHelpful: boolean;
    comment?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type FaqFeedbackCreationAttributes = Optional<FaqFeedbackAttributes, "id" | "comment" | "createdAt" | "updatedAt" | "deletedAt">;

  interface FaqFeedbackInstance extends Model<FaqFeedbackAttributes, FaqFeedbackCreationAttributes>, FaqFeedbackAttributes {
    faq?: FaqInstance;
    user?: UserInstance;
    getFaq: Sequelize.BelongsToGetAssociationMixin<FaqInstance>;
    setFaq: Sequelize.BelongsToSetAssociationMixin<FaqInstance, string>;
    createFaq: Sequelize.BelongsToCreateAssociationMixin<FaqInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // FaqQuestion
  // ========================================

  interface FaqQuestionAttributes {
    id: string;
    name: string;
    email: string;
    question: string;
    answer?: string | null;
    status: "PENDING" | "ANSWERED" | "REJECTED";
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type FaqQuestionCreationAttributes = Optional<FaqQuestionAttributes, "id" | "answer" | "createdAt" | "updatedAt" | "deletedAt">;

  interface FaqQuestionInstance extends Model<FaqQuestionAttributes, FaqQuestionCreationAttributes>, FaqQuestionAttributes {
  }

  // ========================================
  // FaqSearch
  // ========================================

  interface FaqSearchAttributes {
    id: string;
    userId: string;
    query: string;
    resultCount: number;
    category?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FaqSearchCreationAttributes = Optional<FaqSearchAttributes, "id" | "category" | "createdAt" | "updatedAt">;

  interface FaqSearchInstance extends Model<FaqSearchAttributes, FaqSearchCreationAttributes>, FaqSearchAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // ForexAccount
  // ========================================

  interface ForexAccountAttributes {
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
    dailyWithdrawLimit?: number;
    monthlyWithdrawLimit?: number;
    dailyWithdrawn?: number;
    monthlyWithdrawn?: number;
    lastWithdrawReset?: Date | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type ForexAccountCreationAttributes = Optional<ForexAccountAttributes, "id" | "userId" | "accountId" | "password" | "broker" | "mt" | "leverage" | "status" | "dailyWithdrawLimit" | "monthlyWithdrawLimit" | "dailyWithdrawn" | "monthlyWithdrawn" | "lastWithdrawReset" | "createdAt" | "deletedAt" | "updatedAt">;

  interface ForexAccountInstance extends Model<ForexAccountAttributes, ForexAccountCreationAttributes>, ForexAccountAttributes {
    forexAccountSignals?: ForexAccountSignalInstance[];
    user?: UserInstance;
    accountSignals?: ForexSignalInstance[];
    getForexAccountSignals: Sequelize.HasManyGetAssociationsMixin<ForexAccountSignalInstance>;
    setForexAccountSignals: Sequelize.HasManySetAssociationsMixin<ForexAccountSignalInstance, string>;
    addForexAccountSignal: Sequelize.HasManyAddAssociationMixin<ForexAccountSignalInstance, string>;
    addForexAccountSignals: Sequelize.HasManyAddAssociationsMixin<ForexAccountSignalInstance, string>;
    removeForexAccountSignal: Sequelize.HasManyRemoveAssociationMixin<ForexAccountSignalInstance, string>;
    removeForexAccountSignals: Sequelize.HasManyRemoveAssociationsMixin<ForexAccountSignalInstance, string>;
    hasForexAccountSignal: Sequelize.HasManyHasAssociationMixin<ForexAccountSignalInstance, string>;
    hasForexAccountSignals: Sequelize.HasManyHasAssociationsMixin<ForexAccountSignalInstance, string>;
    countForexAccountSignals: Sequelize.HasManyCountAssociationsMixin;
    createForexAccountSignal: Sequelize.HasManyCreateAssociationMixin<ForexAccountSignalInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getAccountSignals: Sequelize.BelongsToManyGetAssociationsMixin<ForexSignalInstance>;
    setAccountSignals: Sequelize.BelongsToManySetAssociationsMixin<ForexSignalInstance, string>;
    addForexSignal: Sequelize.BelongsToManyAddAssociationMixin<ForexSignalInstance, string>;
    addAccountSignals: Sequelize.BelongsToManyAddAssociationsMixin<ForexSignalInstance, string>;
    removeForexSignal: Sequelize.BelongsToManyRemoveAssociationMixin<ForexSignalInstance, string>;
    removeAccountSignals: Sequelize.BelongsToManyRemoveAssociationsMixin<ForexSignalInstance, string>;
    hasForexSignal: Sequelize.BelongsToManyHasAssociationMixin<ForexSignalInstance, string>;
    hasAccountSignals: Sequelize.BelongsToManyHasAssociationsMixin<ForexSignalInstance, string>;
    countAccountSignals: Sequelize.BelongsToManyCountAssociationsMixin;
    createForexSignal: Sequelize.BelongsToManyCreateAssociationMixin<ForexSignalInstance>;
  }

  // ========================================
  // ForexAccountSignal
  // ========================================

  interface ForexAccountSignalAttributes {
    forexAccountId: string;
    forexSignalId: string;
  }

  type ForexAccountSignalCreationAttributes = Optional<ForexAccountSignalAttributes, "forexAccountId">;

  interface ForexAccountSignalInstance extends Model<ForexAccountSignalAttributes, ForexAccountSignalCreationAttributes>, ForexAccountSignalAttributes {
    forexAccount?: ForexAccountInstance;
    forexSignal?: ForexSignalInstance;
    getForexAccount: Sequelize.BelongsToGetAssociationMixin<ForexAccountInstance>;
    setForexAccount: Sequelize.BelongsToSetAssociationMixin<ForexAccountInstance, string>;
    createForexAccount: Sequelize.BelongsToCreateAssociationMixin<ForexAccountInstance>;
    getForexSignal: Sequelize.BelongsToGetAssociationMixin<ForexSignalInstance>;
    setForexSignal: Sequelize.BelongsToSetAssociationMixin<ForexSignalInstance, string>;
    createForexSignal: Sequelize.BelongsToCreateAssociationMixin<ForexSignalInstance>;
  }

  // ========================================
  // ForexDuration
  // ========================================

  interface ForexDurationAttributes {
    id: string;
    duration: number;
    timeframe: "HOUR" | "DAY" | "WEEK" | "MONTH";
  }

  type ForexDurationCreationAttributes = Optional<ForexDurationAttributes, "id">;

  interface ForexDurationInstance extends Model<ForexDurationAttributes, ForexDurationCreationAttributes>, ForexDurationAttributes {
    investments?: ForexInvestmentInstance[];
    forexPlanDurations?: ForexPlanDurationInstance[];
    plans?: ForexPlanInstance[];
    getInvestments: Sequelize.HasManyGetAssociationsMixin<ForexInvestmentInstance>;
    setInvestments: Sequelize.HasManySetAssociationsMixin<ForexInvestmentInstance, string>;
    addForexInvestment: Sequelize.HasManyAddAssociationMixin<ForexInvestmentInstance, string>;
    addInvestments: Sequelize.HasManyAddAssociationsMixin<ForexInvestmentInstance, string>;
    removeForexInvestment: Sequelize.HasManyRemoveAssociationMixin<ForexInvestmentInstance, string>;
    removeInvestments: Sequelize.HasManyRemoveAssociationsMixin<ForexInvestmentInstance, string>;
    hasForexInvestment: Sequelize.HasManyHasAssociationMixin<ForexInvestmentInstance, string>;
    hasInvestments: Sequelize.HasManyHasAssociationsMixin<ForexInvestmentInstance, string>;
    countInvestments: Sequelize.HasManyCountAssociationsMixin;
    createForexInvestment: Sequelize.HasManyCreateAssociationMixin<ForexInvestmentInstance>;
    getForexPlanDurations: Sequelize.HasManyGetAssociationsMixin<ForexPlanDurationInstance>;
    setForexPlanDurations: Sequelize.HasManySetAssociationsMixin<ForexPlanDurationInstance, string>;
    addForexPlanDuration: Sequelize.HasManyAddAssociationMixin<ForexPlanDurationInstance, string>;
    addForexPlanDurations: Sequelize.HasManyAddAssociationsMixin<ForexPlanDurationInstance, string>;
    removeForexPlanDuration: Sequelize.HasManyRemoveAssociationMixin<ForexPlanDurationInstance, string>;
    removeForexPlanDurations: Sequelize.HasManyRemoveAssociationsMixin<ForexPlanDurationInstance, string>;
    hasForexPlanDuration: Sequelize.HasManyHasAssociationMixin<ForexPlanDurationInstance, string>;
    hasForexPlanDurations: Sequelize.HasManyHasAssociationsMixin<ForexPlanDurationInstance, string>;
    countForexPlanDurations: Sequelize.HasManyCountAssociationsMixin;
    createForexPlanDuration: Sequelize.HasManyCreateAssociationMixin<ForexPlanDurationInstance>;
    getPlans: Sequelize.BelongsToManyGetAssociationsMixin<ForexPlanInstance>;
    setPlans: Sequelize.BelongsToManySetAssociationsMixin<ForexPlanInstance, string>;
    addForexPlan: Sequelize.BelongsToManyAddAssociationMixin<ForexPlanInstance, string>;
    addPlans: Sequelize.BelongsToManyAddAssociationsMixin<ForexPlanInstance, string>;
    removeForexPlan: Sequelize.BelongsToManyRemoveAssociationMixin<ForexPlanInstance, string>;
    removePlans: Sequelize.BelongsToManyRemoveAssociationsMixin<ForexPlanInstance, string>;
    hasForexPlan: Sequelize.BelongsToManyHasAssociationMixin<ForexPlanInstance, string>;
    hasPlans: Sequelize.BelongsToManyHasAssociationsMixin<ForexPlanInstance, string>;
    countPlans: Sequelize.BelongsToManyCountAssociationsMixin;
    createForexPlan: Sequelize.BelongsToManyCreateAssociationMixin<ForexPlanInstance>;
  }

  // ========================================
  // ForexInvestment
  // ========================================

  interface ForexInvestmentAttributes {
    id: string;
    userId: string;
    planId?: string;
    durationId?: string;
    amount?: number;
    profit?: number;
    result?: "WIN" | "LOSS" | "DRAW";
    status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
    endDate?: Date | null;
    metadata?: string | null;
    termsAcceptedAt?: Date;
    termsVersion?: string;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type ForexInvestmentCreationAttributes = Optional<ForexInvestmentAttributes, "id" | "planId" | "durationId" | "amount" | "profit" | "result" | "endDate" | "metadata" | "termsAcceptedAt" | "termsVersion" | "createdAt" | "deletedAt" | "updatedAt">;

  interface ForexInvestmentInstance extends Model<ForexInvestmentAttributes, ForexInvestmentCreationAttributes>, ForexInvestmentAttributes {
    plan?: ForexPlanInstance;
    duration?: ForexDurationInstance;
    user?: UserInstance;
    getPlan: Sequelize.BelongsToGetAssociationMixin<ForexPlanInstance>;
    setPlan: Sequelize.BelongsToSetAssociationMixin<ForexPlanInstance, string>;
    createPlan: Sequelize.BelongsToCreateAssociationMixin<ForexPlanInstance>;
    getDuration: Sequelize.BelongsToGetAssociationMixin<ForexDurationInstance>;
    setDuration: Sequelize.BelongsToSetAssociationMixin<ForexDurationInstance, string>;
    createDuration: Sequelize.BelongsToCreateAssociationMixin<ForexDurationInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // ForexPlan
  // ========================================

  interface ForexPlanAttributes {
    id: string;
    name: string;
    title?: string | null;
    description?: string | null;
    image?: string | null;
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
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type ForexPlanCreationAttributes = Optional<ForexPlanAttributes, "id" | "title" | "description" | "image" | "minAmount" | "maxAmount" | "status" | "trending" | "createdAt" | "deletedAt" | "updatedAt">;

  interface ForexPlanInstance extends Model<ForexPlanAttributes, ForexPlanCreationAttributes>, ForexPlanAttributes {
    investments?: ForexInvestmentInstance[];
    planDurations?: ForexPlanDurationInstance[];
    durations?: ForexDurationInstance[];
    getInvestments: Sequelize.HasManyGetAssociationsMixin<ForexInvestmentInstance>;
    setInvestments: Sequelize.HasManySetAssociationsMixin<ForexInvestmentInstance, string>;
    addForexInvestment: Sequelize.HasManyAddAssociationMixin<ForexInvestmentInstance, string>;
    addInvestments: Sequelize.HasManyAddAssociationsMixin<ForexInvestmentInstance, string>;
    removeForexInvestment: Sequelize.HasManyRemoveAssociationMixin<ForexInvestmentInstance, string>;
    removeInvestments: Sequelize.HasManyRemoveAssociationsMixin<ForexInvestmentInstance, string>;
    hasForexInvestment: Sequelize.HasManyHasAssociationMixin<ForexInvestmentInstance, string>;
    hasInvestments: Sequelize.HasManyHasAssociationsMixin<ForexInvestmentInstance, string>;
    countInvestments: Sequelize.HasManyCountAssociationsMixin;
    createForexInvestment: Sequelize.HasManyCreateAssociationMixin<ForexInvestmentInstance>;
    getPlanDurations: Sequelize.HasManyGetAssociationsMixin<ForexPlanDurationInstance>;
    setPlanDurations: Sequelize.HasManySetAssociationsMixin<ForexPlanDurationInstance, string>;
    addForexPlanDuration: Sequelize.HasManyAddAssociationMixin<ForexPlanDurationInstance, string>;
    addPlanDurations: Sequelize.HasManyAddAssociationsMixin<ForexPlanDurationInstance, string>;
    removeForexPlanDuration: Sequelize.HasManyRemoveAssociationMixin<ForexPlanDurationInstance, string>;
    removePlanDurations: Sequelize.HasManyRemoveAssociationsMixin<ForexPlanDurationInstance, string>;
    hasForexPlanDuration: Sequelize.HasManyHasAssociationMixin<ForexPlanDurationInstance, string>;
    hasPlanDurations: Sequelize.HasManyHasAssociationsMixin<ForexPlanDurationInstance, string>;
    countPlanDurations: Sequelize.HasManyCountAssociationsMixin;
    createForexPlanDuration: Sequelize.HasManyCreateAssociationMixin<ForexPlanDurationInstance>;
    getDurations: Sequelize.BelongsToManyGetAssociationsMixin<ForexDurationInstance>;
    setDurations: Sequelize.BelongsToManySetAssociationsMixin<ForexDurationInstance, string>;
    addForexDuration: Sequelize.BelongsToManyAddAssociationMixin<ForexDurationInstance, string>;
    addDurations: Sequelize.BelongsToManyAddAssociationsMixin<ForexDurationInstance, string>;
    removeForexDuration: Sequelize.BelongsToManyRemoveAssociationMixin<ForexDurationInstance, string>;
    removeDurations: Sequelize.BelongsToManyRemoveAssociationsMixin<ForexDurationInstance, string>;
    hasForexDuration: Sequelize.BelongsToManyHasAssociationMixin<ForexDurationInstance, string>;
    hasDurations: Sequelize.BelongsToManyHasAssociationsMixin<ForexDurationInstance, string>;
    countDurations: Sequelize.BelongsToManyCountAssociationsMixin;
    createForexDuration: Sequelize.BelongsToManyCreateAssociationMixin<ForexDurationInstance>;
  }

  // ========================================
  // ForexPlanDuration
  // ========================================

  interface ForexPlanDurationAttributes {
    id: string;
    planId: string;
    durationId: string;
  }

  type ForexPlanDurationCreationAttributes = Optional<ForexPlanDurationAttributes, "id">;

  interface ForexPlanDurationInstance extends Model<ForexPlanDurationAttributes, ForexPlanDurationCreationAttributes>, ForexPlanDurationAttributes {
    duration?: ForexDurationInstance;
    plan?: ForexPlanInstance;
    getDuration: Sequelize.BelongsToGetAssociationMixin<ForexDurationInstance>;
    setDuration: Sequelize.BelongsToSetAssociationMixin<ForexDurationInstance, string>;
    createDuration: Sequelize.BelongsToCreateAssociationMixin<ForexDurationInstance>;
    getPlan: Sequelize.BelongsToGetAssociationMixin<ForexPlanInstance>;
    setPlan: Sequelize.BelongsToSetAssociationMixin<ForexPlanInstance, string>;
    createPlan: Sequelize.BelongsToCreateAssociationMixin<ForexPlanInstance>;
  }

  // ========================================
  // ForexSignal
  // ========================================

  interface ForexSignalAttributes {
    id: string;
    title: string;
    image: string;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type ForexSignalCreationAttributes = Optional<ForexSignalAttributes, "id" | "createdAt" | "deletedAt" | "updatedAt">;

  interface ForexSignalInstance extends Model<ForexSignalAttributes, ForexSignalCreationAttributes>, ForexSignalAttributes {
    forexAccountSignals?: ForexAccountSignalInstance[];
    signalAccounts?: ForexAccountInstance[];
    getForexAccountSignals: Sequelize.HasManyGetAssociationsMixin<ForexAccountSignalInstance>;
    setForexAccountSignals: Sequelize.HasManySetAssociationsMixin<ForexAccountSignalInstance, string>;
    addForexAccountSignal: Sequelize.HasManyAddAssociationMixin<ForexAccountSignalInstance, string>;
    addForexAccountSignals: Sequelize.HasManyAddAssociationsMixin<ForexAccountSignalInstance, string>;
    removeForexAccountSignal: Sequelize.HasManyRemoveAssociationMixin<ForexAccountSignalInstance, string>;
    removeForexAccountSignals: Sequelize.HasManyRemoveAssociationsMixin<ForexAccountSignalInstance, string>;
    hasForexAccountSignal: Sequelize.HasManyHasAssociationMixin<ForexAccountSignalInstance, string>;
    hasForexAccountSignals: Sequelize.HasManyHasAssociationsMixin<ForexAccountSignalInstance, string>;
    countForexAccountSignals: Sequelize.HasManyCountAssociationsMixin;
    createForexAccountSignal: Sequelize.HasManyCreateAssociationMixin<ForexAccountSignalInstance>;
    getSignalAccounts: Sequelize.BelongsToManyGetAssociationsMixin<ForexAccountInstance>;
    setSignalAccounts: Sequelize.BelongsToManySetAssociationsMixin<ForexAccountInstance, string>;
    addForexAccount: Sequelize.BelongsToManyAddAssociationMixin<ForexAccountInstance, string>;
    addSignalAccounts: Sequelize.BelongsToManyAddAssociationsMixin<ForexAccountInstance, string>;
    removeForexAccount: Sequelize.BelongsToManyRemoveAssociationMixin<ForexAccountInstance, string>;
    removeSignalAccounts: Sequelize.BelongsToManyRemoveAssociationsMixin<ForexAccountInstance, string>;
    hasForexAccount: Sequelize.BelongsToManyHasAssociationMixin<ForexAccountInstance, string>;
    hasSignalAccounts: Sequelize.BelongsToManyHasAssociationsMixin<ForexAccountInstance, string>;
    countSignalAccounts: Sequelize.BelongsToManyCountAssociationsMixin;
    createForexAccount: Sequelize.BelongsToManyCreateAssociationMixin<ForexAccountInstance>;
  }

  // ========================================
  // FuturesMarket
  // ========================================

  interface FuturesMarketAttributes {
    id: string;
    currency: string;
    pair: string;
    isTrending?: boolean | null;
    isHot?: boolean | null;
    metadata?: string;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type FuturesMarketCreationAttributes = Optional<FuturesMarketAttributes, "id" | "isTrending" | "isHot" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

  interface FuturesMarketInstance extends Model<FuturesMarketAttributes, FuturesMarketCreationAttributes>, FuturesMarketAttributes {
  }

  // ========================================
  // GasHistory
  // ========================================

  interface GasHistoryAttributes {
    id: string;
    chain: string;
    gasPrice: string;
    baseFee?: string | null;
    priorityFee?: string | null;
    timestamp: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type GasHistoryCreationAttributes = Optional<GasHistoryAttributes, "id" | "baseFee" | "priorityFee" | "createdAt" | "updatedAt">;

  interface GasHistoryInstance extends Model<GasHistoryAttributes, GasHistoryCreationAttributes>, GasHistoryAttributes {
  }

  // ========================================
  // GatewayApiKey
  // ========================================

  interface GatewayApiKeyAttributes {
    id: string;
    merchantId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    lastFourChars: string;
    type: "PUBLIC" | "SECRET";
    mode: "LIVE" | "TEST";
    permissions: string[];
    ipWhitelist?: string[] | null;
    allowedWalletTypes?: AllowedWalletTypesConfig | null;
    successUrl?: string | null;
    cancelUrl?: string | null;
    webhookUrl?: string | null;
    lastUsedAt?: Date | null;
    lastUsedIp?: string | null;
    status: boolean;
    expiresAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type GatewayApiKeyCreationAttributes = Optional<GatewayApiKeyAttributes, "id" | "permissions" | "ipWhitelist" | "allowedWalletTypes" | "successUrl" | "cancelUrl" | "webhookUrl" | "lastUsedAt" | "lastUsedIp" | "status" | "expiresAt" | "createdAt" | "updatedAt" | "deletedAt">;

  interface GatewayApiKeyInstance extends Model<GatewayApiKeyAttributes, GatewayApiKeyCreationAttributes>, GatewayApiKeyAttributes {
    merchant?: GatewayMerchantInstance;
    getMerchant: Sequelize.BelongsToGetAssociationMixin<GatewayMerchantInstance>;
    setMerchant: Sequelize.BelongsToSetAssociationMixin<GatewayMerchantInstance, string>;
    createMerchant: Sequelize.BelongsToCreateAssociationMixin<GatewayMerchantInstance>;
  }

  // ========================================
  // GatewayMerchant
  // ========================================

  interface GatewayMerchantAttributes {
    id: string;
    userId: string;
    name: string;
    slug: string;
    description?: string | null;
    logo?: string | null;
    website?: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
    apiKey: string;
    secretKey: string;
    webhookSecret: string;
    testMode: boolean;
    allowedCurrencies: string[];
    allowedWalletTypes: string[];
    defaultCurrency: string;
    feeType: "PERCENTAGE" | "FIXED" | "BOTH";
    feePercentage: number;
    feeFixed: number;
    payoutSchedule: "INSTANT" | "DAILY" | "WEEKLY" | "MONTHLY";
    payoutThreshold: number;
    payoutWalletId?: string | null;
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
    verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED";
    dailyLimit: number;
    monthlyLimit: number;
    transactionLimit: number;
    metadata?: Record<string, any> | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type GatewayMerchantCreationAttributes = Optional<GatewayMerchantAttributes, "id" | "description" | "logo" | "website" | "phone" | "address" | "city" | "state" | "country" | "postalCode" | "testMode" | "allowedCurrencies" | "allowedWalletTypes" | "defaultCurrency" | "feeType" | "feePercentage" | "feeFixed" | "payoutSchedule" | "payoutThreshold" | "payoutWalletId" | "status" | "verificationStatus" | "dailyLimit" | "monthlyLimit" | "transactionLimit" | "metadata" | "createdAt" | "updatedAt" | "deletedAt">;

  interface GatewayMerchantInstance extends Model<GatewayMerchantAttributes, GatewayMerchantCreationAttributes>, GatewayMerchantAttributes {
    gatewayApiKeys?: GatewayApiKeyInstance[];
    gatewayPayments?: GatewayPaymentInstance[];
    gatewayRefunds?: GatewayRefundInstance[];
    gatewayWebhooks?: GatewayWebhookInstance[];
    gatewayPayouts?: GatewayPayoutInstance[];
    gatewayMerchantBalances?: GatewayMerchantBalanceInstance[];
    user?: UserInstance;
    getGatewayApiKeys: Sequelize.HasManyGetAssociationsMixin<GatewayApiKeyInstance>;
    setGatewayApiKeys: Sequelize.HasManySetAssociationsMixin<GatewayApiKeyInstance, string>;
    addGatewayApiKey: Sequelize.HasManyAddAssociationMixin<GatewayApiKeyInstance, string>;
    addGatewayApiKeys: Sequelize.HasManyAddAssociationsMixin<GatewayApiKeyInstance, string>;
    removeGatewayApiKey: Sequelize.HasManyRemoveAssociationMixin<GatewayApiKeyInstance, string>;
    removeGatewayApiKeys: Sequelize.HasManyRemoveAssociationsMixin<GatewayApiKeyInstance, string>;
    hasGatewayApiKey: Sequelize.HasManyHasAssociationMixin<GatewayApiKeyInstance, string>;
    hasGatewayApiKeys: Sequelize.HasManyHasAssociationsMixin<GatewayApiKeyInstance, string>;
    countGatewayApiKeys: Sequelize.HasManyCountAssociationsMixin;
    createGatewayApiKey: Sequelize.HasManyCreateAssociationMixin<GatewayApiKeyInstance>;
    getGatewayPayments: Sequelize.HasManyGetAssociationsMixin<GatewayPaymentInstance>;
    setGatewayPayments: Sequelize.HasManySetAssociationsMixin<GatewayPaymentInstance, string>;
    addGatewayPayment: Sequelize.HasManyAddAssociationMixin<GatewayPaymentInstance, string>;
    addGatewayPayments: Sequelize.HasManyAddAssociationsMixin<GatewayPaymentInstance, string>;
    removeGatewayPayment: Sequelize.HasManyRemoveAssociationMixin<GatewayPaymentInstance, string>;
    removeGatewayPayments: Sequelize.HasManyRemoveAssociationsMixin<GatewayPaymentInstance, string>;
    hasGatewayPayment: Sequelize.HasManyHasAssociationMixin<GatewayPaymentInstance, string>;
    hasGatewayPayments: Sequelize.HasManyHasAssociationsMixin<GatewayPaymentInstance, string>;
    countGatewayPayments: Sequelize.HasManyCountAssociationsMixin;
    createGatewayPayment: Sequelize.HasManyCreateAssociationMixin<GatewayPaymentInstance>;
    getGatewayRefunds: Sequelize.HasManyGetAssociationsMixin<GatewayRefundInstance>;
    setGatewayRefunds: Sequelize.HasManySetAssociationsMixin<GatewayRefundInstance, string>;
    addGatewayRefund: Sequelize.HasManyAddAssociationMixin<GatewayRefundInstance, string>;
    addGatewayRefunds: Sequelize.HasManyAddAssociationsMixin<GatewayRefundInstance, string>;
    removeGatewayRefund: Sequelize.HasManyRemoveAssociationMixin<GatewayRefundInstance, string>;
    removeGatewayRefunds: Sequelize.HasManyRemoveAssociationsMixin<GatewayRefundInstance, string>;
    hasGatewayRefund: Sequelize.HasManyHasAssociationMixin<GatewayRefundInstance, string>;
    hasGatewayRefunds: Sequelize.HasManyHasAssociationsMixin<GatewayRefundInstance, string>;
    countGatewayRefunds: Sequelize.HasManyCountAssociationsMixin;
    createGatewayRefund: Sequelize.HasManyCreateAssociationMixin<GatewayRefundInstance>;
    getGatewayWebhooks: Sequelize.HasManyGetAssociationsMixin<GatewayWebhookInstance>;
    setGatewayWebhooks: Sequelize.HasManySetAssociationsMixin<GatewayWebhookInstance, string>;
    addGatewayWebhook: Sequelize.HasManyAddAssociationMixin<GatewayWebhookInstance, string>;
    addGatewayWebhooks: Sequelize.HasManyAddAssociationsMixin<GatewayWebhookInstance, string>;
    removeGatewayWebhook: Sequelize.HasManyRemoveAssociationMixin<GatewayWebhookInstance, string>;
    removeGatewayWebhooks: Sequelize.HasManyRemoveAssociationsMixin<GatewayWebhookInstance, string>;
    hasGatewayWebhook: Sequelize.HasManyHasAssociationMixin<GatewayWebhookInstance, string>;
    hasGatewayWebhooks: Sequelize.HasManyHasAssociationsMixin<GatewayWebhookInstance, string>;
    countGatewayWebhooks: Sequelize.HasManyCountAssociationsMixin;
    createGatewayWebhook: Sequelize.HasManyCreateAssociationMixin<GatewayWebhookInstance>;
    getGatewayPayouts: Sequelize.HasManyGetAssociationsMixin<GatewayPayoutInstance>;
    setGatewayPayouts: Sequelize.HasManySetAssociationsMixin<GatewayPayoutInstance, string>;
    addGatewayPayout: Sequelize.HasManyAddAssociationMixin<GatewayPayoutInstance, string>;
    addGatewayPayouts: Sequelize.HasManyAddAssociationsMixin<GatewayPayoutInstance, string>;
    removeGatewayPayout: Sequelize.HasManyRemoveAssociationMixin<GatewayPayoutInstance, string>;
    removeGatewayPayouts: Sequelize.HasManyRemoveAssociationsMixin<GatewayPayoutInstance, string>;
    hasGatewayPayout: Sequelize.HasManyHasAssociationMixin<GatewayPayoutInstance, string>;
    hasGatewayPayouts: Sequelize.HasManyHasAssociationsMixin<GatewayPayoutInstance, string>;
    countGatewayPayouts: Sequelize.HasManyCountAssociationsMixin;
    createGatewayPayout: Sequelize.HasManyCreateAssociationMixin<GatewayPayoutInstance>;
    getGatewayMerchantBalances: Sequelize.HasManyGetAssociationsMixin<GatewayMerchantBalanceInstance>;
    setGatewayMerchantBalances: Sequelize.HasManySetAssociationsMixin<GatewayMerchantBalanceInstance, string>;
    addGatewayMerchantBalance: Sequelize.HasManyAddAssociationMixin<GatewayMerchantBalanceInstance, string>;
    addGatewayMerchantBalances: Sequelize.HasManyAddAssociationsMixin<GatewayMerchantBalanceInstance, string>;
    removeGatewayMerchantBalance: Sequelize.HasManyRemoveAssociationMixin<GatewayMerchantBalanceInstance, string>;
    removeGatewayMerchantBalances: Sequelize.HasManyRemoveAssociationsMixin<GatewayMerchantBalanceInstance, string>;
    hasGatewayMerchantBalance: Sequelize.HasManyHasAssociationMixin<GatewayMerchantBalanceInstance, string>;
    hasGatewayMerchantBalances: Sequelize.HasManyHasAssociationsMixin<GatewayMerchantBalanceInstance, string>;
    countGatewayMerchantBalances: Sequelize.HasManyCountAssociationsMixin;
    createGatewayMerchantBalance: Sequelize.HasManyCreateAssociationMixin<GatewayMerchantBalanceInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // GatewayMerchantBalance
  // ========================================

  interface GatewayMerchantBalanceAttributes {
    id: string;
    merchantId: string;
    currency: string;
    walletType: "FIAT" | "SPOT" | "ECO";
    available: number;
    pending: number;
    reserved: number;
    totalReceived: number;
    totalRefunded: number;
    totalFees: number;
    totalPaidOut: number;
    updatedAt?: Date;
  }

  type GatewayMerchantBalanceCreationAttributes = Optional<GatewayMerchantBalanceAttributes, "id" | "walletType" | "available" | "pending" | "reserved" | "totalReceived" | "totalRefunded" | "totalFees" | "totalPaidOut" | "updatedAt">;

  interface GatewayMerchantBalanceInstance extends Model<GatewayMerchantBalanceAttributes, GatewayMerchantBalanceCreationAttributes>, GatewayMerchantBalanceAttributes {
    merchant?: GatewayMerchantInstance;
    getMerchant: Sequelize.BelongsToGetAssociationMixin<GatewayMerchantInstance>;
    setMerchant: Sequelize.BelongsToSetAssociationMixin<GatewayMerchantInstance, string>;
    createMerchant: Sequelize.BelongsToCreateAssociationMixin<GatewayMerchantInstance>;
  }

  // ========================================
  // GatewayPayment
  // ========================================

  interface GatewayPaymentAttributes {
    id: string;
    merchantId: string;
    customerId?: string | null;
    transactionId?: string | null;
    paymentIntentId: string;
    merchantOrderId?: string | null;
    amount: number;
    currency: string;
    walletType: "FIAT" | "SPOT" | "ECO";
    feeAmount: number;
    netAmount: number;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUNDED" | "PARTIALLY_REFUNDED";
    checkoutUrl: string;
    returnUrl: string;
    cancelUrl?: string | null;
    webhookUrl?: string | null;
    description?: string | null;
    metadata?: Record<string, any> | null;
    lineItems?: GatewayLineItem[] | null;
    customerEmail?: string;
    customerName?: string | null;
    billingAddress?: GatewayBillingAddress | null;
    expiresAt: Date;
    completedAt?: Date | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    allocations?: GatewayPaymentAllocation[] | null;
    testMode: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type GatewayPaymentCreationAttributes = Optional<GatewayPaymentAttributes, "id" | "customerId" | "transactionId" | "merchantOrderId" | "walletType" | "feeAmount" | "netAmount" | "status" | "cancelUrl" | "webhookUrl" | "description" | "metadata" | "lineItems" | "customerEmail" | "customerName" | "billingAddress" | "completedAt" | "ipAddress" | "userAgent" | "allocations" | "testMode" | "createdAt" | "updatedAt" | "deletedAt">;

  interface GatewayPaymentInstance extends Model<GatewayPaymentAttributes, GatewayPaymentCreationAttributes>, GatewayPaymentAttributes {
    gatewayRefunds?: GatewayRefundInstance[];
    gatewayWebhooks?: GatewayWebhookInstance[];
    merchant?: GatewayMerchantInstance;
    customer?: UserInstance;
    transaction?: TransactionInstance;
    getGatewayRefunds: Sequelize.HasManyGetAssociationsMixin<GatewayRefundInstance>;
    setGatewayRefunds: Sequelize.HasManySetAssociationsMixin<GatewayRefundInstance, string>;
    addGatewayRefund: Sequelize.HasManyAddAssociationMixin<GatewayRefundInstance, string>;
    addGatewayRefunds: Sequelize.HasManyAddAssociationsMixin<GatewayRefundInstance, string>;
    removeGatewayRefund: Sequelize.HasManyRemoveAssociationMixin<GatewayRefundInstance, string>;
    removeGatewayRefunds: Sequelize.HasManyRemoveAssociationsMixin<GatewayRefundInstance, string>;
    hasGatewayRefund: Sequelize.HasManyHasAssociationMixin<GatewayRefundInstance, string>;
    hasGatewayRefunds: Sequelize.HasManyHasAssociationsMixin<GatewayRefundInstance, string>;
    countGatewayRefunds: Sequelize.HasManyCountAssociationsMixin;
    createGatewayRefund: Sequelize.HasManyCreateAssociationMixin<GatewayRefundInstance>;
    getGatewayWebhooks: Sequelize.HasManyGetAssociationsMixin<GatewayWebhookInstance>;
    setGatewayWebhooks: Sequelize.HasManySetAssociationsMixin<GatewayWebhookInstance, string>;
    addGatewayWebhook: Sequelize.HasManyAddAssociationMixin<GatewayWebhookInstance, string>;
    addGatewayWebhooks: Sequelize.HasManyAddAssociationsMixin<GatewayWebhookInstance, string>;
    removeGatewayWebhook: Sequelize.HasManyRemoveAssociationMixin<GatewayWebhookInstance, string>;
    removeGatewayWebhooks: Sequelize.HasManyRemoveAssociationsMixin<GatewayWebhookInstance, string>;
    hasGatewayWebhook: Sequelize.HasManyHasAssociationMixin<GatewayWebhookInstance, string>;
    hasGatewayWebhooks: Sequelize.HasManyHasAssociationsMixin<GatewayWebhookInstance, string>;
    countGatewayWebhooks: Sequelize.HasManyCountAssociationsMixin;
    createGatewayWebhook: Sequelize.HasManyCreateAssociationMixin<GatewayWebhookInstance>;
    getMerchant: Sequelize.BelongsToGetAssociationMixin<GatewayMerchantInstance>;
    setMerchant: Sequelize.BelongsToSetAssociationMixin<GatewayMerchantInstance, string>;
    createMerchant: Sequelize.BelongsToCreateAssociationMixin<GatewayMerchantInstance>;
    getCustomer: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setCustomer: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createCustomer: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getTransaction: Sequelize.BelongsToGetAssociationMixin<TransactionInstance>;
    setTransaction: Sequelize.BelongsToSetAssociationMixin<TransactionInstance, string>;
    createTransaction: Sequelize.BelongsToCreateAssociationMixin<TransactionInstance>;
  }

  // ========================================
  // GatewayPayout
  // ========================================

  interface GatewayPayoutAttributes {
    id: string;
    merchantId: string;
    transactionId?: string | null;
    payoutId: string;
    amount: number;
    currency: string;
    walletType: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
    periodStart: Date;
    periodEnd: Date;
    grossAmount: number;
    feeAmount: number;
    netAmount: number;
    paymentCount: number;
    refundCount: number;
    metadata?: Record<string, any> | null;
    processedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type GatewayPayoutCreationAttributes = Optional<GatewayPayoutAttributes, "id" | "transactionId" | "walletType" | "status" | "grossAmount" | "feeAmount" | "netAmount" | "paymentCount" | "refundCount" | "metadata" | "processedAt" | "createdAt" | "updatedAt">;

  interface GatewayPayoutInstance extends Model<GatewayPayoutAttributes, GatewayPayoutCreationAttributes>, GatewayPayoutAttributes {
    merchant?: GatewayMerchantInstance;
    transaction?: TransactionInstance;
    getMerchant: Sequelize.BelongsToGetAssociationMixin<GatewayMerchantInstance>;
    setMerchant: Sequelize.BelongsToSetAssociationMixin<GatewayMerchantInstance, string>;
    createMerchant: Sequelize.BelongsToCreateAssociationMixin<GatewayMerchantInstance>;
    getTransaction: Sequelize.BelongsToGetAssociationMixin<TransactionInstance>;
    setTransaction: Sequelize.BelongsToSetAssociationMixin<TransactionInstance, string>;
    createTransaction: Sequelize.BelongsToCreateAssociationMixin<TransactionInstance>;
  }

  // ========================================
  // GatewayRefund
  // ========================================

  interface GatewayRefundAttributes {
    id: string;
    paymentId: string;
    merchantId: string;
    transactionId?: string | null;
    refundId: string;
    amount: number;
    currency: string;
    reason: "REQUESTED_BY_CUSTOMER" | "DUPLICATE" | "FRAUDULENT" | "OTHER";
    description?: string | null;
    status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
    metadata?: Record<string, any> | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type GatewayRefundCreationAttributes = Optional<GatewayRefundAttributes, "id" | "transactionId" | "reason" | "description" | "status" | "metadata" | "createdAt" | "updatedAt" | "deletedAt">;

  interface GatewayRefundInstance extends Model<GatewayRefundAttributes, GatewayRefundCreationAttributes>, GatewayRefundAttributes {
    gatewayWebhooks?: GatewayWebhookInstance[];
    payment?: GatewayPaymentInstance;
    merchant?: GatewayMerchantInstance;
    transaction?: TransactionInstance;
    getGatewayWebhooks: Sequelize.HasManyGetAssociationsMixin<GatewayWebhookInstance>;
    setGatewayWebhooks: Sequelize.HasManySetAssociationsMixin<GatewayWebhookInstance, string>;
    addGatewayWebhook: Sequelize.HasManyAddAssociationMixin<GatewayWebhookInstance, string>;
    addGatewayWebhooks: Sequelize.HasManyAddAssociationsMixin<GatewayWebhookInstance, string>;
    removeGatewayWebhook: Sequelize.HasManyRemoveAssociationMixin<GatewayWebhookInstance, string>;
    removeGatewayWebhooks: Sequelize.HasManyRemoveAssociationsMixin<GatewayWebhookInstance, string>;
    hasGatewayWebhook: Sequelize.HasManyHasAssociationMixin<GatewayWebhookInstance, string>;
    hasGatewayWebhooks: Sequelize.HasManyHasAssociationsMixin<GatewayWebhookInstance, string>;
    countGatewayWebhooks: Sequelize.HasManyCountAssociationsMixin;
    createGatewayWebhook: Sequelize.HasManyCreateAssociationMixin<GatewayWebhookInstance>;
    getPayment: Sequelize.BelongsToGetAssociationMixin<GatewayPaymentInstance>;
    setPayment: Sequelize.BelongsToSetAssociationMixin<GatewayPaymentInstance, string>;
    createPayment: Sequelize.BelongsToCreateAssociationMixin<GatewayPaymentInstance>;
    getMerchant: Sequelize.BelongsToGetAssociationMixin<GatewayMerchantInstance>;
    setMerchant: Sequelize.BelongsToSetAssociationMixin<GatewayMerchantInstance, string>;
    createMerchant: Sequelize.BelongsToCreateAssociationMixin<GatewayMerchantInstance>;
    getTransaction: Sequelize.BelongsToGetAssociationMixin<TransactionInstance>;
    setTransaction: Sequelize.BelongsToSetAssociationMixin<TransactionInstance, string>;
    createTransaction: Sequelize.BelongsToCreateAssociationMixin<TransactionInstance>;
  }

  // ========================================
  // GatewayWebhook
  // ========================================

  interface GatewayWebhookAttributes {
    id: string;
    merchantId: string;
    paymentId?: string | null;
    refundId?: string | null;
    eventType: GatewayWebhookEvent;
    url: string;
    payload: Record<string, any>;
    signature: string;
    status: "PENDING" | "SENT" | "FAILED" | "RETRYING";
    attempts: number;
    maxAttempts: number;
    lastAttemptAt?: Date | null;
    nextRetryAt?: Date | null;
    responseStatus?: number | null;
    responseBody?: string | null;
    responseTime?: number | null;
    errorMessage?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type GatewayWebhookCreationAttributes = Optional<GatewayWebhookAttributes, "id" | "paymentId" | "refundId" | "status" | "attempts" | "maxAttempts" | "lastAttemptAt" | "nextRetryAt" | "responseStatus" | "responseBody" | "responseTime" | "errorMessage" | "createdAt" | "updatedAt">;

  interface GatewayWebhookInstance extends Model<GatewayWebhookAttributes, GatewayWebhookCreationAttributes>, GatewayWebhookAttributes {
    merchant?: GatewayMerchantInstance;
    payment?: GatewayPaymentInstance;
    refund?: GatewayRefundInstance;
    getMerchant: Sequelize.BelongsToGetAssociationMixin<GatewayMerchantInstance>;
    setMerchant: Sequelize.BelongsToSetAssociationMixin<GatewayMerchantInstance, string>;
    createMerchant: Sequelize.BelongsToCreateAssociationMixin<GatewayMerchantInstance>;
    getPayment: Sequelize.BelongsToGetAssociationMixin<GatewayPaymentInstance>;
    setPayment: Sequelize.BelongsToSetAssociationMixin<GatewayPaymentInstance, string>;
    createPayment: Sequelize.BelongsToCreateAssociationMixin<GatewayPaymentInstance>;
    getRefund: Sequelize.BelongsToGetAssociationMixin<GatewayRefundInstance>;
    setRefund: Sequelize.BelongsToSetAssociationMixin<GatewayRefundInstance, string>;
    createRefund: Sequelize.BelongsToCreateAssociationMixin<GatewayRefundInstance>;
  }

  // ========================================
  // IcoAdminActivity
  // ========================================

  interface IcoAdminActivityAttributes {
    id: string;
    type: string;
    offeringId: string;
    offeringName: string;
    adminId: string;
    details?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type IcoAdminActivityCreationAttributes = Optional<IcoAdminActivityAttributes, "id" | "details" | "createdAt" | "updatedAt" | "deletedAt">;

  interface IcoAdminActivityInstance extends Model<IcoAdminActivityAttributes, IcoAdminActivityCreationAttributes>, IcoAdminActivityAttributes {
    offering?: IcoTokenOfferingInstance;
    admin?: UserInstance;
    getOffering: Sequelize.BelongsToGetAssociationMixin<IcoTokenOfferingInstance>;
    setOffering: Sequelize.BelongsToSetAssociationMixin<IcoTokenOfferingInstance, string>;
    createOffering: Sequelize.BelongsToCreateAssociationMixin<IcoTokenOfferingInstance>;
    getAdmin: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setAdmin: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createAdmin: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // IcoBlockchain
  // ========================================

  interface IcoBlockchainAttributes {
    id: string;
    name: string;
    value: string;
    status: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type IcoBlockchainCreationAttributes = Optional<IcoBlockchainAttributes, "id" | "status" | "createdAt" | "updatedAt" | "deletedAt">;

  interface IcoBlockchainInstance extends Model<IcoBlockchainAttributes, IcoBlockchainCreationAttributes>, IcoBlockchainAttributes {
  }

  // ========================================
  // IcoLaunchPlan
  // ========================================

  interface IcoLaunchPlanAttributes {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    walletType: string;
    features: {
    maxTeamMembers: number;
    maxRoadmapItems: number;
    maxOfferingPhases: number;
    maxUpdatePosts: number;
    supportLevel: "basic" | "standard" | "premium";
    marketingSupport: boolean;
    auditIncluded: boolean;
    customTokenomics: boolean;
    priorityListing: boolean;
    kycRequired: boolean;
    [key: string]: any;
  };
    recommended: boolean;
    status: boolean;
    sortOrder: number;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type IcoLaunchPlanCreationAttributes = Optional<IcoLaunchPlanAttributes, "id" | "recommended" | "status" | "sortOrder" | "createdAt" | "updatedAt" | "deletedAt">;

  interface IcoLaunchPlanInstance extends Model<IcoLaunchPlanAttributes, IcoLaunchPlanCreationAttributes>, IcoLaunchPlanAttributes {
    offerings?: IcoTokenOfferingInstance[];
    getOfferings: Sequelize.HasManyGetAssociationsMixin<IcoTokenOfferingInstance>;
    setOfferings: Sequelize.HasManySetAssociationsMixin<IcoTokenOfferingInstance, string>;
    addIcoTokenOffering: Sequelize.HasManyAddAssociationMixin<IcoTokenOfferingInstance, string>;
    addOfferings: Sequelize.HasManyAddAssociationsMixin<IcoTokenOfferingInstance, string>;
    removeIcoTokenOffering: Sequelize.HasManyRemoveAssociationMixin<IcoTokenOfferingInstance, string>;
    removeOfferings: Sequelize.HasManyRemoveAssociationsMixin<IcoTokenOfferingInstance, string>;
    hasIcoTokenOffering: Sequelize.HasManyHasAssociationMixin<IcoTokenOfferingInstance, string>;
    hasOfferings: Sequelize.HasManyHasAssociationsMixin<IcoTokenOfferingInstance, string>;
    countOfferings: Sequelize.HasManyCountAssociationsMixin;
    createIcoTokenOffering: Sequelize.HasManyCreateAssociationMixin<IcoTokenOfferingInstance>;
  }

  // ========================================
  // IcoRoadmapItem
  // ========================================

  interface IcoRoadmapItemAttributes {
    id: string;
    offeringId: string;
    title: string;
    description: string;
    date: string;
    completed: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type IcoRoadmapItemCreationAttributes = Optional<IcoRoadmapItemAttributes, "id" | "completed" | "createdAt" | "updatedAt" | "deletedAt">;

  interface IcoRoadmapItemInstance extends Model<IcoRoadmapItemAttributes, IcoRoadmapItemCreationAttributes>, IcoRoadmapItemAttributes {
    offering?: IcoTokenOfferingInstance;
    getOffering: Sequelize.BelongsToGetAssociationMixin<IcoTokenOfferingInstance>;
    setOffering: Sequelize.BelongsToSetAssociationMixin<IcoTokenOfferingInstance, string>;
    createOffering: Sequelize.BelongsToCreateAssociationMixin<IcoTokenOfferingInstance>;
  }

  // ========================================
  // IcoTeamMember
  // ========================================

  interface IcoTeamMemberAttributes {
    id: string;
    offeringId: string;
    name: string;
    role: string;
    bio: string;
    avatar?: string | null;
    linkedin?: string;
    twitter?: string;
    website?: string;
    github?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type IcoTeamMemberCreationAttributes = Optional<IcoTeamMemberAttributes, "id" | "avatar" | "linkedin" | "twitter" | "website" | "github" | "createdAt" | "updatedAt" | "deletedAt">;

  interface IcoTeamMemberInstance extends Model<IcoTeamMemberAttributes, IcoTeamMemberCreationAttributes>, IcoTeamMemberAttributes {
    offering?: IcoTokenOfferingInstance;
    getOffering: Sequelize.BelongsToGetAssociationMixin<IcoTokenOfferingInstance>;
    setOffering: Sequelize.BelongsToSetAssociationMixin<IcoTokenOfferingInstance, string>;
    createOffering: Sequelize.BelongsToCreateAssociationMixin<IcoTokenOfferingInstance>;
  }

  // ========================================
  // IcoTokenDetail
  // ========================================

  interface IcoTokenDetailAttributes {
    id: string;
    offeringId: string;
    tokenType: string;
    totalSupply: number;
    tokensForSale: number;
    salePercentage: number;
    blockchain: string;
    description: string;
    useOfFunds: any;
    links: {
    whitepaper?: string;
    github?: string;
    telegram?: string;
    twitter?: string;
  };
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type IcoTokenDetailCreationAttributes = Optional<IcoTokenDetailAttributes, "id" | "createdAt" | "updatedAt" | "deletedAt">;

  interface IcoTokenDetailInstance extends Model<IcoTokenDetailAttributes, IcoTokenDetailCreationAttributes>, IcoTokenDetailAttributes {
    offering?: IcoTokenOfferingInstance;
    tokenTypeData?: IcoTokenTypeInstance;
    getOffering: Sequelize.BelongsToGetAssociationMixin<IcoTokenOfferingInstance>;
    setOffering: Sequelize.BelongsToSetAssociationMixin<IcoTokenOfferingInstance, string>;
    createOffering: Sequelize.BelongsToCreateAssociationMixin<IcoTokenOfferingInstance>;
    getTokenTypeData: Sequelize.BelongsToGetAssociationMixin<IcoTokenTypeInstance>;
    setTokenTypeData: Sequelize.BelongsToSetAssociationMixin<IcoTokenTypeInstance, string>;
    createTokenTypeData: Sequelize.BelongsToCreateAssociationMixin<IcoTokenTypeInstance>;
  }

  // ========================================
  // IcoTokenOffering
  // ========================================

  interface IcoTokenOfferingAttributes {
    id: string;
    userId: string;
    planId: string;
    typeId: string;
    name: string;
    symbol: string;
    icon: string;
    status: | "ACTIVE"
    | "SUCCESS"
    | "FAILED"
    | "UPCOMING"
    | "PENDING"
    | "REJECTED"
    | "DISABLED"
    | "CANCELLED";
    purchaseWalletCurrency: string;
    purchaseWalletType: string;
    tokenPrice: number;
    targetAmount: number;
    startDate: Date;
    endDate: Date;
    participants: number;
    currentPrice?: number;
    priceChange?: number;
    submittedAt?: Date;
    approvedAt?: Date;
    rejectedAt?: Date;
    reviewNotes?: string | null;
    isPaused: boolean;
    isFlagged: boolean;
    featured?: boolean | null;
    website?: string | null;
    cancelledAt?: Date | null;
    cancelledBy?: string | null;
    cancellationReason?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type IcoTokenOfferingCreationAttributes = Optional<IcoTokenOfferingAttributes, "id" | "currentPrice" | "priceChange" | "submittedAt" | "approvedAt" | "rejectedAt" | "reviewNotes" | "isPaused" | "isFlagged" | "featured" | "website" | "cancelledAt" | "cancelledBy" | "cancellationReason" | "createdAt" | "updatedAt" | "deletedAt">;

  interface IcoTokenOfferingInstance extends Model<IcoTokenOfferingAttributes, IcoTokenOfferingCreationAttributes>, IcoTokenOfferingAttributes {
    tokenDetail?: IcoTokenDetailInstance;
    phases?: IcoTokenOfferingPhaseInstance[];
    roadmapItems?: IcoRoadmapItemInstance[];
    teamMembers?: IcoTeamMemberInstance[];
    transactions?: IcoTransactionInstance[];
    adminActivities?: IcoAdminActivityInstance[];
    updates?: IcoTokenOfferingUpdateInstance[];
    plan?: IcoLaunchPlanInstance;
    user?: UserInstance;
    type?: IcoTokenTypeInstance;
    getTokenDetail: Sequelize.HasOneGetAssociationMixin<IcoTokenDetailInstance>;
    setTokenDetail: Sequelize.HasOneSetAssociationMixin<IcoTokenDetailInstance, string>;
    createTokenDetail: Sequelize.HasOneCreateAssociationMixin<IcoTokenDetailInstance>;
    getPhases: Sequelize.HasManyGetAssociationsMixin<IcoTokenOfferingPhaseInstance>;
    setPhases: Sequelize.HasManySetAssociationsMixin<IcoTokenOfferingPhaseInstance, string>;
    addIcoTokenOfferingPhase: Sequelize.HasManyAddAssociationMixin<IcoTokenOfferingPhaseInstance, string>;
    addPhases: Sequelize.HasManyAddAssociationsMixin<IcoTokenOfferingPhaseInstance, string>;
    removeIcoTokenOfferingPhase: Sequelize.HasManyRemoveAssociationMixin<IcoTokenOfferingPhaseInstance, string>;
    removePhases: Sequelize.HasManyRemoveAssociationsMixin<IcoTokenOfferingPhaseInstance, string>;
    hasIcoTokenOfferingPhase: Sequelize.HasManyHasAssociationMixin<IcoTokenOfferingPhaseInstance, string>;
    hasPhases: Sequelize.HasManyHasAssociationsMixin<IcoTokenOfferingPhaseInstance, string>;
    countPhases: Sequelize.HasManyCountAssociationsMixin;
    createIcoTokenOfferingPhase: Sequelize.HasManyCreateAssociationMixin<IcoTokenOfferingPhaseInstance>;
    getRoadmapItems: Sequelize.HasManyGetAssociationsMixin<IcoRoadmapItemInstance>;
    setRoadmapItems: Sequelize.HasManySetAssociationsMixin<IcoRoadmapItemInstance, string>;
    addIcoRoadmapItem: Sequelize.HasManyAddAssociationMixin<IcoRoadmapItemInstance, string>;
    addRoadmapItems: Sequelize.HasManyAddAssociationsMixin<IcoRoadmapItemInstance, string>;
    removeIcoRoadmapItem: Sequelize.HasManyRemoveAssociationMixin<IcoRoadmapItemInstance, string>;
    removeRoadmapItems: Sequelize.HasManyRemoveAssociationsMixin<IcoRoadmapItemInstance, string>;
    hasIcoRoadmapItem: Sequelize.HasManyHasAssociationMixin<IcoRoadmapItemInstance, string>;
    hasRoadmapItems: Sequelize.HasManyHasAssociationsMixin<IcoRoadmapItemInstance, string>;
    countRoadmapItems: Sequelize.HasManyCountAssociationsMixin;
    createIcoRoadmapItem: Sequelize.HasManyCreateAssociationMixin<IcoRoadmapItemInstance>;
    getTeamMembers: Sequelize.HasManyGetAssociationsMixin<IcoTeamMemberInstance>;
    setTeamMembers: Sequelize.HasManySetAssociationsMixin<IcoTeamMemberInstance, string>;
    addIcoTeamMember: Sequelize.HasManyAddAssociationMixin<IcoTeamMemberInstance, string>;
    addTeamMembers: Sequelize.HasManyAddAssociationsMixin<IcoTeamMemberInstance, string>;
    removeIcoTeamMember: Sequelize.HasManyRemoveAssociationMixin<IcoTeamMemberInstance, string>;
    removeTeamMembers: Sequelize.HasManyRemoveAssociationsMixin<IcoTeamMemberInstance, string>;
    hasIcoTeamMember: Sequelize.HasManyHasAssociationMixin<IcoTeamMemberInstance, string>;
    hasTeamMembers: Sequelize.HasManyHasAssociationsMixin<IcoTeamMemberInstance, string>;
    countTeamMembers: Sequelize.HasManyCountAssociationsMixin;
    createIcoTeamMember: Sequelize.HasManyCreateAssociationMixin<IcoTeamMemberInstance>;
    getTransactions: Sequelize.HasManyGetAssociationsMixin<IcoTransactionInstance>;
    setTransactions: Sequelize.HasManySetAssociationsMixin<IcoTransactionInstance, string>;
    addIcoTransaction: Sequelize.HasManyAddAssociationMixin<IcoTransactionInstance, string>;
    addTransactions: Sequelize.HasManyAddAssociationsMixin<IcoTransactionInstance, string>;
    removeIcoTransaction: Sequelize.HasManyRemoveAssociationMixin<IcoTransactionInstance, string>;
    removeTransactions: Sequelize.HasManyRemoveAssociationsMixin<IcoTransactionInstance, string>;
    hasIcoTransaction: Sequelize.HasManyHasAssociationMixin<IcoTransactionInstance, string>;
    hasTransactions: Sequelize.HasManyHasAssociationsMixin<IcoTransactionInstance, string>;
    countTransactions: Sequelize.HasManyCountAssociationsMixin;
    createIcoTransaction: Sequelize.HasManyCreateAssociationMixin<IcoTransactionInstance>;
    getAdminActivities: Sequelize.HasManyGetAssociationsMixin<IcoAdminActivityInstance>;
    setAdminActivities: Sequelize.HasManySetAssociationsMixin<IcoAdminActivityInstance, string>;
    addIcoAdminActivity: Sequelize.HasManyAddAssociationMixin<IcoAdminActivityInstance, string>;
    addAdminActivities: Sequelize.HasManyAddAssociationsMixin<IcoAdminActivityInstance, string>;
    removeIcoAdminActivity: Sequelize.HasManyRemoveAssociationMixin<IcoAdminActivityInstance, string>;
    removeAdminActivities: Sequelize.HasManyRemoveAssociationsMixin<IcoAdminActivityInstance, string>;
    hasIcoAdminActivity: Sequelize.HasManyHasAssociationMixin<IcoAdminActivityInstance, string>;
    hasAdminActivities: Sequelize.HasManyHasAssociationsMixin<IcoAdminActivityInstance, string>;
    countAdminActivities: Sequelize.HasManyCountAssociationsMixin;
    createIcoAdminActivity: Sequelize.HasManyCreateAssociationMixin<IcoAdminActivityInstance>;
    getUpdates: Sequelize.HasManyGetAssociationsMixin<IcoTokenOfferingUpdateInstance>;
    setUpdates: Sequelize.HasManySetAssociationsMixin<IcoTokenOfferingUpdateInstance, string>;
    addIcoTokenOfferingUpdate: Sequelize.HasManyAddAssociationMixin<IcoTokenOfferingUpdateInstance, string>;
    addUpdates: Sequelize.HasManyAddAssociationsMixin<IcoTokenOfferingUpdateInstance, string>;
    removeIcoTokenOfferingUpdate: Sequelize.HasManyRemoveAssociationMixin<IcoTokenOfferingUpdateInstance, string>;
    removeUpdates: Sequelize.HasManyRemoveAssociationsMixin<IcoTokenOfferingUpdateInstance, string>;
    hasIcoTokenOfferingUpdate: Sequelize.HasManyHasAssociationMixin<IcoTokenOfferingUpdateInstance, string>;
    hasUpdates: Sequelize.HasManyHasAssociationsMixin<IcoTokenOfferingUpdateInstance, string>;
    countUpdates: Sequelize.HasManyCountAssociationsMixin;
    createIcoTokenOfferingUpdate: Sequelize.HasManyCreateAssociationMixin<IcoTokenOfferingUpdateInstance>;
    getPlan: Sequelize.BelongsToGetAssociationMixin<IcoLaunchPlanInstance>;
    setPlan: Sequelize.BelongsToSetAssociationMixin<IcoLaunchPlanInstance, string>;
    createPlan: Sequelize.BelongsToCreateAssociationMixin<IcoLaunchPlanInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getType: Sequelize.BelongsToGetAssociationMixin<IcoTokenTypeInstance>;
    setType: Sequelize.BelongsToSetAssociationMixin<IcoTokenTypeInstance, string>;
    createType: Sequelize.BelongsToCreateAssociationMixin<IcoTokenTypeInstance>;
  }

  // ========================================
  // IcoTokenOfferingPhase
  // ========================================

  interface IcoTokenOfferingPhaseAttributes {
    id: string;
    offeringId: string;
    name: string;
    tokenPrice: number;
    allocation: number;
    remaining: number;
    duration: number;
    sequence: number;
    startDate?: Date | null;
    endDate?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type IcoTokenOfferingPhaseCreationAttributes = Optional<IcoTokenOfferingPhaseAttributes, "id" | "startDate" | "endDate" | "createdAt" | "updatedAt">;

  interface IcoTokenOfferingPhaseInstance extends Model<IcoTokenOfferingPhaseAttributes, IcoTokenOfferingPhaseCreationAttributes>, IcoTokenOfferingPhaseAttributes {
    offering?: IcoTokenOfferingInstance;
    getOffering: Sequelize.BelongsToGetAssociationMixin<IcoTokenOfferingInstance>;
    setOffering: Sequelize.BelongsToSetAssociationMixin<IcoTokenOfferingInstance, string>;
    createOffering: Sequelize.BelongsToCreateAssociationMixin<IcoTokenOfferingInstance>;
  }

  // ========================================
  // IcoTokenOfferingUpdate
  // ========================================

  interface IcoTokenOfferingUpdateAttributes {
    id: string;
    offeringId: string;
    userId: string;
    title: string;
    content: string;
    attachments?: any | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type IcoTokenOfferingUpdateCreationAttributes = Optional<IcoTokenOfferingUpdateAttributes, "id" | "attachments" | "createdAt" | "updatedAt" | "deletedAt">;

  interface IcoTokenOfferingUpdateInstance extends Model<IcoTokenOfferingUpdateAttributes, IcoTokenOfferingUpdateCreationAttributes>, IcoTokenOfferingUpdateAttributes {
    offering?: IcoTokenOfferingInstance;
    user?: UserInstance;
    getOffering: Sequelize.BelongsToGetAssociationMixin<IcoTokenOfferingInstance>;
    setOffering: Sequelize.BelongsToSetAssociationMixin<IcoTokenOfferingInstance, string>;
    createOffering: Sequelize.BelongsToCreateAssociationMixin<IcoTokenOfferingInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // IcoTokenType
  // ========================================

  interface IcoTokenTypeAttributes {
    id: string;
    name: string;
    value: string;
    description: string;
    status: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type IcoTokenTypeCreationAttributes = Optional<IcoTokenTypeAttributes, "id" | "status" | "createdAt" | "updatedAt" | "deletedAt">;

  interface IcoTokenTypeInstance extends Model<IcoTokenTypeAttributes, IcoTokenTypeCreationAttributes>, IcoTokenTypeAttributes {
    offerings?: IcoTokenOfferingInstance[];
    getOfferings: Sequelize.HasManyGetAssociationsMixin<IcoTokenOfferingInstance>;
    setOfferings: Sequelize.HasManySetAssociationsMixin<IcoTokenOfferingInstance, string>;
    addIcoTokenOffering: Sequelize.HasManyAddAssociationMixin<IcoTokenOfferingInstance, string>;
    addOfferings: Sequelize.HasManyAddAssociationsMixin<IcoTokenOfferingInstance, string>;
    removeIcoTokenOffering: Sequelize.HasManyRemoveAssociationMixin<IcoTokenOfferingInstance, string>;
    removeOfferings: Sequelize.HasManyRemoveAssociationsMixin<IcoTokenOfferingInstance, string>;
    hasIcoTokenOffering: Sequelize.HasManyHasAssociationMixin<IcoTokenOfferingInstance, string>;
    hasOfferings: Sequelize.HasManyHasAssociationsMixin<IcoTokenOfferingInstance, string>;
    countOfferings: Sequelize.HasManyCountAssociationsMixin;
    createIcoTokenOffering: Sequelize.HasManyCreateAssociationMixin<IcoTokenOfferingInstance>;
  }

  // ========================================
  // IcoTokenVesting
  // ========================================

  interface IcoTokenVestingAttributes {
    id: string;
    transactionId: string;
    userId: string;
    offeringId: string;
    totalAmount: number;
    releasedAmount: number;
    vestingType: "LINEAR" | "CLIFF" | "MILESTONE";
    startDate: Date;
    endDate: Date;
    cliffDuration?: number | null;
    releaseSchedule?: any | null;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    createdAt?: Date;
    updatedAt?: Date;
  }

  type IcoTokenVestingCreationAttributes = Optional<IcoTokenVestingAttributes, "id" | "releasedAmount" | "vestingType" | "cliffDuration" | "releaseSchedule" | "status" | "createdAt" | "updatedAt">;

  interface IcoTokenVestingInstance extends Model<IcoTokenVestingAttributes, IcoTokenVestingCreationAttributes>, IcoTokenVestingAttributes {
    releases?: IcoTokenVestingReleaseInstance[];
    transaction?: IcoTransactionInstance;
    user?: UserInstance;
    offering?: IcoTokenOfferingInstance;
    getReleases: Sequelize.HasManyGetAssociationsMixin<IcoTokenVestingReleaseInstance>;
    setReleases: Sequelize.HasManySetAssociationsMixin<IcoTokenVestingReleaseInstance, string>;
    addIcoTokenVestingRelease: Sequelize.HasManyAddAssociationMixin<IcoTokenVestingReleaseInstance, string>;
    addReleases: Sequelize.HasManyAddAssociationsMixin<IcoTokenVestingReleaseInstance, string>;
    removeIcoTokenVestingRelease: Sequelize.HasManyRemoveAssociationMixin<IcoTokenVestingReleaseInstance, string>;
    removeReleases: Sequelize.HasManyRemoveAssociationsMixin<IcoTokenVestingReleaseInstance, string>;
    hasIcoTokenVestingRelease: Sequelize.HasManyHasAssociationMixin<IcoTokenVestingReleaseInstance, string>;
    hasReleases: Sequelize.HasManyHasAssociationsMixin<IcoTokenVestingReleaseInstance, string>;
    countReleases: Sequelize.HasManyCountAssociationsMixin;
    createIcoTokenVestingRelease: Sequelize.HasManyCreateAssociationMixin<IcoTokenVestingReleaseInstance>;
    getTransaction: Sequelize.BelongsToGetAssociationMixin<IcoTransactionInstance>;
    setTransaction: Sequelize.BelongsToSetAssociationMixin<IcoTransactionInstance, string>;
    createTransaction: Sequelize.BelongsToCreateAssociationMixin<IcoTransactionInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getOffering: Sequelize.BelongsToGetAssociationMixin<IcoTokenOfferingInstance>;
    setOffering: Sequelize.BelongsToSetAssociationMixin<IcoTokenOfferingInstance, string>;
    createOffering: Sequelize.BelongsToCreateAssociationMixin<IcoTokenOfferingInstance>;
  }

  // ========================================
  // IcoTokenVestingRelease
  // ========================================

  interface IcoTokenVestingReleaseAttributes {
    id: string;
    vestingId: string;
    releaseDate: Date;
    releaseAmount: number;
    percentage: number;
    status: "PENDING" | "RELEASED" | "FAILED" | "CANCELLED";
    transactionHash?: string | null;
    releasedAt?: Date | null;
    failureReason?: string | null;
    metadata?: any | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type IcoTokenVestingReleaseCreationAttributes = Optional<IcoTokenVestingReleaseAttributes, "id" | "status" | "transactionHash" | "releasedAt" | "failureReason" | "metadata" | "createdAt" | "updatedAt">;

  interface IcoTokenVestingReleaseInstance extends Model<IcoTokenVestingReleaseAttributes, IcoTokenVestingReleaseCreationAttributes>, IcoTokenVestingReleaseAttributes {
    vesting?: IcoTokenVestingInstance;
    getVesting: Sequelize.BelongsToGetAssociationMixin<IcoTokenVestingInstance>;
    setVesting: Sequelize.BelongsToSetAssociationMixin<IcoTokenVestingInstance, string>;
    createVesting: Sequelize.BelongsToCreateAssociationMixin<IcoTokenVestingInstance>;
  }

  // ========================================
  // IcoTransaction
  // ========================================

  interface IcoTransactionAttributes {
    id: string;
    userId: string;
    offeringId: string;
    phaseId?: string;
    amount: number;
    price: number;
    status: "PENDING" | "VERIFICATION" | "RELEASED" | "REJECTED" | "REFUNDED";
    releaseUrl?: string | null;
    walletAddress?: string | null;
    notes?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type IcoTransactionCreationAttributes = Optional<IcoTransactionAttributes, "id" | "phaseId" | "releaseUrl" | "walletAddress" | "notes" | "createdAt" | "updatedAt" | "deletedAt">;

  interface IcoTransactionInstance extends Model<IcoTransactionAttributes, IcoTransactionCreationAttributes>, IcoTransactionAttributes {
    offering?: IcoTokenOfferingInstance;
    user?: UserInstance;
    phase?: IcoTokenOfferingPhaseInstance;
    getOffering: Sequelize.BelongsToGetAssociationMixin<IcoTokenOfferingInstance>;
    setOffering: Sequelize.BelongsToSetAssociationMixin<IcoTokenOfferingInstance, string>;
    createOffering: Sequelize.BelongsToCreateAssociationMixin<IcoTokenOfferingInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getPhase: Sequelize.BelongsToGetAssociationMixin<IcoTokenOfferingPhaseInstance>;
    setPhase: Sequelize.BelongsToSetAssociationMixin<IcoTokenOfferingPhaseInstance, string>;
    createPhase: Sequelize.BelongsToCreateAssociationMixin<IcoTokenOfferingPhaseInstance>;
  }

  // ========================================
  // Investment
  // ========================================

  interface InvestmentAttributes {
    id: string;
    userId: string;
    planId: string;
    durationId: string;
    amount: number;
    profit?: number;
    result?: "WIN" | "LOSS" | "DRAW";
    status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
    endDate?: Date | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type InvestmentCreationAttributes = Optional<InvestmentAttributes, "id" | "profit" | "result" | "endDate" | "createdAt" | "deletedAt" | "updatedAt">;

  interface InvestmentInstance extends Model<InvestmentAttributes, InvestmentCreationAttributes>, InvestmentAttributes {
    plan?: InvestmentPlanInstance;
    duration?: InvestmentDurationInstance;
    user?: UserInstance;
    getPlan: Sequelize.BelongsToGetAssociationMixin<InvestmentPlanInstance>;
    setPlan: Sequelize.BelongsToSetAssociationMixin<InvestmentPlanInstance, string>;
    createPlan: Sequelize.BelongsToCreateAssociationMixin<InvestmentPlanInstance>;
    getDuration: Sequelize.BelongsToGetAssociationMixin<InvestmentDurationInstance>;
    setDuration: Sequelize.BelongsToSetAssociationMixin<InvestmentDurationInstance, string>;
    createDuration: Sequelize.BelongsToCreateAssociationMixin<InvestmentDurationInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // InvestmentDuration
  // ========================================

  interface InvestmentDurationAttributes {
    id: string;
    duration: number;
    timeframe: "HOUR" | "DAY" | "WEEK" | "MONTH";
  }

  type InvestmentDurationCreationAttributes = Optional<InvestmentDurationAttributes, "id">;

  interface InvestmentDurationInstance extends Model<InvestmentDurationAttributes, InvestmentDurationCreationAttributes>, InvestmentDurationAttributes {
    investments?: InvestmentInstance[];
    investmentPlanDurations?: InvestmentPlanDurationInstance[];
    plans?: InvestmentPlanInstance[];
    getInvestments: Sequelize.HasManyGetAssociationsMixin<InvestmentInstance>;
    setInvestments: Sequelize.HasManySetAssociationsMixin<InvestmentInstance, string>;
    addInvestment: Sequelize.HasManyAddAssociationMixin<InvestmentInstance, string>;
    addInvestments: Sequelize.HasManyAddAssociationsMixin<InvestmentInstance, string>;
    removeInvestment: Sequelize.HasManyRemoveAssociationMixin<InvestmentInstance, string>;
    removeInvestments: Sequelize.HasManyRemoveAssociationsMixin<InvestmentInstance, string>;
    hasInvestment: Sequelize.HasManyHasAssociationMixin<InvestmentInstance, string>;
    hasInvestments: Sequelize.HasManyHasAssociationsMixin<InvestmentInstance, string>;
    countInvestments: Sequelize.HasManyCountAssociationsMixin;
    createInvestment: Sequelize.HasManyCreateAssociationMixin<InvestmentInstance>;
    getInvestmentPlanDurations: Sequelize.HasManyGetAssociationsMixin<InvestmentPlanDurationInstance>;
    setInvestmentPlanDurations: Sequelize.HasManySetAssociationsMixin<InvestmentPlanDurationInstance, string>;
    addInvestmentPlanDuration: Sequelize.HasManyAddAssociationMixin<InvestmentPlanDurationInstance, string>;
    addInvestmentPlanDurations: Sequelize.HasManyAddAssociationsMixin<InvestmentPlanDurationInstance, string>;
    removeInvestmentPlanDuration: Sequelize.HasManyRemoveAssociationMixin<InvestmentPlanDurationInstance, string>;
    removeInvestmentPlanDurations: Sequelize.HasManyRemoveAssociationsMixin<InvestmentPlanDurationInstance, string>;
    hasInvestmentPlanDuration: Sequelize.HasManyHasAssociationMixin<InvestmentPlanDurationInstance, string>;
    hasInvestmentPlanDurations: Sequelize.HasManyHasAssociationsMixin<InvestmentPlanDurationInstance, string>;
    countInvestmentPlanDurations: Sequelize.HasManyCountAssociationsMixin;
    createInvestmentPlanDuration: Sequelize.HasManyCreateAssociationMixin<InvestmentPlanDurationInstance>;
    getPlans: Sequelize.BelongsToManyGetAssociationsMixin<InvestmentPlanInstance>;
    setPlans: Sequelize.BelongsToManySetAssociationsMixin<InvestmentPlanInstance, string>;
    addInvestmentPlan: Sequelize.BelongsToManyAddAssociationMixin<InvestmentPlanInstance, string>;
    addPlans: Sequelize.BelongsToManyAddAssociationsMixin<InvestmentPlanInstance, string>;
    removeInvestmentPlan: Sequelize.BelongsToManyRemoveAssociationMixin<InvestmentPlanInstance, string>;
    removePlans: Sequelize.BelongsToManyRemoveAssociationsMixin<InvestmentPlanInstance, string>;
    hasInvestmentPlan: Sequelize.BelongsToManyHasAssociationMixin<InvestmentPlanInstance, string>;
    hasPlans: Sequelize.BelongsToManyHasAssociationsMixin<InvestmentPlanInstance, string>;
    countPlans: Sequelize.BelongsToManyCountAssociationsMixin;
    createInvestmentPlan: Sequelize.BelongsToManyCreateAssociationMixin<InvestmentPlanInstance>;
  }

  // ========================================
  // InvestmentPlan
  // ========================================

  interface InvestmentPlanAttributes {
    id: string;
    name: string;
    title: string;
    image?: string;
    description: string;
    currency: string;
    walletType: string;
    minAmount: number;
    maxAmount: number;
    profitPercentage: number;
    invested: number;
    minProfit: number;
    maxProfit: number;
    defaultProfit: number;
    defaultResult: "WIN" | "LOSS" | "DRAW";
    trending?: boolean;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type InvestmentPlanCreationAttributes = Optional<InvestmentPlanAttributes, "id" | "image" | "trending" | "createdAt" | "deletedAt" | "updatedAt">;

  interface InvestmentPlanInstance extends Model<InvestmentPlanAttributes, InvestmentPlanCreationAttributes>, InvestmentPlanAttributes {
    investments?: InvestmentInstance[];
    planDurations?: InvestmentPlanDurationInstance[];
    durations?: InvestmentDurationInstance[];
    getInvestments: Sequelize.HasManyGetAssociationsMixin<InvestmentInstance>;
    setInvestments: Sequelize.HasManySetAssociationsMixin<InvestmentInstance, string>;
    addInvestment: Sequelize.HasManyAddAssociationMixin<InvestmentInstance, string>;
    addInvestments: Sequelize.HasManyAddAssociationsMixin<InvestmentInstance, string>;
    removeInvestment: Sequelize.HasManyRemoveAssociationMixin<InvestmentInstance, string>;
    removeInvestments: Sequelize.HasManyRemoveAssociationsMixin<InvestmentInstance, string>;
    hasInvestment: Sequelize.HasManyHasAssociationMixin<InvestmentInstance, string>;
    hasInvestments: Sequelize.HasManyHasAssociationsMixin<InvestmentInstance, string>;
    countInvestments: Sequelize.HasManyCountAssociationsMixin;
    createInvestment: Sequelize.HasManyCreateAssociationMixin<InvestmentInstance>;
    getPlanDurations: Sequelize.HasManyGetAssociationsMixin<InvestmentPlanDurationInstance>;
    setPlanDurations: Sequelize.HasManySetAssociationsMixin<InvestmentPlanDurationInstance, string>;
    addInvestmentPlanDuration: Sequelize.HasManyAddAssociationMixin<InvestmentPlanDurationInstance, string>;
    addPlanDurations: Sequelize.HasManyAddAssociationsMixin<InvestmentPlanDurationInstance, string>;
    removeInvestmentPlanDuration: Sequelize.HasManyRemoveAssociationMixin<InvestmentPlanDurationInstance, string>;
    removePlanDurations: Sequelize.HasManyRemoveAssociationsMixin<InvestmentPlanDurationInstance, string>;
    hasInvestmentPlanDuration: Sequelize.HasManyHasAssociationMixin<InvestmentPlanDurationInstance, string>;
    hasPlanDurations: Sequelize.HasManyHasAssociationsMixin<InvestmentPlanDurationInstance, string>;
    countPlanDurations: Sequelize.HasManyCountAssociationsMixin;
    createInvestmentPlanDuration: Sequelize.HasManyCreateAssociationMixin<InvestmentPlanDurationInstance>;
    getDurations: Sequelize.BelongsToManyGetAssociationsMixin<InvestmentDurationInstance>;
    setDurations: Sequelize.BelongsToManySetAssociationsMixin<InvestmentDurationInstance, string>;
    addInvestmentDuration: Sequelize.BelongsToManyAddAssociationMixin<InvestmentDurationInstance, string>;
    addDurations: Sequelize.BelongsToManyAddAssociationsMixin<InvestmentDurationInstance, string>;
    removeInvestmentDuration: Sequelize.BelongsToManyRemoveAssociationMixin<InvestmentDurationInstance, string>;
    removeDurations: Sequelize.BelongsToManyRemoveAssociationsMixin<InvestmentDurationInstance, string>;
    hasInvestmentDuration: Sequelize.BelongsToManyHasAssociationMixin<InvestmentDurationInstance, string>;
    hasDurations: Sequelize.BelongsToManyHasAssociationsMixin<InvestmentDurationInstance, string>;
    countDurations: Sequelize.BelongsToManyCountAssociationsMixin;
    createInvestmentDuration: Sequelize.BelongsToManyCreateAssociationMixin<InvestmentDurationInstance>;
  }

  // ========================================
  // InvestmentPlanDuration
  // ========================================

  interface InvestmentPlanDurationAttributes {
    id: string;
    planId: string;
    durationId: string;
  }

  type InvestmentPlanDurationCreationAttributes = Optional<InvestmentPlanDurationAttributes, "id">;

  interface InvestmentPlanDurationInstance extends Model<InvestmentPlanDurationAttributes, InvestmentPlanDurationCreationAttributes>, InvestmentPlanDurationAttributes {
    duration?: InvestmentDurationInstance;
    plan?: InvestmentPlanInstance;
    getDuration: Sequelize.BelongsToGetAssociationMixin<InvestmentDurationInstance>;
    setDuration: Sequelize.BelongsToSetAssociationMixin<InvestmentDurationInstance, string>;
    createDuration: Sequelize.BelongsToCreateAssociationMixin<InvestmentDurationInstance>;
    getPlan: Sequelize.BelongsToGetAssociationMixin<InvestmentPlanInstance>;
    setPlan: Sequelize.BelongsToSetAssociationMixin<InvestmentPlanInstance, string>;
    createPlan: Sequelize.BelongsToCreateAssociationMixin<InvestmentPlanInstance>;
  }

  // ========================================
  // KycApplication
  // ========================================

  interface KycApplicationAttributes {
    id: string;
    userId: string;
    levelId: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED";
    data: any;
    adminNotes?: string | null;
    reviewedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type KycApplicationCreationAttributes = Optional<KycApplicationAttributes, "id" | "adminNotes" | "reviewedAt" | "createdAt" | "updatedAt" | "deletedAt">;

  interface KycApplicationInstance extends Model<KycApplicationAttributes, KycApplicationCreationAttributes>, KycApplicationAttributes {
    verificationResult?: KycVerificationResultInstance;
    level?: KycLevelInstance;
    user?: UserInstance;
    getVerificationResult: Sequelize.HasOneGetAssociationMixin<KycVerificationResultInstance>;
    setVerificationResult: Sequelize.HasOneSetAssociationMixin<KycVerificationResultInstance, string>;
    createVerificationResult: Sequelize.HasOneCreateAssociationMixin<KycVerificationResultInstance>;
    getLevel: Sequelize.BelongsToGetAssociationMixin<KycLevelInstance>;
    setLevel: Sequelize.BelongsToSetAssociationMixin<KycLevelInstance, string>;
    createLevel: Sequelize.BelongsToCreateAssociationMixin<KycLevelInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // KycLevel
  // ========================================

  interface KycLevelAttributes {
    id: string;
    serviceId?: string | null;
    name: string;
    description?: string | null;
    level: number;
    fields?: any | null;
    features?: any | null;
    status: "ACTIVE" | "DRAFT" | "INACTIVE";
    createdAt?: Date;
    updatedAt?: Date;
  }

  type KycLevelCreationAttributes = Optional<KycLevelAttributes, "id" | "serviceId" | "description" | "fields" | "features" | "createdAt" | "updatedAt">;

  interface KycLevelInstance extends Model<KycLevelAttributes, KycLevelCreationAttributes>, KycLevelAttributes {
    applications?: KycApplicationInstance[];
    verificationService?: KycVerificationServiceInstance;
    getApplications: Sequelize.HasManyGetAssociationsMixin<KycApplicationInstance>;
    setApplications: Sequelize.HasManySetAssociationsMixin<KycApplicationInstance, string>;
    addKycApplication: Sequelize.HasManyAddAssociationMixin<KycApplicationInstance, string>;
    addApplications: Sequelize.HasManyAddAssociationsMixin<KycApplicationInstance, string>;
    removeKycApplication: Sequelize.HasManyRemoveAssociationMixin<KycApplicationInstance, string>;
    removeApplications: Sequelize.HasManyRemoveAssociationsMixin<KycApplicationInstance, string>;
    hasKycApplication: Sequelize.HasManyHasAssociationMixin<KycApplicationInstance, string>;
    hasApplications: Sequelize.HasManyHasAssociationsMixin<KycApplicationInstance, string>;
    countApplications: Sequelize.HasManyCountAssociationsMixin;
    createKycApplication: Sequelize.HasManyCreateAssociationMixin<KycApplicationInstance>;
    getVerificationService: Sequelize.BelongsToGetAssociationMixin<KycVerificationServiceInstance>;
    setVerificationService: Sequelize.BelongsToSetAssociationMixin<KycVerificationServiceInstance, string>;
    createVerificationService: Sequelize.BelongsToCreateAssociationMixin<KycVerificationServiceInstance>;
  }

  // ========================================
  // KycVerificationResult
  // ========================================

  interface KycVerificationResultAttributes {
    id: string;
    applicationId: string;
    serviceId: string;
    status: "VERIFIED" | "FAILED" | "PENDING" | "NOT_STARTED";
    score?: number;
    checks?: any | null;
    documentVerifications?: any | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type KycVerificationResultCreationAttributes = Optional<KycVerificationResultAttributes, "id" | "score" | "checks" | "documentVerifications" | "createdAt" | "updatedAt">;

  interface KycVerificationResultInstance extends Model<KycVerificationResultAttributes, KycVerificationResultCreationAttributes>, KycVerificationResultAttributes {
    application?: KycApplicationInstance;
    service?: KycVerificationServiceInstance;
    getApplication: Sequelize.BelongsToGetAssociationMixin<KycApplicationInstance>;
    setApplication: Sequelize.BelongsToSetAssociationMixin<KycApplicationInstance, string>;
    createApplication: Sequelize.BelongsToCreateAssociationMixin<KycApplicationInstance>;
    getService: Sequelize.BelongsToGetAssociationMixin<KycVerificationServiceInstance>;
    setService: Sequelize.BelongsToSetAssociationMixin<KycVerificationServiceInstance, string>;
    createService: Sequelize.BelongsToCreateAssociationMixin<KycVerificationServiceInstance>;
  }

  // ========================================
  // KycVerificationService
  // ========================================

  interface KycVerificationServiceAttributes {
    id: string;
    name: string;
    description: string;
    type: string;
    integrationDetails: any;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type KycVerificationServiceCreationAttributes = Optional<KycVerificationServiceAttributes, "id" | "createdAt" | "updatedAt">;

  interface KycVerificationServiceInstance extends Model<KycVerificationServiceAttributes, KycVerificationServiceCreationAttributes>, KycVerificationServiceAttributes {
    verificationResults?: KycVerificationResultInstance[];
    levels?: KycLevelInstance[];
    getVerificationResults: Sequelize.HasManyGetAssociationsMixin<KycVerificationResultInstance>;
    setVerificationResults: Sequelize.HasManySetAssociationsMixin<KycVerificationResultInstance, string>;
    addKycVerificationResult: Sequelize.HasManyAddAssociationMixin<KycVerificationResultInstance, string>;
    addVerificationResults: Sequelize.HasManyAddAssociationsMixin<KycVerificationResultInstance, string>;
    removeKycVerificationResult: Sequelize.HasManyRemoveAssociationMixin<KycVerificationResultInstance, string>;
    removeVerificationResults: Sequelize.HasManyRemoveAssociationsMixin<KycVerificationResultInstance, string>;
    hasKycVerificationResult: Sequelize.HasManyHasAssociationMixin<KycVerificationResultInstance, string>;
    hasVerificationResults: Sequelize.HasManyHasAssociationsMixin<KycVerificationResultInstance, string>;
    countVerificationResults: Sequelize.HasManyCountAssociationsMixin;
    createKycVerificationResult: Sequelize.HasManyCreateAssociationMixin<KycVerificationResultInstance>;
    getLevels: Sequelize.HasManyGetAssociationsMixin<KycLevelInstance>;
    setLevels: Sequelize.HasManySetAssociationsMixin<KycLevelInstance, string>;
    addKycLevel: Sequelize.HasManyAddAssociationMixin<KycLevelInstance, string>;
    addLevels: Sequelize.HasManyAddAssociationsMixin<KycLevelInstance, string>;
    removeKycLevel: Sequelize.HasManyRemoveAssociationMixin<KycLevelInstance, string>;
    removeLevels: Sequelize.HasManyRemoveAssociationsMixin<KycLevelInstance, string>;
    hasKycLevel: Sequelize.HasManyHasAssociationMixin<KycLevelInstance, string>;
    hasLevels: Sequelize.HasManyHasAssociationsMixin<KycLevelInstance, string>;
    countLevels: Sequelize.HasManyCountAssociationsMixin;
    createKycLevel: Sequelize.HasManyCreateAssociationMixin<KycLevelInstance>;
  }

  // ========================================
  // MailwizardBlock
  // ========================================

  interface MailwizardBlockAttributes {
    id: string;
    name: string;
    design: string;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type MailwizardBlockCreationAttributes = Optional<MailwizardBlockAttributes, "id" | "createdAt" | "deletedAt" | "updatedAt">;

  interface MailwizardBlockInstance extends Model<MailwizardBlockAttributes, MailwizardBlockCreationAttributes>, MailwizardBlockAttributes {
  }

  // ========================================
  // MailwizardCampaign
  // ========================================

  interface MailwizardCampaignAttributes {
    id: string;
    name: string;
    subject: string;
    status: | "PENDING"
    | "PAUSED"
    | "ACTIVE"
    | "STOPPED"
    | "COMPLETED"
    | "CANCELLED";
    speed: number;
    targets?: string | null;
    templateId: string;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type MailwizardCampaignCreationAttributes = Optional<MailwizardCampaignAttributes, "id" | "targets" | "createdAt" | "deletedAt" | "updatedAt">;

  interface MailwizardCampaignInstance extends Model<MailwizardCampaignAttributes, MailwizardCampaignCreationAttributes>, MailwizardCampaignAttributes {
    template?: MailwizardTemplateInstance;
    getTemplate: Sequelize.BelongsToGetAssociationMixin<MailwizardTemplateInstance>;
    setTemplate: Sequelize.BelongsToSetAssociationMixin<MailwizardTemplateInstance, string>;
    createTemplate: Sequelize.BelongsToCreateAssociationMixin<MailwizardTemplateInstance>;
  }

  // ========================================
  // MailwizardTemplate
  // ========================================

  interface MailwizardTemplateAttributes {
    id: string;
    name: string;
    content: string;
    design: string;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type MailwizardTemplateCreationAttributes = Optional<MailwizardTemplateAttributes, "id" | "createdAt" | "deletedAt" | "updatedAt">;

  interface MailwizardTemplateInstance extends Model<MailwizardTemplateAttributes, MailwizardTemplateCreationAttributes>, MailwizardTemplateAttributes {
    mailwizardCampaigns?: MailwizardCampaignInstance[];
    getMailwizardCampaigns: Sequelize.HasManyGetAssociationsMixin<MailwizardCampaignInstance>;
    setMailwizardCampaigns: Sequelize.HasManySetAssociationsMixin<MailwizardCampaignInstance, string>;
    addMailwizardCampaign: Sequelize.HasManyAddAssociationMixin<MailwizardCampaignInstance, string>;
    addMailwizardCampaigns: Sequelize.HasManyAddAssociationsMixin<MailwizardCampaignInstance, string>;
    removeMailwizardCampaign: Sequelize.HasManyRemoveAssociationMixin<MailwizardCampaignInstance, string>;
    removeMailwizardCampaigns: Sequelize.HasManyRemoveAssociationsMixin<MailwizardCampaignInstance, string>;
    hasMailwizardCampaign: Sequelize.HasManyHasAssociationMixin<MailwizardCampaignInstance, string>;
    hasMailwizardCampaigns: Sequelize.HasManyHasAssociationsMixin<MailwizardCampaignInstance, string>;
    countMailwizardCampaigns: Sequelize.HasManyCountAssociationsMixin;
    createMailwizardCampaign: Sequelize.HasManyCreateAssociationMixin<MailwizardCampaignInstance>;
  }

  // ========================================
  // MlmBinaryNode
  // ========================================

  interface MlmBinaryNodeAttributes {
    id: string;
    referralId: string;
    parentId?: string;
    leftChildId?: string;
    rightChildId?: string;
  }

  type MlmBinaryNodeCreationAttributes = Optional<MlmBinaryNodeAttributes, "id" | "parentId" | "leftChildId" | "rightChildId">;

  interface MlmBinaryNodeInstance extends Model<MlmBinaryNodeAttributes, MlmBinaryNodeCreationAttributes>, MlmBinaryNodeAttributes {
    nodes?: MlmBinaryNodeInstance[];
    leftChildBinaryNodes?: MlmBinaryNodeInstance[];
    rightChildBinaryNodes?: MlmBinaryNodeInstance[];
    parent?: MlmBinaryNodeInstance;
    leftChild?: MlmBinaryNodeInstance;
    rightChild?: MlmBinaryNodeInstance;
    referral?: MlmReferralInstance;
    getNodes: Sequelize.HasManyGetAssociationsMixin<MlmBinaryNodeInstance>;
    setNodes: Sequelize.HasManySetAssociationsMixin<MlmBinaryNodeInstance, string>;
    addMlmBinaryNode: Sequelize.HasManyAddAssociationMixin<MlmBinaryNodeInstance, string>;
    addNodes: Sequelize.HasManyAddAssociationsMixin<MlmBinaryNodeInstance, string>;
    removeMlmBinaryNode: Sequelize.HasManyRemoveAssociationMixin<MlmBinaryNodeInstance, string>;
    removeNodes: Sequelize.HasManyRemoveAssociationsMixin<MlmBinaryNodeInstance, string>;
    hasMlmBinaryNode: Sequelize.HasManyHasAssociationMixin<MlmBinaryNodeInstance, string>;
    hasNodes: Sequelize.HasManyHasAssociationsMixin<MlmBinaryNodeInstance, string>;
    countNodes: Sequelize.HasManyCountAssociationsMixin;
    createMlmBinaryNode: Sequelize.HasManyCreateAssociationMixin<MlmBinaryNodeInstance>;
    getLeftChildBinaryNodes: Sequelize.HasManyGetAssociationsMixin<MlmBinaryNodeInstance>;
    setLeftChildBinaryNodes: Sequelize.HasManySetAssociationsMixin<MlmBinaryNodeInstance, string>;
    addLeftChildBinaryNodes: Sequelize.HasManyAddAssociationsMixin<MlmBinaryNodeInstance, string>;
    removeLeftChildBinaryNodes: Sequelize.HasManyRemoveAssociationsMixin<MlmBinaryNodeInstance, string>;
    hasLeftChildBinaryNodes: Sequelize.HasManyHasAssociationsMixin<MlmBinaryNodeInstance, string>;
    countLeftChildBinaryNodes: Sequelize.HasManyCountAssociationsMixin;
    getRightChildBinaryNodes: Sequelize.HasManyGetAssociationsMixin<MlmBinaryNodeInstance>;
    setRightChildBinaryNodes: Sequelize.HasManySetAssociationsMixin<MlmBinaryNodeInstance, string>;
    addRightChildBinaryNodes: Sequelize.HasManyAddAssociationsMixin<MlmBinaryNodeInstance, string>;
    removeRightChildBinaryNodes: Sequelize.HasManyRemoveAssociationsMixin<MlmBinaryNodeInstance, string>;
    hasRightChildBinaryNodes: Sequelize.HasManyHasAssociationsMixin<MlmBinaryNodeInstance, string>;
    countRightChildBinaryNodes: Sequelize.HasManyCountAssociationsMixin;
    getParent: Sequelize.BelongsToGetAssociationMixin<MlmBinaryNodeInstance>;
    setParent: Sequelize.BelongsToSetAssociationMixin<MlmBinaryNodeInstance, string>;
    createParent: Sequelize.BelongsToCreateAssociationMixin<MlmBinaryNodeInstance>;
    getLeftChild: Sequelize.BelongsToGetAssociationMixin<MlmBinaryNodeInstance>;
    setLeftChild: Sequelize.BelongsToSetAssociationMixin<MlmBinaryNodeInstance, string>;
    createLeftChild: Sequelize.BelongsToCreateAssociationMixin<MlmBinaryNodeInstance>;
    getRightChild: Sequelize.BelongsToGetAssociationMixin<MlmBinaryNodeInstance>;
    setRightChild: Sequelize.BelongsToSetAssociationMixin<MlmBinaryNodeInstance, string>;
    createRightChild: Sequelize.BelongsToCreateAssociationMixin<MlmBinaryNodeInstance>;
    getReferral: Sequelize.BelongsToGetAssociationMixin<MlmReferralInstance>;
    setReferral: Sequelize.BelongsToSetAssociationMixin<MlmReferralInstance, string>;
    createReferral: Sequelize.BelongsToCreateAssociationMixin<MlmReferralInstance>;
  }

  // ========================================
  // MlmReferral
  // ========================================

  interface MlmReferralAttributes {
    id: string;
    status: "PENDING" | "ACTIVE" | "REJECTED";
    referrerId: string;
    referredId: string;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type MlmReferralCreationAttributes = Optional<MlmReferralAttributes, "id" | "createdAt" | "deletedAt" | "updatedAt">;

  interface MlmReferralInstance extends Model<MlmReferralAttributes, MlmReferralCreationAttributes>, MlmReferralAttributes {
    unilevelNode?: MlmUnilevelNodeInstance;
    node?: MlmBinaryNodeInstance;
    referrer?: UserInstance;
    referred?: UserInstance;
    getUnilevelNode: Sequelize.HasOneGetAssociationMixin<MlmUnilevelNodeInstance>;
    setUnilevelNode: Sequelize.HasOneSetAssociationMixin<MlmUnilevelNodeInstance, string>;
    createUnilevelNode: Sequelize.HasOneCreateAssociationMixin<MlmUnilevelNodeInstance>;
    getNode: Sequelize.HasOneGetAssociationMixin<MlmBinaryNodeInstance>;
    setNode: Sequelize.HasOneSetAssociationMixin<MlmBinaryNodeInstance, string>;
    createNode: Sequelize.HasOneCreateAssociationMixin<MlmBinaryNodeInstance>;
    getReferrer: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setReferrer: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createReferrer: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getReferred: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setReferred: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createReferred: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // MlmReferralCondition
  // ========================================

  interface MlmReferralConditionAttributes {
    id: string;
    name: string;
    title: string;
    description: string;
    type: | "DEPOSIT"
    | "TRADE"
    | "SPOT_TRADE"
    | "BINARY_WIN"
    | "INVESTMENT"
    | "AI_INVESTMENT"
    | "FOREX_INVESTMENT"
    | "ICO_CONTRIBUTION"
    | "STAKING"
    | "ECOMMERCE_PURCHASE"
    | "P2P_TRADE"
    | "NFT_TRADE"
    | "COPY_TRADING"
    | "FUTURES_TRADE"
    | "TOKEN_PURCHASE";
    reward: number;
    rewardType: "PERCENTAGE" | "FIXED";
    rewardWalletType: "FIAT" | "SPOT" | "ECO";
    rewardCurrency: string;
    rewardChain?: string | null;
    image?: string | null;
    minAmount: number;
    status: boolean;
  }

  type MlmReferralConditionCreationAttributes = Optional<MlmReferralConditionAttributes, "id" | "rewardChain" | "image">;

  interface MlmReferralConditionInstance extends Model<MlmReferralConditionAttributes, MlmReferralConditionCreationAttributes>, MlmReferralConditionAttributes {
    referralRewards?: MlmReferralRewardInstance[];
    getReferralRewards: Sequelize.HasManyGetAssociationsMixin<MlmReferralRewardInstance>;
    setReferralRewards: Sequelize.HasManySetAssociationsMixin<MlmReferralRewardInstance, string>;
    addMlmReferralReward: Sequelize.HasManyAddAssociationMixin<MlmReferralRewardInstance, string>;
    addReferralRewards: Sequelize.HasManyAddAssociationsMixin<MlmReferralRewardInstance, string>;
    removeMlmReferralReward: Sequelize.HasManyRemoveAssociationMixin<MlmReferralRewardInstance, string>;
    removeReferralRewards: Sequelize.HasManyRemoveAssociationsMixin<MlmReferralRewardInstance, string>;
    hasMlmReferralReward: Sequelize.HasManyHasAssociationMixin<MlmReferralRewardInstance, string>;
    hasReferralRewards: Sequelize.HasManyHasAssociationsMixin<MlmReferralRewardInstance, string>;
    countReferralRewards: Sequelize.HasManyCountAssociationsMixin;
    createMlmReferralReward: Sequelize.HasManyCreateAssociationMixin<MlmReferralRewardInstance>;
  }

  // ========================================
  // MlmReferralReward
  // ========================================

  interface MlmReferralRewardAttributes {
    id: string;
    reward: number;
    isClaimed: boolean;
    conditionId: string;
    referrerId: string;
    sourceId?: string | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type MlmReferralRewardCreationAttributes = Optional<MlmReferralRewardAttributes, "id" | "isClaimed" | "sourceId" | "createdAt" | "deletedAt" | "updatedAt">;

  interface MlmReferralRewardInstance extends Model<MlmReferralRewardAttributes, MlmReferralRewardCreationAttributes>, MlmReferralRewardAttributes {
    condition?: MlmReferralConditionInstance;
    referrer?: UserInstance;
    getCondition: Sequelize.BelongsToGetAssociationMixin<MlmReferralConditionInstance>;
    setCondition: Sequelize.BelongsToSetAssociationMixin<MlmReferralConditionInstance, string>;
    createCondition: Sequelize.BelongsToCreateAssociationMixin<MlmReferralConditionInstance>;
    getReferrer: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setReferrer: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createReferrer: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // MlmUnilevelNode
  // ========================================

  interface MlmUnilevelNodeAttributes {
    id: string;
    referralId: string;
    parentId: string | null;
  }

  type MlmUnilevelNodeCreationAttributes = Optional<MlmUnilevelNodeAttributes, "id" | "parentId">;

  interface MlmUnilevelNodeInstance extends Model<MlmUnilevelNodeAttributes, MlmUnilevelNodeCreationAttributes>, MlmUnilevelNodeAttributes {
    unilevelNodes?: MlmUnilevelNodeInstance[];
    parent?: MlmUnilevelNodeInstance;
    referral?: MlmReferralInstance;
    getUnilevelNodes: Sequelize.HasManyGetAssociationsMixin<MlmUnilevelNodeInstance>;
    setUnilevelNodes: Sequelize.HasManySetAssociationsMixin<MlmUnilevelNodeInstance, string>;
    addMlmUnilevelNode: Sequelize.HasManyAddAssociationMixin<MlmUnilevelNodeInstance, string>;
    addUnilevelNodes: Sequelize.HasManyAddAssociationsMixin<MlmUnilevelNodeInstance, string>;
    removeMlmUnilevelNode: Sequelize.HasManyRemoveAssociationMixin<MlmUnilevelNodeInstance, string>;
    removeUnilevelNodes: Sequelize.HasManyRemoveAssociationsMixin<MlmUnilevelNodeInstance, string>;
    hasMlmUnilevelNode: Sequelize.HasManyHasAssociationMixin<MlmUnilevelNodeInstance, string>;
    hasUnilevelNodes: Sequelize.HasManyHasAssociationsMixin<MlmUnilevelNodeInstance, string>;
    countUnilevelNodes: Sequelize.HasManyCountAssociationsMixin;
    createMlmUnilevelNode: Sequelize.HasManyCreateAssociationMixin<MlmUnilevelNodeInstance>;
    getParent: Sequelize.BelongsToGetAssociationMixin<MlmUnilevelNodeInstance>;
    setParent: Sequelize.BelongsToSetAssociationMixin<MlmUnilevelNodeInstance, string>;
    createParent: Sequelize.BelongsToCreateAssociationMixin<MlmUnilevelNodeInstance>;
    getReferral: Sequelize.BelongsToGetAssociationMixin<MlmReferralInstance>;
    setReferral: Sequelize.BelongsToSetAssociationMixin<MlmReferralInstance, string>;
    createReferral: Sequelize.BelongsToCreateAssociationMixin<MlmReferralInstance>;
  }

  // ========================================
  // NftActivity
  // ========================================

  interface NftActivityAttributes {
    id: string;
    type: "MINT" | "TRANSFER" | "SALE" | "LIST" | "DELIST" | "BID" | "OFFER" | "BURN" | "COLLECTION_CREATED" | "COLLECTION_DEPLOYED" | "AUCTION_ENDED";
    tokenId?: string;
    collectionId?: string;
    listingId?: string;
    offerId?: string;
    bidId?: string;
    fromUserId?: string;
    toUserId?: string;
    price?: number;
    currency?: string | null;
    transactionHash?: string;
    blockNumber?: number;
    metadata?: any | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftActivityCreationAttributes = Optional<NftActivityAttributes, "id" | "tokenId" | "collectionId" | "listingId" | "offerId" | "bidId" | "fromUserId" | "toUserId" | "price" | "currency" | "transactionHash" | "blockNumber" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

  interface NftActivityInstance extends Model<NftActivityAttributes, NftActivityCreationAttributes>, NftActivityAttributes {
    token?: NftTokenInstance;
    collection?: NftCollectionInstance;
    listing?: NftListingInstance;
    offer?: NftOfferInstance;
    bid?: NftBidInstance;
    fromUser?: UserInstance;
    toUser?: UserInstance;
    getToken: Sequelize.BelongsToGetAssociationMixin<NftTokenInstance>;
    setToken: Sequelize.BelongsToSetAssociationMixin<NftTokenInstance, string>;
    createToken: Sequelize.BelongsToCreateAssociationMixin<NftTokenInstance>;
    getCollection: Sequelize.BelongsToGetAssociationMixin<NftCollectionInstance>;
    setCollection: Sequelize.BelongsToSetAssociationMixin<NftCollectionInstance, string>;
    createCollection: Sequelize.BelongsToCreateAssociationMixin<NftCollectionInstance>;
    getListing: Sequelize.BelongsToGetAssociationMixin<NftListingInstance>;
    setListing: Sequelize.BelongsToSetAssociationMixin<NftListingInstance, string>;
    createListing: Sequelize.BelongsToCreateAssociationMixin<NftListingInstance>;
    getOffer: Sequelize.BelongsToGetAssociationMixin<NftOfferInstance>;
    setOffer: Sequelize.BelongsToSetAssociationMixin<NftOfferInstance, string>;
    createOffer: Sequelize.BelongsToCreateAssociationMixin<NftOfferInstance>;
    getBid: Sequelize.BelongsToGetAssociationMixin<NftBidInstance>;
    setBid: Sequelize.BelongsToSetAssociationMixin<NftBidInstance, string>;
    createBid: Sequelize.BelongsToCreateAssociationMixin<NftBidInstance>;
    getFromUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setFromUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createFromUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getToUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setToUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createToUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NftBid
  // ========================================

  interface NftBidAttributes {
    id: string;
    listingId: string;
    tokenId?: string;
    userId: string;
    amount: number;
    currency: string;
    transactionHash?: string | null;
    expiresAt?: Date | null;
    status: "ACTIVE" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED" | "OUTBID";
    acceptedAt?: Date | null;
    rejectedAt?: Date | null;
    outbidAt?: Date | null;
    cancelledAt?: Date | null;
    metadata?: any | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftBidCreationAttributes = Optional<NftBidAttributes, "id" | "tokenId" | "transactionHash" | "expiresAt" | "acceptedAt" | "rejectedAt" | "outbidAt" | "cancelledAt" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

  interface NftBidInstance extends Model<NftBidAttributes, NftBidCreationAttributes>, NftBidAttributes {
    listing?: NftListingInstance;
    user?: UserInstance;
    token?: NftTokenInstance;
    getListing: Sequelize.BelongsToGetAssociationMixin<NftListingInstance>;
    setListing: Sequelize.BelongsToSetAssociationMixin<NftListingInstance, string>;
    createListing: Sequelize.BelongsToCreateAssociationMixin<NftListingInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getToken: Sequelize.BelongsToGetAssociationMixin<NftTokenInstance>;
    setToken: Sequelize.BelongsToSetAssociationMixin<NftTokenInstance, string>;
    createToken: Sequelize.BelongsToCreateAssociationMixin<NftTokenInstance>;
    // Instance methods
    bidderId: string;
  }

  // ========================================
  // NftCategory
  // ========================================

  interface NftCategoryAttributes {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    image?: string;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftCategoryCreationAttributes = Optional<NftCategoryAttributes, "id" | "description" | "image" | "createdAt" | "deletedAt" | "updatedAt">;

  interface NftCategoryInstance extends Model<NftCategoryAttributes, NftCategoryCreationAttributes>, NftCategoryAttributes {
    collections?: NftCollectionInstance[];
    getCollections: Sequelize.HasManyGetAssociationsMixin<NftCollectionInstance>;
    setCollections: Sequelize.HasManySetAssociationsMixin<NftCollectionInstance, string>;
    addNftCollection: Sequelize.HasManyAddAssociationMixin<NftCollectionInstance, string>;
    addCollections: Sequelize.HasManyAddAssociationsMixin<NftCollectionInstance, string>;
    removeNftCollection: Sequelize.HasManyRemoveAssociationMixin<NftCollectionInstance, string>;
    removeCollections: Sequelize.HasManyRemoveAssociationsMixin<NftCollectionInstance, string>;
    hasNftCollection: Sequelize.HasManyHasAssociationMixin<NftCollectionInstance, string>;
    hasCollections: Sequelize.HasManyHasAssociationsMixin<NftCollectionInstance, string>;
    countCollections: Sequelize.HasManyCountAssociationsMixin;
    createNftCollection: Sequelize.HasManyCreateAssociationMixin<NftCollectionInstance>;
  }

  // ========================================
  // NftCollection
  // ========================================

  interface NftCollectionAttributes {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    symbol: string;
    contractAddress?: string;
    chain: string;
    network: string;
    standard: "ERC721" | "ERC1155";
    totalSupply?: number;
    maxSupply?: number;
    mintPrice?: number;
    currency?: string | null;
    royaltyPercentage?: number;
    royaltyAddress?: string;
    creatorId: string;
    categoryId?: string | null;
    bannerImage?: string;
    logoImage?: string;
    featuredImage?: string;
    website?: string;
    discord?: string;
    twitter?: string;
    telegram?: string;
    isVerified?: boolean;
    isLazyMinted?: boolean;
    isPublicMintEnabled?: boolean;
    status: "DRAFT" | "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
    metadata?: any | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftCollectionCreationAttributes = Optional<NftCollectionAttributes, "id" | "description" | "contractAddress" | "totalSupply" | "maxSupply" | "mintPrice" | "currency" | "royaltyPercentage" | "royaltyAddress" | "categoryId" | "bannerImage" | "logoImage" | "featuredImage" | "website" | "discord" | "twitter" | "telegram" | "isVerified" | "isLazyMinted" | "isPublicMintEnabled" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

  interface NftCollectionInstance extends Model<NftCollectionAttributes, NftCollectionCreationAttributes>, NftCollectionAttributes {
    tokens?: NftTokenInstance[];
    activities?: NftActivityInstance[];
    creator?: NftCreatorInstance;
    category?: NftCategoryInstance;
    getTokens: Sequelize.HasManyGetAssociationsMixin<NftTokenInstance>;
    setTokens: Sequelize.HasManySetAssociationsMixin<NftTokenInstance, string>;
    addNftToken: Sequelize.HasManyAddAssociationMixin<NftTokenInstance, string>;
    addTokens: Sequelize.HasManyAddAssociationsMixin<NftTokenInstance, string>;
    removeNftToken: Sequelize.HasManyRemoveAssociationMixin<NftTokenInstance, string>;
    removeTokens: Sequelize.HasManyRemoveAssociationsMixin<NftTokenInstance, string>;
    hasNftToken: Sequelize.HasManyHasAssociationMixin<NftTokenInstance, string>;
    hasTokens: Sequelize.HasManyHasAssociationsMixin<NftTokenInstance, string>;
    countTokens: Sequelize.HasManyCountAssociationsMixin;
    createNftToken: Sequelize.HasManyCreateAssociationMixin<NftTokenInstance>;
    getActivities: Sequelize.HasManyGetAssociationsMixin<NftActivityInstance>;
    setActivities: Sequelize.HasManySetAssociationsMixin<NftActivityInstance, string>;
    addNftActivity: Sequelize.HasManyAddAssociationMixin<NftActivityInstance, string>;
    addActivities: Sequelize.HasManyAddAssociationsMixin<NftActivityInstance, string>;
    removeNftActivity: Sequelize.HasManyRemoveAssociationMixin<NftActivityInstance, string>;
    removeActivities: Sequelize.HasManyRemoveAssociationsMixin<NftActivityInstance, string>;
    hasNftActivity: Sequelize.HasManyHasAssociationMixin<NftActivityInstance, string>;
    hasActivities: Sequelize.HasManyHasAssociationsMixin<NftActivityInstance, string>;
    countActivities: Sequelize.HasManyCountAssociationsMixin;
    createNftActivity: Sequelize.HasManyCreateAssociationMixin<NftActivityInstance>;
    getCreator: Sequelize.BelongsToGetAssociationMixin<NftCreatorInstance>;
    setCreator: Sequelize.BelongsToSetAssociationMixin<NftCreatorInstance, string>;
    createCreator: Sequelize.BelongsToCreateAssociationMixin<NftCreatorInstance>;
    getCategory: Sequelize.BelongsToGetAssociationMixin<NftCategoryInstance>;
    setCategory: Sequelize.BelongsToSetAssociationMixin<NftCategoryInstance, string>;
    createCategory: Sequelize.BelongsToCreateAssociationMixin<NftCategoryInstance>;
  }

  // ========================================
  // NftComment
  // ========================================

  interface NftCommentAttributes {
    id: string;
    tokenId?: string;
    collectionId?: string;
    userId: string;
    parentId?: string;
    content: string;
    likes: number;
    isEdited: boolean;
    isDeleted: boolean;
    metadata?: any | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type NftCommentCreationAttributes = Optional<NftCommentAttributes, "id" | "tokenId" | "collectionId" | "parentId" | "isEdited" | "isDeleted" | "metadata" | "createdAt" | "updatedAt">;

  interface NftCommentInstance extends Model<NftCommentAttributes, NftCommentCreationAttributes>, NftCommentAttributes {
    replies?: NftCommentInstance[];
    user?: UserInstance;
    token?: NftTokenInstance;
    collection?: NftCollectionInstance;
    parent?: NftCommentInstance;
    getReplies: Sequelize.HasManyGetAssociationsMixin<NftCommentInstance>;
    setReplies: Sequelize.HasManySetAssociationsMixin<NftCommentInstance, string>;
    addNftComment: Sequelize.HasManyAddAssociationMixin<NftCommentInstance, string>;
    addReplies: Sequelize.HasManyAddAssociationsMixin<NftCommentInstance, string>;
    removeNftComment: Sequelize.HasManyRemoveAssociationMixin<NftCommentInstance, string>;
    removeReplies: Sequelize.HasManyRemoveAssociationsMixin<NftCommentInstance, string>;
    hasNftComment: Sequelize.HasManyHasAssociationMixin<NftCommentInstance, string>;
    hasReplies: Sequelize.HasManyHasAssociationsMixin<NftCommentInstance, string>;
    countReplies: Sequelize.HasManyCountAssociationsMixin;
    createNftComment: Sequelize.HasManyCreateAssociationMixin<NftCommentInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getToken: Sequelize.BelongsToGetAssociationMixin<NftTokenInstance>;
    setToken: Sequelize.BelongsToSetAssociationMixin<NftTokenInstance, string>;
    createToken: Sequelize.BelongsToCreateAssociationMixin<NftTokenInstance>;
    getCollection: Sequelize.BelongsToGetAssociationMixin<NftCollectionInstance>;
    setCollection: Sequelize.BelongsToSetAssociationMixin<NftCollectionInstance, string>;
    createCollection: Sequelize.BelongsToCreateAssociationMixin<NftCollectionInstance>;
    getParent: Sequelize.BelongsToGetAssociationMixin<NftCommentInstance>;
    setParent: Sequelize.BelongsToSetAssociationMixin<NftCommentInstance, string>;
    createParent: Sequelize.BelongsToCreateAssociationMixin<NftCommentInstance>;
  }

  // ========================================
  // NftCreator
  // ========================================

  interface NftCreatorAttributes {
    id: string;
    userId: string;
    displayName?: string;
    bio?: string;
    banner?: string;
    isVerified: boolean;
    verificationTier?: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
    totalSales?: number;
    totalVolume?: number;
    totalItems?: number;
    floorPrice?: number;
    profilePublic?: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftCreatorCreationAttributes = Optional<NftCreatorAttributes, "id" | "displayName" | "bio" | "banner" | "isVerified" | "verificationTier" | "totalSales" | "totalVolume" | "totalItems" | "floorPrice" | "profilePublic" | "createdAt" | "deletedAt" | "updatedAt">;

  interface NftCreatorInstance extends Model<NftCreatorAttributes, NftCreatorCreationAttributes>, NftCreatorAttributes {
    collections?: NftCollectionInstance[];
    tokens?: NftTokenInstance[];
    user?: UserInstance;
    getCollections: Sequelize.HasManyGetAssociationsMixin<NftCollectionInstance>;
    setCollections: Sequelize.HasManySetAssociationsMixin<NftCollectionInstance, string>;
    addNftCollection: Sequelize.HasManyAddAssociationMixin<NftCollectionInstance, string>;
    addCollections: Sequelize.HasManyAddAssociationsMixin<NftCollectionInstance, string>;
    removeNftCollection: Sequelize.HasManyRemoveAssociationMixin<NftCollectionInstance, string>;
    removeCollections: Sequelize.HasManyRemoveAssociationsMixin<NftCollectionInstance, string>;
    hasNftCollection: Sequelize.HasManyHasAssociationMixin<NftCollectionInstance, string>;
    hasCollections: Sequelize.HasManyHasAssociationsMixin<NftCollectionInstance, string>;
    countCollections: Sequelize.HasManyCountAssociationsMixin;
    createNftCollection: Sequelize.HasManyCreateAssociationMixin<NftCollectionInstance>;
    getTokens: Sequelize.HasManyGetAssociationsMixin<NftTokenInstance>;
    setTokens: Sequelize.HasManySetAssociationsMixin<NftTokenInstance, string>;
    addNftToken: Sequelize.HasManyAddAssociationMixin<NftTokenInstance, string>;
    addTokens: Sequelize.HasManyAddAssociationsMixin<NftTokenInstance, string>;
    removeNftToken: Sequelize.HasManyRemoveAssociationMixin<NftTokenInstance, string>;
    removeTokens: Sequelize.HasManyRemoveAssociationsMixin<NftTokenInstance, string>;
    hasNftToken: Sequelize.HasManyHasAssociationMixin<NftTokenInstance, string>;
    hasTokens: Sequelize.HasManyHasAssociationsMixin<NftTokenInstance, string>;
    countTokens: Sequelize.HasManyCountAssociationsMixin;
    createNftToken: Sequelize.HasManyCreateAssociationMixin<NftTokenInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NftCreatorFollow
  // ========================================

  interface NftCreatorFollowAttributes {
    id: string;
    followerId: string;
    followingId: string;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type NftCreatorFollowCreationAttributes = Optional<NftCreatorFollowAttributes, "id" | "createdAt" | "updatedAt">;

  interface NftCreatorFollowInstance extends Model<NftCreatorFollowAttributes, NftCreatorFollowCreationAttributes>, NftCreatorFollowAttributes {
    follower?: UserInstance;
    following?: UserInstance;
    getFollower: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setFollower: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createFollower: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getFollowing: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setFollowing: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createFollowing: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NftDispute
  // ========================================

  interface NftDisputeAttributes {
    id: string;
    listingId?: string;
    tokenId?: string;
    transactionHash?: string;
    disputeType: "FAKE_NFT" | "COPYRIGHT_INFRINGEMENT" | "SCAM" | "NOT_RECEIVED" | "WRONG_ITEM" | "UNAUTHORIZED_SALE" | "OTHER";
    status: "PENDING" | "INVESTIGATING" | "AWAITING_RESPONSE" | "RESOLVED" | "REJECTED" | "ESCALATED";
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    reporterId: string;
    respondentId?: string;
    assignedToId?: string;
    title: string;
    description: string;
    evidence?: any | null;
    resolution?: string | null;
    resolutionType?: "REFUND" | "CANCEL_SALE" | "REMOVE_LISTING" | "BAN_USER" | "WARNING" | "NO_ACTION";
    refundAmount?: number;
    escalatedAt?: Date | null;
    investigatedAt?: Date | null;
    resolvedAt?: Date | null;
    resolvedById?: string;
    metadata?: any | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type NftDisputeCreationAttributes = Optional<NftDisputeAttributes, "id" | "listingId" | "tokenId" | "transactionHash" | "respondentId" | "assignedToId" | "evidence" | "resolution" | "resolutionType" | "refundAmount" | "escalatedAt" | "investigatedAt" | "resolvedAt" | "resolvedById" | "metadata" | "createdAt" | "updatedAt">;

  interface NftDisputeInstance extends Model<NftDisputeAttributes, NftDisputeCreationAttributes>, NftDisputeAttributes {
    messages?: NftDisputeMessageInstance[];
    reporter?: UserInstance;
    respondent?: UserInstance;
    assignedTo?: UserInstance;
    resolvedBy?: UserInstance;
    listing?: NftListingInstance;
    token?: NftTokenInstance;
    getMessages: Sequelize.HasManyGetAssociationsMixin<NftDisputeMessageInstance>;
    setMessages: Sequelize.HasManySetAssociationsMixin<NftDisputeMessageInstance, string>;
    addNftDisputeMessage: Sequelize.HasManyAddAssociationMixin<NftDisputeMessageInstance, string>;
    addMessages: Sequelize.HasManyAddAssociationsMixin<NftDisputeMessageInstance, string>;
    removeNftDisputeMessage: Sequelize.HasManyRemoveAssociationMixin<NftDisputeMessageInstance, string>;
    removeMessages: Sequelize.HasManyRemoveAssociationsMixin<NftDisputeMessageInstance, string>;
    hasNftDisputeMessage: Sequelize.HasManyHasAssociationMixin<NftDisputeMessageInstance, string>;
    hasMessages: Sequelize.HasManyHasAssociationsMixin<NftDisputeMessageInstance, string>;
    countMessages: Sequelize.HasManyCountAssociationsMixin;
    createNftDisputeMessage: Sequelize.HasManyCreateAssociationMixin<NftDisputeMessageInstance>;
    getReporter: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setReporter: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createReporter: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getRespondent: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setRespondent: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createRespondent: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getAssignedTo: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setAssignedTo: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createAssignedTo: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getResolvedBy: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setResolvedBy: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createResolvedBy: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getListing: Sequelize.BelongsToGetAssociationMixin<NftListingInstance>;
    setListing: Sequelize.BelongsToSetAssociationMixin<NftListingInstance, string>;
    createListing: Sequelize.BelongsToCreateAssociationMixin<NftListingInstance>;
    getToken: Sequelize.BelongsToGetAssociationMixin<NftTokenInstance>;
    setToken: Sequelize.BelongsToSetAssociationMixin<NftTokenInstance, string>;
    createToken: Sequelize.BelongsToCreateAssociationMixin<NftTokenInstance>;
  }

  // ========================================
  // NftDisputeMessage
  // ========================================

  interface NftDisputeMessageAttributes {
    id: string;
    disputeId: string;
    userId: string;
    message: string;
    attachments?: any | null;
    isInternal: boolean;
    isSystemMessage: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type NftDisputeMessageCreationAttributes = Optional<NftDisputeMessageAttributes, "id" | "attachments" | "isInternal" | "isSystemMessage" | "createdAt" | "updatedAt">;

  interface NftDisputeMessageInstance extends Model<NftDisputeMessageAttributes, NftDisputeMessageCreationAttributes>, NftDisputeMessageAttributes {
    dispute?: NftDisputeInstance;
    user?: UserInstance;
    getDispute: Sequelize.BelongsToGetAssociationMixin<NftDisputeInstance>;
    setDispute: Sequelize.BelongsToSetAssociationMixin<NftDisputeInstance, string>;
    createDispute: Sequelize.BelongsToCreateAssociationMixin<NftDisputeInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NftFavorite
  // ========================================

  interface NftFavoriteAttributes {
    id: string;
    userId: string;
    tokenId?: string;
    collectionId?: string;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftFavoriteCreationAttributes = Optional<NftFavoriteAttributes, "id" | "tokenId" | "collectionId" | "createdAt" | "deletedAt" | "updatedAt">;

  interface NftFavoriteInstance extends Model<NftFavoriteAttributes, NftFavoriteCreationAttributes>, NftFavoriteAttributes {
    user?: UserInstance;
    token?: NftTokenInstance;
    collection?: NftCollectionInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getToken: Sequelize.BelongsToGetAssociationMixin<NftTokenInstance>;
    setToken: Sequelize.BelongsToSetAssociationMixin<NftTokenInstance, string>;
    createToken: Sequelize.BelongsToCreateAssociationMixin<NftTokenInstance>;
    getCollection: Sequelize.BelongsToGetAssociationMixin<NftCollectionInstance>;
    setCollection: Sequelize.BelongsToSetAssociationMixin<NftCollectionInstance, string>;
    createCollection: Sequelize.BelongsToCreateAssociationMixin<NftCollectionInstance>;
  }

  // ========================================
  // NftFractional
  // ========================================

  interface NftFractionalAttributes {
    id: string;
    tokenId: string;
    vaultAddress?: string;
    totalShares: number;
    availableShares: number;
    sharePrice: number;
    currency: string;
    minPurchase: number;
    maxPurchase: number;
    buyoutPrice?: number;
    buyoutEnabled: boolean;
    votingEnabled: boolean;
    status: "PENDING" | "ACTIVE" | "BUYOUT_PENDING" | "BOUGHT_OUT" | "CANCELLED";
    createdById: string;
    deployedAt?: Date | null;
    buyoutAt?: Date | null;
    metadata?: any | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type NftFractionalCreationAttributes = Optional<NftFractionalAttributes, "id" | "vaultAddress" | "buyoutPrice" | "buyoutEnabled" | "votingEnabled" | "status" | "deployedAt" | "buyoutAt" | "metadata" | "createdAt" | "updatedAt">;

  interface NftFractionalInstance extends Model<NftFractionalAttributes, NftFractionalCreationAttributes>, NftFractionalAttributes {
    token?: NftTokenInstance;
    creator?: UserInstance;
    getToken: Sequelize.BelongsToGetAssociationMixin<NftTokenInstance>;
    setToken: Sequelize.BelongsToSetAssociationMixin<NftTokenInstance, string>;
    createToken: Sequelize.BelongsToCreateAssociationMixin<NftTokenInstance>;
    getCreator: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setCreator: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createCreator: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NftListing
  // ========================================

  interface NftListingAttributes {
    id: string;
    tokenId: string;
    sellerId: string;
    type: "FIXED_PRICE" | "AUCTION" | "BUNDLE";
    price?: number;
    currency: string;
    currentBid?: number;
    startingBid?: number;
    reservePrice?: number;
    minBidIncrement?: number;
    buyNowPrice?: number;
    auctionContractAddress?: string | null;
    bundleTokenIds?: string | null;
    startTime?: Date | null;
    endTime?: Date | null;
    status: "ACTIVE" | "SOLD" | "CANCELLED" | "EXPIRED";
    soldAt?: Date | null;
    cancelledAt?: Date | null;
    endedAt?: Date | null;
    views?: number;
    likes?: number;
    metadata?: any | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftListingCreationAttributes = Optional<NftListingAttributes, "id" | "price" | "currentBid" | "startingBid" | "reservePrice" | "minBidIncrement" | "buyNowPrice" | "auctionContractAddress" | "bundleTokenIds" | "startTime" | "endTime" | "soldAt" | "cancelledAt" | "endedAt" | "views" | "likes" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

  interface NftListingInstance extends Model<NftListingAttributes, NftListingCreationAttributes>, NftListingAttributes {
    bids?: NftBidInstance[];
    offers?: NftOfferInstance[];
    activities?: NftActivityInstance[];
    token?: NftTokenInstance;
    seller?: UserInstance;
    getBids: Sequelize.HasManyGetAssociationsMixin<NftBidInstance>;
    setBids: Sequelize.HasManySetAssociationsMixin<NftBidInstance, string>;
    addNftBid: Sequelize.HasManyAddAssociationMixin<NftBidInstance, string>;
    addBids: Sequelize.HasManyAddAssociationsMixin<NftBidInstance, string>;
    removeNftBid: Sequelize.HasManyRemoveAssociationMixin<NftBidInstance, string>;
    removeBids: Sequelize.HasManyRemoveAssociationsMixin<NftBidInstance, string>;
    hasNftBid: Sequelize.HasManyHasAssociationMixin<NftBidInstance, string>;
    hasBids: Sequelize.HasManyHasAssociationsMixin<NftBidInstance, string>;
    countBids: Sequelize.HasManyCountAssociationsMixin;
    createNftBid: Sequelize.HasManyCreateAssociationMixin<NftBidInstance>;
    getOffers: Sequelize.HasManyGetAssociationsMixin<NftOfferInstance>;
    setOffers: Sequelize.HasManySetAssociationsMixin<NftOfferInstance, string>;
    addNftOffer: Sequelize.HasManyAddAssociationMixin<NftOfferInstance, string>;
    addOffers: Sequelize.HasManyAddAssociationsMixin<NftOfferInstance, string>;
    removeNftOffer: Sequelize.HasManyRemoveAssociationMixin<NftOfferInstance, string>;
    removeOffers: Sequelize.HasManyRemoveAssociationsMixin<NftOfferInstance, string>;
    hasNftOffer: Sequelize.HasManyHasAssociationMixin<NftOfferInstance, string>;
    hasOffers: Sequelize.HasManyHasAssociationsMixin<NftOfferInstance, string>;
    countOffers: Sequelize.HasManyCountAssociationsMixin;
    createNftOffer: Sequelize.HasManyCreateAssociationMixin<NftOfferInstance>;
    getActivities: Sequelize.HasManyGetAssociationsMixin<NftActivityInstance>;
    setActivities: Sequelize.HasManySetAssociationsMixin<NftActivityInstance, string>;
    addNftActivity: Sequelize.HasManyAddAssociationMixin<NftActivityInstance, string>;
    addActivities: Sequelize.HasManyAddAssociationsMixin<NftActivityInstance, string>;
    removeNftActivity: Sequelize.HasManyRemoveAssociationMixin<NftActivityInstance, string>;
    removeActivities: Sequelize.HasManyRemoveAssociationsMixin<NftActivityInstance, string>;
    hasNftActivity: Sequelize.HasManyHasAssociationMixin<NftActivityInstance, string>;
    hasActivities: Sequelize.HasManyHasAssociationsMixin<NftActivityInstance, string>;
    countActivities: Sequelize.HasManyCountAssociationsMixin;
    createNftActivity: Sequelize.HasManyCreateAssociationMixin<NftActivityInstance>;
    getToken: Sequelize.BelongsToGetAssociationMixin<NftTokenInstance>;
    setToken: Sequelize.BelongsToSetAssociationMixin<NftTokenInstance, string>;
    createToken: Sequelize.BelongsToCreateAssociationMixin<NftTokenInstance>;
    getSeller: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setSeller: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createSeller: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NftMarketplace
  // ========================================

  interface NftMarketplaceAttributes {
    id: string;
    chain: string;
    network: string;
    contractAddress: string;
    deployerAddress: string;
    deployedBy?: string;
    feeRecipient: string;
    feePercentage: number;
    listingFee?: number;
    maxRoyaltyPercentage?: number;
    transactionHash: string;
    blockNumber: number;
    gasUsed?: string | null;
    deploymentCost?: string | null;
    status: "ACTIVE" | "PAUSED" | "DEPRECATED";
    pauseReason?: string | null;
    pausedAt?: Date | null;
    pausedBy?: string;
    version?: string | null;
    metadata?: any | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type NftMarketplaceCreationAttributes = Optional<NftMarketplaceAttributes, "id" | "deployedBy" | "listingFee" | "maxRoyaltyPercentage" | "gasUsed" | "deploymentCost" | "pauseReason" | "pausedAt" | "pausedBy" | "version" | "metadata" | "createdAt" | "updatedAt">;

  interface NftMarketplaceInstance extends Model<NftMarketplaceAttributes, NftMarketplaceCreationAttributes>, NftMarketplaceAttributes {
    deployer?: UserInstance;
    pauser?: UserInstance;
    getDeployer: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setDeployer: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createDeployer: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getPauser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setPauser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createPauser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NftMetadataBackup
  // ========================================

  interface NftMetadataBackupAttributes {
    id: string;
    backupId: string;
    type: string;
    size: number;
    checksum: string;
    locations: Record<string, string>;
    encrypted: boolean;
    compressed: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type NftMetadataBackupCreationAttributes = Optional<NftMetadataBackupAttributes, "id" | "size" | "locations" | "encrypted" | "compressed" | "createdAt" | "updatedAt">;

  interface NftMetadataBackupInstance extends Model<NftMetadataBackupAttributes, NftMetadataBackupCreationAttributes>, NftMetadataBackupAttributes {
  }

  // ========================================
  // NftOffer
  // ========================================

  interface NftOfferAttributes {
    id: string;
    tokenId?: string;
    collectionId?: string;
    listingId?: string;
    userId: string;
    amount: number;
    currency: string;
    expiresAt?: Date | null;
    status: "ACTIVE" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
    type?: "TOKEN" | "COLLECTION" | null;
    message?: string | null;
    acceptedAt?: Date | null;
    rejectedAt?: Date | null;
    cancelledAt?: Date | null;
    expiredAt?: Date | null;
    metadata?: any | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftOfferCreationAttributes = Optional<NftOfferAttributes, "id" | "tokenId" | "collectionId" | "listingId" | "expiresAt" | "type" | "message" | "acceptedAt" | "rejectedAt" | "cancelledAt" | "expiredAt" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

  interface NftOfferInstance extends Model<NftOfferAttributes, NftOfferCreationAttributes>, NftOfferAttributes {
    token?: NftTokenInstance;
    collection?: NftCollectionInstance;
    listing?: NftListingInstance;
    user?: UserInstance;
    getToken: Sequelize.BelongsToGetAssociationMixin<NftTokenInstance>;
    setToken: Sequelize.BelongsToSetAssociationMixin<NftTokenInstance, string>;
    createToken: Sequelize.BelongsToCreateAssociationMixin<NftTokenInstance>;
    getCollection: Sequelize.BelongsToGetAssociationMixin<NftCollectionInstance>;
    setCollection: Sequelize.BelongsToSetAssociationMixin<NftCollectionInstance, string>;
    createCollection: Sequelize.BelongsToCreateAssociationMixin<NftCollectionInstance>;
    getListing: Sequelize.BelongsToGetAssociationMixin<NftListingInstance>;
    setListing: Sequelize.BelongsToSetAssociationMixin<NftListingInstance, string>;
    createListing: Sequelize.BelongsToCreateAssociationMixin<NftListingInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NftPriceHistory
  // ========================================

  interface NftPriceHistoryAttributes {
    id: string;
    tokenId: string;
    collectionId?: string;
    price: number;
    currency: string;
    priceUSD?: number | null;
    saleType: "DIRECT" | "AUCTION" | "OFFER";
    buyerId?: string;
    sellerId?: string;
    transactionHash?: string | null;
    createdAt?: Date;
  }

  type NftPriceHistoryCreationAttributes = Optional<NftPriceHistoryAttributes, "id" | "collectionId" | "priceUSD" | "buyerId" | "sellerId" | "transactionHash" | "createdAt">;

  interface NftPriceHistoryInstance extends Model<NftPriceHistoryAttributes, NftPriceHistoryCreationAttributes>, NftPriceHistoryAttributes {
    token?: NftTokenInstance;
    collection?: NftCollectionInstance;
    buyer?: UserInstance;
    seller?: UserInstance;
    getToken: Sequelize.BelongsToGetAssociationMixin<NftTokenInstance>;
    setToken: Sequelize.BelongsToSetAssociationMixin<NftTokenInstance, string>;
    createToken: Sequelize.BelongsToCreateAssociationMixin<NftTokenInstance>;
    getCollection: Sequelize.BelongsToGetAssociationMixin<NftCollectionInstance>;
    setCollection: Sequelize.BelongsToSetAssociationMixin<NftCollectionInstance, string>;
    createCollection: Sequelize.BelongsToCreateAssociationMixin<NftCollectionInstance>;
    getBuyer: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setBuyer: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createBuyer: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getSeller: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setSeller: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createSeller: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NftReview
  // ========================================

  interface NftReviewAttributes {
    id: string;
    userId: string;
    tokenId?: string;
    collectionId?: string;
    creatorId?: string;
    rating: number;
    title?: string;
    comment?: string;
    isVerified?: boolean;
    helpfulCount?: number;
    status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftReviewCreationAttributes = Optional<NftReviewAttributes, "id" | "tokenId" | "collectionId" | "creatorId" | "title" | "comment" | "isVerified" | "helpfulCount" | "createdAt" | "deletedAt" | "updatedAt">;

  interface NftReviewInstance extends Model<NftReviewAttributes, NftReviewCreationAttributes>, NftReviewAttributes {
    user?: UserInstance;
    token?: NftTokenInstance;
    collection?: NftCollectionInstance;
    creator?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getToken: Sequelize.BelongsToGetAssociationMixin<NftTokenInstance>;
    setToken: Sequelize.BelongsToSetAssociationMixin<NftTokenInstance, string>;
    createToken: Sequelize.BelongsToCreateAssociationMixin<NftTokenInstance>;
    getCollection: Sequelize.BelongsToGetAssociationMixin<NftCollectionInstance>;
    setCollection: Sequelize.BelongsToSetAssociationMixin<NftCollectionInstance, string>;
    createCollection: Sequelize.BelongsToCreateAssociationMixin<NftCollectionInstance>;
    getCreator: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setCreator: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createCreator: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NftRoyalty
  // ========================================

  interface NftRoyaltyAttributes {
    id: string;
    saleId: string;
    tokenId: string;
    collectionId: string;
    recipientId: string;
    amount: number;
    percentage: number;
    currency: string;
    transactionHash?: string;
    blockNumber?: number;
    status: "PENDING" | "PAID" | "FAILED";
    paidAt?: Date | null;
    metadata?: any | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftRoyaltyCreationAttributes = Optional<NftRoyaltyAttributes, "id" | "transactionHash" | "blockNumber" | "paidAt" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

  interface NftRoyaltyInstance extends Model<NftRoyaltyAttributes, NftRoyaltyCreationAttributes>, NftRoyaltyAttributes {
    sale?: NftSaleInstance;
    token?: NftTokenInstance;
    collection?: NftCollectionInstance;
    recipient?: UserInstance;
    getSale: Sequelize.BelongsToGetAssociationMixin<NftSaleInstance>;
    setSale: Sequelize.BelongsToSetAssociationMixin<NftSaleInstance, string>;
    createSale: Sequelize.BelongsToCreateAssociationMixin<NftSaleInstance>;
    getToken: Sequelize.BelongsToGetAssociationMixin<NftTokenInstance>;
    setToken: Sequelize.BelongsToSetAssociationMixin<NftTokenInstance, string>;
    createToken: Sequelize.BelongsToCreateAssociationMixin<NftTokenInstance>;
    getCollection: Sequelize.BelongsToGetAssociationMixin<NftCollectionInstance>;
    setCollection: Sequelize.BelongsToSetAssociationMixin<NftCollectionInstance, string>;
    createCollection: Sequelize.BelongsToCreateAssociationMixin<NftCollectionInstance>;
    getRecipient: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setRecipient: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createRecipient: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NftSale
  // ========================================

  interface NftSaleAttributes {
    id: string;
    tokenId: string;
    listingId?: string;
    sellerId: string;
    buyerId: string;
    price: number;
    currency: string;
    marketplaceFee: number;
    royaltyFee: number;
    totalFee: number;
    netAmount: number;
    transactionHash?: string;
    blockNumber?: number;
    status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
    metadata?: any | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftSaleCreationAttributes = Optional<NftSaleAttributes, "id" | "listingId" | "transactionHash" | "blockNumber" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

  interface NftSaleInstance extends Model<NftSaleAttributes, NftSaleCreationAttributes>, NftSaleAttributes {
    token?: NftTokenInstance;
    listing?: NftListingInstance;
    seller?: UserInstance;
    buyer?: UserInstance;
    getToken: Sequelize.BelongsToGetAssociationMixin<NftTokenInstance>;
    setToken: Sequelize.BelongsToSetAssociationMixin<NftTokenInstance, string>;
    createToken: Sequelize.BelongsToCreateAssociationMixin<NftTokenInstance>;
    getListing: Sequelize.BelongsToGetAssociationMixin<NftListingInstance>;
    setListing: Sequelize.BelongsToSetAssociationMixin<NftListingInstance, string>;
    createListing: Sequelize.BelongsToCreateAssociationMixin<NftListingInstance>;
    getSeller: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setSeller: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createSeller: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getBuyer: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setBuyer: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createBuyer: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NftToken
  // ========================================

  interface NftTokenAttributes {
    id: string;
    collectionId: string;
    tokenId: string;
    blockchainTokenId?: string | null;
    name: string;
    description?: string | null;
    image?: string | null;
    attributes?: any | null;
    metadataUri?: string;
    metadataHash?: string | null;
    ownerWalletAddress?: string;
    ownerId?: string;
    creatorId: string;
    mintedAt?: Date | null;
    isMinted: boolean;
    isListed: boolean;
    views?: number;
    likes?: number;
    rarity?: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
    rarityScore?: number;
    status: "DRAFT" | "MINTED" | "BURNED";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftTokenCreationAttributes = Optional<NftTokenAttributes, "id" | "blockchainTokenId" | "description" | "image" | "attributes" | "metadataUri" | "metadataHash" | "ownerWalletAddress" | "ownerId" | "mintedAt" | "isMinted" | "isListed" | "views" | "likes" | "rarity" | "rarityScore" | "createdAt" | "deletedAt" | "updatedAt">;

  interface NftTokenInstance extends Model<NftTokenAttributes, NftTokenCreationAttributes>, NftTokenAttributes {
    currentListing?: NftListingInstance;
    listings?: NftListingInstance[];
    activities?: NftActivityInstance[];
    favorites?: NftFavoriteInstance[];
    sales?: NftSaleInstance[];
    offers?: NftOfferInstance[];
    collection?: NftCollectionInstance;
    owner?: UserInstance;
    creator?: NftCreatorInstance;
    getCurrentListing: Sequelize.HasOneGetAssociationMixin<NftListingInstance>;
    setCurrentListing: Sequelize.HasOneSetAssociationMixin<NftListingInstance, string>;
    createCurrentListing: Sequelize.HasOneCreateAssociationMixin<NftListingInstance>;
    getListings: Sequelize.HasManyGetAssociationsMixin<NftListingInstance>;
    setListings: Sequelize.HasManySetAssociationsMixin<NftListingInstance, string>;
    addNftListing: Sequelize.HasManyAddAssociationMixin<NftListingInstance, string>;
    addListings: Sequelize.HasManyAddAssociationsMixin<NftListingInstance, string>;
    removeNftListing: Sequelize.HasManyRemoveAssociationMixin<NftListingInstance, string>;
    removeListings: Sequelize.HasManyRemoveAssociationsMixin<NftListingInstance, string>;
    hasNftListing: Sequelize.HasManyHasAssociationMixin<NftListingInstance, string>;
    hasListings: Sequelize.HasManyHasAssociationsMixin<NftListingInstance, string>;
    countListings: Sequelize.HasManyCountAssociationsMixin;
    createNftListing: Sequelize.HasManyCreateAssociationMixin<NftListingInstance>;
    getActivities: Sequelize.HasManyGetAssociationsMixin<NftActivityInstance>;
    setActivities: Sequelize.HasManySetAssociationsMixin<NftActivityInstance, string>;
    addNftActivity: Sequelize.HasManyAddAssociationMixin<NftActivityInstance, string>;
    addActivities: Sequelize.HasManyAddAssociationsMixin<NftActivityInstance, string>;
    removeNftActivity: Sequelize.HasManyRemoveAssociationMixin<NftActivityInstance, string>;
    removeActivities: Sequelize.HasManyRemoveAssociationsMixin<NftActivityInstance, string>;
    hasNftActivity: Sequelize.HasManyHasAssociationMixin<NftActivityInstance, string>;
    hasActivities: Sequelize.HasManyHasAssociationsMixin<NftActivityInstance, string>;
    countActivities: Sequelize.HasManyCountAssociationsMixin;
    createNftActivity: Sequelize.HasManyCreateAssociationMixin<NftActivityInstance>;
    getFavorites: Sequelize.HasManyGetAssociationsMixin<NftFavoriteInstance>;
    setFavorites: Sequelize.HasManySetAssociationsMixin<NftFavoriteInstance, string>;
    addNftFavorite: Sequelize.HasManyAddAssociationMixin<NftFavoriteInstance, string>;
    addFavorites: Sequelize.HasManyAddAssociationsMixin<NftFavoriteInstance, string>;
    removeNftFavorite: Sequelize.HasManyRemoveAssociationMixin<NftFavoriteInstance, string>;
    removeFavorites: Sequelize.HasManyRemoveAssociationsMixin<NftFavoriteInstance, string>;
    hasNftFavorite: Sequelize.HasManyHasAssociationMixin<NftFavoriteInstance, string>;
    hasFavorites: Sequelize.HasManyHasAssociationsMixin<NftFavoriteInstance, string>;
    countFavorites: Sequelize.HasManyCountAssociationsMixin;
    createNftFavorite: Sequelize.HasManyCreateAssociationMixin<NftFavoriteInstance>;
    getSales: Sequelize.HasManyGetAssociationsMixin<NftSaleInstance>;
    setSales: Sequelize.HasManySetAssociationsMixin<NftSaleInstance, string>;
    addNftSale: Sequelize.HasManyAddAssociationMixin<NftSaleInstance, string>;
    addSales: Sequelize.HasManyAddAssociationsMixin<NftSaleInstance, string>;
    removeNftSale: Sequelize.HasManyRemoveAssociationMixin<NftSaleInstance, string>;
    removeSales: Sequelize.HasManyRemoveAssociationsMixin<NftSaleInstance, string>;
    hasNftSale: Sequelize.HasManyHasAssociationMixin<NftSaleInstance, string>;
    hasSales: Sequelize.HasManyHasAssociationsMixin<NftSaleInstance, string>;
    countSales: Sequelize.HasManyCountAssociationsMixin;
    createNftSale: Sequelize.HasManyCreateAssociationMixin<NftSaleInstance>;
    getOffers: Sequelize.HasManyGetAssociationsMixin<NftOfferInstance>;
    setOffers: Sequelize.HasManySetAssociationsMixin<NftOfferInstance, string>;
    addNftOffer: Sequelize.HasManyAddAssociationMixin<NftOfferInstance, string>;
    addOffers: Sequelize.HasManyAddAssociationsMixin<NftOfferInstance, string>;
    removeNftOffer: Sequelize.HasManyRemoveAssociationMixin<NftOfferInstance, string>;
    removeOffers: Sequelize.HasManyRemoveAssociationsMixin<NftOfferInstance, string>;
    hasNftOffer: Sequelize.HasManyHasAssociationMixin<NftOfferInstance, string>;
    hasOffers: Sequelize.HasManyHasAssociationsMixin<NftOfferInstance, string>;
    countOffers: Sequelize.HasManyCountAssociationsMixin;
    createNftOffer: Sequelize.HasManyCreateAssociationMixin<NftOfferInstance>;
    getCollection: Sequelize.BelongsToGetAssociationMixin<NftCollectionInstance>;
    setCollection: Sequelize.BelongsToSetAssociationMixin<NftCollectionInstance, string>;
    createCollection: Sequelize.BelongsToCreateAssociationMixin<NftCollectionInstance>;
    getOwner: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setOwner: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createOwner: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getCreator: Sequelize.BelongsToGetAssociationMixin<NftCreatorInstance>;
    setCreator: Sequelize.BelongsToSetAssociationMixin<NftCreatorInstance, string>;
    createCreator: Sequelize.BelongsToCreateAssociationMixin<NftCreatorInstance>;
  }

  // ========================================
  // Notification
  // ========================================

  interface NotificationAttributes {
    id: string;
    userId: string;
    relatedId?: string | null;
    title: string;
    type: string;
    message: string;
    details?: string | null;
    link?: string | null;
    actions?: any | null;
    read: boolean;
    idempotencyKey?: string | null;
    channels?: any | null;
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type NotificationCreationAttributes = Optional<NotificationAttributes, "id" | "relatedId" | "details" | "link" | "actions" | "read" | "idempotencyKey" | "channels" | "priority" | "createdAt" | "updatedAt" | "deletedAt">;

  interface NotificationInstance extends Model<NotificationAttributes, NotificationCreationAttributes>, NotificationAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NotificationTemplate
  // ========================================

  interface NotificationTemplateAttributes {
    id: number;
    name: string;
    subject: string;
    emailBody?: string | null;
    smsBody?: string | null;
    pushBody?: string | null;
    shortCodes?: string | null;
    email?: boolean | null;
    sms?: boolean | null;
    push?: boolean | null;
  }

  type NotificationTemplateCreationAttributes = Optional<NotificationTemplateAttributes, "id" | "emailBody" | "smsBody" | "pushBody" | "shortCodes" | "email" | "sms" | "push">;

  interface NotificationTemplateInstance extends Model<NotificationTemplateAttributes, NotificationTemplateCreationAttributes>, NotificationTemplateAttributes {
  }

  // ========================================
  // OneTimeToken
  // ========================================

  interface OneTimeTokenAttributes {
    id: string;
    tokenId: string;
    tokenType?: "RESET";
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type OneTimeTokenCreationAttributes = Optional<OneTimeTokenAttributes, "id" | "tokenType" | "createdAt" | "updatedAt">;

  interface OneTimeTokenInstance extends Model<OneTimeTokenAttributes, OneTimeTokenCreationAttributes>, OneTimeTokenAttributes {
  }

  // ========================================
  // P2pActivityLog
  // ========================================

  interface P2pActivityLogAttributes {
    id: string;
    userId?: string | null;
    type: string;
    action: string;
    details?: string | null;
    relatedEntity?: string | null;
    relatedEntityId?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type P2pActivityLogCreationAttributes = Optional<P2pActivityLogAttributes, "id" | "userId" | "details" | "relatedEntity" | "relatedEntityId" | "createdAt" | "updatedAt" | "deletedAt">;

  interface P2pActivityLogInstance extends Model<P2pActivityLogAttributes, P2pActivityLogCreationAttributes>, P2pActivityLogAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // P2pAdminActivity
  // ========================================

  interface P2pAdminActivityAttributes {
    id: string;
    type: string;
    relatedEntityId: string;
    relatedEntityName: string;
    adminId: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type P2pAdminActivityCreationAttributes = Optional<P2pAdminActivityAttributes, "id" | "createdAt" | "updatedAt" | "deletedAt">;

  interface P2pAdminActivityInstance extends Model<P2pAdminActivityAttributes, P2pAdminActivityCreationAttributes>, P2pAdminActivityAttributes {
    admin?: UserInstance;
    getAdmin: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setAdmin: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createAdmin: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // P2pCommission
  // ========================================

  interface P2pCommissionAttributes {
    id: string;
    adminId: string;
    amount: number;
    description?: string | null;
    tradeId?: string;
    offerId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type P2pCommissionCreationAttributes = Optional<P2pCommissionAttributes, "id" | "description" | "tradeId" | "offerId" | "createdAt" | "updatedAt" | "deletedAt">;

  interface P2pCommissionInstance extends Model<P2pCommissionAttributes, P2pCommissionCreationAttributes>, P2pCommissionAttributes {
    admin?: UserInstance;
    trade?: P2pTradeInstance;
    offer?: P2pOfferInstance;
    getAdmin: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setAdmin: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createAdmin: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getTrade: Sequelize.BelongsToGetAssociationMixin<P2pTradeInstance>;
    setTrade: Sequelize.BelongsToSetAssociationMixin<P2pTradeInstance, string>;
    createTrade: Sequelize.BelongsToCreateAssociationMixin<P2pTradeInstance>;
    getOffer: Sequelize.BelongsToGetAssociationMixin<P2pOfferInstance>;
    setOffer: Sequelize.BelongsToSetAssociationMixin<P2pOfferInstance, string>;
    createOffer: Sequelize.BelongsToCreateAssociationMixin<P2pOfferInstance>;
  }

  // ========================================
  // P2pDispute
  // ========================================

  interface P2pDisputeAttributes {
    id: string;
    tradeId: string;
    amount: string;
    reportedById: string;
    againstId: string;
    reason: string;
    details?: string | null;
    filedOn: Date;
    status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
    priority: "HIGH" | "MEDIUM" | "LOW";
    resolution?: any | null;
    resolvedOn?: Date | null;
    messages?: any | null;
    evidence?: any | null;
    activityLog?: any | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type P2pDisputeCreationAttributes = Optional<P2pDisputeAttributes, "id" | "details" | "resolution" | "resolvedOn" | "messages" | "evidence" | "activityLog" | "createdAt" | "updatedAt" | "deletedAt">;

  interface P2pDisputeInstance extends Model<P2pDisputeAttributes, P2pDisputeCreationAttributes>, P2pDisputeAttributes {
    trade?: P2pTradeInstance;
    reportedBy?: UserInstance;
    against?: UserInstance;
    getTrade: Sequelize.BelongsToGetAssociationMixin<P2pTradeInstance>;
    setTrade: Sequelize.BelongsToSetAssociationMixin<P2pTradeInstance, string>;
    createTrade: Sequelize.BelongsToCreateAssociationMixin<P2pTradeInstance>;
    getReportedBy: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setReportedBy: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createReportedBy: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getAgainst: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setAgainst: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createAgainst: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // P2pOffer
  // ========================================

  interface P2pOfferAttributes {
    id: string;
    userId: string;
    type: "BUY" | "SELL";
    currency: string;
    walletType: "FIAT" | "SPOT" | "ECO";
    priceCurrency?: string | null;
    amountConfig: {
    total: number;
    min?: number;
    max?: number;
    availableBalance?: number;
  };
    priceConfig: {
    model: "FIXED" | "MARGIN";
    value: number;
    marketPrice?: number;
    finalPrice: number;
    currency?: string; // Currency for the price (USD, EUR, GBP, etc.)
    marginType?: "percentage" | "fixed";
  };
    tradeSettings: {
    autoCancel: number;
    kycRequired: boolean;
    visibility: "PUBLIC" | "PRIVATE";
    termsOfTrade?: string;
    additionalNotes?: string;
  };
    locationSettings?: {
    country?: string;
    region?: string;
    city?: string;
    restrictions?: string[];
  };
    userRequirements?: {
    minCompletedTrades?: number;
    minSuccessRate?: number;
    minAccountAge?: number;
    trustedOnly?: boolean;
  };
    status: "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED" | "REJECTED" | "EXPIRED";
    views: number;
    systemTags?: string[] | null;
    adminNotes?: string | null;
    activityLog?: Array<{
    type: string;
    adminId?: string;
    adminName?: string;
    previousStatus?: string;
    reason?: string;
    createdAt: string;
  }> | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type P2pOfferCreationAttributes = Optional<P2pOfferAttributes, "id" | "priceCurrency" | "locationSettings" | "userRequirements" | "status" | "views" | "systemTags" | "adminNotes" | "activityLog" | "createdAt" | "updatedAt" | "deletedAt">;

  interface P2pOfferInstance extends Model<P2pOfferAttributes, P2pOfferCreationAttributes>, P2pOfferAttributes {
    flag?: P2pOfferFlagInstance;
    trades?: P2pTradeInstance[];
    user?: UserInstance;
    paymentMethods?: P2pPaymentMethodInstance[];
    getFlag: Sequelize.HasOneGetAssociationMixin<P2pOfferFlagInstance>;
    setFlag: Sequelize.HasOneSetAssociationMixin<P2pOfferFlagInstance, string>;
    createFlag: Sequelize.HasOneCreateAssociationMixin<P2pOfferFlagInstance>;
    getTrades: Sequelize.HasManyGetAssociationsMixin<P2pTradeInstance>;
    setTrades: Sequelize.HasManySetAssociationsMixin<P2pTradeInstance, string>;
    addP2pTrade: Sequelize.HasManyAddAssociationMixin<P2pTradeInstance, string>;
    addTrades: Sequelize.HasManyAddAssociationsMixin<P2pTradeInstance, string>;
    removeP2pTrade: Sequelize.HasManyRemoveAssociationMixin<P2pTradeInstance, string>;
    removeTrades: Sequelize.HasManyRemoveAssociationsMixin<P2pTradeInstance, string>;
    hasP2pTrade: Sequelize.HasManyHasAssociationMixin<P2pTradeInstance, string>;
    hasTrades: Sequelize.HasManyHasAssociationsMixin<P2pTradeInstance, string>;
    countTrades: Sequelize.HasManyCountAssociationsMixin;
    createP2pTrade: Sequelize.HasManyCreateAssociationMixin<P2pTradeInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getPaymentMethods: Sequelize.BelongsToManyGetAssociationsMixin<P2pPaymentMethodInstance>;
    setPaymentMethods: Sequelize.BelongsToManySetAssociationsMixin<P2pPaymentMethodInstance, string>;
    addP2pPaymentMethod: Sequelize.BelongsToManyAddAssociationMixin<P2pPaymentMethodInstance, string>;
    addPaymentMethods: Sequelize.BelongsToManyAddAssociationsMixin<P2pPaymentMethodInstance, string>;
    removeP2pPaymentMethod: Sequelize.BelongsToManyRemoveAssociationMixin<P2pPaymentMethodInstance, string>;
    removePaymentMethods: Sequelize.BelongsToManyRemoveAssociationsMixin<P2pPaymentMethodInstance, string>;
    hasP2pPaymentMethod: Sequelize.BelongsToManyHasAssociationMixin<P2pPaymentMethodInstance, string>;
    hasPaymentMethods: Sequelize.BelongsToManyHasAssociationsMixin<P2pPaymentMethodInstance, string>;
    countPaymentMethods: Sequelize.BelongsToManyCountAssociationsMixin;
    createP2pPaymentMethod: Sequelize.BelongsToManyCreateAssociationMixin<P2pPaymentMethodInstance>;
  }

  // ========================================
  // P2pOfferFlag
  // ========================================

  interface P2pOfferFlagAttributes {
    id: string;
    offerId: string;
    isFlagged: boolean;
    reason?: string | null;
    flaggedAt: Date;
    flaggedById?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type P2pOfferFlagCreationAttributes = Optional<P2pOfferFlagAttributes, "id" | "isFlagged" | "reason" | "flaggedAt" | "flaggedById" | "createdAt" | "updatedAt" | "deletedAt">;

  interface P2pOfferFlagInstance extends Model<P2pOfferFlagAttributes, P2pOfferFlagCreationAttributes>, P2pOfferFlagAttributes {
    offer?: P2pOfferInstance;
    flaggedBy?: UserInstance;
    getOffer: Sequelize.BelongsToGetAssociationMixin<P2pOfferInstance>;
    setOffer: Sequelize.BelongsToSetAssociationMixin<P2pOfferInstance, string>;
    createOffer: Sequelize.BelongsToCreateAssociationMixin<P2pOfferInstance>;
    getFlaggedBy: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setFlaggedBy: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createFlaggedBy: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // P2pOfferPaymentMethod
  // ========================================

  interface P2pOfferPaymentMethodAttributes {
    offerId: string;
    paymentMethodId: string;
  }

  type P2pOfferPaymentMethodCreationAttributes = P2pOfferPaymentMethodAttributes;

  interface P2pOfferPaymentMethodInstance extends Model<P2pOfferPaymentMethodAttributes, P2pOfferPaymentMethodCreationAttributes>, P2pOfferPaymentMethodAttributes {
  }

  // ========================================
  // P2pPaymentMethod
  // ========================================

  interface P2pPaymentMethodAttributes {
    id: string;
    userId?: string;
    name: string;
    icon: string;
    description?: string | null;
    instructions?: string | null;
    metadata?: Record<string, string>;
    processingTime?: string | null;
    fees?: string | null;
    available: boolean;
    isGlobal: boolean;
    popularityRank: number;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type P2pPaymentMethodCreationAttributes = Optional<P2pPaymentMethodAttributes, "id" | "userId" | "description" | "instructions" | "metadata" | "processingTime" | "fees" | "available" | "isGlobal" | "popularityRank" | "createdAt" | "updatedAt" | "deletedAt">;

  interface P2pPaymentMethodInstance extends Model<P2pPaymentMethodAttributes, P2pPaymentMethodCreationAttributes>, P2pPaymentMethodAttributes {
    user?: UserInstance;
    offers?: P2pOfferInstance[];
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getOffers: Sequelize.BelongsToManyGetAssociationsMixin<P2pOfferInstance>;
    setOffers: Sequelize.BelongsToManySetAssociationsMixin<P2pOfferInstance, string>;
    addP2pOffer: Sequelize.BelongsToManyAddAssociationMixin<P2pOfferInstance, string>;
    addOffers: Sequelize.BelongsToManyAddAssociationsMixin<P2pOfferInstance, string>;
    removeP2pOffer: Sequelize.BelongsToManyRemoveAssociationMixin<P2pOfferInstance, string>;
    removeOffers: Sequelize.BelongsToManyRemoveAssociationsMixin<P2pOfferInstance, string>;
    hasP2pOffer: Sequelize.BelongsToManyHasAssociationMixin<P2pOfferInstance, string>;
    hasOffers: Sequelize.BelongsToManyHasAssociationsMixin<P2pOfferInstance, string>;
    countOffers: Sequelize.BelongsToManyCountAssociationsMixin;
    createP2pOffer: Sequelize.BelongsToManyCreateAssociationMixin<P2pOfferInstance>;
  }

  // ========================================
  // P2pReview
  // ========================================

  interface P2pReviewAttributes {
    id: string;
    reviewerId: string;
    revieweeId: string;
    tradeId?: string;
    communicationRating: number;
    speedRating: number;
    trustRating: number;
    comment?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type P2pReviewCreationAttributes = Optional<P2pReviewAttributes, "id" | "tradeId" | "comment" | "createdAt" | "updatedAt" | "deletedAt">;

  interface P2pReviewInstance extends Model<P2pReviewAttributes, P2pReviewCreationAttributes>, P2pReviewAttributes {
    reviewer?: UserInstance;
    reviewee?: UserInstance;
    trade?: P2pTradeInstance;
    getReviewer: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setReviewer: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createReviewer: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getReviewee: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setReviewee: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createReviewee: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getTrade: Sequelize.BelongsToGetAssociationMixin<P2pTradeInstance>;
    setTrade: Sequelize.BelongsToSetAssociationMixin<P2pTradeInstance, string>;
    createTrade: Sequelize.BelongsToCreateAssociationMixin<P2pTradeInstance>;
  }

  // ========================================
  // P2pTrade
  // ========================================

  interface P2pTradeAttributes {
    id: string;
    offerId: string;
    buyerId: string;
    sellerId: string;
    type: "BUY" | "SELL";
    currency: string;
    amount: number;
    price: number;
    total: number;
    status: "PENDING" | "PAYMENT_SENT" | "COMPLETED" | "CANCELLED" | "DISPUTED" | "EXPIRED";
    paymentMethod: string;
    paymentDetails?: any | null;
    timeline?: any | null;
    terms?: string | null;
    escrowFee?: string | null;
    escrowTime?: string | null;
    paymentConfirmedAt?: Date | null;
    paymentReference?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type P2pTradeCreationAttributes = Optional<P2pTradeAttributes, "id" | "paymentDetails" | "timeline" | "terms" | "escrowFee" | "escrowTime" | "paymentConfirmedAt" | "paymentReference" | "createdAt" | "updatedAt" | "deletedAt">;

  interface P2pTradeInstance extends Model<P2pTradeAttributes, P2pTradeCreationAttributes>, P2pTradeAttributes {
    dispute?: P2pDisputeInstance;
    reviews?: P2pReviewInstance[];
    buyer?: UserInstance;
    seller?: UserInstance;
    offer?: P2pOfferInstance;
    paymentMethodDetails?: P2pPaymentMethodInstance;
    getDispute: Sequelize.HasOneGetAssociationMixin<P2pDisputeInstance>;
    setDispute: Sequelize.HasOneSetAssociationMixin<P2pDisputeInstance, string>;
    createDispute: Sequelize.HasOneCreateAssociationMixin<P2pDisputeInstance>;
    getReviews: Sequelize.HasManyGetAssociationsMixin<P2pReviewInstance>;
    setReviews: Sequelize.HasManySetAssociationsMixin<P2pReviewInstance, string>;
    addP2pReview: Sequelize.HasManyAddAssociationMixin<P2pReviewInstance, string>;
    addReviews: Sequelize.HasManyAddAssociationsMixin<P2pReviewInstance, string>;
    removeP2pReview: Sequelize.HasManyRemoveAssociationMixin<P2pReviewInstance, string>;
    removeReviews: Sequelize.HasManyRemoveAssociationsMixin<P2pReviewInstance, string>;
    hasP2pReview: Sequelize.HasManyHasAssociationMixin<P2pReviewInstance, string>;
    hasReviews: Sequelize.HasManyHasAssociationsMixin<P2pReviewInstance, string>;
    countReviews: Sequelize.HasManyCountAssociationsMixin;
    createP2pReview: Sequelize.HasManyCreateAssociationMixin<P2pReviewInstance>;
    getBuyer: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setBuyer: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createBuyer: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getSeller: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setSeller: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createSeller: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getOffer: Sequelize.BelongsToGetAssociationMixin<P2pOfferInstance>;
    setOffer: Sequelize.BelongsToSetAssociationMixin<P2pOfferInstance, string>;
    createOffer: Sequelize.BelongsToCreateAssociationMixin<P2pOfferInstance>;
    getPaymentMethodDetails: Sequelize.BelongsToGetAssociationMixin<P2pPaymentMethodInstance>;
    setPaymentMethodDetails: Sequelize.BelongsToSetAssociationMixin<P2pPaymentMethodInstance, string>;
    createPaymentMethodDetails: Sequelize.BelongsToCreateAssociationMixin<P2pPaymentMethodInstance>;
  }

  // ========================================
  // Page
  // ========================================

  interface PageAttributes {
    id: string;
    slug: string;
    path: string;
    title: string;
    content: string;
    description?: string | null;
    image?: string | null;
    status: "PUBLISHED" | "DRAFT";
    visits: number;
    order: number;
    isHome: boolean;
    isBuilderPage: boolean;
    template?: string | null;
    category?: string | null;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string | null;
    ogImage?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    settings?: string;
    customCss?: string | null;
    customJs?: string | null;
    lastModifiedBy?: string | null;
    publishedAt?: Date | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type PageCreationAttributes = Optional<PageAttributes, "id" | "path" | "description" | "image" | "visits" | "order" | "isBuilderPage" | "template" | "category" | "seoTitle" | "seoDescription" | "seoKeywords" | "ogImage" | "ogTitle" | "ogDescription" | "settings" | "customCss" | "customJs" | "lastModifiedBy" | "publishedAt" | "createdAt" | "deletedAt" | "updatedAt">;

  interface PageInstance extends Model<PageAttributes, PageCreationAttributes>, PageAttributes {
  }

  // ========================================
  // Permission
  // ========================================

  interface PermissionAttributes {
    id: number;
    name: string;
  }

  type PermissionCreationAttributes = Optional<PermissionAttributes, "id">;

  interface PermissionInstance extends Model<PermissionAttributes, PermissionCreationAttributes>, PermissionAttributes {
    roles?: RoleInstance[];
    getRoles: Sequelize.BelongsToManyGetAssociationsMixin<RoleInstance>;
    setRoles: Sequelize.BelongsToManySetAssociationsMixin<RoleInstance, string>;
    addRole: Sequelize.BelongsToManyAddAssociationMixin<RoleInstance, string>;
    addRoles: Sequelize.BelongsToManyAddAssociationsMixin<RoleInstance, string>;
    removeRole: Sequelize.BelongsToManyRemoveAssociationMixin<RoleInstance, string>;
    removeRoles: Sequelize.BelongsToManyRemoveAssociationsMixin<RoleInstance, string>;
    hasRole: Sequelize.BelongsToManyHasAssociationMixin<RoleInstance, string>;
    hasRoles: Sequelize.BelongsToManyHasAssociationsMixin<RoleInstance, string>;
    countRoles: Sequelize.BelongsToManyCountAssociationsMixin;
    createRole: Sequelize.BelongsToManyCreateAssociationMixin<RoleInstance>;
  }

  // ========================================
  // Post
  // ========================================

  interface PostAttributes {
    id: string;
    title: string;
    content: string;
    categoryId: string;
    authorId: string;
    slug: string;
    description?: string | null;
    status: "PUBLISHED" | "DRAFT";
    image?: string | null;
    views?: number | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type PostCreationAttributes = Optional<PostAttributes, "id" | "description" | "image" | "views" | "createdAt" | "deletedAt" | "updatedAt">;

  interface PostInstance extends Model<PostAttributes, PostCreationAttributes>, PostAttributes {
    comments?: CommentInstance[];
    postTags?: PostTagInstance[];
    author?: AuthorInstance;
    category?: CategoryInstance;
    tags?: TagInstance[];
    getComments: Sequelize.HasManyGetAssociationsMixin<CommentInstance>;
    setComments: Sequelize.HasManySetAssociationsMixin<CommentInstance, string>;
    addComment: Sequelize.HasManyAddAssociationMixin<CommentInstance, string>;
    addComments: Sequelize.HasManyAddAssociationsMixin<CommentInstance, string>;
    removeComment: Sequelize.HasManyRemoveAssociationMixin<CommentInstance, string>;
    removeComments: Sequelize.HasManyRemoveAssociationsMixin<CommentInstance, string>;
    hasComment: Sequelize.HasManyHasAssociationMixin<CommentInstance, string>;
    hasComments: Sequelize.HasManyHasAssociationsMixin<CommentInstance, string>;
    countComments: Sequelize.HasManyCountAssociationsMixin;
    createComment: Sequelize.HasManyCreateAssociationMixin<CommentInstance>;
    getPostTags: Sequelize.HasManyGetAssociationsMixin<PostTagInstance>;
    setPostTags: Sequelize.HasManySetAssociationsMixin<PostTagInstance, string>;
    addPostTag: Sequelize.HasManyAddAssociationMixin<PostTagInstance, string>;
    addPostTags: Sequelize.HasManyAddAssociationsMixin<PostTagInstance, string>;
    removePostTag: Sequelize.HasManyRemoveAssociationMixin<PostTagInstance, string>;
    removePostTags: Sequelize.HasManyRemoveAssociationsMixin<PostTagInstance, string>;
    hasPostTag: Sequelize.HasManyHasAssociationMixin<PostTagInstance, string>;
    hasPostTags: Sequelize.HasManyHasAssociationsMixin<PostTagInstance, string>;
    countPostTags: Sequelize.HasManyCountAssociationsMixin;
    createPostTag: Sequelize.HasManyCreateAssociationMixin<PostTagInstance>;
    getAuthor: Sequelize.BelongsToGetAssociationMixin<AuthorInstance>;
    setAuthor: Sequelize.BelongsToSetAssociationMixin<AuthorInstance, string>;
    createAuthor: Sequelize.BelongsToCreateAssociationMixin<AuthorInstance>;
    getCategory: Sequelize.BelongsToGetAssociationMixin<CategoryInstance>;
    setCategory: Sequelize.BelongsToSetAssociationMixin<CategoryInstance, string>;
    createCategory: Sequelize.BelongsToCreateAssociationMixin<CategoryInstance>;
    getTags: Sequelize.BelongsToManyGetAssociationsMixin<TagInstance>;
    setTags: Sequelize.BelongsToManySetAssociationsMixin<TagInstance, string>;
    addTag: Sequelize.BelongsToManyAddAssociationMixin<TagInstance, string>;
    addTags: Sequelize.BelongsToManyAddAssociationsMixin<TagInstance, string>;
    removeTag: Sequelize.BelongsToManyRemoveAssociationMixin<TagInstance, string>;
    removeTags: Sequelize.BelongsToManyRemoveAssociationsMixin<TagInstance, string>;
    hasTag: Sequelize.BelongsToManyHasAssociationMixin<TagInstance, string>;
    hasTags: Sequelize.BelongsToManyHasAssociationsMixin<TagInstance, string>;
    countTags: Sequelize.BelongsToManyCountAssociationsMixin;
    createTag: Sequelize.BelongsToManyCreateAssociationMixin<TagInstance>;
  }

  // ========================================
  // PostTag
  // ========================================

  interface PostTagAttributes {
    id: string;
    postId: string;
    tagId: string;
  }

  type PostTagCreationAttributes = Optional<PostTagAttributes, "id">;

  interface PostTagInstance extends Model<PostTagAttributes, PostTagCreationAttributes>, PostTagAttributes {
    post?: PostInstance;
    tag?: TagInstance;
    getPost: Sequelize.BelongsToGetAssociationMixin<PostInstance>;
    setPost: Sequelize.BelongsToSetAssociationMixin<PostInstance, string>;
    createPost: Sequelize.BelongsToCreateAssociationMixin<PostInstance>;
    getTag: Sequelize.BelongsToGetAssociationMixin<TagInstance>;
    setTag: Sequelize.BelongsToSetAssociationMixin<TagInstance, string>;
    createTag: Sequelize.BelongsToCreateAssociationMixin<TagInstance>;
  }

  // ========================================
  // ProviderUser
  // ========================================

  interface ProviderUserAttributes {
    id: string;
    provider: "GOOGLE" | "WALLET";
    providerUserId: string;
    userId: string;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type ProviderUserCreationAttributes = Optional<ProviderUserAttributes, "id" | "createdAt" | "deletedAt" | "updatedAt">;

  interface ProviderUserInstance extends Model<ProviderUserAttributes, ProviderUserCreationAttributes>, ProviderUserAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // Role
  // ========================================

  interface RoleAttributes {
    id: number;
    name: string;
  }

  type RoleCreationAttributes = Optional<RoleAttributes, "id">;

  interface RoleInstance extends Model<RoleAttributes, RoleCreationAttributes>, RoleAttributes {
    users?: UserInstance[];
    permissions?: PermissionInstance[];
    getUsers: Sequelize.HasManyGetAssociationsMixin<UserInstance>;
    setUsers: Sequelize.HasManySetAssociationsMixin<UserInstance, string>;
    addUser: Sequelize.HasManyAddAssociationMixin<UserInstance, string>;
    addUsers: Sequelize.HasManyAddAssociationsMixin<UserInstance, string>;
    removeUser: Sequelize.HasManyRemoveAssociationMixin<UserInstance, string>;
    removeUsers: Sequelize.HasManyRemoveAssociationsMixin<UserInstance, string>;
    hasUser: Sequelize.HasManyHasAssociationMixin<UserInstance, string>;
    hasUsers: Sequelize.HasManyHasAssociationsMixin<UserInstance, string>;
    countUsers: Sequelize.HasManyCountAssociationsMixin;
    createUser: Sequelize.HasManyCreateAssociationMixin<UserInstance>;
    getPermissions: Sequelize.BelongsToManyGetAssociationsMixin<PermissionInstance>;
    setPermissions: Sequelize.BelongsToManySetAssociationsMixin<PermissionInstance, string>;
    addPermission: Sequelize.BelongsToManyAddAssociationMixin<PermissionInstance, string>;
    addPermissions: Sequelize.BelongsToManyAddAssociationsMixin<PermissionInstance, string>;
    removePermission: Sequelize.BelongsToManyRemoveAssociationMixin<PermissionInstance, string>;
    removePermissions: Sequelize.BelongsToManyRemoveAssociationsMixin<PermissionInstance, string>;
    hasPermission: Sequelize.BelongsToManyHasAssociationMixin<PermissionInstance, string>;
    hasPermissions: Sequelize.BelongsToManyHasAssociationsMixin<PermissionInstance, string>;
    countPermissions: Sequelize.BelongsToManyCountAssociationsMixin;
    createPermission: Sequelize.BelongsToManyCreateAssociationMixin<PermissionInstance>;
  }

  // ========================================
  // RolePermission
  // ========================================

  interface RolePermissionAttributes {
    id: number;
    roleId: number;
    permissionId: number;
  }

  type RolePermissionCreationAttributes = Optional<RolePermissionAttributes, "id">;

  interface RolePermissionInstance extends Model<RolePermissionAttributes, RolePermissionCreationAttributes>, RolePermissionAttributes {
    role?: RoleInstance;
    permission?: PermissionInstance;
    getRole: Sequelize.BelongsToGetAssociationMixin<RoleInstance>;
    setRole: Sequelize.BelongsToSetAssociationMixin<RoleInstance, string>;
    createRole: Sequelize.BelongsToCreateAssociationMixin<RoleInstance>;
    getPermission: Sequelize.BelongsToGetAssociationMixin<PermissionInstance>;
    setPermission: Sequelize.BelongsToSetAssociationMixin<PermissionInstance, string>;
    createPermission: Sequelize.BelongsToCreateAssociationMixin<PermissionInstance>;
  }

  // ========================================
  // Settings
  // ========================================

  interface SettingsAttributes {
    key: string;
    value: string | null;
  }

  type SettingsCreationAttributes = Optional<SettingsAttributes, "value">;

  interface SettingsInstance extends Model<SettingsAttributes, SettingsCreationAttributes>, SettingsAttributes {
  }

  // ========================================
  // Slider
  // ========================================

  interface SliderAttributes {
    id: string;
    image: string;
    link?: string | null;
    status?: boolean | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
    deletedAt?: Date | null;
  }

  type SliderCreationAttributes = Optional<SliderAttributes, "id" | "link" | "status" | "createdAt" | "updatedAt" | "deletedAt">;

  interface SliderInstance extends Model<SliderAttributes, SliderCreationAttributes>, SliderAttributes {
  }

  // ========================================
  // StakingAdminActivity
  // ========================================

  interface StakingAdminActivityAttributes {
    id: string;
    userId: string;
    action: "create" | "update" | "delete" | "approve" | "reject" | "distribute";
    type: "pool" | "position" | "earnings" | "settings" | "withdrawal";
    relatedId: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type StakingAdminActivityCreationAttributes = Optional<StakingAdminActivityAttributes, "id" | "createdAt" | "updatedAt" | "deletedAt">;

  interface StakingAdminActivityInstance extends Model<StakingAdminActivityAttributes, StakingAdminActivityCreationAttributes>, StakingAdminActivityAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // StakingAdminEarning
  // ========================================

  interface StakingAdminEarningAttributes {
    id: string;
    poolId: string;
    amount: number;
    isClaimed: boolean;
    type: "PLATFORM_FEE" | "EARLY_WITHDRAWAL_FEE" | "PERFORMANCE_FEE" | "OTHER";
    currency: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type StakingAdminEarningCreationAttributes = Optional<StakingAdminEarningAttributes, "id" | "isClaimed" | "createdAt" | "updatedAt" | "deletedAt">;

  interface StakingAdminEarningInstance extends Model<StakingAdminEarningAttributes, StakingAdminEarningCreationAttributes>, StakingAdminEarningAttributes {
    pool?: StakingPoolInstance;
    getPool: Sequelize.BelongsToGetAssociationMixin<StakingPoolInstance>;
    setPool: Sequelize.BelongsToSetAssociationMixin<StakingPoolInstance, string>;
    createPool: Sequelize.BelongsToCreateAssociationMixin<StakingPoolInstance>;
  }

  // ========================================
  // StakingEarningRecord
  // ========================================

  interface StakingEarningRecordAttributes {
    id: string;
    positionId: string;
    amount: number;
    type: "REGULAR" | "BONUS" | "REFERRAL";
    description: string;
    isClaimed: boolean;
    claimedAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type StakingEarningRecordCreationAttributes = Optional<StakingEarningRecordAttributes, "id" | "isClaimed" | "claimedAt" | "createdAt" | "updatedAt" | "deletedAt">;

  interface StakingEarningRecordInstance extends Model<StakingEarningRecordAttributes, StakingEarningRecordCreationAttributes>, StakingEarningRecordAttributes {
    position?: StakingPositionInstance;
    getPosition: Sequelize.BelongsToGetAssociationMixin<StakingPositionInstance>;
    setPosition: Sequelize.BelongsToSetAssociationMixin<StakingPositionInstance, string>;
    createPosition: Sequelize.BelongsToCreateAssociationMixin<StakingPositionInstance>;
  }

  // ========================================
  // StakingExternalPoolPerformance
  // ========================================

  interface StakingExternalPoolPerformanceAttributes {
    id: string;
    poolId: string;
    date: Date;
    apr: number;
    totalStaked: number;
    profit: number;
    notes: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type StakingExternalPoolPerformanceCreationAttributes = Optional<StakingExternalPoolPerformanceAttributes, "id" | "createdAt" | "updatedAt" | "deletedAt">;

  interface StakingExternalPoolPerformanceInstance extends Model<StakingExternalPoolPerformanceAttributes, StakingExternalPoolPerformanceCreationAttributes>, StakingExternalPoolPerformanceAttributes {
    pool?: StakingPoolInstance;
    getPool: Sequelize.BelongsToGetAssociationMixin<StakingPoolInstance>;
    setPool: Sequelize.BelongsToSetAssociationMixin<StakingPoolInstance, string>;
    createPool: Sequelize.BelongsToCreateAssociationMixin<StakingPoolInstance>;
  }

  // ========================================
  // StakingPool
  // ========================================

  interface StakingPoolAttributes {
    id: string;
    name: string;
    token: string;
    symbol: string;
    icon?: string | null;
    description: string;
    walletType: "FIAT" | "SPOT" | "ECO";
    walletChain?: string | null;
    apr: number;
    lockPeriod: number;
    minStake: number;
    maxStake: number | null;
    availableToStake: number;
    earlyWithdrawalFee: number;
    adminFeePercentage: number;
    status: "ACTIVE" | "INACTIVE" | "COMING_SOON";
    isPromoted: boolean;
    order: number;
    earningFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM";
    autoCompound: boolean;
    externalPoolUrl: string;
    profitSource: string;
    fundAllocation: string;
    risks: string;
    rewards: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type StakingPoolCreationAttributes = Optional<StakingPoolAttributes, "id" | "icon" | "walletChain" | "maxStake" | "isPromoted" | "autoCompound" | "createdAt" | "updatedAt" | "deletedAt">;

  interface StakingPoolInstance extends Model<StakingPoolAttributes, StakingPoolCreationAttributes>, StakingPoolAttributes {
    positions?: StakingPositionInstance[];
    adminEarnings?: StakingAdminEarningInstance[];
    performances?: StakingExternalPoolPerformanceInstance[];
    getPositions: Sequelize.HasManyGetAssociationsMixin<StakingPositionInstance>;
    setPositions: Sequelize.HasManySetAssociationsMixin<StakingPositionInstance, string>;
    addStakingPosition: Sequelize.HasManyAddAssociationMixin<StakingPositionInstance, string>;
    addPositions: Sequelize.HasManyAddAssociationsMixin<StakingPositionInstance, string>;
    removeStakingPosition: Sequelize.HasManyRemoveAssociationMixin<StakingPositionInstance, string>;
    removePositions: Sequelize.HasManyRemoveAssociationsMixin<StakingPositionInstance, string>;
    hasStakingPosition: Sequelize.HasManyHasAssociationMixin<StakingPositionInstance, string>;
    hasPositions: Sequelize.HasManyHasAssociationsMixin<StakingPositionInstance, string>;
    countPositions: Sequelize.HasManyCountAssociationsMixin;
    createStakingPosition: Sequelize.HasManyCreateAssociationMixin<StakingPositionInstance>;
    getAdminEarnings: Sequelize.HasManyGetAssociationsMixin<StakingAdminEarningInstance>;
    setAdminEarnings: Sequelize.HasManySetAssociationsMixin<StakingAdminEarningInstance, string>;
    addStakingAdminEarning: Sequelize.HasManyAddAssociationMixin<StakingAdminEarningInstance, string>;
    addAdminEarnings: Sequelize.HasManyAddAssociationsMixin<StakingAdminEarningInstance, string>;
    removeStakingAdminEarning: Sequelize.HasManyRemoveAssociationMixin<StakingAdminEarningInstance, string>;
    removeAdminEarnings: Sequelize.HasManyRemoveAssociationsMixin<StakingAdminEarningInstance, string>;
    hasStakingAdminEarning: Sequelize.HasManyHasAssociationMixin<StakingAdminEarningInstance, string>;
    hasAdminEarnings: Sequelize.HasManyHasAssociationsMixin<StakingAdminEarningInstance, string>;
    countAdminEarnings: Sequelize.HasManyCountAssociationsMixin;
    createStakingAdminEarning: Sequelize.HasManyCreateAssociationMixin<StakingAdminEarningInstance>;
    getPerformances: Sequelize.HasManyGetAssociationsMixin<StakingExternalPoolPerformanceInstance>;
    setPerformances: Sequelize.HasManySetAssociationsMixin<StakingExternalPoolPerformanceInstance, string>;
    addStakingExternalPoolPerformance: Sequelize.HasManyAddAssociationMixin<StakingExternalPoolPerformanceInstance, string>;
    addPerformances: Sequelize.HasManyAddAssociationsMixin<StakingExternalPoolPerformanceInstance, string>;
    removeStakingExternalPoolPerformance: Sequelize.HasManyRemoveAssociationMixin<StakingExternalPoolPerformanceInstance, string>;
    removePerformances: Sequelize.HasManyRemoveAssociationsMixin<StakingExternalPoolPerformanceInstance, string>;
    hasStakingExternalPoolPerformance: Sequelize.HasManyHasAssociationMixin<StakingExternalPoolPerformanceInstance, string>;
    hasPerformances: Sequelize.HasManyHasAssociationsMixin<StakingExternalPoolPerformanceInstance, string>;
    countPerformances: Sequelize.HasManyCountAssociationsMixin;
    createStakingExternalPoolPerformance: Sequelize.HasManyCreateAssociationMixin<StakingExternalPoolPerformanceInstance>;
  }

  // ========================================
  // StakingPosition
  // ========================================

  interface StakingPositionAttributes {
    id: string;
    userId: string;
    poolId: string;
    amount: number;
    startDate: Date;
    endDate: Date;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "PENDING_WITHDRAWAL";
    withdrawalRequested: boolean;
    withdrawalRequestDate: Date | null;
    adminNotes: string | null;
    completedAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type StakingPositionCreationAttributes = Optional<StakingPositionAttributes, "id" | "withdrawalRequested" | "withdrawalRequestDate" | "adminNotes" | "completedAt" | "createdAt" | "updatedAt" | "deletedAt">;

  interface StakingPositionInstance extends Model<StakingPositionAttributes, StakingPositionCreationAttributes>, StakingPositionAttributes {
    earningHistory?: StakingEarningRecordInstance[];
    pool?: StakingPoolInstance;
    user?: UserInstance;
    getEarningHistory: Sequelize.HasManyGetAssociationsMixin<StakingEarningRecordInstance>;
    setEarningHistory: Sequelize.HasManySetAssociationsMixin<StakingEarningRecordInstance, string>;
    addStakingEarningRecord: Sequelize.HasManyAddAssociationMixin<StakingEarningRecordInstance, string>;
    addEarningHistory: Sequelize.HasManyAddAssociationsMixin<StakingEarningRecordInstance, string>;
    removeStakingEarningRecord: Sequelize.HasManyRemoveAssociationMixin<StakingEarningRecordInstance, string>;
    removeEarningHistory: Sequelize.HasManyRemoveAssociationsMixin<StakingEarningRecordInstance, string>;
    hasStakingEarningRecord: Sequelize.HasManyHasAssociationMixin<StakingEarningRecordInstance, string>;
    hasEarningHistory: Sequelize.HasManyHasAssociationsMixin<StakingEarningRecordInstance, string>;
    countEarningHistory: Sequelize.HasManyCountAssociationsMixin;
    createStakingEarningRecord: Sequelize.HasManyCreateAssociationMixin<StakingEarningRecordInstance>;
    getPool: Sequelize.BelongsToGetAssociationMixin<StakingPoolInstance>;
    setPool: Sequelize.BelongsToSetAssociationMixin<StakingPoolInstance, string>;
    createPool: Sequelize.BelongsToCreateAssociationMixin<StakingPoolInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // SupportTicket
  // ========================================

  interface SupportTicketAttributes {
    id: string;
    userId: string;
    agentId?: string | null;
    agentName?: string | null;
    subject: string;
    importance: "LOW" | "MEDIUM" | "HIGH";
    status: "PENDING" | "OPEN" | "REPLIED" | "CLOSED";
    messages?: SupportMessage[] | null;
    type?: "LIVE" | "TICKET";
    tags?: string[] | null;
    responseTime?: number | null;
    satisfaction?: number | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type SupportTicketCreationAttributes = Optional<SupportTicketAttributes, "id" | "agentId" | "agentName" | "importance" | "status" | "messages" | "type" | "tags" | "responseTime" | "satisfaction" | "createdAt" | "deletedAt" | "updatedAt">;

  interface SupportTicketInstance extends Model<SupportTicketAttributes, SupportTicketCreationAttributes>, SupportTicketAttributes {
    user?: UserInstance;
    agent?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getAgent: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setAgent: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createAgent: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // Tag
  // ========================================

  interface TagAttributes {
    id: string;
    name: string;
    slug: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type TagCreationAttributes = Optional<TagAttributes, "id" | "createdAt" | "updatedAt" | "deletedAt">;

  interface TagInstance extends Model<TagAttributes, TagCreationAttributes>, TagAttributes {
    postTags?: PostTagInstance[];
    posts?: PostInstance[];
    getPostTags: Sequelize.HasManyGetAssociationsMixin<PostTagInstance>;
    setPostTags: Sequelize.HasManySetAssociationsMixin<PostTagInstance, string>;
    addPostTag: Sequelize.HasManyAddAssociationMixin<PostTagInstance, string>;
    addPostTags: Sequelize.HasManyAddAssociationsMixin<PostTagInstance, string>;
    removePostTag: Sequelize.HasManyRemoveAssociationMixin<PostTagInstance, string>;
    removePostTags: Sequelize.HasManyRemoveAssociationsMixin<PostTagInstance, string>;
    hasPostTag: Sequelize.HasManyHasAssociationMixin<PostTagInstance, string>;
    hasPostTags: Sequelize.HasManyHasAssociationsMixin<PostTagInstance, string>;
    countPostTags: Sequelize.HasManyCountAssociationsMixin;
    createPostTag: Sequelize.HasManyCreateAssociationMixin<PostTagInstance>;
    getPosts: Sequelize.BelongsToManyGetAssociationsMixin<PostInstance>;
    setPosts: Sequelize.BelongsToManySetAssociationsMixin<PostInstance, string>;
    addPost: Sequelize.BelongsToManyAddAssociationMixin<PostInstance, string>;
    addPosts: Sequelize.BelongsToManyAddAssociationsMixin<PostInstance, string>;
    removePost: Sequelize.BelongsToManyRemoveAssociationMixin<PostInstance, string>;
    removePosts: Sequelize.BelongsToManyRemoveAssociationsMixin<PostInstance, string>;
    hasPost: Sequelize.BelongsToManyHasAssociationMixin<PostInstance, string>;
    hasPosts: Sequelize.BelongsToManyHasAssociationsMixin<PostInstance, string>;
    countPosts: Sequelize.BelongsToManyCountAssociationsMixin;
    createPost: Sequelize.BelongsToManyCreateAssociationMixin<PostInstance>;
  }

  // ========================================
  // TradingBot
  // ========================================

  interface TradingBotAttributes {
    id: string;
    userId: string;
    name: string;
    description?: string | null;
    symbol: string;
    type: TradingBotType;
    mode: TradingBotMode;
    status: TradingBotStatus;
    strategyConfig: Record<string, any>;
    maxPositionSize: number;
    maxConcurrentTrades: number;
    dailyLossLimit?: number | null;
    dailyLossLimitPercent?: number | null;
    maxDrawdownPercent?: number | null;
    cooldownSeconds: number;
    stopLossPercent?: number | null;
    takeProfitPercent?: number | null;
    allocatedAmount: number;
    usedAmount: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalProfit: number;
    totalVolume: number;
    totalFees: number;
    dailyTrades: number;
    dailyProfit: number;
    dailyVolume: number;
    dailyResetAt?: Date | null;
    peakEquity: number;
    currentDrawdown: number;
    purchaseId?: string | null;
    lastTickAt?: Date | null;
    lastTradeAt?: Date | null;
    lastErrorAt?: Date | null;
    lastError?: string | null;
    errorCount: number;
    startedAt?: Date | null;
    stoppedAt?: Date | null;
    pausedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type TradingBotCreationAttributes = Optional<TradingBotAttributes, "id" | "description" | "strategyConfig" | "maxPositionSize" | "dailyLossLimit" | "dailyLossLimitPercent" | "maxDrawdownPercent" | "stopLossPercent" | "takeProfitPercent" | "allocatedAmount" | "usedAmount" | "totalTrades" | "winningTrades" | "losingTrades" | "totalProfit" | "totalVolume" | "totalFees" | "dailyTrades" | "dailyProfit" | "dailyVolume" | "dailyResetAt" | "peakEquity" | "currentDrawdown" | "purchaseId" | "lastTickAt" | "lastTradeAt" | "lastErrorAt" | "lastError" | "errorCount" | "startedAt" | "stoppedAt" | "pausedAt" | "createdAt" | "updatedAt" | "deletedAt">;

  interface TradingBotInstance extends Model<TradingBotAttributes, TradingBotCreationAttributes>, TradingBotAttributes {
    trades?: TradingBotTradeInstance[];
    orders?: TradingBotOrderInstance[];
    stats?: TradingBotStatsInstance[];
    auditLogs?: TradingBotAuditLogInstance[];
    user?: UserInstance;
    purchase?: TradingBotPurchaseInstance;
    getTrades: Sequelize.HasManyGetAssociationsMixin<TradingBotTradeInstance>;
    setTrades: Sequelize.HasManySetAssociationsMixin<TradingBotTradeInstance, string>;
    addTradingBotTrade: Sequelize.HasManyAddAssociationMixin<TradingBotTradeInstance, string>;
    addTrades: Sequelize.HasManyAddAssociationsMixin<TradingBotTradeInstance, string>;
    removeTradingBotTrade: Sequelize.HasManyRemoveAssociationMixin<TradingBotTradeInstance, string>;
    removeTrades: Sequelize.HasManyRemoveAssociationsMixin<TradingBotTradeInstance, string>;
    hasTradingBotTrade: Sequelize.HasManyHasAssociationMixin<TradingBotTradeInstance, string>;
    hasTrades: Sequelize.HasManyHasAssociationsMixin<TradingBotTradeInstance, string>;
    countTrades: Sequelize.HasManyCountAssociationsMixin;
    createTradingBotTrade: Sequelize.HasManyCreateAssociationMixin<TradingBotTradeInstance>;
    getOrders: Sequelize.HasManyGetAssociationsMixin<TradingBotOrderInstance>;
    setOrders: Sequelize.HasManySetAssociationsMixin<TradingBotOrderInstance, string>;
    addTradingBotOrder: Sequelize.HasManyAddAssociationMixin<TradingBotOrderInstance, string>;
    addOrders: Sequelize.HasManyAddAssociationsMixin<TradingBotOrderInstance, string>;
    removeTradingBotOrder: Sequelize.HasManyRemoveAssociationMixin<TradingBotOrderInstance, string>;
    removeOrders: Sequelize.HasManyRemoveAssociationsMixin<TradingBotOrderInstance, string>;
    hasTradingBotOrder: Sequelize.HasManyHasAssociationMixin<TradingBotOrderInstance, string>;
    hasOrders: Sequelize.HasManyHasAssociationsMixin<TradingBotOrderInstance, string>;
    countOrders: Sequelize.HasManyCountAssociationsMixin;
    createTradingBotOrder: Sequelize.HasManyCreateAssociationMixin<TradingBotOrderInstance>;
    getStats: Sequelize.HasManyGetAssociationsMixin<TradingBotStatsInstance>;
    setStats: Sequelize.HasManySetAssociationsMixin<TradingBotStatsInstance, string>;
    addTradingBotStats: Sequelize.HasManyAddAssociationMixin<TradingBotStatsInstance, string>;
    addStats: Sequelize.HasManyAddAssociationsMixin<TradingBotStatsInstance, string>;
    removeTradingBotStats: Sequelize.HasManyRemoveAssociationMixin<TradingBotStatsInstance, string>;
    removeStats: Sequelize.HasManyRemoveAssociationsMixin<TradingBotStatsInstance, string>;
    hasTradingBotStats: Sequelize.HasManyHasAssociationMixin<TradingBotStatsInstance, string>;
    hasStats: Sequelize.HasManyHasAssociationsMixin<TradingBotStatsInstance, string>;
    countStats: Sequelize.HasManyCountAssociationsMixin;
    createTradingBotStats: Sequelize.HasManyCreateAssociationMixin<TradingBotStatsInstance>;
    getAuditLogs: Sequelize.HasManyGetAssociationsMixin<TradingBotAuditLogInstance>;
    setAuditLogs: Sequelize.HasManySetAssociationsMixin<TradingBotAuditLogInstance, string>;
    addTradingBotAuditLog: Sequelize.HasManyAddAssociationMixin<TradingBotAuditLogInstance, string>;
    addAuditLogs: Sequelize.HasManyAddAssociationsMixin<TradingBotAuditLogInstance, string>;
    removeTradingBotAuditLog: Sequelize.HasManyRemoveAssociationMixin<TradingBotAuditLogInstance, string>;
    removeAuditLogs: Sequelize.HasManyRemoveAssociationsMixin<TradingBotAuditLogInstance, string>;
    hasTradingBotAuditLog: Sequelize.HasManyHasAssociationMixin<TradingBotAuditLogInstance, string>;
    hasAuditLogs: Sequelize.HasManyHasAssociationsMixin<TradingBotAuditLogInstance, string>;
    countAuditLogs: Sequelize.HasManyCountAssociationsMixin;
    createTradingBotAuditLog: Sequelize.HasManyCreateAssociationMixin<TradingBotAuditLogInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getPurchase: Sequelize.BelongsToGetAssociationMixin<TradingBotPurchaseInstance>;
    setPurchase: Sequelize.BelongsToSetAssociationMixin<TradingBotPurchaseInstance, string>;
    createPurchase: Sequelize.BelongsToCreateAssociationMixin<TradingBotPurchaseInstance>;
  }

  // ========================================
  // TradingBotAuditLog
  // ========================================

  interface TradingBotAuditLogAttributes {
    id: string;
    entityType: AuditEntityType;
    entityId: string;
    botId?: string | null;
    action: "BOT_CREATED" | "BOT_UPDATED" | "BOT_STARTED" | "BOT_STOPPED" | "BOT_PAUSED" | "BOT_RESUMED" | "BOT_DELETED" | "BOT_ERROR" | "TRADE_OPENED" | "TRADE_CLOSED" | "TRADE_FAILED" | "ORDER_PLACED" | "ORDER_CANCELLED" | "ORDER_FILLED" | "DAILY_LIMIT_REACHED" | "DRAWDOWN_LIMIT_REACHED" | "STOP_LOSS_TRIGGERED" | "TAKE_PROFIT_TRIGGERED" | "KILL_SWITCH_ACTIVATED" | "FUNDS_ALLOCATED" | "FUNDS_DEALLOCATED" | "STRATEGY_PURCHASED" | "STRATEGY_SUBMITTED" | "STRATEGY_APPROVED" | "STRATEGY_REJECTED" | "ADMIN_FORCE_STOP" | "ADMIN_CONFIG_CHANGE";
    userId?: string | null;
    adminId?: string | null;
    isSystem: boolean;
    oldValue?: Record<string, any> | null;
    newValue?: Record<string, any> | null;
    metadata?: Record<string, any> | null;
    reason?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt?: Date;
  }

  type TradingBotAuditLogCreationAttributes = Optional<TradingBotAuditLogAttributes, "id" | "botId" | "userId" | "adminId" | "isSystem" | "oldValue" | "newValue" | "metadata" | "reason" | "ipAddress" | "userAgent" | "createdAt">;

  interface TradingBotAuditLogInstance extends Model<TradingBotAuditLogAttributes, TradingBotAuditLogCreationAttributes>, TradingBotAuditLogAttributes {
    bot?: TradingBotInstance;
    user?: UserInstance;
    admin?: UserInstance;
    getBot: Sequelize.BelongsToGetAssociationMixin<TradingBotInstance>;
    setBot: Sequelize.BelongsToSetAssociationMixin<TradingBotInstance, string>;
    createBot: Sequelize.BelongsToCreateAssociationMixin<TradingBotInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getAdmin: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setAdmin: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createAdmin: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // TradingBotOrder
  // ========================================

  interface TradingBotOrderAttributes {
    id: string;
    botId: string;
    userId: string;
    tradeId?: string | null;
    ecosystemOrderId?: string | null;
    symbol: string;
    side: OrderSide;
    type: OrderType;
    status: OrderStatus;
    amount: number;
    price: number;
    stopPrice?: number | null;
    filledAmount: number;
    remainingAmount: number;
    purpose: OrderPurpose;
    gridLevel?: number | null;
    isPaper: boolean;
    expiresAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type TradingBotOrderCreationAttributes = Optional<TradingBotOrderAttributes, "id" | "tradeId" | "ecosystemOrderId" | "stopPrice" | "filledAmount" | "gridLevel" | "isPaper" | "expiresAt" | "createdAt" | "updatedAt">;

  interface TradingBotOrderInstance extends Model<TradingBotOrderAttributes, TradingBotOrderCreationAttributes>, TradingBotOrderAttributes {
    bot?: TradingBotInstance;
    user?: UserInstance;
    trade?: TradingBotTradeInstance;
    getBot: Sequelize.BelongsToGetAssociationMixin<TradingBotInstance>;
    setBot: Sequelize.BelongsToSetAssociationMixin<TradingBotInstance, string>;
    createBot: Sequelize.BelongsToCreateAssociationMixin<TradingBotInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getTrade: Sequelize.BelongsToGetAssociationMixin<TradingBotTradeInstance>;
    setTrade: Sequelize.BelongsToSetAssociationMixin<TradingBotTradeInstance, string>;
    createTrade: Sequelize.BelongsToCreateAssociationMixin<TradingBotTradeInstance>;
  }

  // ========================================
  // TradingBotPaperAccount
  // ========================================

  interface TradingBotPaperAccountAttributes {
    id: string;
    userId: string;
    currency: string;
    balance: number;
    initialBalance: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalProfit: number;
    totalVolume: number;
    highWaterMark: number;
    maxDrawdown: number;
    isActive: boolean;
    lastResetAt?: Date | null;
    resetCount: number;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type TradingBotPaperAccountCreationAttributes = Optional<TradingBotPaperAccountAttributes, "id" | "currency" | "totalTrades" | "winningTrades" | "losingTrades" | "totalProfit" | "totalVolume" | "highWaterMark" | "maxDrawdown" | "isActive" | "lastResetAt" | "resetCount" | "createdAt" | "updatedAt">;

  interface TradingBotPaperAccountInstance extends Model<TradingBotPaperAccountAttributes, TradingBotPaperAccountCreationAttributes>, TradingBotPaperAccountAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // TradingBotPurchase
  // ========================================

  interface TradingBotPurchaseAttributes {
    id: string;
    buyerId: string;
    strategyId: string;
    sellerId: string;
    status: PurchaseStatus;
    price: number;
    currency: string;
    platformFee: number;
    platformFeePercent: number;
    sellerAmount: number;
    transactionId?: string | null;
    walletId?: string | null;
    strategySnapshot: Record<string, any>;
    strategyVersion: string;
    timesUsed: number;
    lastUsedAt?: Date | null;
    rating?: number;
    review?: string | null;
    reviewedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type TradingBotPurchaseCreationAttributes = Optional<TradingBotPurchaseAttributes, "id" | "currency" | "transactionId" | "walletId" | "timesUsed" | "lastUsedAt" | "rating" | "review" | "reviewedAt" | "createdAt" | "updatedAt">;

  interface TradingBotPurchaseInstance extends Model<TradingBotPurchaseAttributes, TradingBotPurchaseCreationAttributes>, TradingBotPurchaseAttributes {
    bots?: TradingBotInstance[];
    buyer?: UserInstance;
    seller?: UserInstance;
    strategy?: TradingBotStrategyInstance;
    getBots: Sequelize.HasManyGetAssociationsMixin<TradingBotInstance>;
    setBots: Sequelize.HasManySetAssociationsMixin<TradingBotInstance, string>;
    addTradingBot: Sequelize.HasManyAddAssociationMixin<TradingBotInstance, string>;
    addBots: Sequelize.HasManyAddAssociationsMixin<TradingBotInstance, string>;
    removeTradingBot: Sequelize.HasManyRemoveAssociationMixin<TradingBotInstance, string>;
    removeBots: Sequelize.HasManyRemoveAssociationsMixin<TradingBotInstance, string>;
    hasTradingBot: Sequelize.HasManyHasAssociationMixin<TradingBotInstance, string>;
    hasBots: Sequelize.HasManyHasAssociationsMixin<TradingBotInstance, string>;
    countBots: Sequelize.HasManyCountAssociationsMixin;
    createTradingBot: Sequelize.HasManyCreateAssociationMixin<TradingBotInstance>;
    getBuyer: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setBuyer: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createBuyer: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getSeller: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setSeller: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createSeller: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getStrategy: Sequelize.BelongsToGetAssociationMixin<TradingBotStrategyInstance>;
    setStrategy: Sequelize.BelongsToSetAssociationMixin<TradingBotStrategyInstance, string>;
    createStrategy: Sequelize.BelongsToCreateAssociationMixin<TradingBotStrategyInstance>;
  }

  // ========================================
  // TradingBotStats
  // ========================================

  interface TradingBotStatsAttributes {
    id: string;
    botId: string;
    userId: string;
    date: string;
    trades: number;
    winningTrades: number;
    losingTrades: number;
    profit: number;
    volume: number;
    fees: number;
    startEquity?: number | null;
    endEquity?: number | null;
    highEquity?: number | null;
    lowEquity?: number | null;
    isPaper: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type TradingBotStatsCreationAttributes = Optional<TradingBotStatsAttributes, "id" | "trades" | "winningTrades" | "losingTrades" | "profit" | "volume" | "fees" | "startEquity" | "endEquity" | "highEquity" | "lowEquity" | "isPaper" | "createdAt" | "updatedAt">;

  interface TradingBotStatsInstance extends Model<TradingBotStatsAttributes, TradingBotStatsCreationAttributes>, TradingBotStatsAttributes {
    bot?: TradingBotInstance;
    user?: UserInstance;
    getBot: Sequelize.BelongsToGetAssociationMixin<TradingBotInstance>;
    setBot: Sequelize.BelongsToSetAssociationMixin<TradingBotInstance, string>;
    createBot: Sequelize.BelongsToCreateAssociationMixin<TradingBotInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // TradingBotStrategy
  // ========================================

  interface TradingBotStrategyAttributes {
    id: string;
    creatorId: string;
    name: string;
    slug: string;
    description: string;
    shortDescription?: string | null;
    icon?: string | null;
    coverImage?: string | null;
    type: StrategyType;
    category?: string | null;
    tags: string[];
    defaultConfig: Record<string, any>;
    customNodes?: Record<string, any> | null;
    recommendedSymbols: string[];
    recommendedTimeframe?: string | null;
    minAllocation?: number | null;
    riskLevel: RiskLevel;
    status: StrategyStatus;
    visibility: StrategyVisibility;
    price: number;
    currency: string;
    isFeatured: boolean;
    featuredOrder?: number | null;
    totalPurchases: number;
    totalUsers: number;
    avgRating?: number | null;
    totalRatings: number;
    totalRevenue: number;
    creatorRevenue: number;
    platformRevenue: number;
    reviewedAt?: Date | null;
    reviewedBy?: string | null;
    rejectionReason?: string | null;
    version: string;
    changelog?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type TradingBotStrategyCreationAttributes = Optional<TradingBotStrategyAttributes, "id" | "shortDescription" | "icon" | "coverImage" | "category" | "tags" | "customNodes" | "recommendedSymbols" | "recommendedTimeframe" | "minAllocation" | "price" | "currency" | "isFeatured" | "featuredOrder" | "totalPurchases" | "totalUsers" | "avgRating" | "totalRatings" | "totalRevenue" | "creatorRevenue" | "platformRevenue" | "reviewedAt" | "reviewedBy" | "rejectionReason" | "version" | "changelog" | "createdAt" | "updatedAt" | "deletedAt">;

  interface TradingBotStrategyInstance extends Model<TradingBotStrategyAttributes, TradingBotStrategyCreationAttributes>, TradingBotStrategyAttributes {
    purchases?: TradingBotPurchaseInstance[];
    creator?: UserInstance;
    getPurchases: Sequelize.HasManyGetAssociationsMixin<TradingBotPurchaseInstance>;
    setPurchases: Sequelize.HasManySetAssociationsMixin<TradingBotPurchaseInstance, string>;
    addTradingBotPurchase: Sequelize.HasManyAddAssociationMixin<TradingBotPurchaseInstance, string>;
    addPurchases: Sequelize.HasManyAddAssociationsMixin<TradingBotPurchaseInstance, string>;
    removeTradingBotPurchase: Sequelize.HasManyRemoveAssociationMixin<TradingBotPurchaseInstance, string>;
    removePurchases: Sequelize.HasManyRemoveAssociationsMixin<TradingBotPurchaseInstance, string>;
    hasTradingBotPurchase: Sequelize.HasManyHasAssociationMixin<TradingBotPurchaseInstance, string>;
    hasPurchases: Sequelize.HasManyHasAssociationsMixin<TradingBotPurchaseInstance, string>;
    countPurchases: Sequelize.HasManyCountAssociationsMixin;
    createTradingBotPurchase: Sequelize.HasManyCreateAssociationMixin<TradingBotPurchaseInstance>;
    getCreator: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setCreator: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createCreator: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // TradingBotStrategyReview
  // ========================================

  interface TradingBotStrategyReviewAttributes {
    id: string;
    userId: string;
    strategyId: string;
    rating: number;
    title: string;
    content: string;
    status: ReviewStatus;
    adminNote?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type TradingBotStrategyReviewCreationAttributes = Optional<TradingBotStrategyReviewAttributes, "id" | "adminNote" | "createdAt" | "updatedAt">;

  interface TradingBotStrategyReviewInstance extends Model<TradingBotStrategyReviewAttributes, TradingBotStrategyReviewCreationAttributes>, TradingBotStrategyReviewAttributes {
    reviewer?: UserInstance;
    strategy?: TradingBotStrategyInstance;
    getReviewer: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setReviewer: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createReviewer: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getStrategy: Sequelize.BelongsToGetAssociationMixin<TradingBotStrategyInstance>;
    setStrategy: Sequelize.BelongsToSetAssociationMixin<TradingBotStrategyInstance, string>;
    createStrategy: Sequelize.BelongsToCreateAssociationMixin<TradingBotStrategyInstance>;
  }

  // ========================================
  // TradingBotTrade
  // ========================================

  interface TradingBotTradeAttributes {
    id: string;
    botId: string;
    userId: string;
    ecosystemOrderId?: string | null;
    symbol: string;
    side: TradeSide;
    type: TradeType;
    status: TradeStatus;
    amount: number;
    price: number;
    cost: number;
    fee: number;
    feeCurrency?: string | null;
    executedAmount?: number | null;
    executedPrice?: number | null;
    executedCost?: number | null;
    entryPrice?: number | null;
    exitPrice?: number | null;
    profit?: number | null;
    profitPercent?: number | null;
    stopLossPrice?: number | null;
    takeProfitPrice?: number | null;
    stopLossTriggered: boolean;
    takeProfitTriggered: boolean;
    strategySignal?: string | null;
    strategyContext?: Record<string, any> | null;
    isPaper: boolean;
    openedAt?: Date | null;
    closedAt?: Date | null;
    errorMessage?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type TradingBotTradeCreationAttributes = Optional<TradingBotTradeAttributes, "id" | "ecosystemOrderId" | "fee" | "feeCurrency" | "executedAmount" | "executedPrice" | "executedCost" | "entryPrice" | "exitPrice" | "profit" | "profitPercent" | "stopLossPrice" | "takeProfitPrice" | "stopLossTriggered" | "takeProfitTriggered" | "strategySignal" | "strategyContext" | "isPaper" | "openedAt" | "closedAt" | "errorMessage" | "createdAt" | "updatedAt">;

  interface TradingBotTradeInstance extends Model<TradingBotTradeAttributes, TradingBotTradeCreationAttributes>, TradingBotTradeAttributes {
    bot?: TradingBotInstance;
    user?: UserInstance;
    getBot: Sequelize.BelongsToGetAssociationMixin<TradingBotInstance>;
    setBot: Sequelize.BelongsToSetAssociationMixin<TradingBotInstance, string>;
    createBot: Sequelize.BelongsToCreateAssociationMixin<TradingBotInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // Transaction
  // ========================================

  interface TransactionAttributes {
    id: string;
    userId: string;
    walletId: string;
    type: | "FAILED"
    | "DEPOSIT"
    | "WITHDRAW"
    | "OUTGOING_TRANSFER"
    | "INCOMING_TRANSFER"
    | "PAYMENT"
    | "REFUND"
    | "REFUND_WITHDRAWAL"
    | "BINARY_ORDER"
    | "BINARY_ORDER_WIN"
    | "EXCHANGE_ORDER"
    | "TRADE_CREDIT"
    | "FEE"
    | "INVESTMENT"
    | "INVESTMENT_ROI"
    | "AI_INVESTMENT"
    | "AI_INVESTMENT_ROI"
    | "INVOICE"
    | "FOREX_DEPOSIT"
    | "FOREX_WITHDRAW"
    | "FOREX_INVESTMENT"
    | "FOREX_INVESTMENT_ROI"
    | "ICO_CONTRIBUTION"
    | "REFERRAL_REWARD"
    | "STAKING"
    | "STAKING_REWARD"
    | "P2P_OFFER_TRANSFER"
    | "P2P_TRADE"
    | "NFT_PURCHASE"
    | "NFT_SALE"
    | "NFT_MINT"
    | "NFT_BURN"
    | "NFT_TRANSFER"
    | "NFT_AUCTION_BID"
    | "NFT_AUCTION_SETTLE"
    | "NFT_OFFER";
    status: | "PENDING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED"
    | "REJECTED"
    | "REFUNDED"
    | "FROZEN"
    | "PROCESSING"
    | "TIMEOUT";
    amount: number;
    fee?: number | null;
    description?: string | null;
    metadata?: any | null;
    referenceId?: string | null;
    trxId?: string | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type TransactionCreationAttributes = Optional<TransactionAttributes, "id" | "fee" | "description" | "metadata" | "referenceId" | "trxId" | "createdAt" | "deletedAt" | "updatedAt">;

  interface TransactionInstance extends Model<TransactionAttributes, TransactionCreationAttributes>, TransactionAttributes {
    adminProfit?: AdminProfitInstance;
    wallet?: WalletInstance;
    user?: UserInstance;
    getAdminProfit: Sequelize.HasOneGetAssociationMixin<AdminProfitInstance>;
    setAdminProfit: Sequelize.HasOneSetAssociationMixin<AdminProfitInstance, string>;
    createAdminProfit: Sequelize.HasOneCreateAssociationMixin<AdminProfitInstance>;
    getWallet: Sequelize.BelongsToGetAssociationMixin<WalletInstance>;
    setWallet: Sequelize.BelongsToSetAssociationMixin<WalletInstance, string>;
    createWallet: Sequelize.BelongsToCreateAssociationMixin<WalletInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // TwoFactor
  // ========================================

  interface TwoFactorAttributes {
    id: string;
    userId: string;
    secret: string;
    type: "EMAIL" | "SMS" | "APP";
    enabled: boolean;
    recoveryCodes?: string | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type TwoFactorCreationAttributes = Optional<TwoFactorAttributes, "id" | "enabled" | "recoveryCodes" | "createdAt" | "deletedAt" | "updatedAt">;

  interface TwoFactorInstance extends Model<TwoFactorAttributes, TwoFactorCreationAttributes>, TwoFactorAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // User
  // ========================================

  interface UserAttributes {
    id: string;
    email?: string;
    password?: string;
    avatar?: string | null;
    firstName?: string;
    lastName?: string;
    emailVerified: boolean;
    phone?: string;
    phoneVerified: boolean;
    roleId: number | null;
    profile?: string | null;
    lastLogin?: Date | null;
    lastFailedLogin?: Date | null;
    failedLoginAttempts?: number | null;
    walletAddress?: string;
    walletProvider?: string;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BANNED" | null;
    settings?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    pushTokens?: any;
    webPushSubscriptions?: any[];
  } | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type UserCreationAttributes = Optional<UserAttributes, "id" | "email" | "password" | "avatar" | "firstName" | "lastName" | "emailVerified" | "phone" | "phoneVerified" | "roleId" | "profile" | "lastLogin" | "lastFailedLogin" | "failedLoginAttempts" | "walletAddress" | "walletProvider" | "status" | "settings" | "createdAt" | "deletedAt" | "updatedAt">;

  interface UserInstance extends Model<UserAttributes, UserCreationAttributes>, UserAttributes {
    author?: AuthorInstance;
    ecommerceShippingAddress?: EcommerceShippingAddressInstance;
    twoFactor?: TwoFactorInstance;
    nftCreator?: NftCreatorInstance;
    aiInvestments?: AiInvestmentInstance[];
    binaryOrder?: BinaryOrderInstance[];
    comments?: CommentInstance[];
    ecommerceOrders?: EcommerceOrderInstance[];
    ecommerceReviews?: EcommerceReviewInstance[];
    ecommerceUserDiscounts?: EcommerceUserDiscountInstance[];
    ecommerceWishlists?: EcommerceWishlistInstance[];
    exchangeOrder?: ExchangeOrderInstance[];
    exchangeWatchlists?: ExchangeWatchlistInstance[];
    forexAccounts?: ForexAccountInstance[];
    forexInvestments?: ForexInvestmentInstance[];
    investments?: InvestmentInstance[];
    kycApplications?: KycApplicationInstance[];
    referredReferrals?: MlmReferralInstance[];
    referrerReferrals?: MlmReferralInstance[];
    referralRewards?: MlmReferralRewardInstance[];
    notifications?: NotificationInstance[];
    providers?: ProviderUserInstance[];
    supportTickets?: SupportTicketInstance[];
    agentSupportTickets?: SupportTicketInstance[];
    transactions?: TransactionInstance[];
    wallets?: WalletInstance[];
    walletPnls?: WalletPnlInstance[];
    icoTransactions?: IcoTransactionInstance[];
    icoAdminActivities?: IcoAdminActivityInstance[];
    p2pTrades?: P2pTradeInstance[];
    p2pOffers?: P2pOfferInstance[];
    p2pReviews?: P2pReviewInstance[];
    blocks?: UserBlockInstance[];
    adminBlocks?: UserBlockInstance[];
    role?: RoleInstance;
    getAuthor: Sequelize.HasOneGetAssociationMixin<AuthorInstance>;
    setAuthor: Sequelize.HasOneSetAssociationMixin<AuthorInstance, string>;
    createAuthor: Sequelize.HasOneCreateAssociationMixin<AuthorInstance>;
    getEcommerceShippingAddress: Sequelize.HasOneGetAssociationMixin<EcommerceShippingAddressInstance>;
    setEcommerceShippingAddress: Sequelize.HasOneSetAssociationMixin<EcommerceShippingAddressInstance, string>;
    createEcommerceShippingAddress: Sequelize.HasOneCreateAssociationMixin<EcommerceShippingAddressInstance>;
    getTwoFactor: Sequelize.HasOneGetAssociationMixin<TwoFactorInstance>;
    setTwoFactor: Sequelize.HasOneSetAssociationMixin<TwoFactorInstance, string>;
    createTwoFactor: Sequelize.HasOneCreateAssociationMixin<TwoFactorInstance>;
    getNftCreator: Sequelize.HasOneGetAssociationMixin<NftCreatorInstance>;
    setNftCreator: Sequelize.HasOneSetAssociationMixin<NftCreatorInstance, string>;
    createNftCreator: Sequelize.HasOneCreateAssociationMixin<NftCreatorInstance>;
    getAiInvestments: Sequelize.HasManyGetAssociationsMixin<AiInvestmentInstance>;
    setAiInvestments: Sequelize.HasManySetAssociationsMixin<AiInvestmentInstance, string>;
    addAiInvestment: Sequelize.HasManyAddAssociationMixin<AiInvestmentInstance, string>;
    addAiInvestments: Sequelize.HasManyAddAssociationsMixin<AiInvestmentInstance, string>;
    removeAiInvestment: Sequelize.HasManyRemoveAssociationMixin<AiInvestmentInstance, string>;
    removeAiInvestments: Sequelize.HasManyRemoveAssociationsMixin<AiInvestmentInstance, string>;
    hasAiInvestment: Sequelize.HasManyHasAssociationMixin<AiInvestmentInstance, string>;
    hasAiInvestments: Sequelize.HasManyHasAssociationsMixin<AiInvestmentInstance, string>;
    countAiInvestments: Sequelize.HasManyCountAssociationsMixin;
    createAiInvestment: Sequelize.HasManyCreateAssociationMixin<AiInvestmentInstance>;
    getBinaryOrder: Sequelize.HasManyGetAssociationsMixin<BinaryOrderInstance>;
    setBinaryOrder: Sequelize.HasManySetAssociationsMixin<BinaryOrderInstance, string>;
    addBinaryOrder: Sequelize.HasManyAddAssociationMixin<BinaryOrderInstance, string>;
    removeBinaryOrder: Sequelize.HasManyRemoveAssociationMixin<BinaryOrderInstance, string>;
    hasBinaryOrder: Sequelize.HasManyHasAssociationMixin<BinaryOrderInstance, string>;
    countBinaryOrder: Sequelize.HasManyCountAssociationsMixin;
    createBinaryOrder: Sequelize.HasManyCreateAssociationMixin<BinaryOrderInstance>;
    getComments: Sequelize.HasManyGetAssociationsMixin<CommentInstance>;
    setComments: Sequelize.HasManySetAssociationsMixin<CommentInstance, string>;
    addComment: Sequelize.HasManyAddAssociationMixin<CommentInstance, string>;
    addComments: Sequelize.HasManyAddAssociationsMixin<CommentInstance, string>;
    removeComment: Sequelize.HasManyRemoveAssociationMixin<CommentInstance, string>;
    removeComments: Sequelize.HasManyRemoveAssociationsMixin<CommentInstance, string>;
    hasComment: Sequelize.HasManyHasAssociationMixin<CommentInstance, string>;
    hasComments: Sequelize.HasManyHasAssociationsMixin<CommentInstance, string>;
    countComments: Sequelize.HasManyCountAssociationsMixin;
    createComment: Sequelize.HasManyCreateAssociationMixin<CommentInstance>;
    getEcommerceOrders: Sequelize.HasManyGetAssociationsMixin<EcommerceOrderInstance>;
    setEcommerceOrders: Sequelize.HasManySetAssociationsMixin<EcommerceOrderInstance, string>;
    addEcommerceOrder: Sequelize.HasManyAddAssociationMixin<EcommerceOrderInstance, string>;
    addEcommerceOrders: Sequelize.HasManyAddAssociationsMixin<EcommerceOrderInstance, string>;
    removeEcommerceOrder: Sequelize.HasManyRemoveAssociationMixin<EcommerceOrderInstance, string>;
    removeEcommerceOrders: Sequelize.HasManyRemoveAssociationsMixin<EcommerceOrderInstance, string>;
    hasEcommerceOrder: Sequelize.HasManyHasAssociationMixin<EcommerceOrderInstance, string>;
    hasEcommerceOrders: Sequelize.HasManyHasAssociationsMixin<EcommerceOrderInstance, string>;
    countEcommerceOrders: Sequelize.HasManyCountAssociationsMixin;
    createEcommerceOrder: Sequelize.HasManyCreateAssociationMixin<EcommerceOrderInstance>;
    getEcommerceReviews: Sequelize.HasManyGetAssociationsMixin<EcommerceReviewInstance>;
    setEcommerceReviews: Sequelize.HasManySetAssociationsMixin<EcommerceReviewInstance, string>;
    addEcommerceReview: Sequelize.HasManyAddAssociationMixin<EcommerceReviewInstance, string>;
    addEcommerceReviews: Sequelize.HasManyAddAssociationsMixin<EcommerceReviewInstance, string>;
    removeEcommerceReview: Sequelize.HasManyRemoveAssociationMixin<EcommerceReviewInstance, string>;
    removeEcommerceReviews: Sequelize.HasManyRemoveAssociationsMixin<EcommerceReviewInstance, string>;
    hasEcommerceReview: Sequelize.HasManyHasAssociationMixin<EcommerceReviewInstance, string>;
    hasEcommerceReviews: Sequelize.HasManyHasAssociationsMixin<EcommerceReviewInstance, string>;
    countEcommerceReviews: Sequelize.HasManyCountAssociationsMixin;
    createEcommerceReview: Sequelize.HasManyCreateAssociationMixin<EcommerceReviewInstance>;
    getEcommerceUserDiscounts: Sequelize.HasManyGetAssociationsMixin<EcommerceUserDiscountInstance>;
    setEcommerceUserDiscounts: Sequelize.HasManySetAssociationsMixin<EcommerceUserDiscountInstance, string>;
    addEcommerceUserDiscount: Sequelize.HasManyAddAssociationMixin<EcommerceUserDiscountInstance, string>;
    addEcommerceUserDiscounts: Sequelize.HasManyAddAssociationsMixin<EcommerceUserDiscountInstance, string>;
    removeEcommerceUserDiscount: Sequelize.HasManyRemoveAssociationMixin<EcommerceUserDiscountInstance, string>;
    removeEcommerceUserDiscounts: Sequelize.HasManyRemoveAssociationsMixin<EcommerceUserDiscountInstance, string>;
    hasEcommerceUserDiscount: Sequelize.HasManyHasAssociationMixin<EcommerceUserDiscountInstance, string>;
    hasEcommerceUserDiscounts: Sequelize.HasManyHasAssociationsMixin<EcommerceUserDiscountInstance, string>;
    countEcommerceUserDiscounts: Sequelize.HasManyCountAssociationsMixin;
    createEcommerceUserDiscount: Sequelize.HasManyCreateAssociationMixin<EcommerceUserDiscountInstance>;
    getEcommerceWishlists: Sequelize.HasManyGetAssociationsMixin<EcommerceWishlistInstance>;
    setEcommerceWishlists: Sequelize.HasManySetAssociationsMixin<EcommerceWishlistInstance, string>;
    addEcommerceWishlist: Sequelize.HasManyAddAssociationMixin<EcommerceWishlistInstance, string>;
    addEcommerceWishlists: Sequelize.HasManyAddAssociationsMixin<EcommerceWishlistInstance, string>;
    removeEcommerceWishlist: Sequelize.HasManyRemoveAssociationMixin<EcommerceWishlistInstance, string>;
    removeEcommerceWishlists: Sequelize.HasManyRemoveAssociationsMixin<EcommerceWishlistInstance, string>;
    hasEcommerceWishlist: Sequelize.HasManyHasAssociationMixin<EcommerceWishlistInstance, string>;
    hasEcommerceWishlists: Sequelize.HasManyHasAssociationsMixin<EcommerceWishlistInstance, string>;
    countEcommerceWishlists: Sequelize.HasManyCountAssociationsMixin;
    createEcommerceWishlist: Sequelize.HasManyCreateAssociationMixin<EcommerceWishlistInstance>;
    getExchangeOrder: Sequelize.HasManyGetAssociationsMixin<ExchangeOrderInstance>;
    setExchangeOrder: Sequelize.HasManySetAssociationsMixin<ExchangeOrderInstance, string>;
    addExchangeOrder: Sequelize.HasManyAddAssociationMixin<ExchangeOrderInstance, string>;
    removeExchangeOrder: Sequelize.HasManyRemoveAssociationMixin<ExchangeOrderInstance, string>;
    hasExchangeOrder: Sequelize.HasManyHasAssociationMixin<ExchangeOrderInstance, string>;
    countExchangeOrder: Sequelize.HasManyCountAssociationsMixin;
    createExchangeOrder: Sequelize.HasManyCreateAssociationMixin<ExchangeOrderInstance>;
    getExchangeWatchlists: Sequelize.HasManyGetAssociationsMixin<ExchangeWatchlistInstance>;
    setExchangeWatchlists: Sequelize.HasManySetAssociationsMixin<ExchangeWatchlistInstance, string>;
    addExchangeWatchlist: Sequelize.HasManyAddAssociationMixin<ExchangeWatchlistInstance, string>;
    addExchangeWatchlists: Sequelize.HasManyAddAssociationsMixin<ExchangeWatchlistInstance, string>;
    removeExchangeWatchlist: Sequelize.HasManyRemoveAssociationMixin<ExchangeWatchlistInstance, string>;
    removeExchangeWatchlists: Sequelize.HasManyRemoveAssociationsMixin<ExchangeWatchlistInstance, string>;
    hasExchangeWatchlist: Sequelize.HasManyHasAssociationMixin<ExchangeWatchlistInstance, string>;
    hasExchangeWatchlists: Sequelize.HasManyHasAssociationsMixin<ExchangeWatchlistInstance, string>;
    countExchangeWatchlists: Sequelize.HasManyCountAssociationsMixin;
    createExchangeWatchlist: Sequelize.HasManyCreateAssociationMixin<ExchangeWatchlistInstance>;
    getForexAccounts: Sequelize.HasManyGetAssociationsMixin<ForexAccountInstance>;
    setForexAccounts: Sequelize.HasManySetAssociationsMixin<ForexAccountInstance, string>;
    addForexAccount: Sequelize.HasManyAddAssociationMixin<ForexAccountInstance, string>;
    addForexAccounts: Sequelize.HasManyAddAssociationsMixin<ForexAccountInstance, string>;
    removeForexAccount: Sequelize.HasManyRemoveAssociationMixin<ForexAccountInstance, string>;
    removeForexAccounts: Sequelize.HasManyRemoveAssociationsMixin<ForexAccountInstance, string>;
    hasForexAccount: Sequelize.HasManyHasAssociationMixin<ForexAccountInstance, string>;
    hasForexAccounts: Sequelize.HasManyHasAssociationsMixin<ForexAccountInstance, string>;
    countForexAccounts: Sequelize.HasManyCountAssociationsMixin;
    createForexAccount: Sequelize.HasManyCreateAssociationMixin<ForexAccountInstance>;
    getForexInvestments: Sequelize.HasManyGetAssociationsMixin<ForexInvestmentInstance>;
    setForexInvestments: Sequelize.HasManySetAssociationsMixin<ForexInvestmentInstance, string>;
    addForexInvestment: Sequelize.HasManyAddAssociationMixin<ForexInvestmentInstance, string>;
    addForexInvestments: Sequelize.HasManyAddAssociationsMixin<ForexInvestmentInstance, string>;
    removeForexInvestment: Sequelize.HasManyRemoveAssociationMixin<ForexInvestmentInstance, string>;
    removeForexInvestments: Sequelize.HasManyRemoveAssociationsMixin<ForexInvestmentInstance, string>;
    hasForexInvestment: Sequelize.HasManyHasAssociationMixin<ForexInvestmentInstance, string>;
    hasForexInvestments: Sequelize.HasManyHasAssociationsMixin<ForexInvestmentInstance, string>;
    countForexInvestments: Sequelize.HasManyCountAssociationsMixin;
    createForexInvestment: Sequelize.HasManyCreateAssociationMixin<ForexInvestmentInstance>;
    getInvestments: Sequelize.HasManyGetAssociationsMixin<InvestmentInstance>;
    setInvestments: Sequelize.HasManySetAssociationsMixin<InvestmentInstance, string>;
    addInvestment: Sequelize.HasManyAddAssociationMixin<InvestmentInstance, string>;
    addInvestments: Sequelize.HasManyAddAssociationsMixin<InvestmentInstance, string>;
    removeInvestment: Sequelize.HasManyRemoveAssociationMixin<InvestmentInstance, string>;
    removeInvestments: Sequelize.HasManyRemoveAssociationsMixin<InvestmentInstance, string>;
    hasInvestment: Sequelize.HasManyHasAssociationMixin<InvestmentInstance, string>;
    hasInvestments: Sequelize.HasManyHasAssociationsMixin<InvestmentInstance, string>;
    countInvestments: Sequelize.HasManyCountAssociationsMixin;
    createInvestment: Sequelize.HasManyCreateAssociationMixin<InvestmentInstance>;
    getKycApplications: Sequelize.HasManyGetAssociationsMixin<KycApplicationInstance>;
    setKycApplications: Sequelize.HasManySetAssociationsMixin<KycApplicationInstance, string>;
    addKycApplication: Sequelize.HasManyAddAssociationMixin<KycApplicationInstance, string>;
    addKycApplications: Sequelize.HasManyAddAssociationsMixin<KycApplicationInstance, string>;
    removeKycApplication: Sequelize.HasManyRemoveAssociationMixin<KycApplicationInstance, string>;
    removeKycApplications: Sequelize.HasManyRemoveAssociationsMixin<KycApplicationInstance, string>;
    hasKycApplication: Sequelize.HasManyHasAssociationMixin<KycApplicationInstance, string>;
    hasKycApplications: Sequelize.HasManyHasAssociationsMixin<KycApplicationInstance, string>;
    countKycApplications: Sequelize.HasManyCountAssociationsMixin;
    createKycApplication: Sequelize.HasManyCreateAssociationMixin<KycApplicationInstance>;
    getReferredReferrals: Sequelize.HasManyGetAssociationsMixin<MlmReferralInstance>;
    setReferredReferrals: Sequelize.HasManySetAssociationsMixin<MlmReferralInstance, string>;
    addMlmReferral: Sequelize.HasManyAddAssociationMixin<MlmReferralInstance, string>;
    addReferredReferrals: Sequelize.HasManyAddAssociationsMixin<MlmReferralInstance, string>;
    removeMlmReferral: Sequelize.HasManyRemoveAssociationMixin<MlmReferralInstance, string>;
    removeReferredReferrals: Sequelize.HasManyRemoveAssociationsMixin<MlmReferralInstance, string>;
    hasMlmReferral: Sequelize.HasManyHasAssociationMixin<MlmReferralInstance, string>;
    hasReferredReferrals: Sequelize.HasManyHasAssociationsMixin<MlmReferralInstance, string>;
    countReferredReferrals: Sequelize.HasManyCountAssociationsMixin;
    createMlmReferral: Sequelize.HasManyCreateAssociationMixin<MlmReferralInstance>;
    getReferrerReferrals: Sequelize.HasManyGetAssociationsMixin<MlmReferralInstance>;
    setReferrerReferrals: Sequelize.HasManySetAssociationsMixin<MlmReferralInstance, string>;
    addReferrerReferrals: Sequelize.HasManyAddAssociationsMixin<MlmReferralInstance, string>;
    removeReferrerReferrals: Sequelize.HasManyRemoveAssociationsMixin<MlmReferralInstance, string>;
    hasReferrerReferrals: Sequelize.HasManyHasAssociationsMixin<MlmReferralInstance, string>;
    countReferrerReferrals: Sequelize.HasManyCountAssociationsMixin;
    getReferralRewards: Sequelize.HasManyGetAssociationsMixin<MlmReferralRewardInstance>;
    setReferralRewards: Sequelize.HasManySetAssociationsMixin<MlmReferralRewardInstance, string>;
    addMlmReferralReward: Sequelize.HasManyAddAssociationMixin<MlmReferralRewardInstance, string>;
    addReferralRewards: Sequelize.HasManyAddAssociationsMixin<MlmReferralRewardInstance, string>;
    removeMlmReferralReward: Sequelize.HasManyRemoveAssociationMixin<MlmReferralRewardInstance, string>;
    removeReferralRewards: Sequelize.HasManyRemoveAssociationsMixin<MlmReferralRewardInstance, string>;
    hasMlmReferralReward: Sequelize.HasManyHasAssociationMixin<MlmReferralRewardInstance, string>;
    hasReferralRewards: Sequelize.HasManyHasAssociationsMixin<MlmReferralRewardInstance, string>;
    countReferralRewards: Sequelize.HasManyCountAssociationsMixin;
    createMlmReferralReward: Sequelize.HasManyCreateAssociationMixin<MlmReferralRewardInstance>;
    getNotifications: Sequelize.HasManyGetAssociationsMixin<NotificationInstance>;
    setNotifications: Sequelize.HasManySetAssociationsMixin<NotificationInstance, string>;
    addNotification: Sequelize.HasManyAddAssociationMixin<NotificationInstance, string>;
    addNotifications: Sequelize.HasManyAddAssociationsMixin<NotificationInstance, string>;
    removeNotification: Sequelize.HasManyRemoveAssociationMixin<NotificationInstance, string>;
    removeNotifications: Sequelize.HasManyRemoveAssociationsMixin<NotificationInstance, string>;
    hasNotification: Sequelize.HasManyHasAssociationMixin<NotificationInstance, string>;
    hasNotifications: Sequelize.HasManyHasAssociationsMixin<NotificationInstance, string>;
    countNotifications: Sequelize.HasManyCountAssociationsMixin;
    createNotification: Sequelize.HasManyCreateAssociationMixin<NotificationInstance>;
    getProviders: Sequelize.HasManyGetAssociationsMixin<ProviderUserInstance>;
    setProviders: Sequelize.HasManySetAssociationsMixin<ProviderUserInstance, string>;
    addProviderUser: Sequelize.HasManyAddAssociationMixin<ProviderUserInstance, string>;
    addProviders: Sequelize.HasManyAddAssociationsMixin<ProviderUserInstance, string>;
    removeProviderUser: Sequelize.HasManyRemoveAssociationMixin<ProviderUserInstance, string>;
    removeProviders: Sequelize.HasManyRemoveAssociationsMixin<ProviderUserInstance, string>;
    hasProviderUser: Sequelize.HasManyHasAssociationMixin<ProviderUserInstance, string>;
    hasProviders: Sequelize.HasManyHasAssociationsMixin<ProviderUserInstance, string>;
    countProviders: Sequelize.HasManyCountAssociationsMixin;
    createProviderUser: Sequelize.HasManyCreateAssociationMixin<ProviderUserInstance>;
    getSupportTickets: Sequelize.HasManyGetAssociationsMixin<SupportTicketInstance>;
    setSupportTickets: Sequelize.HasManySetAssociationsMixin<SupportTicketInstance, string>;
    addSupportTicket: Sequelize.HasManyAddAssociationMixin<SupportTicketInstance, string>;
    addSupportTickets: Sequelize.HasManyAddAssociationsMixin<SupportTicketInstance, string>;
    removeSupportTicket: Sequelize.HasManyRemoveAssociationMixin<SupportTicketInstance, string>;
    removeSupportTickets: Sequelize.HasManyRemoveAssociationsMixin<SupportTicketInstance, string>;
    hasSupportTicket: Sequelize.HasManyHasAssociationMixin<SupportTicketInstance, string>;
    hasSupportTickets: Sequelize.HasManyHasAssociationsMixin<SupportTicketInstance, string>;
    countSupportTickets: Sequelize.HasManyCountAssociationsMixin;
    createSupportTicket: Sequelize.HasManyCreateAssociationMixin<SupportTicketInstance>;
    getAgentSupportTickets: Sequelize.HasManyGetAssociationsMixin<SupportTicketInstance>;
    setAgentSupportTickets: Sequelize.HasManySetAssociationsMixin<SupportTicketInstance, string>;
    addAgentSupportTickets: Sequelize.HasManyAddAssociationsMixin<SupportTicketInstance, string>;
    removeAgentSupportTickets: Sequelize.HasManyRemoveAssociationsMixin<SupportTicketInstance, string>;
    hasAgentSupportTickets: Sequelize.HasManyHasAssociationsMixin<SupportTicketInstance, string>;
    countAgentSupportTickets: Sequelize.HasManyCountAssociationsMixin;
    getTransactions: Sequelize.HasManyGetAssociationsMixin<TransactionInstance>;
    setTransactions: Sequelize.HasManySetAssociationsMixin<TransactionInstance, string>;
    addTransaction: Sequelize.HasManyAddAssociationMixin<TransactionInstance, string>;
    addTransactions: Sequelize.HasManyAddAssociationsMixin<TransactionInstance, string>;
    removeTransaction: Sequelize.HasManyRemoveAssociationMixin<TransactionInstance, string>;
    removeTransactions: Sequelize.HasManyRemoveAssociationsMixin<TransactionInstance, string>;
    hasTransaction: Sequelize.HasManyHasAssociationMixin<TransactionInstance, string>;
    hasTransactions: Sequelize.HasManyHasAssociationsMixin<TransactionInstance, string>;
    countTransactions: Sequelize.HasManyCountAssociationsMixin;
    createTransaction: Sequelize.HasManyCreateAssociationMixin<TransactionInstance>;
    getWallets: Sequelize.HasManyGetAssociationsMixin<WalletInstance>;
    setWallets: Sequelize.HasManySetAssociationsMixin<WalletInstance, string>;
    addWallet: Sequelize.HasManyAddAssociationMixin<WalletInstance, string>;
    addWallets: Sequelize.HasManyAddAssociationsMixin<WalletInstance, string>;
    removeWallet: Sequelize.HasManyRemoveAssociationMixin<WalletInstance, string>;
    removeWallets: Sequelize.HasManyRemoveAssociationsMixin<WalletInstance, string>;
    hasWallet: Sequelize.HasManyHasAssociationMixin<WalletInstance, string>;
    hasWallets: Sequelize.HasManyHasAssociationsMixin<WalletInstance, string>;
    countWallets: Sequelize.HasManyCountAssociationsMixin;
    createWallet: Sequelize.HasManyCreateAssociationMixin<WalletInstance>;
    getWalletPnls: Sequelize.HasManyGetAssociationsMixin<WalletPnlInstance>;
    setWalletPnls: Sequelize.HasManySetAssociationsMixin<WalletPnlInstance, string>;
    addWalletPnl: Sequelize.HasManyAddAssociationMixin<WalletPnlInstance, string>;
    addWalletPnls: Sequelize.HasManyAddAssociationsMixin<WalletPnlInstance, string>;
    removeWalletPnl: Sequelize.HasManyRemoveAssociationMixin<WalletPnlInstance, string>;
    removeWalletPnls: Sequelize.HasManyRemoveAssociationsMixin<WalletPnlInstance, string>;
    hasWalletPnl: Sequelize.HasManyHasAssociationMixin<WalletPnlInstance, string>;
    hasWalletPnls: Sequelize.HasManyHasAssociationsMixin<WalletPnlInstance, string>;
    countWalletPnls: Sequelize.HasManyCountAssociationsMixin;
    createWalletPnl: Sequelize.HasManyCreateAssociationMixin<WalletPnlInstance>;
    getIcoTransactions: Sequelize.HasManyGetAssociationsMixin<IcoTransactionInstance>;
    setIcoTransactions: Sequelize.HasManySetAssociationsMixin<IcoTransactionInstance, string>;
    addIcoTransaction: Sequelize.HasManyAddAssociationMixin<IcoTransactionInstance, string>;
    addIcoTransactions: Sequelize.HasManyAddAssociationsMixin<IcoTransactionInstance, string>;
    removeIcoTransaction: Sequelize.HasManyRemoveAssociationMixin<IcoTransactionInstance, string>;
    removeIcoTransactions: Sequelize.HasManyRemoveAssociationsMixin<IcoTransactionInstance, string>;
    hasIcoTransaction: Sequelize.HasManyHasAssociationMixin<IcoTransactionInstance, string>;
    hasIcoTransactions: Sequelize.HasManyHasAssociationsMixin<IcoTransactionInstance, string>;
    countIcoTransactions: Sequelize.HasManyCountAssociationsMixin;
    createIcoTransaction: Sequelize.HasManyCreateAssociationMixin<IcoTransactionInstance>;
    getIcoAdminActivities: Sequelize.HasManyGetAssociationsMixin<IcoAdminActivityInstance>;
    setIcoAdminActivities: Sequelize.HasManySetAssociationsMixin<IcoAdminActivityInstance, string>;
    addIcoAdminActivity: Sequelize.HasManyAddAssociationMixin<IcoAdminActivityInstance, string>;
    addIcoAdminActivities: Sequelize.HasManyAddAssociationsMixin<IcoAdminActivityInstance, string>;
    removeIcoAdminActivity: Sequelize.HasManyRemoveAssociationMixin<IcoAdminActivityInstance, string>;
    removeIcoAdminActivities: Sequelize.HasManyRemoveAssociationsMixin<IcoAdminActivityInstance, string>;
    hasIcoAdminActivity: Sequelize.HasManyHasAssociationMixin<IcoAdminActivityInstance, string>;
    hasIcoAdminActivities: Sequelize.HasManyHasAssociationsMixin<IcoAdminActivityInstance, string>;
    countIcoAdminActivities: Sequelize.HasManyCountAssociationsMixin;
    createIcoAdminActivity: Sequelize.HasManyCreateAssociationMixin<IcoAdminActivityInstance>;
    getP2pTrades: Sequelize.HasManyGetAssociationsMixin<P2pTradeInstance>;
    setP2pTrades: Sequelize.HasManySetAssociationsMixin<P2pTradeInstance, string>;
    addP2pTrade: Sequelize.HasManyAddAssociationMixin<P2pTradeInstance, string>;
    addP2pTrades: Sequelize.HasManyAddAssociationsMixin<P2pTradeInstance, string>;
    removeP2pTrade: Sequelize.HasManyRemoveAssociationMixin<P2pTradeInstance, string>;
    removeP2pTrades: Sequelize.HasManyRemoveAssociationsMixin<P2pTradeInstance, string>;
    hasP2pTrade: Sequelize.HasManyHasAssociationMixin<P2pTradeInstance, string>;
    hasP2pTrades: Sequelize.HasManyHasAssociationsMixin<P2pTradeInstance, string>;
    countP2pTrades: Sequelize.HasManyCountAssociationsMixin;
    createP2pTrade: Sequelize.HasManyCreateAssociationMixin<P2pTradeInstance>;
    getP2pOffers: Sequelize.HasManyGetAssociationsMixin<P2pOfferInstance>;
    setP2pOffers: Sequelize.HasManySetAssociationsMixin<P2pOfferInstance, string>;
    addP2pOffer: Sequelize.HasManyAddAssociationMixin<P2pOfferInstance, string>;
    addP2pOffers: Sequelize.HasManyAddAssociationsMixin<P2pOfferInstance, string>;
    removeP2pOffer: Sequelize.HasManyRemoveAssociationMixin<P2pOfferInstance, string>;
    removeP2pOffers: Sequelize.HasManyRemoveAssociationsMixin<P2pOfferInstance, string>;
    hasP2pOffer: Sequelize.HasManyHasAssociationMixin<P2pOfferInstance, string>;
    hasP2pOffers: Sequelize.HasManyHasAssociationsMixin<P2pOfferInstance, string>;
    countP2pOffers: Sequelize.HasManyCountAssociationsMixin;
    createP2pOffer: Sequelize.HasManyCreateAssociationMixin<P2pOfferInstance>;
    getP2pReviews: Sequelize.HasManyGetAssociationsMixin<P2pReviewInstance>;
    setP2pReviews: Sequelize.HasManySetAssociationsMixin<P2pReviewInstance, string>;
    addP2pReview: Sequelize.HasManyAddAssociationMixin<P2pReviewInstance, string>;
    addP2pReviews: Sequelize.HasManyAddAssociationsMixin<P2pReviewInstance, string>;
    removeP2pReview: Sequelize.HasManyRemoveAssociationMixin<P2pReviewInstance, string>;
    removeP2pReviews: Sequelize.HasManyRemoveAssociationsMixin<P2pReviewInstance, string>;
    hasP2pReview: Sequelize.HasManyHasAssociationMixin<P2pReviewInstance, string>;
    hasP2pReviews: Sequelize.HasManyHasAssociationsMixin<P2pReviewInstance, string>;
    countP2pReviews: Sequelize.HasManyCountAssociationsMixin;
    createP2pReview: Sequelize.HasManyCreateAssociationMixin<P2pReviewInstance>;
    getBlocks: Sequelize.HasManyGetAssociationsMixin<UserBlockInstance>;
    setBlocks: Sequelize.HasManySetAssociationsMixin<UserBlockInstance, string>;
    addUserBlock: Sequelize.HasManyAddAssociationMixin<UserBlockInstance, string>;
    addBlocks: Sequelize.HasManyAddAssociationsMixin<UserBlockInstance, string>;
    removeUserBlock: Sequelize.HasManyRemoveAssociationMixin<UserBlockInstance, string>;
    removeBlocks: Sequelize.HasManyRemoveAssociationsMixin<UserBlockInstance, string>;
    hasUserBlock: Sequelize.HasManyHasAssociationMixin<UserBlockInstance, string>;
    hasBlocks: Sequelize.HasManyHasAssociationsMixin<UserBlockInstance, string>;
    countBlocks: Sequelize.HasManyCountAssociationsMixin;
    createUserBlock: Sequelize.HasManyCreateAssociationMixin<UserBlockInstance>;
    getAdminBlocks: Sequelize.HasManyGetAssociationsMixin<UserBlockInstance>;
    setAdminBlocks: Sequelize.HasManySetAssociationsMixin<UserBlockInstance, string>;
    addAdminBlocks: Sequelize.HasManyAddAssociationsMixin<UserBlockInstance, string>;
    removeAdminBlocks: Sequelize.HasManyRemoveAssociationsMixin<UserBlockInstance, string>;
    hasAdminBlocks: Sequelize.HasManyHasAssociationsMixin<UserBlockInstance, string>;
    countAdminBlocks: Sequelize.HasManyCountAssociationsMixin;
    getRole: Sequelize.BelongsToGetAssociationMixin<RoleInstance>;
    setRole: Sequelize.BelongsToSetAssociationMixin<RoleInstance, string>;
    createRole: Sequelize.BelongsToCreateAssociationMixin<RoleInstance>;
  }

  // ========================================
  // UserBlock
  // ========================================

  interface UserBlockAttributes {
    id: string;
    userId: string;
    adminId: string;
    reason: string;
    isTemporary: boolean;
    duration?: number;
    blockedUntil?: Date | null;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type UserBlockCreationAttributes = Optional<UserBlockAttributes, "id" | "isTemporary" | "duration" | "blockedUntil" | "isActive" | "createdAt" | "updatedAt">;

  interface UserBlockInstance extends Model<UserBlockAttributes, UserBlockCreationAttributes>, UserBlockAttributes {
    user?: UserInstance;
    admin?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getAdmin: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setAdmin: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createAdmin: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // Wallet
  // ========================================

  interface WalletAttributes {
    id: string;
    userId: string;
    type: "FIAT" | "SPOT" | "ECO" | "FUTURES" | "COPY_TRADING";
    currency: string;
    balance: number;
    inOrder?: number | null;
    address?: {
    [key: string]: { address: string; network: string; balance: number };
  };
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type WalletCreationAttributes = Optional<WalletAttributes, "id" | "inOrder" | "address" | "createdAt" | "deletedAt" | "updatedAt">;

  interface WalletInstance extends Model<WalletAttributes, WalletCreationAttributes>, WalletAttributes {
    ecosystemPrivateLedgers?: EcosystemPrivateLedgerInstance[];
    ecosystemUtxos?: EcosystemUtxoInstance[];
    transactions?: TransactionInstance[];
    walletData?: WalletDataInstance[];
    user?: UserInstance;
    getEcosystemPrivateLedgers: Sequelize.HasManyGetAssociationsMixin<EcosystemPrivateLedgerInstance>;
    setEcosystemPrivateLedgers: Sequelize.HasManySetAssociationsMixin<EcosystemPrivateLedgerInstance, string>;
    addEcosystemPrivateLedger: Sequelize.HasManyAddAssociationMixin<EcosystemPrivateLedgerInstance, string>;
    addEcosystemPrivateLedgers: Sequelize.HasManyAddAssociationsMixin<EcosystemPrivateLedgerInstance, string>;
    removeEcosystemPrivateLedger: Sequelize.HasManyRemoveAssociationMixin<EcosystemPrivateLedgerInstance, string>;
    removeEcosystemPrivateLedgers: Sequelize.HasManyRemoveAssociationsMixin<EcosystemPrivateLedgerInstance, string>;
    hasEcosystemPrivateLedger: Sequelize.HasManyHasAssociationMixin<EcosystemPrivateLedgerInstance, string>;
    hasEcosystemPrivateLedgers: Sequelize.HasManyHasAssociationsMixin<EcosystemPrivateLedgerInstance, string>;
    countEcosystemPrivateLedgers: Sequelize.HasManyCountAssociationsMixin;
    createEcosystemPrivateLedger: Sequelize.HasManyCreateAssociationMixin<EcosystemPrivateLedgerInstance>;
    getEcosystemUtxos: Sequelize.HasManyGetAssociationsMixin<EcosystemUtxoInstance>;
    setEcosystemUtxos: Sequelize.HasManySetAssociationsMixin<EcosystemUtxoInstance, string>;
    addEcosystemUtxo: Sequelize.HasManyAddAssociationMixin<EcosystemUtxoInstance, string>;
    addEcosystemUtxos: Sequelize.HasManyAddAssociationsMixin<EcosystemUtxoInstance, string>;
    removeEcosystemUtxo: Sequelize.HasManyRemoveAssociationMixin<EcosystemUtxoInstance, string>;
    removeEcosystemUtxos: Sequelize.HasManyRemoveAssociationsMixin<EcosystemUtxoInstance, string>;
    hasEcosystemUtxo: Sequelize.HasManyHasAssociationMixin<EcosystemUtxoInstance, string>;
    hasEcosystemUtxos: Sequelize.HasManyHasAssociationsMixin<EcosystemUtxoInstance, string>;
    countEcosystemUtxos: Sequelize.HasManyCountAssociationsMixin;
    createEcosystemUtxo: Sequelize.HasManyCreateAssociationMixin<EcosystemUtxoInstance>;
    getTransactions: Sequelize.HasManyGetAssociationsMixin<TransactionInstance>;
    setTransactions: Sequelize.HasManySetAssociationsMixin<TransactionInstance, string>;
    addTransaction: Sequelize.HasManyAddAssociationMixin<TransactionInstance, string>;
    addTransactions: Sequelize.HasManyAddAssociationsMixin<TransactionInstance, string>;
    removeTransaction: Sequelize.HasManyRemoveAssociationMixin<TransactionInstance, string>;
    removeTransactions: Sequelize.HasManyRemoveAssociationsMixin<TransactionInstance, string>;
    hasTransaction: Sequelize.HasManyHasAssociationMixin<TransactionInstance, string>;
    hasTransactions: Sequelize.HasManyHasAssociationsMixin<TransactionInstance, string>;
    countTransactions: Sequelize.HasManyCountAssociationsMixin;
    createTransaction: Sequelize.HasManyCreateAssociationMixin<TransactionInstance>;
    getWalletData: Sequelize.HasManyGetAssociationsMixin<WalletDataInstance>;
    setWalletData: Sequelize.HasManySetAssociationsMixin<WalletDataInstance, string>;
    addWalletData: Sequelize.HasManyAddAssociationMixin<WalletDataInstance, string>;
    removeWalletData: Sequelize.HasManyRemoveAssociationMixin<WalletDataInstance, string>;
    hasWalletData: Sequelize.HasManyHasAssociationMixin<WalletDataInstance, string>;
    countWalletData: Sequelize.HasManyCountAssociationsMixin;
    createWalletData: Sequelize.HasManyCreateAssociationMixin<WalletDataInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // WalletData
  // ========================================

  interface WalletDataAttributes {
    id: string;
    walletId: string;
    currency: string;
    chain: string;
    balance: number;
    index: number;
    data: string;
  }

  type WalletDataCreationAttributes = Optional<WalletDataAttributes, "id">;

  interface WalletDataInstance extends Model<WalletDataAttributes, WalletDataCreationAttributes>, WalletDataAttributes {
    wallet?: WalletInstance;
    getWallet: Sequelize.BelongsToGetAssociationMixin<WalletInstance>;
    setWallet: Sequelize.BelongsToSetAssociationMixin<WalletInstance, string>;
    createWallet: Sequelize.BelongsToCreateAssociationMixin<WalletInstance>;
  }

  // ========================================
  // WalletPnl
  // ========================================

  interface WalletPnlAttributes {
    id: string;
    userId: string;
    balances: {
    FIAT: number;
    SPOT: number;
    ECO: number;
  } | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type WalletPnlCreationAttributes = Optional<WalletPnlAttributes, "id" | "balances" | "createdAt" | "updatedAt">;

  interface WalletPnlInstance extends Model<WalletPnlAttributes, WalletPnlCreationAttributes>, WalletPnlAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // WithdrawMethod
  // ========================================

  interface WithdrawMethodAttributes {
    id: string;
    title: string;
    processingTime: string;
    instructions: string;
    image?: string | null;
    fixedFee: number;
    percentageFee: number;
    minAmount: number;
    maxAmount: number;
    customFields?: string;
    status?: boolean | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type WithdrawMethodCreationAttributes = Optional<WithdrawMethodAttributes, "id" | "image" | "customFields" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

  interface WithdrawMethodInstance extends Model<WithdrawMethodAttributes, WithdrawMethodCreationAttributes>, WithdrawMethodAttributes {
  }

  // ========================================
  // Models Registry
  // ========================================

  interface Models {
    sequelize: Sequelize.Sequelize;
    adminProfit: ModelStatic<AdminProfitInstance>;
    aiBot: ModelStatic<AiBotInstance>;
    aiInvestment: ModelStatic<AiInvestmentInstance>;
    aiInvestmentDuration: ModelStatic<AiInvestmentDurationInstance>;
    aiInvestmentPlan: ModelStatic<AiInvestmentPlanInstance>;
    aiInvestmentPlanDuration: ModelStatic<AiInvestmentPlanDurationInstance>;
    aiMarketMaker: ModelStatic<AiMarketMakerInstance>;
    aiMarketMakerHistory: ModelStatic<AiMarketMakerHistoryInstance>;
    aiMarketMakerPool: ModelStatic<AiMarketMakerPoolInstance>;
    announcement: ModelStatic<AnnouncementInstance>;
    apiKey: ModelStatic<ApiKeyInstance>;
    author: ModelStatic<AuthorInstance>;
    binaryAiEngine: ModelStatic<BinaryAiEngineInstance>;
    binaryAiEngineABTest: ModelStatic<BinaryAiEngineABTestInstance>;
    binaryAiEngineABTestAssignment: ModelStatic<BinaryAiEngineABTestAssignmentInstance>;
    binaryAiEngineAction: ModelStatic<BinaryAiEngineActionInstance>;
    binaryAiEngineCohort: ModelStatic<BinaryAiEngineCohortInstance>;
    binaryAiEngineCorrelationAlert: ModelStatic<BinaryAiEngineCorrelationAlertInstance>;
    binaryAiEngineCorrelationHistory: ModelStatic<BinaryAiEngineCorrelationHistoryInstance>;
    binaryAiEngineDailyStats: ModelStatic<BinaryAiEngineDailyStatsInstance>;
    binaryAiEnginePosition: ModelStatic<BinaryAiEnginePositionInstance>;
    binaryAiEngineSimulation: ModelStatic<BinaryAiEngineSimulationInstance>;
    binaryAiEngineSnapshot: ModelStatic<BinaryAiEngineSnapshotInstance>;
    binaryAiEngineUserCooldown: ModelStatic<BinaryAiEngineUserCooldownInstance>;
    binaryAiEngineUserTier: ModelStatic<BinaryAiEngineUserTierInstance>;
    binaryMarket: ModelStatic<BinaryMarketInstance>;
    binaryOrder: ModelStatic<BinaryOrderInstance>;
    category: ModelStatic<CategoryInstance>;
    comment: ModelStatic<CommentInstance>;
    copyTradingAuditLog: ModelStatic<CopyTradingAuditLogInstance>;
    copyTradingFollower: ModelStatic<CopyTradingFollowerInstance>;
    copyTradingFollowerAllocation: ModelStatic<CopyTradingFollowerAllocationInstance>;
    copyTradingLeader: ModelStatic<CopyTradingLeaderInstance>;
    copyTradingLeaderMarket: ModelStatic<CopyTradingLeaderMarketInstance>;
    copyTradingLeaderStats: ModelStatic<CopyTradingLeaderStatsInstance>;
    copyTradingTrade: ModelStatic<CopyTradingTradeInstance>;
    copyTradingTransaction: ModelStatic<CopyTradingTransactionInstance>;
    currency: ModelStatic<CurrencyInstance>;
    defaultPage: ModelStatic<DefaultPageInstance>;
    depositGateway: ModelStatic<DepositGatewayInstance>;
    depositMethod: ModelStatic<DepositMethodInstance>;
    ecommerceCategory: ModelStatic<EcommerceCategoryInstance>;
    ecommerceDiscount: ModelStatic<EcommerceDiscountInstance>;
    ecommerceOrder: ModelStatic<EcommerceOrderInstance>;
    ecommerceOrderItem: ModelStatic<EcommerceOrderItemInstance>;
    ecommerceProduct: ModelStatic<EcommerceProductInstance>;
    ecommerceReview: ModelStatic<EcommerceReviewInstance>;
    ecommerceShipping: ModelStatic<EcommerceShippingInstance>;
    ecommerceShippingAddress: ModelStatic<EcommerceShippingAddressInstance>;
    ecommerceUserDiscount: ModelStatic<EcommerceUserDiscountInstance>;
    ecommerceWishlist: ModelStatic<EcommerceWishlistInstance>;
    ecommerceWishlistItem: ModelStatic<EcommerceWishlistItemInstance>;
    ecosystemBlockchain: ModelStatic<EcosystemBlockchainInstance>;
    ecosystemCustodialWallet: ModelStatic<EcosystemCustodialWalletInstance>;
    ecosystemMarket: ModelStatic<EcosystemMarketInstance>;
    ecosystemMasterWallet: ModelStatic<EcosystemMasterWalletInstance>;
    ecosystemPrivateLedger: ModelStatic<EcosystemPrivateLedgerInstance>;
    ecosystemToken: ModelStatic<EcosystemTokenInstance>;
    ecosystemUtxo: ModelStatic<EcosystemUtxoInstance>;
    exchange: ModelStatic<ExchangeInstance>;
    exchangeCurrency: ModelStatic<ExchangeCurrencyInstance>;
    exchangeMarket: ModelStatic<ExchangeMarketInstance>;
    exchangeOrder: ModelStatic<ExchangeOrderInstance>;
    exchangeWatchlist: ModelStatic<ExchangeWatchlistInstance>;
    extension: ModelStatic<ExtensionInstance>;
    faq: ModelStatic<FaqInstance>;
    faqFeedback: ModelStatic<FaqFeedbackInstance>;
    faqQuestion: ModelStatic<FaqQuestionInstance>;
    faqSearch: ModelStatic<FaqSearchInstance>;
    forexAccount: ModelStatic<ForexAccountInstance>;
    forexAccountSignal: ModelStatic<ForexAccountSignalInstance>;
    forexDuration: ModelStatic<ForexDurationInstance>;
    forexInvestment: ModelStatic<ForexInvestmentInstance>;
    forexPlan: ModelStatic<ForexPlanInstance>;
    forexPlanDuration: ModelStatic<ForexPlanDurationInstance>;
    forexSignal: ModelStatic<ForexSignalInstance>;
    futuresMarket: ModelStatic<FuturesMarketInstance>;
    gasHistory: ModelStatic<GasHistoryInstance>;
    gatewayApiKey: ModelStatic<GatewayApiKeyInstance>;
    gatewayMerchant: ModelStatic<GatewayMerchantInstance>;
    gatewayMerchantBalance: ModelStatic<GatewayMerchantBalanceInstance>;
    gatewayPayment: ModelStatic<GatewayPaymentInstance>;
    gatewayPayout: ModelStatic<GatewayPayoutInstance>;
    gatewayRefund: ModelStatic<GatewayRefundInstance>;
    gatewayWebhook: ModelStatic<GatewayWebhookInstance>;
    icoAdminActivity: ModelStatic<IcoAdminActivityInstance>;
    icoBlockchain: ModelStatic<IcoBlockchainInstance>;
    icoLaunchPlan: ModelStatic<IcoLaunchPlanInstance>;
    icoRoadmapItem: ModelStatic<IcoRoadmapItemInstance>;
    icoTeamMember: ModelStatic<IcoTeamMemberInstance>;
    icoTokenDetail: ModelStatic<IcoTokenDetailInstance>;
    icoTokenOffering: ModelStatic<IcoTokenOfferingInstance>;
    icoTokenOfferingPhase: ModelStatic<IcoTokenOfferingPhaseInstance>;
    icoTokenOfferingUpdate: ModelStatic<IcoTokenOfferingUpdateInstance>;
    icoTokenType: ModelStatic<IcoTokenTypeInstance>;
    icoTokenVesting: ModelStatic<IcoTokenVestingInstance>;
    icoTokenVestingRelease: ModelStatic<IcoTokenVestingReleaseInstance>;
    icoTransaction: ModelStatic<IcoTransactionInstance>;
    investment: ModelStatic<InvestmentInstance>;
    investmentDuration: ModelStatic<InvestmentDurationInstance>;
    investmentPlan: ModelStatic<InvestmentPlanInstance>;
    investmentPlanDuration: ModelStatic<InvestmentPlanDurationInstance>;
    kycApplication: ModelStatic<KycApplicationInstance>;
    kycLevel: ModelStatic<KycLevelInstance>;
    kycVerificationResult: ModelStatic<KycVerificationResultInstance>;
    kycVerificationService: ModelStatic<KycVerificationServiceInstance>;
    mailwizardBlock: ModelStatic<MailwizardBlockInstance>;
    mailwizardCampaign: ModelStatic<MailwizardCampaignInstance>;
    mailwizardTemplate: ModelStatic<MailwizardTemplateInstance>;
    mlmBinaryNode: ModelStatic<MlmBinaryNodeInstance>;
    mlmReferral: ModelStatic<MlmReferralInstance>;
    mlmReferralCondition: ModelStatic<MlmReferralConditionInstance>;
    mlmReferralReward: ModelStatic<MlmReferralRewardInstance>;
    mlmUnilevelNode: ModelStatic<MlmUnilevelNodeInstance>;
    nftActivity: ModelStatic<NftActivityInstance>;
    nftBid: ModelStatic<NftBidInstance>;
    nftCategory: ModelStatic<NftCategoryInstance>;
    nftCollection: ModelStatic<NftCollectionInstance>;
    nftComment: ModelStatic<NftCommentInstance>;
    nftCreator: ModelStatic<NftCreatorInstance>;
    nftCreatorFollow: ModelStatic<NftCreatorFollowInstance>;
    nftDispute: ModelStatic<NftDisputeInstance>;
    nftDisputeMessage: ModelStatic<NftDisputeMessageInstance>;
    nftFavorite: ModelStatic<NftFavoriteInstance>;
    nftFractional: ModelStatic<NftFractionalInstance>;
    nftListing: ModelStatic<NftListingInstance>;
    nftMarketplace: ModelStatic<NftMarketplaceInstance>;
    nftMetadataBackup: ModelStatic<NftMetadataBackupInstance>;
    nftOffer: ModelStatic<NftOfferInstance>;
    nftPriceHistory: ModelStatic<NftPriceHistoryInstance>;
    nftReview: ModelStatic<NftReviewInstance>;
    nftRoyalty: ModelStatic<NftRoyaltyInstance>;
    nftSale: ModelStatic<NftSaleInstance>;
    nftToken: ModelStatic<NftTokenInstance>;
    notification: ModelStatic<NotificationInstance>;
    notificationTemplate: ModelStatic<NotificationTemplateInstance>;
    oneTimeToken: ModelStatic<OneTimeTokenInstance>;
    p2pActivityLog: ModelStatic<P2pActivityLogInstance>;
    p2pAdminActivity: ModelStatic<P2pAdminActivityInstance>;
    p2pCommission: ModelStatic<P2pCommissionInstance>;
    p2pDispute: ModelStatic<P2pDisputeInstance>;
    p2pOffer: ModelStatic<P2pOfferInstance>;
    p2pOfferFlag: ModelStatic<P2pOfferFlagInstance>;
    p2pOfferPaymentMethod: ModelStatic<P2pOfferPaymentMethodInstance>;
    p2pPaymentMethod: ModelStatic<P2pPaymentMethodInstance>;
    p2pReview: ModelStatic<P2pReviewInstance>;
    p2pTrade: ModelStatic<P2pTradeInstance>;
    page: ModelStatic<PageInstance>;
    permission: ModelStatic<PermissionInstance>;
    post: ModelStatic<PostInstance>;
    postTag: ModelStatic<PostTagInstance>;
    providerUser: ModelStatic<ProviderUserInstance>;
    role: ModelStatic<RoleInstance>;
    rolePermission: ModelStatic<RolePermissionInstance>;
    settings: ModelStatic<SettingsInstance>;
    slider: ModelStatic<SliderInstance>;
    stakingAdminActivity: ModelStatic<StakingAdminActivityInstance>;
    stakingAdminEarning: ModelStatic<StakingAdminEarningInstance>;
    stakingEarningRecord: ModelStatic<StakingEarningRecordInstance>;
    stakingExternalPoolPerformance: ModelStatic<StakingExternalPoolPerformanceInstance>;
    stakingPool: ModelStatic<StakingPoolInstance>;
    stakingPosition: ModelStatic<StakingPositionInstance>;
    supportTicket: ModelStatic<SupportTicketInstance>;
    tag: ModelStatic<TagInstance>;
    tradingBot: ModelStatic<TradingBotInstance>;
    tradingBotAuditLog: ModelStatic<TradingBotAuditLogInstance>;
    tradingBotOrder: ModelStatic<TradingBotOrderInstance>;
    tradingBotPaperAccount: ModelStatic<TradingBotPaperAccountInstance>;
    tradingBotPurchase: ModelStatic<TradingBotPurchaseInstance>;
    tradingBotStats: ModelStatic<TradingBotStatsInstance>;
    tradingBotStrategy: ModelStatic<TradingBotStrategyInstance>;
    tradingBotStrategyReview: ModelStatic<TradingBotStrategyReviewInstance>;
    tradingBotTrade: ModelStatic<TradingBotTradeInstance>;
    transaction: ModelStatic<TransactionInstance>;
    twoFactor: ModelStatic<TwoFactorInstance>;
    user: ModelStatic<UserInstance>;
    userBlock: ModelStatic<UserBlockInstance>;
    wallet: ModelStatic<WalletInstance>;
    walletData: ModelStatic<WalletDataInstance>;
    walletPnl: ModelStatic<WalletPnlInstance>;
    withdrawMethod: ModelStatic<WithdrawMethodInstance>;
  }

  // ========================================
  // Type Aliases (for backward compatibility)
  // ========================================

  type adminProfitAttributes = AdminProfitAttributes;
  type adminProfitCreationAttributes = AdminProfitCreationAttributes;
  type aiBotAttributes = AiBotAttributes;
  type aiBotCreationAttributes = AiBotCreationAttributes;
  type aiInvestmentAttributes = AiInvestmentAttributes;
  type aiInvestmentCreationAttributes = AiInvestmentCreationAttributes;
  type aiInvestmentDurationAttributes = AiInvestmentDurationAttributes;
  type aiInvestmentDurationCreationAttributes = AiInvestmentDurationCreationAttributes;
  type aiInvestmentPlanAttributes = AiInvestmentPlanAttributes;
  type aiInvestmentPlanCreationAttributes = AiInvestmentPlanCreationAttributes;
  type aiInvestmentPlanDurationAttributes = AiInvestmentPlanDurationAttributes;
  type aiInvestmentPlanDurationCreationAttributes = AiInvestmentPlanDurationCreationAttributes;
  type aiMarketMakerAttributes = AiMarketMakerAttributes;
  type aiMarketMakerCreationAttributes = AiMarketMakerCreationAttributes;
  type aiMarketMakerHistoryAttributes = AiMarketMakerHistoryAttributes;
  type aiMarketMakerHistoryCreationAttributes = AiMarketMakerHistoryCreationAttributes;
  type aiMarketMakerPoolAttributes = AiMarketMakerPoolAttributes;
  type aiMarketMakerPoolCreationAttributes = AiMarketMakerPoolCreationAttributes;
  type announcementAttributes = AnnouncementAttributes;
  type announcementCreationAttributes = AnnouncementCreationAttributes;
  type apiKeyAttributes = ApiKeyAttributes;
  type apiKeyCreationAttributes = ApiKeyCreationAttributes;
  type authorAttributes = AuthorAttributes;
  type authorCreationAttributes = AuthorCreationAttributes;
  type binaryAiEngineAttributes = BinaryAiEngineAttributes;
  type binaryAiEngineCreationAttributes = BinaryAiEngineCreationAttributes;
  type binaryAiEngineABTestAttributes = BinaryAiEngineABTestAttributes;
  type binaryAiEngineABTestCreationAttributes = BinaryAiEngineABTestCreationAttributes;
  type binaryAiEngineABTestAssignmentAttributes = BinaryAiEngineABTestAssignmentAttributes;
  type binaryAiEngineABTestAssignmentCreationAttributes = BinaryAiEngineABTestAssignmentCreationAttributes;
  type binaryAiEngineActionAttributes = BinaryAiEngineActionAttributes;
  type binaryAiEngineActionCreationAttributes = BinaryAiEngineActionCreationAttributes;
  type binaryAiEngineCohortAttributes = BinaryAiEngineCohortAttributes;
  type binaryAiEngineCohortCreationAttributes = BinaryAiEngineCohortCreationAttributes;
  type binaryAiEngineCorrelationAlertAttributes = BinaryAiEngineCorrelationAlertAttributes;
  type binaryAiEngineCorrelationAlertCreationAttributes = BinaryAiEngineCorrelationAlertCreationAttributes;
  type binaryAiEngineCorrelationHistoryAttributes = BinaryAiEngineCorrelationHistoryAttributes;
  type binaryAiEngineCorrelationHistoryCreationAttributes = BinaryAiEngineCorrelationHistoryCreationAttributes;
  type binaryAiEngineDailyStatsAttributes = BinaryAiEngineDailyStatsAttributes;
  type binaryAiEngineDailyStatsCreationAttributes = BinaryAiEngineDailyStatsCreationAttributes;
  type binaryAiEnginePositionAttributes = BinaryAiEnginePositionAttributes;
  type binaryAiEnginePositionCreationAttributes = BinaryAiEnginePositionCreationAttributes;
  type binaryAiEngineSimulationAttributes = BinaryAiEngineSimulationAttributes;
  type binaryAiEngineSimulationCreationAttributes = BinaryAiEngineSimulationCreationAttributes;
  type binaryAiEngineSnapshotAttributes = BinaryAiEngineSnapshotAttributes;
  type binaryAiEngineSnapshotCreationAttributes = BinaryAiEngineSnapshotCreationAttributes;
  type binaryAiEngineUserCooldownAttributes = BinaryAiEngineUserCooldownAttributes;
  type binaryAiEngineUserCooldownCreationAttributes = BinaryAiEngineUserCooldownCreationAttributes;
  type binaryAiEngineUserTierAttributes = BinaryAiEngineUserTierAttributes;
  type binaryAiEngineUserTierCreationAttributes = BinaryAiEngineUserTierCreationAttributes;
  type binaryMarketAttributes = BinaryMarketAttributes;
  type binaryMarketCreationAttributes = BinaryMarketCreationAttributes;
  type binaryOrderAttributes = BinaryOrderAttributes;
  type binaryOrderCreationAttributes = BinaryOrderCreationAttributes;
  type categoryAttributes = CategoryAttributes;
  type categoryCreationAttributes = CategoryCreationAttributes;
  type commentAttributes = CommentAttributes;
  type commentCreationAttributes = CommentCreationAttributes;
  type copyTradingAuditLogAttributes = CopyTradingAuditLogAttributes;
  type copyTradingAuditLogCreationAttributes = CopyTradingAuditLogCreationAttributes;
  type copyTradingFollowerAttributes = CopyTradingFollowerAttributes;
  type copyTradingFollowerCreationAttributes = CopyTradingFollowerCreationAttributes;
  type copyTradingFollowerAllocationAttributes = CopyTradingFollowerAllocationAttributes;
  type copyTradingFollowerAllocationCreationAttributes = CopyTradingFollowerAllocationCreationAttributes;
  type copyTradingLeaderAttributes = CopyTradingLeaderAttributes;
  type copyTradingLeaderCreationAttributes = CopyTradingLeaderCreationAttributes;
  type copyTradingLeaderMarketAttributes = CopyTradingLeaderMarketAttributes;
  type copyTradingLeaderMarketCreationAttributes = CopyTradingLeaderMarketCreationAttributes;
  type copyTradingLeaderStatsAttributes = CopyTradingLeaderStatsAttributes;
  type copyTradingLeaderStatsCreationAttributes = CopyTradingLeaderStatsCreationAttributes;
  type copyTradingTradeAttributes = CopyTradingTradeAttributes;
  type copyTradingTradeCreationAttributes = CopyTradingTradeCreationAttributes;
  type copyTradingTransactionAttributes = CopyTradingTransactionAttributes;
  type copyTradingTransactionCreationAttributes = CopyTradingTransactionCreationAttributes;
  type currencyAttributes = CurrencyAttributes;
  type currencyCreationAttributes = CurrencyCreationAttributes;
  type defaultPageAttributes = DefaultPageAttributes;
  type defaultPageCreationAttributes = DefaultPageCreationAttributes;
  type depositGatewayAttributes = DepositGatewayAttributes;
  type depositGatewayCreationAttributes = DepositGatewayCreationAttributes;
  type depositMethodAttributes = DepositMethodAttributes;
  type depositMethodCreationAttributes = DepositMethodCreationAttributes;
  type ecommerceCategoryAttributes = EcommerceCategoryAttributes;
  type ecommerceCategoryCreationAttributes = EcommerceCategoryCreationAttributes;
  type ecommerceDiscountAttributes = EcommerceDiscountAttributes;
  type ecommerceDiscountCreationAttributes = EcommerceDiscountCreationAttributes;
  type ecommerceOrderAttributes = EcommerceOrderAttributes;
  type ecommerceOrderCreationAttributes = EcommerceOrderCreationAttributes;
  type ecommerceOrderItemAttributes = EcommerceOrderItemAttributes;
  type ecommerceOrderItemCreationAttributes = EcommerceOrderItemCreationAttributes;
  type ecommerceProductAttributes = EcommerceProductAttributes;
  type ecommerceProductCreationAttributes = EcommerceProductCreationAttributes;
  type ecommerceReviewAttributes = EcommerceReviewAttributes;
  type ecommerceReviewCreationAttributes = EcommerceReviewCreationAttributes;
  type ecommerceShippingAttributes = EcommerceShippingAttributes;
  type ecommerceShippingCreationAttributes = EcommerceShippingCreationAttributes;
  type ecommerceShippingAddressAttributes = EcommerceShippingAddressAttributes;
  type ecommerceShippingAddressCreationAttributes = EcommerceShippingAddressCreationAttributes;
  type ecommerceUserDiscountAttributes = EcommerceUserDiscountAttributes;
  type ecommerceUserDiscountCreationAttributes = EcommerceUserDiscountCreationAttributes;
  type ecommerceWishlistAttributes = EcommerceWishlistAttributes;
  type ecommerceWishlistCreationAttributes = EcommerceWishlistCreationAttributes;
  type ecommerceWishlistItemAttributes = EcommerceWishlistItemAttributes;
  type ecommerceWishlistItemCreationAttributes = EcommerceWishlistItemCreationAttributes;
  type ecosystemBlockchainAttributes = EcosystemBlockchainAttributes;
  type ecosystemBlockchainCreationAttributes = EcosystemBlockchainCreationAttributes;
  type ecosystemCustodialWalletAttributes = EcosystemCustodialWalletAttributes;
  type ecosystemCustodialWalletCreationAttributes = EcosystemCustodialWalletCreationAttributes;
  type ecosystemMarketAttributes = EcosystemMarketAttributes;
  type ecosystemMarketCreationAttributes = EcosystemMarketCreationAttributes;
  type ecosystemMasterWalletAttributes = EcosystemMasterWalletAttributes;
  type ecosystemMasterWalletCreationAttributes = EcosystemMasterWalletCreationAttributes;
  type ecosystemPrivateLedgerAttributes = EcosystemPrivateLedgerAttributes;
  type ecosystemPrivateLedgerCreationAttributes = EcosystemPrivateLedgerCreationAttributes;
  type ecosystemTokenAttributes = EcosystemTokenAttributes;
  type ecosystemTokenCreationAttributes = EcosystemTokenCreationAttributes;
  type ecosystemUtxoAttributes = EcosystemUtxoAttributes;
  type ecosystemUtxoCreationAttributes = EcosystemUtxoCreationAttributes;
  type exchangeAttributes = ExchangeAttributes;
  type exchangeCreationAttributes = ExchangeCreationAttributes;
  type exchangeCurrencyAttributes = ExchangeCurrencyAttributes;
  type exchangeCurrencyCreationAttributes = ExchangeCurrencyCreationAttributes;
  type exchangeMarketAttributes = ExchangeMarketAttributes;
  type exchangeMarketCreationAttributes = ExchangeMarketCreationAttributes;
  type exchangeOrderAttributes = ExchangeOrderAttributes;
  type exchangeOrderCreationAttributes = ExchangeOrderCreationAttributes;
  type exchangeWatchlistAttributes = ExchangeWatchlistAttributes;
  type exchangeWatchlistCreationAttributes = ExchangeWatchlistCreationAttributes;
  type extensionAttributes = ExtensionAttributes;
  type extensionCreationAttributes = ExtensionCreationAttributes;
  type faqAttributes = FaqAttributes;
  type faqCreationAttributes = FaqCreationAttributes;
  type faqFeedbackAttributes = FaqFeedbackAttributes;
  type faqFeedbackCreationAttributes = FaqFeedbackCreationAttributes;
  type faqQuestionAttributes = FaqQuestionAttributes;
  type faqQuestionCreationAttributes = FaqQuestionCreationAttributes;
  type faqSearchAttributes = FaqSearchAttributes;
  type faqSearchCreationAttributes = FaqSearchCreationAttributes;
  type forexAccountAttributes = ForexAccountAttributes;
  type forexAccountCreationAttributes = ForexAccountCreationAttributes;
  type forexAccountSignalAttributes = ForexAccountSignalAttributes;
  type forexAccountSignalCreationAttributes = ForexAccountSignalCreationAttributes;
  type forexDurationAttributes = ForexDurationAttributes;
  type forexDurationCreationAttributes = ForexDurationCreationAttributes;
  type forexInvestmentAttributes = ForexInvestmentAttributes;
  type forexInvestmentCreationAttributes = ForexInvestmentCreationAttributes;
  type forexPlanAttributes = ForexPlanAttributes;
  type forexPlanCreationAttributes = ForexPlanCreationAttributes;
  type forexPlanDurationAttributes = ForexPlanDurationAttributes;
  type forexPlanDurationCreationAttributes = ForexPlanDurationCreationAttributes;
  type forexSignalAttributes = ForexSignalAttributes;
  type forexSignalCreationAttributes = ForexSignalCreationAttributes;
  type futuresMarketAttributes = FuturesMarketAttributes;
  type futuresMarketCreationAttributes = FuturesMarketCreationAttributes;
  type gasHistoryAttributes = GasHistoryAttributes;
  type gasHistoryCreationAttributes = GasHistoryCreationAttributes;
  type gatewayApiKeyAttributes = GatewayApiKeyAttributes;
  type gatewayApiKeyCreationAttributes = GatewayApiKeyCreationAttributes;
  type gatewayMerchantAttributes = GatewayMerchantAttributes;
  type gatewayMerchantCreationAttributes = GatewayMerchantCreationAttributes;
  type gatewayMerchantBalanceAttributes = GatewayMerchantBalanceAttributes;
  type gatewayMerchantBalanceCreationAttributes = GatewayMerchantBalanceCreationAttributes;
  type gatewayPaymentAttributes = GatewayPaymentAttributes;
  type gatewayPaymentCreationAttributes = GatewayPaymentCreationAttributes;
  type gatewayPayoutAttributes = GatewayPayoutAttributes;
  type gatewayPayoutCreationAttributes = GatewayPayoutCreationAttributes;
  type gatewayRefundAttributes = GatewayRefundAttributes;
  type gatewayRefundCreationAttributes = GatewayRefundCreationAttributes;
  type gatewayWebhookAttributes = GatewayWebhookAttributes;
  type gatewayWebhookCreationAttributes = GatewayWebhookCreationAttributes;
  type icoAdminActivityAttributes = IcoAdminActivityAttributes;
  type icoAdminActivityCreationAttributes = IcoAdminActivityCreationAttributes;
  type icoBlockchainAttributes = IcoBlockchainAttributes;
  type icoBlockchainCreationAttributes = IcoBlockchainCreationAttributes;
  type icoLaunchPlanAttributes = IcoLaunchPlanAttributes;
  type icoLaunchPlanCreationAttributes = IcoLaunchPlanCreationAttributes;
  type icoRoadmapItemAttributes = IcoRoadmapItemAttributes;
  type icoRoadmapItemCreationAttributes = IcoRoadmapItemCreationAttributes;
  type icoTeamMemberAttributes = IcoTeamMemberAttributes;
  type icoTeamMemberCreationAttributes = IcoTeamMemberCreationAttributes;
  type icoTokenDetailAttributes = IcoTokenDetailAttributes;
  type icoTokenDetailCreationAttributes = IcoTokenDetailCreationAttributes;
  type icoTokenOfferingAttributes = IcoTokenOfferingAttributes;
  type icoTokenOfferingCreationAttributes = IcoTokenOfferingCreationAttributes;
  type icoTokenOfferingPhaseAttributes = IcoTokenOfferingPhaseAttributes;
  type icoTokenOfferingPhaseCreationAttributes = IcoTokenOfferingPhaseCreationAttributes;
  type icoTokenOfferingUpdateAttributes = IcoTokenOfferingUpdateAttributes;
  type icoTokenOfferingUpdateCreationAttributes = IcoTokenOfferingUpdateCreationAttributes;
  type icoTokenTypeAttributes = IcoTokenTypeAttributes;
  type icoTokenTypeCreationAttributes = IcoTokenTypeCreationAttributes;
  type icoTokenVestingAttributes = IcoTokenVestingAttributes;
  type icoTokenVestingCreationAttributes = IcoTokenVestingCreationAttributes;
  type icoTokenVestingReleaseAttributes = IcoTokenVestingReleaseAttributes;
  type icoTokenVestingReleaseCreationAttributes = IcoTokenVestingReleaseCreationAttributes;
  type icoTransactionAttributes = IcoTransactionAttributes;
  type icoTransactionCreationAttributes = IcoTransactionCreationAttributes;
  type investmentAttributes = InvestmentAttributes;
  type investmentCreationAttributes = InvestmentCreationAttributes;
  type investmentDurationAttributes = InvestmentDurationAttributes;
  type investmentDurationCreationAttributes = InvestmentDurationCreationAttributes;
  type investmentPlanAttributes = InvestmentPlanAttributes;
  type investmentPlanCreationAttributes = InvestmentPlanCreationAttributes;
  type investmentPlanDurationAttributes = InvestmentPlanDurationAttributes;
  type investmentPlanDurationCreationAttributes = InvestmentPlanDurationCreationAttributes;
  type kycApplicationAttributes = KycApplicationAttributes;
  type kycApplicationCreationAttributes = KycApplicationCreationAttributes;
  type kycLevelAttributes = KycLevelAttributes;
  type kycLevelCreationAttributes = KycLevelCreationAttributes;
  type kycVerificationResultAttributes = KycVerificationResultAttributes;
  type kycVerificationResultCreationAttributes = KycVerificationResultCreationAttributes;
  type kycVerificationServiceAttributes = KycVerificationServiceAttributes;
  type kycVerificationServiceCreationAttributes = KycVerificationServiceCreationAttributes;
  type mailwizardBlockAttributes = MailwizardBlockAttributes;
  type mailwizardBlockCreationAttributes = MailwizardBlockCreationAttributes;
  type mailwizardCampaignAttributes = MailwizardCampaignAttributes;
  type mailwizardCampaignCreationAttributes = MailwizardCampaignCreationAttributes;
  type mailwizardTemplateAttributes = MailwizardTemplateAttributes;
  type mailwizardTemplateCreationAttributes = MailwizardTemplateCreationAttributes;
  type mlmBinaryNodeAttributes = MlmBinaryNodeAttributes;
  type mlmBinaryNodeCreationAttributes = MlmBinaryNodeCreationAttributes;
  type mlmReferralAttributes = MlmReferralAttributes;
  type mlmReferralCreationAttributes = MlmReferralCreationAttributes;
  type mlmReferralConditionAttributes = MlmReferralConditionAttributes;
  type mlmReferralConditionCreationAttributes = MlmReferralConditionCreationAttributes;
  type mlmReferralRewardAttributes = MlmReferralRewardAttributes;
  type mlmReferralRewardCreationAttributes = MlmReferralRewardCreationAttributes;
  type mlmUnilevelNodeAttributes = MlmUnilevelNodeAttributes;
  type mlmUnilevelNodeCreationAttributes = MlmUnilevelNodeCreationAttributes;
  type nftActivityAttributes = NftActivityAttributes;
  type nftActivityCreationAttributes = NftActivityCreationAttributes;
  type nftBidAttributes = NftBidAttributes;
  type nftBidCreationAttributes = NftBidCreationAttributes;
  type nftCategoryAttributes = NftCategoryAttributes;
  type nftCategoryCreationAttributes = NftCategoryCreationAttributes;
  type nftCollectionAttributes = NftCollectionAttributes;
  type nftCollectionCreationAttributes = NftCollectionCreationAttributes;
  type nftCommentAttributes = NftCommentAttributes;
  type nftCommentCreationAttributes = NftCommentCreationAttributes;
  type nftCreatorAttributes = NftCreatorAttributes;
  type nftCreatorCreationAttributes = NftCreatorCreationAttributes;
  type nftCreatorFollowAttributes = NftCreatorFollowAttributes;
  type nftCreatorFollowCreationAttributes = NftCreatorFollowCreationAttributes;
  type nftDisputeAttributes = NftDisputeAttributes;
  type nftDisputeCreationAttributes = NftDisputeCreationAttributes;
  type nftDisputeMessageAttributes = NftDisputeMessageAttributes;
  type nftDisputeMessageCreationAttributes = NftDisputeMessageCreationAttributes;
  type nftFavoriteAttributes = NftFavoriteAttributes;
  type nftFavoriteCreationAttributes = NftFavoriteCreationAttributes;
  type nftFractionalAttributes = NftFractionalAttributes;
  type nftFractionalCreationAttributes = NftFractionalCreationAttributes;
  type nftListingAttributes = NftListingAttributes;
  type nftListingCreationAttributes = NftListingCreationAttributes;
  type nftMarketplaceAttributes = NftMarketplaceAttributes;
  type nftMarketplaceCreationAttributes = NftMarketplaceCreationAttributes;
  type nftMetadataBackupAttributes = NftMetadataBackupAttributes;
  type nftMetadataBackupCreationAttributes = NftMetadataBackupCreationAttributes;
  type nftOfferAttributes = NftOfferAttributes;
  type nftOfferCreationAttributes = NftOfferCreationAttributes;
  type nftPriceHistoryAttributes = NftPriceHistoryAttributes;
  type nftPriceHistoryCreationAttributes = NftPriceHistoryCreationAttributes;
  type nftReviewAttributes = NftReviewAttributes;
  type nftReviewCreationAttributes = NftReviewCreationAttributes;
  type nftRoyaltyAttributes = NftRoyaltyAttributes;
  type nftRoyaltyCreationAttributes = NftRoyaltyCreationAttributes;
  type nftSaleAttributes = NftSaleAttributes;
  type nftSaleCreationAttributes = NftSaleCreationAttributes;
  type nftTokenAttributes = NftTokenAttributes;
  type nftTokenCreationAttributes = NftTokenCreationAttributes;
  type notificationAttributes = NotificationAttributes;
  type notificationCreationAttributes = NotificationCreationAttributes;
  type notificationTemplateAttributes = NotificationTemplateAttributes;
  type notificationTemplateCreationAttributes = NotificationTemplateCreationAttributes;
  type oneTimeTokenAttributes = OneTimeTokenAttributes;
  type oneTimeTokenCreationAttributes = OneTimeTokenCreationAttributes;
  type p2pActivityLogAttributes = P2pActivityLogAttributes;
  type p2pActivityLogCreationAttributes = P2pActivityLogCreationAttributes;
  type p2pAdminActivityAttributes = P2pAdminActivityAttributes;
  type p2pAdminActivityCreationAttributes = P2pAdminActivityCreationAttributes;
  type p2pCommissionAttributes = P2pCommissionAttributes;
  type p2pCommissionCreationAttributes = P2pCommissionCreationAttributes;
  type p2pDisputeAttributes = P2pDisputeAttributes;
  type p2pDisputeCreationAttributes = P2pDisputeCreationAttributes;
  type p2pOfferAttributes = P2pOfferAttributes;
  type p2pOfferCreationAttributes = P2pOfferCreationAttributes;
  type p2pOfferFlagAttributes = P2pOfferFlagAttributes;
  type p2pOfferFlagCreationAttributes = P2pOfferFlagCreationAttributes;
  type p2pOfferPaymentMethodAttributes = P2pOfferPaymentMethodAttributes;
  type p2pOfferPaymentMethodCreationAttributes = P2pOfferPaymentMethodCreationAttributes;
  type p2pPaymentMethodAttributes = P2pPaymentMethodAttributes;
  type p2pPaymentMethodCreationAttributes = P2pPaymentMethodCreationAttributes;
  type p2pReviewAttributes = P2pReviewAttributes;
  type p2pReviewCreationAttributes = P2pReviewCreationAttributes;
  type p2pTradeAttributes = P2pTradeAttributes;
  type p2pTradeCreationAttributes = P2pTradeCreationAttributes;
  type pageAttributes = PageAttributes;
  type pageCreationAttributes = PageCreationAttributes;
  type permissionAttributes = PermissionAttributes;
  type permissionCreationAttributes = PermissionCreationAttributes;
  type postAttributes = PostAttributes;
  type postCreationAttributes = PostCreationAttributes;
  type postTagAttributes = PostTagAttributes;
  type postTagCreationAttributes = PostTagCreationAttributes;
  type providerUserAttributes = ProviderUserAttributes;
  type providerUserCreationAttributes = ProviderUserCreationAttributes;
  type roleAttributes = RoleAttributes;
  type roleCreationAttributes = RoleCreationAttributes;
  type rolePermissionAttributes = RolePermissionAttributes;
  type rolePermissionCreationAttributes = RolePermissionCreationAttributes;
  type settingsAttributes = SettingsAttributes;
  type settingsCreationAttributes = SettingsCreationAttributes;
  type sliderAttributes = SliderAttributes;
  type sliderCreationAttributes = SliderCreationAttributes;
  type stakingAdminActivityAttributes = StakingAdminActivityAttributes;
  type stakingAdminActivityCreationAttributes = StakingAdminActivityCreationAttributes;
  type stakingAdminEarningAttributes = StakingAdminEarningAttributes;
  type stakingAdminEarningCreationAttributes = StakingAdminEarningCreationAttributes;
  type stakingEarningRecordAttributes = StakingEarningRecordAttributes;
  type stakingEarningRecordCreationAttributes = StakingEarningRecordCreationAttributes;
  type stakingExternalPoolPerformanceAttributes = StakingExternalPoolPerformanceAttributes;
  type stakingExternalPoolPerformanceCreationAttributes = StakingExternalPoolPerformanceCreationAttributes;
  type stakingPoolAttributes = StakingPoolAttributes;
  type stakingPoolCreationAttributes = StakingPoolCreationAttributes;
  type stakingPositionAttributes = StakingPositionAttributes;
  type stakingPositionCreationAttributes = StakingPositionCreationAttributes;
  type supportTicketAttributes = SupportTicketAttributes;
  type supportTicketCreationAttributes = SupportTicketCreationAttributes;
  type tagAttributes = TagAttributes;
  type tagCreationAttributes = TagCreationAttributes;
  type tradingBotAttributes = TradingBotAttributes;
  type tradingBotCreationAttributes = TradingBotCreationAttributes;
  type tradingBotAuditLogAttributes = TradingBotAuditLogAttributes;
  type tradingBotAuditLogCreationAttributes = TradingBotAuditLogCreationAttributes;
  type tradingBotOrderAttributes = TradingBotOrderAttributes;
  type tradingBotOrderCreationAttributes = TradingBotOrderCreationAttributes;
  type tradingBotPaperAccountAttributes = TradingBotPaperAccountAttributes;
  type tradingBotPaperAccountCreationAttributes = TradingBotPaperAccountCreationAttributes;
  type tradingBotPurchaseAttributes = TradingBotPurchaseAttributes;
  type tradingBotPurchaseCreationAttributes = TradingBotPurchaseCreationAttributes;
  type tradingBotStatsAttributes = TradingBotStatsAttributes;
  type tradingBotStatsCreationAttributes = TradingBotStatsCreationAttributes;
  type tradingBotStrategyAttributes = TradingBotStrategyAttributes;
  type tradingBotStrategyCreationAttributes = TradingBotStrategyCreationAttributes;
  type tradingBotStrategyReviewAttributes = TradingBotStrategyReviewAttributes;
  type tradingBotStrategyReviewCreationAttributes = TradingBotStrategyReviewCreationAttributes;
  type tradingBotTradeAttributes = TradingBotTradeAttributes;
  type tradingBotTradeCreationAttributes = TradingBotTradeCreationAttributes;
  type transactionAttributes = TransactionAttributes;
  type transactionCreationAttributes = TransactionCreationAttributes;
  type twoFactorAttributes = TwoFactorAttributes;
  type twoFactorCreationAttributes = TwoFactorCreationAttributes;
  type userAttributes = UserAttributes;
  type userCreationAttributes = UserCreationAttributes;
  type userBlockAttributes = UserBlockAttributes;
  type userBlockCreationAttributes = UserBlockCreationAttributes;
  type walletAttributes = WalletAttributes;
  type walletCreationAttributes = WalletCreationAttributes;
  type walletDataAttributes = WalletDataAttributes;
  type walletDataCreationAttributes = WalletDataCreationAttributes;
  type walletPnlAttributes = WalletPnlAttributes;
  type walletPnlCreationAttributes = WalletPnlCreationAttributes;
  type withdrawMethodAttributes = WithdrawMethodAttributes;
  type withdrawMethodCreationAttributes = WithdrawMethodCreationAttributes;

  // ========================================
  // Plain Types for API Responses
  // These types represent the plain object form of models,
  // useful for frontend consumption and API responses.
  // ========================================

  /** Plain object type for AdminProfit, suitable for API responses */
  interface AdminProfitPlain extends AdminProfitAttributes {
    transaction?: TransactionPlain;
  }

  /** Plain object type for AiBot, suitable for API responses */
  interface AiBotPlain extends AiBotAttributes {
    marketMaker?: AiMarketMakerPlain;
  }

  /** Plain object type for AiInvestment, suitable for API responses */
  interface AiInvestmentPlain extends AiInvestmentAttributes {
    plan?: AiInvestmentPlanPlain;
    duration?: AiInvestmentDurationPlain;
    user?: UserPlain;
  }

  /** Plain object type for AiInvestmentDuration, suitable for API responses */
  interface AiInvestmentDurationPlain extends AiInvestmentDurationAttributes {
    investments?: AiInvestmentPlain[];
    aiInvestmentPlanDurations?: AiInvestmentPlanDurationPlain[];
    plans?: AiInvestmentPlanPlain[];
  }

  /** Plain object type for AiInvestmentPlan, suitable for API responses */
  interface AiInvestmentPlanPlain extends AiInvestmentPlanAttributes {
    investments?: AiInvestmentPlain[];
    planDurations?: AiInvestmentPlanDurationPlain[];
    durations?: AiInvestmentDurationPlain[];
  }

  /** Plain object type for AiInvestmentPlanDuration, suitable for API responses */
  interface AiInvestmentPlanDurationPlain extends AiInvestmentPlanDurationAttributes {
    duration?: AiInvestmentDurationPlain;
    plan?: AiInvestmentPlanPlain;
  }

  /** Plain object type for AiMarketMaker, suitable for API responses */
  interface AiMarketMakerPlain extends AiMarketMakerAttributes {
    pool?: AiMarketMakerPoolPlain;
    bots?: AiBotPlain[];
    history?: AiMarketMakerHistoryPlain[];
    market?: EcosystemMarketPlain;
  }

  /** Plain object type for AiMarketMakerHistory, suitable for API responses */
  interface AiMarketMakerHistoryPlain extends AiMarketMakerHistoryAttributes {
    marketMaker?: AiMarketMakerPlain;
  }

  /** Plain object type for AiMarketMakerPool, suitable for API responses */
  interface AiMarketMakerPoolPlain extends AiMarketMakerPoolAttributes {
    marketMaker?: AiMarketMakerPlain;
  }

  /** Plain object type for Announcement, suitable for API responses */
  interface AnnouncementPlain extends AnnouncementAttributes {
  }

  /** Plain object type for ApiKey, suitable for API responses */
  interface ApiKeyPlain extends ApiKeyAttributes {
    user?: UserPlain;
  }

  /** Plain object type for Author, suitable for API responses */
  interface AuthorPlain extends AuthorAttributes {
    posts?: PostPlain[];
    user?: UserPlain;
  }

  /** Plain object type for BinaryAiEngine, suitable for API responses */
  interface BinaryAiEnginePlain extends BinaryAiEngineAttributes {
    positions?: BinaryAiEnginePositionPlain[];
    actions?: BinaryAiEngineActionPlain[];
    dailyStats?: BinaryAiEngineDailyStatsPlain[];
    userTiers?: BinaryAiEngineUserTierPlain[];
    userCooldowns?: BinaryAiEngineUserCooldownPlain[];
    snapshots?: BinaryAiEngineSnapshotPlain[];
    simulations?: BinaryAiEngineSimulationPlain[];
    abTests?: BinaryAiEngineABTestPlain[];
    cohorts?: BinaryAiEngineCohortPlain[];
    correlationAlerts?: BinaryAiEngineCorrelationAlertPlain[];
    marketMaker?: AiMarketMakerPlain;
  }

  /** Plain object type for BinaryAiEngineABTest, suitable for API responses */
  interface BinaryAiEngineABTestPlain extends BinaryAiEngineABTestAttributes {
    engine?: BinaryAiEnginePlain;
  }

  /** Plain object type for BinaryAiEngineABTestAssignment, suitable for API responses */
  interface BinaryAiEngineABTestAssignmentPlain extends BinaryAiEngineABTestAssignmentAttributes {
    test?: BinaryAiEngineABTestPlain;
    user?: UserPlain;
  }

  /** Plain object type for BinaryAiEngineAction, suitable for API responses */
  interface BinaryAiEngineActionPlain extends BinaryAiEngineActionAttributes {
    engine?: BinaryAiEnginePlain;
  }

  /** Plain object type for BinaryAiEngineCohort, suitable for API responses */
  interface BinaryAiEngineCohortPlain extends BinaryAiEngineCohortAttributes {
    engine?: BinaryAiEnginePlain;
  }

  /** Plain object type for BinaryAiEngineCorrelationAlert, suitable for API responses */
  interface BinaryAiEngineCorrelationAlertPlain extends BinaryAiEngineCorrelationAlertAttributes {
    engine?: BinaryAiEnginePlain;
  }

  /** Plain object type for BinaryAiEngineCorrelationHistory, suitable for API responses */
  interface BinaryAiEngineCorrelationHistoryPlain extends BinaryAiEngineCorrelationHistoryAttributes {
    engine?: BinaryAiEnginePlain;
  }

  /** Plain object type for BinaryAiEngineDailyStats, suitable for API responses */
  interface BinaryAiEngineDailyStatsPlain extends BinaryAiEngineDailyStatsAttributes {
    engine?: BinaryAiEnginePlain;
  }

  /** Plain object type for BinaryAiEnginePosition, suitable for API responses */
  interface BinaryAiEnginePositionPlain extends BinaryAiEnginePositionAttributes {
    engine?: BinaryAiEnginePlain;
    user?: UserPlain;
  }

  /** Plain object type for BinaryAiEngineSimulation, suitable for API responses */
  interface BinaryAiEngineSimulationPlain extends BinaryAiEngineSimulationAttributes {
    engine?: BinaryAiEnginePlain;
  }

  /** Plain object type for BinaryAiEngineSnapshot, suitable for API responses */
  interface BinaryAiEngineSnapshotPlain extends BinaryAiEngineSnapshotAttributes {
    engine?: BinaryAiEnginePlain;
  }

  /** Plain object type for BinaryAiEngineUserCooldown, suitable for API responses */
  interface BinaryAiEngineUserCooldownPlain extends BinaryAiEngineUserCooldownAttributes {
    engine?: BinaryAiEnginePlain;
    user?: UserPlain;
  }

  /** Plain object type for BinaryAiEngineUserTier, suitable for API responses */
  interface BinaryAiEngineUserTierPlain extends BinaryAiEngineUserTierAttributes {
    engine?: BinaryAiEnginePlain;
  }

  /** Plain object type for BinaryMarket, suitable for API responses */
  interface BinaryMarketPlain extends BinaryMarketAttributes {
  }

  /** Plain object type for BinaryOrder, suitable for API responses */
  interface BinaryOrderPlain extends BinaryOrderAttributes {
    user?: UserPlain;
  }

  /** Plain object type for Category, suitable for API responses */
  interface CategoryPlain extends CategoryAttributes {
    posts?: PostPlain[];
  }

  /** Plain object type for Comment, suitable for API responses */
  interface CommentPlain extends CommentAttributes {
    user?: UserPlain;
    post?: PostPlain;
  }

  /** Plain object type for CopyTradingAuditLog, suitable for API responses */
  interface CopyTradingAuditLogPlain extends CopyTradingAuditLogAttributes {
    user?: UserPlain;
    admin?: UserPlain;
  }

  /** Plain object type for CopyTradingFollower, suitable for API responses */
  interface CopyTradingFollowerPlain extends CopyTradingFollowerAttributes {
    trades?: CopyTradingTradePlain[];
    transactions?: CopyTradingTransactionPlain[];
    allocations?: CopyTradingFollowerAllocationPlain[];
    user?: UserPlain;
    leader?: CopyTradingLeaderPlain;
  }

  /** Plain object type for CopyTradingFollowerAllocation, suitable for API responses */
  interface CopyTradingFollowerAllocationPlain extends CopyTradingFollowerAllocationAttributes {
    follower?: CopyTradingFollowerPlain;
  }

  /** Plain object type for CopyTradingLeader, suitable for API responses */
  interface CopyTradingLeaderPlain extends CopyTradingLeaderAttributes {
    followers?: CopyTradingFollowerPlain[];
    trades?: CopyTradingTradePlain[];
    transactions?: CopyTradingTransactionPlain[];
    markets?: CopyTradingLeaderMarketPlain[];
    user?: UserPlain;
  }

  /** Plain object type for CopyTradingLeaderMarket, suitable for API responses */
  interface CopyTradingLeaderMarketPlain extends CopyTradingLeaderMarketAttributes {
    leader?: CopyTradingLeaderPlain;
  }

  /** Plain object type for CopyTradingLeaderStats, suitable for API responses */
  interface CopyTradingLeaderStatsPlain extends CopyTradingLeaderStatsAttributes {
    leader?: CopyTradingLeaderPlain;
  }

  /** Plain object type for CopyTradingTrade, suitable for API responses */
  interface CopyTradingTradePlain extends CopyTradingTradeAttributes {
    leader?: CopyTradingLeaderPlain;
    follower?: CopyTradingFollowerPlain;
  }

  /** Plain object type for CopyTradingTransaction, suitable for API responses */
  interface CopyTradingTransactionPlain extends CopyTradingTransactionAttributes {
    user?: UserPlain;
    leader?: CopyTradingLeaderPlain;
    follower?: CopyTradingFollowerPlain;
    trade?: CopyTradingTradePlain;
  }

  /** Plain object type for Currency, suitable for API responses */
  interface CurrencyPlain extends CurrencyAttributes {
  }

  /** Plain object type for DefaultPage, suitable for API responses */
  interface DefaultPagePlain extends DefaultPageAttributes {
  }

  /** Plain object type for DepositGateway, suitable for API responses */
  interface DepositGatewayPlain extends DepositGatewayAttributes {
  }

  /** Plain object type for DepositMethod, suitable for API responses */
  interface DepositMethodPlain extends DepositMethodAttributes {
  }

  /** Plain object type for EcommerceCategory, suitable for API responses */
  interface EcommerceCategoryPlain extends EcommerceCategoryAttributes {
    ecommerceProducts?: EcommerceProductPlain[];
  }

  /** Plain object type for EcommerceDiscount, suitable for API responses */
  interface EcommerceDiscountPlain extends EcommerceDiscountAttributes {
    ecommerceUserDiscounts?: EcommerceUserDiscountPlain[];
    product?: EcommerceProductPlain;
  }

  /** Plain object type for EcommerceOrder, suitable for API responses */
  interface EcommerceOrderPlain extends EcommerceOrderAttributes {
    shippingAddress?: EcommerceShippingAddressPlain;
    ecommerceOrderItems?: EcommerceOrderItemPlain[];
    shipping?: EcommerceShippingPlain;
    user?: UserPlain;
    products?: EcommerceProductPlain[];
  }

  /** Plain object type for EcommerceOrderItem, suitable for API responses */
  interface EcommerceOrderItemPlain extends EcommerceOrderItemAttributes {
    product?: EcommerceProductPlain;
    order?: EcommerceOrderPlain;
  }

  /** Plain object type for EcommerceProduct, suitable for API responses */
  interface EcommerceProductPlain extends EcommerceProductAttributes {
    ecommerceDiscounts?: EcommerceDiscountPlain[];
    ecommerceReviews?: EcommerceReviewPlain[];
    ecommerceOrderItems?: EcommerceOrderItemPlain[];
    wishlistItems?: EcommerceWishlistItemPlain[];
    category?: EcommerceCategoryPlain;
    orders?: EcommerceOrderPlain[];
    wishlists?: EcommerceWishlistPlain[];
  }

  /** Plain object type for EcommerceReview, suitable for API responses */
  interface EcommerceReviewPlain extends EcommerceReviewAttributes {
    product?: EcommerceProductPlain;
    user?: UserPlain;
  }

  /** Plain object type for EcommerceShipping, suitable for API responses */
  interface EcommerceShippingPlain extends EcommerceShippingAttributes {
    ecommerceOrders?: EcommerceOrderPlain[];
    products?: EcommerceProductPlain[];
  }

  /** Plain object type for EcommerceShippingAddress, suitable for API responses */
  interface EcommerceShippingAddressPlain extends EcommerceShippingAddressAttributes {
    order?: EcommerceOrderPlain;
    user?: UserPlain;
  }

  /** Plain object type for EcommerceUserDiscount, suitable for API responses */
  interface EcommerceUserDiscountPlain extends EcommerceUserDiscountAttributes {
    discount?: EcommerceDiscountPlain;
    user?: UserPlain;
  }

  /** Plain object type for EcommerceWishlist, suitable for API responses */
  interface EcommerceWishlistPlain extends EcommerceWishlistAttributes {
    wishlistItems?: EcommerceWishlistItemPlain[];
    user?: UserPlain;
    products?: EcommerceProductPlain[];
  }

  /** Plain object type for EcommerceWishlistItem, suitable for API responses */
  interface EcommerceWishlistItemPlain extends EcommerceWishlistItemAttributes {
    wishlist?: EcommerceWishlistPlain;
    product?: EcommerceProductPlain;
  }

  /** Plain object type for EcosystemBlockchain, suitable for API responses */
  interface EcosystemBlockchainPlain extends EcosystemBlockchainAttributes {
  }

  /** Plain object type for EcosystemCustodialWallet, suitable for API responses */
  interface EcosystemCustodialWalletPlain extends EcosystemCustodialWalletAttributes {
    masterWallet?: EcosystemMasterWalletPlain;
  }

  /** Plain object type for EcosystemMarket, suitable for API responses */
  interface EcosystemMarketPlain extends EcosystemMarketAttributes {
  }

  /** Plain object type for EcosystemMasterWallet, suitable for API responses */
  interface EcosystemMasterWalletPlain extends EcosystemMasterWalletAttributes {
    ecosystemCustodialWallets?: EcosystemCustodialWalletPlain[];
  }

  /** Plain object type for EcosystemPrivateLedger, suitable for API responses */
  interface EcosystemPrivateLedgerPlain extends EcosystemPrivateLedgerAttributes {
    wallet?: WalletPlain;
  }

  /** Plain object type for EcosystemToken, suitable for API responses */
  interface EcosystemTokenPlain extends EcosystemTokenAttributes {
  }

  /** Plain object type for EcosystemUtxo, suitable for API responses */
  interface EcosystemUtxoPlain extends EcosystemUtxoAttributes {
    wallet?: WalletPlain;
  }

  /** Plain object type for Exchange, suitable for API responses */
  interface ExchangePlain extends ExchangeAttributes {
  }

  /** Plain object type for ExchangeCurrency, suitable for API responses */
  interface ExchangeCurrencyPlain extends ExchangeCurrencyAttributes {
  }

  /** Plain object type for ExchangeMarket, suitable for API responses */
  interface ExchangeMarketPlain extends ExchangeMarketAttributes {
  }

  /** Plain object type for ExchangeOrder, suitable for API responses */
  interface ExchangeOrderPlain extends ExchangeOrderAttributes {
    user?: UserPlain;
  }

  /** Plain object type for ExchangeWatchlist, suitable for API responses */
  interface ExchangeWatchlistPlain extends ExchangeWatchlistAttributes {
    user?: UserPlain;
  }

  /** Plain object type for Extension, suitable for API responses */
  interface ExtensionPlain extends ExtensionAttributes {
  }

  /** Plain object type for Faq, suitable for API responses */
  interface FaqPlain extends FaqAttributes {
    feedbacks?: FaqFeedbackPlain[];
  }

  /** Plain object type for FaqFeedback, suitable for API responses */
  interface FaqFeedbackPlain extends FaqFeedbackAttributes {
    faq?: FaqPlain;
    user?: UserPlain;
  }

  /** Plain object type for FaqQuestion, suitable for API responses */
  interface FaqQuestionPlain extends FaqQuestionAttributes {
  }

  /** Plain object type for FaqSearch, suitable for API responses */
  interface FaqSearchPlain extends FaqSearchAttributes {
    user?: UserPlain;
  }

  /** Plain object type for ForexAccount, suitable for API responses */
  interface ForexAccountPlain extends ForexAccountAttributes {
    forexAccountSignals?: ForexAccountSignalPlain[];
    user?: UserPlain;
    accountSignals?: ForexSignalPlain[];
  }

  /** Plain object type for ForexAccountSignal, suitable for API responses */
  interface ForexAccountSignalPlain extends ForexAccountSignalAttributes {
    forexAccount?: ForexAccountPlain;
    forexSignal?: ForexSignalPlain;
  }

  /** Plain object type for ForexDuration, suitable for API responses */
  interface ForexDurationPlain extends ForexDurationAttributes {
    investments?: ForexInvestmentPlain[];
    forexPlanDurations?: ForexPlanDurationPlain[];
    plans?: ForexPlanPlain[];
  }

  /** Plain object type for ForexInvestment, suitable for API responses */
  interface ForexInvestmentPlain extends ForexInvestmentAttributes {
    plan?: ForexPlanPlain;
    duration?: ForexDurationPlain;
    user?: UserPlain;
  }

  /** Plain object type for ForexPlan, suitable for API responses */
  interface ForexPlanPlain extends ForexPlanAttributes {
    investments?: ForexInvestmentPlain[];
    planDurations?: ForexPlanDurationPlain[];
    durations?: ForexDurationPlain[];
  }

  /** Plain object type for ForexPlanDuration, suitable for API responses */
  interface ForexPlanDurationPlain extends ForexPlanDurationAttributes {
    duration?: ForexDurationPlain;
    plan?: ForexPlanPlain;
  }

  /** Plain object type for ForexSignal, suitable for API responses */
  interface ForexSignalPlain extends ForexSignalAttributes {
    forexAccountSignals?: ForexAccountSignalPlain[];
    signalAccounts?: ForexAccountPlain[];
  }

  /** Plain object type for FuturesMarket, suitable for API responses */
  interface FuturesMarketPlain extends FuturesMarketAttributes {
  }

  /** Plain object type for GasHistory, suitable for API responses */
  interface GasHistoryPlain extends GasHistoryAttributes {
  }

  /** Plain object type for GatewayApiKey, suitable for API responses */
  interface GatewayApiKeyPlain extends GatewayApiKeyAttributes {
    merchant?: GatewayMerchantPlain;
  }

  /** Plain object type for GatewayMerchant, suitable for API responses */
  interface GatewayMerchantPlain extends GatewayMerchantAttributes {
    gatewayApiKeys?: GatewayApiKeyPlain[];
    gatewayPayments?: GatewayPaymentPlain[];
    gatewayRefunds?: GatewayRefundPlain[];
    gatewayWebhooks?: GatewayWebhookPlain[];
    gatewayPayouts?: GatewayPayoutPlain[];
    gatewayMerchantBalances?: GatewayMerchantBalancePlain[];
    user?: UserPlain;
  }

  /** Plain object type for GatewayMerchantBalance, suitable for API responses */
  interface GatewayMerchantBalancePlain extends GatewayMerchantBalanceAttributes {
    merchant?: GatewayMerchantPlain;
  }

  /** Plain object type for GatewayPayment, suitable for API responses */
  interface GatewayPaymentPlain extends GatewayPaymentAttributes {
    gatewayRefunds?: GatewayRefundPlain[];
    gatewayWebhooks?: GatewayWebhookPlain[];
    merchant?: GatewayMerchantPlain;
    customer?: UserPlain;
    transaction?: TransactionPlain;
  }

  /** Plain object type for GatewayPayout, suitable for API responses */
  interface GatewayPayoutPlain extends GatewayPayoutAttributes {
    merchant?: GatewayMerchantPlain;
    transaction?: TransactionPlain;
  }

  /** Plain object type for GatewayRefund, suitable for API responses */
  interface GatewayRefundPlain extends GatewayRefundAttributes {
    gatewayWebhooks?: GatewayWebhookPlain[];
    payment?: GatewayPaymentPlain;
    merchant?: GatewayMerchantPlain;
    transaction?: TransactionPlain;
  }

  /** Plain object type for GatewayWebhook, suitable for API responses */
  interface GatewayWebhookPlain extends GatewayWebhookAttributes {
    merchant?: GatewayMerchantPlain;
    payment?: GatewayPaymentPlain;
    refund?: GatewayRefundPlain;
  }

  /** Plain object type for IcoAdminActivity, suitable for API responses */
  interface IcoAdminActivityPlain extends IcoAdminActivityAttributes {
    offering?: IcoTokenOfferingPlain;
    admin?: UserPlain;
  }

  /** Plain object type for IcoBlockchain, suitable for API responses */
  interface IcoBlockchainPlain extends IcoBlockchainAttributes {
  }

  /** Plain object type for IcoLaunchPlan, suitable for API responses */
  interface IcoLaunchPlanPlain extends IcoLaunchPlanAttributes {
    offerings?: IcoTokenOfferingPlain[];
  }

  /** Plain object type for IcoRoadmapItem, suitable for API responses */
  interface IcoRoadmapItemPlain extends IcoRoadmapItemAttributes {
    offering?: IcoTokenOfferingPlain;
  }

  /** Plain object type for IcoTeamMember, suitable for API responses */
  interface IcoTeamMemberPlain extends IcoTeamMemberAttributes {
    offering?: IcoTokenOfferingPlain;
  }

  /** Plain object type for IcoTokenDetail, suitable for API responses */
  interface IcoTokenDetailPlain extends IcoTokenDetailAttributes {
    offering?: IcoTokenOfferingPlain;
    tokenTypeData?: IcoTokenTypePlain;
  }

  /** Plain object type for IcoTokenOffering, suitable for API responses */
  interface IcoTokenOfferingPlain extends IcoTokenOfferingAttributes {
    tokenDetail?: IcoTokenDetailPlain;
    phases?: IcoTokenOfferingPhasePlain[];
    roadmapItems?: IcoRoadmapItemPlain[];
    teamMembers?: IcoTeamMemberPlain[];
    transactions?: IcoTransactionPlain[];
    adminActivities?: IcoAdminActivityPlain[];
    updates?: IcoTokenOfferingUpdatePlain[];
    plan?: IcoLaunchPlanPlain;
    user?: UserPlain;
    type?: IcoTokenTypePlain;
  }

  /** Plain object type for IcoTokenOfferingPhase, suitable for API responses */
  interface IcoTokenOfferingPhasePlain extends IcoTokenOfferingPhaseAttributes {
    offering?: IcoTokenOfferingPlain;
  }

  /** Plain object type for IcoTokenOfferingUpdate, suitable for API responses */
  interface IcoTokenOfferingUpdatePlain extends IcoTokenOfferingUpdateAttributes {
    offering?: IcoTokenOfferingPlain;
    user?: UserPlain;
  }

  /** Plain object type for IcoTokenType, suitable for API responses */
  interface IcoTokenTypePlain extends IcoTokenTypeAttributes {
    offerings?: IcoTokenOfferingPlain[];
  }

  /** Plain object type for IcoTokenVesting, suitable for API responses */
  interface IcoTokenVestingPlain extends IcoTokenVestingAttributes {
    releases?: IcoTokenVestingReleasePlain[];
    transaction?: IcoTransactionPlain;
    user?: UserPlain;
    offering?: IcoTokenOfferingPlain;
  }

  /** Plain object type for IcoTokenVestingRelease, suitable for API responses */
  interface IcoTokenVestingReleasePlain extends IcoTokenVestingReleaseAttributes {
    vesting?: IcoTokenVestingPlain;
  }

  /** Plain object type for IcoTransaction, suitable for API responses */
  interface IcoTransactionPlain extends IcoTransactionAttributes {
    offering?: IcoTokenOfferingPlain;
    user?: UserPlain;
    phase?: IcoTokenOfferingPhasePlain;
  }

  /** Plain object type for Investment, suitable for API responses */
  interface InvestmentPlain extends InvestmentAttributes {
    plan?: InvestmentPlanPlain;
    duration?: InvestmentDurationPlain;
    user?: UserPlain;
  }

  /** Plain object type for InvestmentDuration, suitable for API responses */
  interface InvestmentDurationPlain extends InvestmentDurationAttributes {
    investments?: InvestmentPlain[];
    investmentPlanDurations?: InvestmentPlanDurationPlain[];
    plans?: InvestmentPlanPlain[];
  }

  /** Plain object type for InvestmentPlan, suitable for API responses */
  interface InvestmentPlanPlain extends InvestmentPlanAttributes {
    investments?: InvestmentPlain[];
    planDurations?: InvestmentPlanDurationPlain[];
    durations?: InvestmentDurationPlain[];
  }

  /** Plain object type for InvestmentPlanDuration, suitable for API responses */
  interface InvestmentPlanDurationPlain extends InvestmentPlanDurationAttributes {
    duration?: InvestmentDurationPlain;
    plan?: InvestmentPlanPlain;
  }

  /** Plain object type for KycApplication, suitable for API responses */
  interface KycApplicationPlain extends KycApplicationAttributes {
    verificationResult?: KycVerificationResultPlain;
    level?: KycLevelPlain;
    user?: UserPlain;
  }

  /** Plain object type for KycLevel, suitable for API responses */
  interface KycLevelPlain extends KycLevelAttributes {
    applications?: KycApplicationPlain[];
    verificationService?: KycVerificationServicePlain;
  }

  /** Plain object type for KycVerificationResult, suitable for API responses */
  interface KycVerificationResultPlain extends KycVerificationResultAttributes {
    application?: KycApplicationPlain;
    service?: KycVerificationServicePlain;
  }

  /** Plain object type for KycVerificationService, suitable for API responses */
  interface KycVerificationServicePlain extends KycVerificationServiceAttributes {
    verificationResults?: KycVerificationResultPlain[];
    levels?: KycLevelPlain[];
  }

  /** Plain object type for MailwizardBlock, suitable for API responses */
  interface MailwizardBlockPlain extends MailwizardBlockAttributes {
  }

  /** Plain object type for MailwizardCampaign, suitable for API responses */
  interface MailwizardCampaignPlain extends MailwizardCampaignAttributes {
    template?: MailwizardTemplatePlain;
  }

  /** Plain object type for MailwizardTemplate, suitable for API responses */
  interface MailwizardTemplatePlain extends MailwizardTemplateAttributes {
    mailwizardCampaigns?: MailwizardCampaignPlain[];
  }

  /** Plain object type for MlmBinaryNode, suitable for API responses */
  interface MlmBinaryNodePlain extends MlmBinaryNodeAttributes {
    nodes?: MlmBinaryNodePlain[];
    leftChildBinaryNodes?: MlmBinaryNodePlain[];
    rightChildBinaryNodes?: MlmBinaryNodePlain[];
    parent?: MlmBinaryNodePlain;
    leftChild?: MlmBinaryNodePlain;
    rightChild?: MlmBinaryNodePlain;
    referral?: MlmReferralPlain;
  }

  /** Plain object type for MlmReferral, suitable for API responses */
  interface MlmReferralPlain extends MlmReferralAttributes {
    unilevelNode?: MlmUnilevelNodePlain;
    node?: MlmBinaryNodePlain;
    referrer?: UserPlain;
    referred?: UserPlain;
  }

  /** Plain object type for MlmReferralCondition, suitable for API responses */
  interface MlmReferralConditionPlain extends MlmReferralConditionAttributes {
    referralRewards?: MlmReferralRewardPlain[];
  }

  /** Plain object type for MlmReferralReward, suitable for API responses */
  interface MlmReferralRewardPlain extends MlmReferralRewardAttributes {
    condition?: MlmReferralConditionPlain;
    referrer?: UserPlain;
  }

  /** Plain object type for MlmUnilevelNode, suitable for API responses */
  interface MlmUnilevelNodePlain extends MlmUnilevelNodeAttributes {
    unilevelNodes?: MlmUnilevelNodePlain[];
    parent?: MlmUnilevelNodePlain;
    referral?: MlmReferralPlain;
  }

  /** Plain object type for NftActivity, suitable for API responses */
  interface NftActivityPlain extends NftActivityAttributes {
    token?: NftTokenPlain;
    collection?: NftCollectionPlain;
    listing?: NftListingPlain;
    offer?: NftOfferPlain;
    bid?: NftBidPlain;
    fromUser?: UserPlain;
    toUser?: UserPlain;
  }

  /** Plain object type for NftBid, suitable for API responses */
  interface NftBidPlain extends NftBidAttributes {
    listing?: NftListingPlain;
    user?: UserPlain;
    token?: NftTokenPlain;
  }

  /** Plain object type for NftCategory, suitable for API responses */
  interface NftCategoryPlain extends NftCategoryAttributes {
    collections?: NftCollectionPlain[];
  }

  /** Plain object type for NftCollection, suitable for API responses */
  interface NftCollectionPlain extends NftCollectionAttributes {
    tokens?: NftTokenPlain[];
    activities?: NftActivityPlain[];
    creator?: NftCreatorPlain;
    category?: NftCategoryPlain;
  }

  /** Plain object type for NftComment, suitable for API responses */
  interface NftCommentPlain extends NftCommentAttributes {
    replies?: NftCommentPlain[];
    user?: UserPlain;
    token?: NftTokenPlain;
    collection?: NftCollectionPlain;
    parent?: NftCommentPlain;
  }

  /** Plain object type for NftCreator, suitable for API responses */
  interface NftCreatorPlain extends NftCreatorAttributes {
    collections?: NftCollectionPlain[];
    tokens?: NftTokenPlain[];
    user?: UserPlain;
  }

  /** Plain object type for NftCreatorFollow, suitable for API responses */
  interface NftCreatorFollowPlain extends NftCreatorFollowAttributes {
    follower?: UserPlain;
    following?: UserPlain;
  }

  /** Plain object type for NftDispute, suitable for API responses */
  interface NftDisputePlain extends NftDisputeAttributes {
    messages?: NftDisputeMessagePlain[];
    reporter?: UserPlain;
    respondent?: UserPlain;
    assignedTo?: UserPlain;
    resolvedBy?: UserPlain;
    listing?: NftListingPlain;
    token?: NftTokenPlain;
  }

  /** Plain object type for NftDisputeMessage, suitable for API responses */
  interface NftDisputeMessagePlain extends NftDisputeMessageAttributes {
    dispute?: NftDisputePlain;
    user?: UserPlain;
  }

  /** Plain object type for NftFavorite, suitable for API responses */
  interface NftFavoritePlain extends NftFavoriteAttributes {
    user?: UserPlain;
    token?: NftTokenPlain;
    collection?: NftCollectionPlain;
  }

  /** Plain object type for NftFractional, suitable for API responses */
  interface NftFractionalPlain extends NftFractionalAttributes {
    token?: NftTokenPlain;
    creator?: UserPlain;
  }

  /** Plain object type for NftListing, suitable for API responses */
  interface NftListingPlain extends NftListingAttributes {
    bids?: NftBidPlain[];
    offers?: NftOfferPlain[];
    activities?: NftActivityPlain[];
    token?: NftTokenPlain;
    seller?: UserPlain;
  }

  /** Plain object type for NftMarketplace, suitable for API responses */
  interface NftMarketplacePlain extends NftMarketplaceAttributes {
    deployer?: UserPlain;
    pauser?: UserPlain;
  }

  /** Plain object type for NftMetadataBackup, suitable for API responses */
  interface NftMetadataBackupPlain extends NftMetadataBackupAttributes {
  }

  /** Plain object type for NftOffer, suitable for API responses */
  interface NftOfferPlain extends NftOfferAttributes {
    token?: NftTokenPlain;
    collection?: NftCollectionPlain;
    listing?: NftListingPlain;
    user?: UserPlain;
  }

  /** Plain object type for NftPriceHistory, suitable for API responses */
  interface NftPriceHistoryPlain extends NftPriceHistoryAttributes {
    token?: NftTokenPlain;
    collection?: NftCollectionPlain;
    buyer?: UserPlain;
    seller?: UserPlain;
  }

  /** Plain object type for NftReview, suitable for API responses */
  interface NftReviewPlain extends NftReviewAttributes {
    user?: UserPlain;
    token?: NftTokenPlain;
    collection?: NftCollectionPlain;
    creator?: UserPlain;
  }

  /** Plain object type for NftRoyalty, suitable for API responses */
  interface NftRoyaltyPlain extends NftRoyaltyAttributes {
    sale?: NftSalePlain;
    token?: NftTokenPlain;
    collection?: NftCollectionPlain;
    recipient?: UserPlain;
  }

  /** Plain object type for NftSale, suitable for API responses */
  interface NftSalePlain extends NftSaleAttributes {
    token?: NftTokenPlain;
    listing?: NftListingPlain;
    seller?: UserPlain;
    buyer?: UserPlain;
  }

  /** Plain object type for NftToken, suitable for API responses */
  interface NftTokenPlain extends NftTokenAttributes {
    currentListing?: NftListingPlain;
    listings?: NftListingPlain[];
    activities?: NftActivityPlain[];
    favorites?: NftFavoritePlain[];
    sales?: NftSalePlain[];
    offers?: NftOfferPlain[];
    collection?: NftCollectionPlain;
    owner?: UserPlain;
    creator?: NftCreatorPlain;
  }

  /** Plain object type for Notification, suitable for API responses */
  interface NotificationPlain extends NotificationAttributes {
    user?: UserPlain;
  }

  /** Plain object type for NotificationTemplate, suitable for API responses */
  interface NotificationTemplatePlain extends NotificationTemplateAttributes {
  }

  /** Plain object type for OneTimeToken, suitable for API responses */
  interface OneTimeTokenPlain extends OneTimeTokenAttributes {
  }

  /** Plain object type for P2pActivityLog, suitable for API responses */
  interface P2pActivityLogPlain extends P2pActivityLogAttributes {
    user?: UserPlain;
  }

  /** Plain object type for P2pAdminActivity, suitable for API responses */
  interface P2pAdminActivityPlain extends P2pAdminActivityAttributes {
    admin?: UserPlain;
  }

  /** Plain object type for P2pCommission, suitable for API responses */
  interface P2pCommissionPlain extends P2pCommissionAttributes {
    admin?: UserPlain;
    trade?: P2pTradePlain;
    offer?: P2pOfferPlain;
  }

  /** Plain object type for P2pDispute, suitable for API responses */
  interface P2pDisputePlain extends P2pDisputeAttributes {
    trade?: P2pTradePlain;
    reportedBy?: UserPlain;
    against?: UserPlain;
  }

  /** Plain object type for P2pOffer, suitable for API responses */
  interface P2pOfferPlain extends P2pOfferAttributes {
    flag?: P2pOfferFlagPlain;
    trades?: P2pTradePlain[];
    user?: UserPlain;
    paymentMethods?: P2pPaymentMethodPlain[];
  }

  /** Plain object type for P2pOfferFlag, suitable for API responses */
  interface P2pOfferFlagPlain extends P2pOfferFlagAttributes {
    offer?: P2pOfferPlain;
    flaggedBy?: UserPlain;
  }

  /** Plain object type for P2pOfferPaymentMethod, suitable for API responses */
  interface P2pOfferPaymentMethodPlain extends P2pOfferPaymentMethodAttributes {
  }

  /** Plain object type for P2pPaymentMethod, suitable for API responses */
  interface P2pPaymentMethodPlain extends P2pPaymentMethodAttributes {
    user?: UserPlain;
    offers?: P2pOfferPlain[];
  }

  /** Plain object type for P2pReview, suitable for API responses */
  interface P2pReviewPlain extends P2pReviewAttributes {
    reviewer?: UserPlain;
    reviewee?: UserPlain;
    trade?: P2pTradePlain;
  }

  /** Plain object type for P2pTrade, suitable for API responses */
  interface P2pTradePlain extends P2pTradeAttributes {
    dispute?: P2pDisputePlain;
    reviews?: P2pReviewPlain[];
    buyer?: UserPlain;
    seller?: UserPlain;
    offer?: P2pOfferPlain;
    paymentMethodDetails?: P2pPaymentMethodPlain;
  }

  /** Plain object type for Page, suitable for API responses */
  interface PagePlain extends PageAttributes {
  }

  /** Plain object type for Permission, suitable for API responses */
  interface PermissionPlain extends PermissionAttributes {
    roles?: RolePlain[];
  }

  /** Plain object type for Post, suitable for API responses */
  interface PostPlain extends PostAttributes {
    comments?: CommentPlain[];
    postTags?: PostTagPlain[];
    author?: AuthorPlain;
    category?: CategoryPlain;
    tags?: TagPlain[];
  }

  /** Plain object type for PostTag, suitable for API responses */
  interface PostTagPlain extends PostTagAttributes {
    post?: PostPlain;
    tag?: TagPlain;
  }

  /** Plain object type for ProviderUser, suitable for API responses */
  interface ProviderUserPlain extends ProviderUserAttributes {
    user?: UserPlain;
  }

  /** Plain object type for Role, suitable for API responses */
  interface RolePlain extends RoleAttributes {
    users?: UserPlain[];
    permissions?: PermissionPlain[];
  }

  /** Plain object type for RolePermission, suitable for API responses */
  interface RolePermissionPlain extends RolePermissionAttributes {
    role?: RolePlain;
    permission?: PermissionPlain;
  }

  /** Plain object type for Settings, suitable for API responses */
  interface SettingsPlain extends SettingsAttributes {
  }

  /** Plain object type for Slider, suitable for API responses */
  interface SliderPlain extends SliderAttributes {
  }

  /** Plain object type for StakingAdminActivity, suitable for API responses */
  interface StakingAdminActivityPlain extends StakingAdminActivityAttributes {
    user?: UserPlain;
  }

  /** Plain object type for StakingAdminEarning, suitable for API responses */
  interface StakingAdminEarningPlain extends StakingAdminEarningAttributes {
    pool?: StakingPoolPlain;
  }

  /** Plain object type for StakingEarningRecord, suitable for API responses */
  interface StakingEarningRecordPlain extends StakingEarningRecordAttributes {
    position?: StakingPositionPlain;
  }

  /** Plain object type for StakingExternalPoolPerformance, suitable for API responses */
  interface StakingExternalPoolPerformancePlain extends StakingExternalPoolPerformanceAttributes {
    pool?: StakingPoolPlain;
  }

  /** Plain object type for StakingPool, suitable for API responses */
  interface StakingPoolPlain extends StakingPoolAttributes {
    positions?: StakingPositionPlain[];
    adminEarnings?: StakingAdminEarningPlain[];
    performances?: StakingExternalPoolPerformancePlain[];
  }

  /** Plain object type for StakingPosition, suitable for API responses */
  interface StakingPositionPlain extends StakingPositionAttributes {
    earningHistory?: StakingEarningRecordPlain[];
    pool?: StakingPoolPlain;
    user?: UserPlain;
  }

  /** Plain object type for SupportTicket, suitable for API responses */
  interface SupportTicketPlain extends SupportTicketAttributes {
    user?: UserPlain;
    agent?: UserPlain;
  }

  /** Plain object type for Tag, suitable for API responses */
  interface TagPlain extends TagAttributes {
    postTags?: PostTagPlain[];
    posts?: PostPlain[];
  }

  /** Plain object type for TradingBot, suitable for API responses */
  interface TradingBotPlain extends TradingBotAttributes {
    trades?: TradingBotTradePlain[];
    orders?: TradingBotOrderPlain[];
    stats?: TradingBotStatsPlain[];
    auditLogs?: TradingBotAuditLogPlain[];
    user?: UserPlain;
    purchase?: TradingBotPurchasePlain;
  }

  /** Plain object type for TradingBotAuditLog, suitable for API responses */
  interface TradingBotAuditLogPlain extends TradingBotAuditLogAttributes {
    bot?: TradingBotPlain;
    user?: UserPlain;
    admin?: UserPlain;
  }

  /** Plain object type for TradingBotOrder, suitable for API responses */
  interface TradingBotOrderPlain extends TradingBotOrderAttributes {
    bot?: TradingBotPlain;
    user?: UserPlain;
    trade?: TradingBotTradePlain;
  }

  /** Plain object type for TradingBotPaperAccount, suitable for API responses */
  interface TradingBotPaperAccountPlain extends TradingBotPaperAccountAttributes {
    user?: UserPlain;
  }

  /** Plain object type for TradingBotPurchase, suitable for API responses */
  interface TradingBotPurchasePlain extends TradingBotPurchaseAttributes {
    bots?: TradingBotPlain[];
    buyer?: UserPlain;
    seller?: UserPlain;
    strategy?: TradingBotStrategyPlain;
  }

  /** Plain object type for TradingBotStats, suitable for API responses */
  interface TradingBotStatsPlain extends TradingBotStatsAttributes {
    bot?: TradingBotPlain;
    user?: UserPlain;
  }

  /** Plain object type for TradingBotStrategy, suitable for API responses */
  interface TradingBotStrategyPlain extends TradingBotStrategyAttributes {
    purchases?: TradingBotPurchasePlain[];
    creator?: UserPlain;
  }

  /** Plain object type for TradingBotStrategyReview, suitable for API responses */
  interface TradingBotStrategyReviewPlain extends TradingBotStrategyReviewAttributes {
    reviewer?: UserPlain;
    strategy?: TradingBotStrategyPlain;
  }

  /** Plain object type for TradingBotTrade, suitable for API responses */
  interface TradingBotTradePlain extends TradingBotTradeAttributes {
    bot?: TradingBotPlain;
    user?: UserPlain;
  }

  /** Plain object type for Transaction, suitable for API responses */
  interface TransactionPlain extends TransactionAttributes {
    adminProfit?: AdminProfitPlain;
    wallet?: WalletPlain;
    user?: UserPlain;
  }

  /** Plain object type for TwoFactor, suitable for API responses */
  interface TwoFactorPlain extends TwoFactorAttributes {
    user?: UserPlain;
  }

  /** Plain object type for User, suitable for API responses */
  interface UserPlain extends UserAttributes {
    author?: AuthorPlain;
    ecommerceShippingAddress?: EcommerceShippingAddressPlain;
    twoFactor?: TwoFactorPlain;
    nftCreator?: NftCreatorPlain;
    aiInvestments?: AiInvestmentPlain[];
    binaryOrder?: BinaryOrderPlain[];
    comments?: CommentPlain[];
    ecommerceOrders?: EcommerceOrderPlain[];
    ecommerceReviews?: EcommerceReviewPlain[];
    ecommerceUserDiscounts?: EcommerceUserDiscountPlain[];
    ecommerceWishlists?: EcommerceWishlistPlain[];
    exchangeOrder?: ExchangeOrderPlain[];
    exchangeWatchlists?: ExchangeWatchlistPlain[];
    forexAccounts?: ForexAccountPlain[];
    forexInvestments?: ForexInvestmentPlain[];
    investments?: InvestmentPlain[];
    kycApplications?: KycApplicationPlain[];
    referredReferrals?: MlmReferralPlain[];
    referrerReferrals?: MlmReferralPlain[];
    referralRewards?: MlmReferralRewardPlain[];
    notifications?: NotificationPlain[];
    providers?: ProviderUserPlain[];
    supportTickets?: SupportTicketPlain[];
    agentSupportTickets?: SupportTicketPlain[];
    transactions?: TransactionPlain[];
    wallets?: WalletPlain[];
    walletPnls?: WalletPnlPlain[];
    icoTransactions?: IcoTransactionPlain[];
    icoAdminActivities?: IcoAdminActivityPlain[];
    p2pTrades?: P2pTradePlain[];
    p2pOffers?: P2pOfferPlain[];
    p2pReviews?: P2pReviewPlain[];
    blocks?: UserBlockPlain[];
    adminBlocks?: UserBlockPlain[];
    role?: RolePlain;
  }

  /** Plain object type for UserBlock, suitable for API responses */
  interface UserBlockPlain extends UserBlockAttributes {
    user?: UserPlain;
    admin?: UserPlain;
  }

  /** Plain object type for Wallet, suitable for API responses */
  interface WalletPlain extends WalletAttributes {
    ecosystemPrivateLedgers?: EcosystemPrivateLedgerPlain[];
    ecosystemUtxos?: EcosystemUtxoPlain[];
    transactions?: TransactionPlain[];
    walletData?: WalletDataPlain[];
    user?: UserPlain;
  }

  /** Plain object type for WalletData, suitable for API responses */
  interface WalletDataPlain extends WalletDataAttributes {
    wallet?: WalletPlain;
  }

  /** Plain object type for WalletPnl, suitable for API responses */
  interface WalletPnlPlain extends WalletPnlAttributes {
    user?: UserPlain;
  }

  /** Plain object type for WithdrawMethod, suitable for API responses */
  interface WithdrawMethodPlain extends WithdrawMethodAttributes {
  }

  // ========================================
  // Utility Types for Includes
  // ========================================

  /** Extract the plain type from a Sequelize instance */
  type PlainOf<T> = T extends { get(options: { plain: true }): infer P } ? P : T;

  /** Make specific associations required instead of optional */
  type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

  /** Type for findAll results with includes */
  type FindAllResult<T> = T[];

  /** Type for findOne result with includes */
  type FindOneResult<T> = T | null;

}

export {};
