/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Generated: 2026-09-10T12:28:03.324Z
 * Hash: eff75f1d2d4267c53cb8f66098378457
 * Models: 275
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
    /**
     * Whether the external tether could reach its reference at the moment the price mode
     * was set — one of NOT_TETHERED, NO_REFERENCE, OUTSIDE_RANGE, NEAR_EDGE, OK.
     *
     * Recorded because the two settings that decide it are edited on different screens and
     * at different times: without this, an investigation cannot tell a market that was
     * misconfigured from the moment it was tethered from one whose reference later drifted
     * out of a range that was correct when it was set.
     */
    tetherVerdict?: string;
    /** The operator-facing sentence that accompanied `tetherVerdict`, if any. */
    tetherMessage?: string | null;
  
    // For PAUSE/AUTO_PAUSE actions
    reason?: string;
    volatility?: number;
  
    // For PHASE_CHANGE actions
    previousPhase?: "ACCUMULATION" | "MARKUP" | "DISTRIBUTION" | "MARKDOWN";
    newPhase?: "ACCUMULATION" | "MARKUP" | "DISTRIBUTION" | "MARKDOWN";
    phaseDuration?: number; // Expected duration in hours
    phaseTargetPrice?: number;
    /** Multi-month narrative the phase belongs to, from the NarrativePlanner. */
    archetype?: string;
  
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
    /** WHO ACTED — the admin whose session drove the route. */
    adminId?: string;
    /**
     * WHOSE WALLET THE MONEY MOVED THROUGH, on DEPOSIT and WITHDRAW rows.
     *
     * The platform's — the Super Admin's — never the caller's, so it is not the
     * same id as `adminId` when a delegated admin operates the pool. Named
     * separately so one row answers both "who did it" and "where did it go".
     */
    houseWalletOwnerId?: string;
    note?: string;
  }

  type AiMarketMakerPhase = "ACCUMULATION" | "MARKUP" | "DISTRIBUTION" | "MARKDOWN";

  type AiMarketMakerPriceMode = "AUTONOMOUS" | "FOLLOW_EXTERNAL" | "HYBRID" | "MIRROR";

  type AiMarketMakerStatus = "ACTIVE" | "PAUSED" | "STOPPED";

  type AiMarketMakerVenue = "ECO" | "FUTURES";

  type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

  export interface AllowedWalletTypesConfig {
    [walletType: string]: {
      enabled: boolean;
      currencies: string[];
    };
  }

  type ApiKeyAuditAction = "key.created" | "key.updated" | "key.deleted" | "key.rotated" | "secret.attached" | "secret.rotated" | "secret.revoked" | "auth.failed" | "auth.replay_blocked" | "auth.ip_blocked" | "auth.expired" | "auth.skew_blocked" | "auth.scope_blocked" | "trade.placed" | "trade.cancelled" | "killswitch.triggered" | "auth.disabled_blocked";

  type AuditAction = string;

  type AuditEntityType = string;

  type BinaryAiEngineStatus = "ACTIVE" | "PAUSED" | "STOPPED";

  type BinaryTradeResult = "WIN" | "LOSS" | "DRAW";

  type CohortType = "SIGNUP_DATE" | "DEPOSIT_AMOUNT" | "TRADE_FREQUENCY" | "CUSTOM";

  type CooldownReason = "BIG_WIN" | "STREAK" | "MANUAL";

  type CopyMode = "PROPORTIONAL" | "FIXED_AMOUNT" | "FIXED_RATIO";

  type CopyTradingMarketType = "SPOT" | "BINARY";

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

  type GeoAccessDecision = "BLOCKED" | "ALLOWED" | "BYPASSED";

  type GeoCountrySource = "CDN_HEADER" | "IP_LOOKUP" | "KYC" | "PROFILE" | "MANUAL" | "NONE";

  type GeoRestrictionReason = "SANCTIONS" | "UNLICENSED" | "REGULATORY" | "HIGH_RISK" | "INTERNAL_POLICY" | "OTHER";

  type GeoRestrictionScope = "FULL" | "PARTIAL";

  type GeoRestrictionType = "BLOCK" | "ALLOW";

  type HbInstanceStatus = "STOPPED" | "STARTING" | "RUNNING" | "STOPPING" | "CRASHED";

  type HbStrategyFamily = "pmm" | "xemm";

  type HbStrategyStatus = "draft" | "published";

  type LeaderStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED" | "INACTIVE";

  type LeaderTradingType = "SPOT" | "BINARY" | "BOTH";

  type OptimizationStrategy = "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";

  type OrderPurpose = "ENTRY" | "EXIT" | "STOP_LOSS" | "TAKE_PROFIT" | "GRID_BUY" | "GRID_SELL" | "DCA";

  type OrderSide = "BUY" | "SELL";

  type OrderStatus = "PENDING" | "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED" | "EXPIRED" | "FAILED";

  type OrderType = "MARKET" | "LIMIT" | "STOP_LIMIT";

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

  type TradeMarketType = "SPOT" | "BINARY";

  type TradeSide = "BUY" | "SELL" | "RISE" | "FALL" | "HIGHER" | "LOWER" | "TOUCH" | "NO_TOUCH" | "CALL" | "PUT" | "UP" | "DOWN";

  type TradeStatus = "PENDING" | "PENDING_REPLICATION" | "REPLICATED" | "REPLICATION_FAILED" | "OPEN" | "CLOSED" | "PARTIALLY_FILLED" | "FAILED" | "CANCELLED" | "CLOSING";

  type TradeType = "MARKET" | "LIMIT" | "RISE_FALL" | "HIGHER_LOWER" | "TOUCH_NO_TOUCH" | "CALL_PUT" | "TURBO";

  type TradingBotMode = "LIVE" | "PAPER";

  type TradingBotStatus = "DRAFT" | "RUNNING" | "PAUSED" | "STOPPED" | "ERROR" | "LIMIT_REACHED";

  type TradingBotType = "DCA" | "GRID" | "INDICATOR" | "TRAILING_STOP" | "CUSTOM";

  type TradingStyle = "SCALPING" | "DAY_TRADING" | "SWING" | "POSITION";

  type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED";

  type TransactionType = "ALLOCATION" | "DEALLOCATION" | "PROFIT_SHARE" | "TRADE_PROFIT" | "TRADE_LOSS" | "FEE" | "REFUND";

  type UserActivitySeverity = "success" | "warning" | "info";

  type UserActivityType = "auth.login" | "auth.login_failed" | "auth.logout" | "security.2fa_enabled" | "security.2fa_disabled" | "security.password_reset" | "security.password_changed" | "security.email_verified" | "security.phone_verified" | "security.session_revoked" | "security.withdraw_2fa_verified" | "security.p2p_2fa_verified" | "security.transfer_verified" | "security.transfer_pin_changed" | "security.transfer_pin_cleared" | "security.transfer_pin_locked" | "security.transfer_pin_unlocked" | "api_key.created" | "api_key.updated" | "api_key.deleted" | "kyc.submitted" | "kyc.updated" | "kyc.approved" | "kyc.rejected" | "profile.updated" | "wallet.connected" | "wallet.disconnected";

  type WhaleStrategy = "REDUCE_EXPOSURE" | "ALERT_ONLY" | "FORCE_LOSS";

  type exchangeOrderId = string;

  type exchangeOrderPk = "id";

  // ========================================
  // AdminAuditLog
  // ========================================

  interface AdminAuditLogAttributes {
    id: string;
    userId?: string | null;
    module: string;
    title: string;
    method: string;
    path: string;
    targetId?: string | null;
    targetIds?: string[] | null;
    status: "SUCCESS" | "ERROR";
    reason?: string | null;
    error?: string | null;
    durationMs?: number | null;
    requestId?: string | null;
    ip?: string | null;
    steps?: Record<string, any> | null;
    createdAt?: Date;
  }

  type AdminAuditLogCreationAttributes = Optional<AdminAuditLogAttributes, "id" | "userId" | "targetId" | "targetIds" | "reason" | "error" | "durationMs" | "requestId" | "ip" | "steps" | "createdAt">;

  interface AdminAuditLogInstance extends Model<AdminAuditLogAttributes, AdminAuditLogCreationAttributes>, AdminAuditLogAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // AdminProfit
  // ========================================

  interface AdminProfitAttributes {
    id: string;
    transactionId?: string | null;
    type: "DEPOSIT" | "WITHDRAW" | "TRANSFER" | "BINARY_ORDER" | "EXCHANGE_ORDER" | "INVESTMENT" | "AI_INVESTMENT" | "FOREX_DEPOSIT" | "FOREX_WITHDRAW" | "FOREX_INVESTMENT" | "ICO_CONTRIBUTION" | "STAKING" | "P2P_TRADE" | "NFT_SALE" | "NFT_AUCTION" | "NFT_OFFER" | "GATEWAY_PAYMENT" | "TRADE" | "REFERRAL_REWARD" | "DEX_SWAP" | "DEX_LP_FEE" | "DEX_LISTING" | "POOL_BACKING";
    amount: number;
    currency: string;
    chain?: string | null;
    description?: string | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type AdminProfitCreationAttributes = Optional<AdminProfitAttributes, "id" | "transactionId" | "chain" | "description" | "createdAt" | "deletedAt" | "updatedAt">;

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
    personality: "SCALPER" | "SWING" | "ACCUMULATOR" | "DISTRIBUTOR" | "MARKET_MAKER";
    riskTolerance: number;
    tradeFrequency: "HIGH" | "MEDIUM" | "LOW";
    avgOrderSize: number;
    orderSizeVariance: number;
    preferredSpread: number;
    status: "ACTIVE" | "PAUSED" | "COOLDOWN";
    lastTradeAt?: Date | null;
    firstRealTradeAt?: Date | null;
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
    cooldownUntil?: Date | null;
  }

  type AiBotCreationAttributes = Optional<AiBotAttributes, "id" | "personality" | "riskTolerance" | "tradeFrequency" | "avgOrderSize" | "orderSizeVariance" | "preferredSpread" | "status" | "lastTradeAt" | "firstRealTradeAt" | "dailyTradeCount" | "maxDailyTrades" | "realTradesExecuted" | "profitableTrades" | "totalRealizedPnL" | "totalVolume" | "currentPosition" | "avgEntryPrice" | "createdAt" | "updatedAt" | "cooldownUntil">;

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
    profit?: number | null;
    roiPercentage?: number | null;
    result?: "WIN" | "LOSS" | "DRAW" | null;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type AiInvestmentCreationAttributes = Optional<AiInvestmentAttributes, "id" | "durationId" | "profit" | "roiPercentage" | "result" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

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
    image?: string | null;
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

  type AiInvestmentPlanCreationAttributes = Optional<AiInvestmentPlanAttributes, "id" | "description" | "image" | "status" | "invested" | "profitPercentage" | "minAmount" | "trending" | "createdAt" | "deletedAt" | "updatedAt">;

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
    marketType: "ECO" | "FUTURES";
    futuresLeverage: number;
    status: "ACTIVE" | "PAUSED" | "STOPPED";
    targetPrice: number;
    priceRangeLow: number;
    priceRangeHigh: number;
    aggressionLevel: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
    maxDailyVolume: number;
    currentDailyVolume: number;
    volatilityThreshold: number;
    pauseOnHighVolatility: boolean;
    realLiquidityPercent: number;
    requoteFloorPerSide: number;
    maxRestingRealOrders: number | null;
    priceMode: "AUTONOMOUS" | "FOLLOW_EXTERNAL" | "HYBRID" | "MIRROR";
    externalSymbol: string | null;
    correlationStrength: number;
    marketBias: "BULLISH" | "BEARISH" | "NEUTRAL";
    biasStrength: number;
    currentPhase: "ACCUMULATION" | "MARKUP" | "DISTRIBUTION" | "MARKDOWN";
    phaseStartedAt: Date | null;
    nextPhaseChangeAt: Date | null;
    phaseTargetPrice: number | null;
    baseVolatility: number;
    volatilityMultiplier: number;
    momentumDecay: number;
    lastKnownPrice: number | null;
    trendMomentum: number;
    lastMomentumUpdate: Date | null;
    entropySeed: string | null;
    priceEngineState: any | null;
    priceEngineStateAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiMarketMakerCreationAttributes = Optional<AiMarketMakerAttributes, "id" | "marketType" | "futuresLeverage" | "status" | "targetPrice" | "priceRangeLow" | "priceRangeHigh" | "aggressionLevel" | "maxDailyVolume" | "currentDailyVolume" | "volatilityThreshold" | "pauseOnHighVolatility" | "realLiquidityPercent" | "requoteFloorPerSide" | "maxRestingRealOrders" | "priceMode" | "externalSymbol" | "correlationStrength" | "marketBias" | "biasStrength" | "currentPhase" | "phaseStartedAt" | "nextPhaseChangeAt" | "phaseTargetPrice" | "baseVolatility" | "volatilityMultiplier" | "momentumDecay" | "lastKnownPrice" | "trendMomentum" | "lastMomentumUpdate" | "entropySeed" | "priceEngineState" | "priceEngineStateAt" | "createdAt" | "updatedAt">;

  interface AiMarketMakerInstance extends Model<AiMarketMakerAttributes, AiMarketMakerCreationAttributes>, AiMarketMakerAttributes {
    pool?: AiMarketMakerPoolInstance;
    bots?: AiBotInstance[];
    history?: AiMarketMakerHistoryInstance[];
    market?: EcosystemMarketInstance;
    futuresMarket?: FuturesMarketInstance;
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
    getFuturesMarket: Sequelize.BelongsToGetAssociationMixin<FuturesMarketInstance>;
    setFuturesMarket: Sequelize.BelongsToSetAssociationMixin<FuturesMarketInstance, string>;
    createFuturesMarket: Sequelize.BelongsToCreateAssociationMixin<FuturesMarketInstance>;
    // Instance methods
    toJSON(): any;
  }

  // ========================================
  // AiMarketMakerEngineLease
  // ========================================

  interface AiMarketMakerEngineLeaseAttributes {
    id: string;
    instanceId: string;
    hostname?: string | null;
    pid?: number | null;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiMarketMakerEngineLeaseCreationAttributes = Optional<AiMarketMakerEngineLeaseAttributes, "id" | "hostname" | "pid" | "createdAt" | "updatedAt">;

  interface AiMarketMakerEngineLeaseInstance extends Model<AiMarketMakerEngineLeaseAttributes, AiMarketMakerEngineLeaseCreationAttributes>, AiMarketMakerEngineLeaseAttributes {
  }

  // ========================================
  // AiMarketMakerHistory
  // ========================================

  interface AiMarketMakerHistoryAttributes {
    id: string;
    marketMakerId: string;
    action: "TRADE" | "PAUSE" | "RESUME" | "REBALANCE" | "TARGET_CHANGE" | "DEPOSIT" | "WITHDRAW" | "START" | "STOP" | "CONFIG_CHANGE" | "EMERGENCY_STOP" | "AUTO_PAUSE" | "PHASE_CHANGE" | "BIAS_CHANGE" | "MOMENTUM_EVENT";
    details?: AiMarketMakerHistoryDetails | null;
    priceAtAction: number;
    poolValueAtAction: number;
    createdAt?: Date;
  }

  type AiMarketMakerHistoryCreationAttributes = Optional<AiMarketMakerHistoryAttributes, "id" | "details" | "priceAtAction" | "poolValueAtAction" | "createdAt">;

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

  type AiMarketMakerPoolCreationAttributes = Optional<AiMarketMakerPoolAttributes, "id" | "baseCurrencyBalance" | "quoteCurrencyBalance" | "initialBaseBalance" | "initialQuoteBalance" | "totalValueLocked" | "unrealizedPnL" | "realizedPnL" | "lastRebalanceAt" | "createdAt" | "updatedAt">;

  interface AiMarketMakerPoolInstance extends Model<AiMarketMakerPoolAttributes, AiMarketMakerPoolCreationAttributes>, AiMarketMakerPoolAttributes {
    marketMaker?: AiMarketMakerInstance;
    getMarketMaker: Sequelize.BelongsToGetAssociationMixin<AiMarketMakerInstance>;
    setMarketMaker: Sequelize.BelongsToSetAssociationMixin<AiMarketMakerInstance, string>;
    createMarketMaker: Sequelize.BelongsToCreateAssociationMixin<AiMarketMakerInstance>;
  }

  // ========================================
  // AiSupportAdminAction
  // ========================================

  interface AiSupportAdminActionAttributes {
    id: string;
    proposedTo: string;
    action: string;
    permission: string;
    reason?: string | null;
    state: "PROPOSED" | "CONFIRMED" | "COMPLETED" | "FAILED" | "EXPIRED";
    workflowId?: string | null;
    procedure?: string | null;
    stepIndex?: number | null;
    approvedBy?: string | null;
    approvedAt?: Date | null;
    completedAt?: Date | null;
    result?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiSupportAdminActionCreationAttributes = Optional<AiSupportAdminActionAttributes, "id" | "reason" | "state" | "workflowId" | "procedure" | "stepIndex" | "approvedBy" | "approvedAt" | "completedAt" | "result" | "createdAt" | "updatedAt">;

  interface AiSupportAdminActionInstance extends Model<AiSupportAdminActionAttributes, AiSupportAdminActionCreationAttributes>, AiSupportAdminActionAttributes {
  }

  // ========================================
  // AiSupportAdminSession
  // ========================================

  interface AiSupportAdminSessionAttributes {
    id: string;
    adminId: string;
    title: string;
    screen?: string | null;
    turnCount: number;
    costUsdTotal: number;
    lastMessageAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiSupportAdminSessionCreationAttributes = Optional<AiSupportAdminSessionAttributes, "id" | "screen" | "turnCount" | "costUsdTotal" | "createdAt" | "updatedAt">;

  interface AiSupportAdminSessionInstance extends Model<AiSupportAdminSessionAttributes, AiSupportAdminSessionCreationAttributes>, AiSupportAdminSessionAttributes {
  }

  // ========================================
  // AiSupportAdminTurn
  // ========================================

  interface AiSupportAdminTurnAttributes {
    id: string;
    sessionId: string;
    adminId: string;
    question: string;
    answer: string;
    grounded: boolean;
    proposals?: Record<string, unknown> | null;
    screen?: string | null;
    providerId?: string | null;
    model?: string | null;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    costUsd: number;
    latencyMs?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
    sources?: any | null;
  }

  type AiSupportAdminTurnCreationAttributes = Optional<AiSupportAdminTurnAttributes, "id" | "grounded" | "proposals" | "screen" | "providerId" | "model" | "inputTokens" | "outputTokens" | "cacheReadTokens" | "cacheWriteTokens" | "costUsd" | "latencyMs" | "createdAt" | "updatedAt" | "sources">;

  interface AiSupportAdminTurnInstance extends Model<AiSupportAdminTurnAttributes, AiSupportAdminTurnCreationAttributes>, AiSupportAdminTurnAttributes {
  }

  // ========================================
  // AiSupportAgent
  // ========================================

  interface AiSupportAgentAttributes {
    id: string;
    name: string;
    slug: string;
    avatar?: string | null;
    persona: string;
    disclosureText?: string | null;
    model?: string | null;
    effort?: "low" | "medium" | "high" | "xhigh" | "max" | null;
    maxTokens: number;
    autonomy: "COPILOT" | "AUTO_TICKET" | "AUTO_ALL";
    toolsEnabled?: string[] | null;
    channels?: string[] | null;
    languages?: string[] | null;
    workingHours?: Record<string, unknown> | null;
    timezone?: string | null;
    status: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type AiSupportAgentCreationAttributes = Optional<AiSupportAgentAttributes, "id" | "avatar" | "persona" | "disclosureText" | "model" | "effort" | "maxTokens" | "autonomy" | "toolsEnabled" | "channels" | "languages" | "workingHours" | "timezone" | "status" | "createdAt" | "updatedAt" | "deletedAt">;

  interface AiSupportAgentInstance extends Model<AiSupportAgentAttributes, AiSupportAgentCreationAttributes>, AiSupportAgentAttributes {
    sessions?: AiSupportSessionInstance[];
    getSessions: Sequelize.HasManyGetAssociationsMixin<AiSupportSessionInstance>;
    setSessions: Sequelize.HasManySetAssociationsMixin<AiSupportSessionInstance, string>;
    addAiSupportSession: Sequelize.HasManyAddAssociationMixin<AiSupportSessionInstance, string>;
    addSessions: Sequelize.HasManyAddAssociationsMixin<AiSupportSessionInstance, string>;
    removeAiSupportSession: Sequelize.HasManyRemoveAssociationMixin<AiSupportSessionInstance, string>;
    removeSessions: Sequelize.HasManyRemoveAssociationsMixin<AiSupportSessionInstance, string>;
    hasAiSupportSession: Sequelize.HasManyHasAssociationMixin<AiSupportSessionInstance, string>;
    hasSessions: Sequelize.HasManyHasAssociationsMixin<AiSupportSessionInstance, string>;
    countSessions: Sequelize.HasManyCountAssociationsMixin;
    createAiSupportSession: Sequelize.HasManyCreateAssociationMixin<AiSupportSessionInstance>;
  }

  // ========================================
  // AiSupportArticle
  // ========================================

  interface AiSupportArticleAttributes {
    id: string;
    question: string;
    answer: string;
    category?: string | null;
    productSlug?: string | null;
    status: "DRAFT" | "PUBLISHED";
    isPolicyStub: boolean;
    sourceTicketId?: string | null;
    approvedBy?: string | null;
    generatedBy?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type AiSupportArticleCreationAttributes = Optional<AiSupportArticleAttributes, "id" | "answer" | "category" | "productSlug" | "status" | "isPolicyStub" | "sourceTicketId" | "approvedBy" | "generatedBy" | "createdAt" | "updatedAt" | "deletedAt">;

  interface AiSupportArticleInstance extends Model<AiSupportArticleAttributes, AiSupportArticleCreationAttributes>, AiSupportArticleAttributes {
  }

  // ========================================
  // AiSupportChunk
  // ========================================

  interface AiSupportChunkAttributes {
    id: string;
    sourceId: string;
    ord: number;
    breadcrumb?: string | null;
    title?: string | null;
    anchor?: string | null;
    text: string;
    tokens: number;
    citationUrl?: string | null;
    tags?: string[] | null;
    weight: number;
    audience: "CUSTOMER" | "OPERATOR";
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiSupportChunkCreationAttributes = Optional<AiSupportChunkAttributes, "id" | "ord" | "breadcrumb" | "title" | "anchor" | "tokens" | "citationUrl" | "tags" | "weight" | "audience" | "createdAt" | "updatedAt">;

  interface AiSupportChunkInstance extends Model<AiSupportChunkAttributes, AiSupportChunkCreationAttributes>, AiSupportChunkAttributes {
    source?: AiSupportSourceInstance;
    getSource: Sequelize.BelongsToGetAssociationMixin<AiSupportSourceInstance>;
    setSource: Sequelize.BelongsToSetAssociationMixin<AiSupportSourceInstance, string>;
    createSource: Sequelize.BelongsToCreateAssociationMixin<AiSupportSourceInstance>;
  }

  // ========================================
  // AiSupportDeflection
  // ========================================

  interface AiSupportDeflectionAttributes {
    id: string;
    userId: string;
    question: string;
    chunkId?: string | null;
    articleQuestion?: string | null;
    outcome: "SHOWN" | "RESOLVED" | "FILED";
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiSupportDeflectionCreationAttributes = Optional<AiSupportDeflectionAttributes, "id" | "chunkId" | "articleQuestion" | "outcome" | "createdAt" | "updatedAt">;

  interface AiSupportDeflectionInstance extends Model<AiSupportDeflectionAttributes, AiSupportDeflectionCreationAttributes>, AiSupportDeflectionAttributes {
  }

  // ========================================
  // AiSupportFeedback
  // ========================================

  interface AiSupportFeedbackAttributes {
    id: string;
    turnId: string;
    userId?: string | null;
    isHelpful: boolean;
    comment?: string;
    source: "CUSTOMER" | "AGENT";
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiSupportFeedbackCreationAttributes = Optional<AiSupportFeedbackAttributes, "id" | "userId" | "comment" | "source" | "createdAt" | "updatedAt">;

  interface AiSupportFeedbackInstance extends Model<AiSupportFeedbackAttributes, AiSupportFeedbackCreationAttributes>, AiSupportFeedbackAttributes {
    turn?: AiSupportTurnInstance;
    getTurn: Sequelize.BelongsToGetAssociationMixin<AiSupportTurnInstance>;
    setTurn: Sequelize.BelongsToSetAssociationMixin<AiSupportTurnInstance, string>;
    createTurn: Sequelize.BelongsToCreateAssociationMixin<AiSupportTurnInstance>;
  }

  // ========================================
  // AiSupportGap
  // ========================================

  interface AiSupportGapAttributes {
    id: string;
    normalisedQuestion: string;
    sampleQuestion?: string | null;
    count: number;
    firstSeen: Date;
    lastSeen: Date;
    bestScore?: number | null;
    status: "OPEN" | "DRAFTED" | "RESOLVED" | "IGNORED";
    articleId?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiSupportGapCreationAttributes = Optional<AiSupportGapAttributes, "id" | "sampleQuestion" | "count" | "firstSeen" | "lastSeen" | "bestScore" | "status" | "articleId" | "createdAt" | "updatedAt">;

  interface AiSupportGapInstance extends Model<AiSupportGapAttributes, AiSupportGapCreationAttributes>, AiSupportGapAttributes {
  }

  // ========================================
  // AiSupportGlossary
  // ========================================

  interface AiSupportGlossaryAttributes {
    id: string;
    term: string;
    canonical: string;
    definition?: string | null;
    forbidden?: string[] | null;
    status: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiSupportGlossaryCreationAttributes = Optional<AiSupportGlossaryAttributes, "id" | "definition" | "forbidden" | "status" | "createdAt" | "updatedAt">;

  interface AiSupportGlossaryInstance extends Model<AiSupportGlossaryAttributes, AiSupportGlossaryCreationAttributes>, AiSupportGlossaryAttributes {
  }

  // ========================================
  // AiSupportHandover
  // ========================================

  interface AiSupportHandoverAttributes {
    id: string;
    sessionId: string;
    fromState?: string | null;
    toState: string;
    actor: "AI" | "HUMAN" | "SYSTEM" | "USER";
    actorId?: string | null;
    reason?: string | null;
    note?: string | null;
    createdAt?: Date;
  }

  type AiSupportHandoverCreationAttributes = Optional<AiSupportHandoverAttributes, "id" | "fromState" | "actor" | "actorId" | "reason" | "note" | "createdAt">;

  interface AiSupportHandoverInstance extends Model<AiSupportHandoverAttributes, AiSupportHandoverCreationAttributes>, AiSupportHandoverAttributes {
    session?: AiSupportSessionInstance;
    getSession: Sequelize.BelongsToGetAssociationMixin<AiSupportSessionInstance>;
    setSession: Sequelize.BelongsToSetAssociationMixin<AiSupportSessionInstance, string>;
    createSession: Sequelize.BelongsToCreateAssociationMixin<AiSupportSessionInstance>;
  }

  // ========================================
  // AiSupportOperation
  // ========================================

  interface AiSupportOperationAttributes {
    id: string;
    userId: string;
    ticketId: string;
    operation: string;
    reason?: string | null;
    state: "PROPOSED" | "CONFIRMED" | "COMPLETED" | "FAILED" | "EXPIRED";
    workflowId?: string | null;
    stepIndex?: number | null;
    confirmedAt?: Date | null;
    completedAt?: Date | null;
    result?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiSupportOperationCreationAttributes = Optional<AiSupportOperationAttributes, "id" | "reason" | "state" | "workflowId" | "stepIndex" | "confirmedAt" | "completedAt" | "result" | "createdAt" | "updatedAt">;

  interface AiSupportOperationInstance extends Model<AiSupportOperationAttributes, AiSupportOperationCreationAttributes>, AiSupportOperationAttributes {
  }

  // ========================================
  // AiSupportRule
  // ========================================

  interface AiSupportRuleAttributes {
    id: string;
    name: string;
    priority: number;
    matchType: "KEYWORD" | "REGEX" | "INTENT" | "CONFIDENCE" | "TURN_COUNT" | "KYC_FEATURE" | "ALWAYS";
    matchValue?: string | null;
    action: "ESCALATE" | "SUSPEND_AI" | "TAG" | "SET_IMPORTANCE" | "REFUSE";
    actionValue?: string | null;
    status: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiSupportRuleCreationAttributes = Optional<AiSupportRuleAttributes, "id" | "priority" | "matchType" | "matchValue" | "action" | "actionValue" | "status" | "createdAt" | "updatedAt">;

  interface AiSupportRuleInstance extends Model<AiSupportRuleAttributes, AiSupportRuleCreationAttributes>, AiSupportRuleAttributes {
  }

  // ========================================
  // AiSupportSession
  // ========================================

  interface AiSupportSessionAttributes {
    id: string;
    ticketId: string;
    agentId?: string | null;
    state: "AI_ACTIVE" | "AWAITING_USER" | "HUMAN_REQUESTED" | "HUMAN_ACTIVE" | "AI_SUSPENDED" | "RESOLVED";
    previousState?: string | null;
    generationToken?: string | null;
    activeTurnId?: string | null;
    humanAgentId?: string | null;
    turnCount: number;
    escalationReason?: string | null;
    locale?: string | null;
    handoverSummary?: string | null;
    lastStateAt?: Date | null;
    deflected?: boolean | null;
    costUsdTotal: number;
    channel: "TICKET" | "LIVE";
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiSupportSessionCreationAttributes = Optional<AiSupportSessionAttributes, "id" | "agentId" | "state" | "previousState" | "generationToken" | "activeTurnId" | "humanAgentId" | "turnCount" | "escalationReason" | "locale" | "handoverSummary" | "lastStateAt" | "deflected" | "costUsdTotal" | "channel" | "createdAt" | "updatedAt">;

  interface AiSupportSessionInstance extends Model<AiSupportSessionAttributes, AiSupportSessionCreationAttributes>, AiSupportSessionAttributes {
    turns?: AiSupportTurnInstance[];
    handovers?: AiSupportHandoverInstance[];
    ticket?: SupportTicketInstance;
    agent?: AiSupportAgentInstance;
    getTurns: Sequelize.HasManyGetAssociationsMixin<AiSupportTurnInstance>;
    setTurns: Sequelize.HasManySetAssociationsMixin<AiSupportTurnInstance, string>;
    addAiSupportTurn: Sequelize.HasManyAddAssociationMixin<AiSupportTurnInstance, string>;
    addTurns: Sequelize.HasManyAddAssociationsMixin<AiSupportTurnInstance, string>;
    removeAiSupportTurn: Sequelize.HasManyRemoveAssociationMixin<AiSupportTurnInstance, string>;
    removeTurns: Sequelize.HasManyRemoveAssociationsMixin<AiSupportTurnInstance, string>;
    hasAiSupportTurn: Sequelize.HasManyHasAssociationMixin<AiSupportTurnInstance, string>;
    hasTurns: Sequelize.HasManyHasAssociationsMixin<AiSupportTurnInstance, string>;
    countTurns: Sequelize.HasManyCountAssociationsMixin;
    createAiSupportTurn: Sequelize.HasManyCreateAssociationMixin<AiSupportTurnInstance>;
    getHandovers: Sequelize.HasManyGetAssociationsMixin<AiSupportHandoverInstance>;
    setHandovers: Sequelize.HasManySetAssociationsMixin<AiSupportHandoverInstance, string>;
    addAiSupportHandover: Sequelize.HasManyAddAssociationMixin<AiSupportHandoverInstance, string>;
    addHandovers: Sequelize.HasManyAddAssociationsMixin<AiSupportHandoverInstance, string>;
    removeAiSupportHandover: Sequelize.HasManyRemoveAssociationMixin<AiSupportHandoverInstance, string>;
    removeHandovers: Sequelize.HasManyRemoveAssociationsMixin<AiSupportHandoverInstance, string>;
    hasAiSupportHandover: Sequelize.HasManyHasAssociationMixin<AiSupportHandoverInstance, string>;
    hasHandovers: Sequelize.HasManyHasAssociationsMixin<AiSupportHandoverInstance, string>;
    countHandovers: Sequelize.HasManyCountAssociationsMixin;
    createAiSupportHandover: Sequelize.HasManyCreateAssociationMixin<AiSupportHandoverInstance>;
    getTicket: Sequelize.BelongsToGetAssociationMixin<SupportTicketInstance>;
    setTicket: Sequelize.BelongsToSetAssociationMixin<SupportTicketInstance, string>;
    createTicket: Sequelize.BelongsToCreateAssociationMixin<SupportTicketInstance>;
    getAgent: Sequelize.BelongsToGetAssociationMixin<AiSupportAgentInstance>;
    setAgent: Sequelize.BelongsToSetAssociationMixin<AiSupportAgentInstance, string>;
    createAgent: Sequelize.BelongsToCreateAssociationMixin<AiSupportAgentInstance>;
  }

  // ========================================
  // AiSupportSource
  // ========================================

  interface AiSupportSourceAttributes {
    id: string;
    kind: "DOCS_PACK" | "DOCS_REMOTE" | "FAQ" | "ARTICLE" | "CRAWL";
    title: string;
    locator?: string | null;
    productSlug?: string | null;
    version?: string | null;
    checksum?: string | null;
    chunkCount: number;
    weight: number;
    status: boolean;
    lastIndexedAt?: Date | null;
    error?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiSupportSourceCreationAttributes = Optional<AiSupportSourceAttributes, "id" | "kind" | "locator" | "productSlug" | "version" | "checksum" | "chunkCount" | "weight" | "status" | "lastIndexedAt" | "error" | "createdAt" | "updatedAt">;

  interface AiSupportSourceInstance extends Model<AiSupportSourceAttributes, AiSupportSourceCreationAttributes>, AiSupportSourceAttributes {
    chunks?: AiSupportChunkInstance[];
    getChunks: Sequelize.HasManyGetAssociationsMixin<AiSupportChunkInstance>;
    setChunks: Sequelize.HasManySetAssociationsMixin<AiSupportChunkInstance, string>;
    addAiSupportChunk: Sequelize.HasManyAddAssociationMixin<AiSupportChunkInstance, string>;
    addChunks: Sequelize.HasManyAddAssociationsMixin<AiSupportChunkInstance, string>;
    removeAiSupportChunk: Sequelize.HasManyRemoveAssociationMixin<AiSupportChunkInstance, string>;
    removeChunks: Sequelize.HasManyRemoveAssociationsMixin<AiSupportChunkInstance, string>;
    hasAiSupportChunk: Sequelize.HasManyHasAssociationMixin<AiSupportChunkInstance, string>;
    hasChunks: Sequelize.HasManyHasAssociationsMixin<AiSupportChunkInstance, string>;
    countChunks: Sequelize.HasManyCountAssociationsMixin;
    createAiSupportChunk: Sequelize.HasManyCreateAssociationMixin<AiSupportChunkInstance>;
  }

  // ========================================
  // AiSupportTurn
  // ========================================

  interface AiSupportTurnAttributes {
    id: string;
    sessionId: string;
    ticketId: string;
    messageKey?: string | null;
    trigger: "NEW_TICKET" | "CUSTOMER_REPLY" | "MANUAL" | "RETRY" | "HANDBACK";
    providerId: string;
    model?: string | null;
    effort?: string | null;
    status: "PENDING" | "STREAMING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "SKIPPED" | "REFUSED";
    skipReason?: string | null;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    costUsd: number;
    latencyMs?: number | null;
    aiFirstResponseMs?: number | null;
    retrievalScore?: number | null;
    retrievedChunkIds?: string[] | null;
    citationMode?: "NATIVE" | "MARKER" | null;
    groundedness?: number | null;
    verdict?: "ANSWERED" | "ESCALATED" | "REFUSED" | null;
    escalationReason?: string | null;
    draftText?: string | null;
    sentText?: string | null;
    editDistance?: number | null;
    wasSent?: boolean | null;
    promptHash?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    citations?: any | null;
    toolCalls?: any | null;
  }

  type AiSupportTurnCreationAttributes = Optional<AiSupportTurnAttributes, "id" | "messageKey" | "trigger" | "providerId" | "model" | "effort" | "status" | "skipReason" | "inputTokens" | "outputTokens" | "cacheReadTokens" | "cacheWriteTokens" | "costUsd" | "latencyMs" | "aiFirstResponseMs" | "retrievalScore" | "retrievedChunkIds" | "citationMode" | "groundedness" | "verdict" | "escalationReason" | "draftText" | "sentText" | "editDistance" | "wasSent" | "promptHash" | "errorCode" | "errorMessage" | "createdAt" | "updatedAt" | "citations" | "toolCalls">;

  interface AiSupportTurnInstance extends Model<AiSupportTurnAttributes, AiSupportTurnCreationAttributes>, AiSupportTurnAttributes {
    feedback?: AiSupportFeedbackInstance[];
    session?: AiSupportSessionInstance;
    getFeedback: Sequelize.HasManyGetAssociationsMixin<AiSupportFeedbackInstance>;
    setFeedback: Sequelize.HasManySetAssociationsMixin<AiSupportFeedbackInstance, string>;
    addAiSupportFeedback: Sequelize.HasManyAddAssociationMixin<AiSupportFeedbackInstance, string>;
    addFeedback: Sequelize.HasManyAddAssociationsMixin<AiSupportFeedbackInstance, string>;
    removeAiSupportFeedback: Sequelize.HasManyRemoveAssociationMixin<AiSupportFeedbackInstance, string>;
    removeFeedback: Sequelize.HasManyRemoveAssociationsMixin<AiSupportFeedbackInstance, string>;
    hasAiSupportFeedback: Sequelize.HasManyHasAssociationMixin<AiSupportFeedbackInstance, string>;
    hasFeedback: Sequelize.HasManyHasAssociationsMixin<AiSupportFeedbackInstance, string>;
    countFeedback: Sequelize.HasManyCountAssociationsMixin;
    createAiSupportFeedback: Sequelize.HasManyCreateAssociationMixin<AiSupportFeedbackInstance>;
    getSession: Sequelize.BelongsToGetAssociationMixin<AiSupportSessionInstance>;
    setSession: Sequelize.BelongsToSetAssociationMixin<AiSupportSessionInstance, string>;
    createSession: Sequelize.BelongsToCreateAssociationMixin<AiSupportSessionInstance>;
  }

  // ========================================
  // AiSupportWorkflow
  // ========================================

  interface AiSupportWorkflowAttributes {
    id: string;
    userId: string;
    ticketId: string;
    workflow: string;
    reason?: string | null;
    currentStep: number;
    state: "RUNNING" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "FAILED";
    cancelledBy?: string | null;
    completedAt?: Date | null;
    result?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type AiSupportWorkflowCreationAttributes = Optional<AiSupportWorkflowAttributes, "id" | "reason" | "currentStep" | "state" | "cancelledBy" | "completedAt" | "result" | "createdAt" | "updatedAt">;

  interface AiSupportWorkflowInstance extends Model<AiSupportWorkflowAttributes, AiSupportWorkflowCreationAttributes>, AiSupportWorkflowAttributes {
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

  type AnnouncementCreationAttributes = Optional<AnnouncementAttributes, "id" | "type" | "link" | "status" | "createdAt" | "updatedAt" | "deletedAt">;

  interface AnnouncementInstance extends Model<AnnouncementAttributes, AnnouncementCreationAttributes>, AnnouncementAttributes {
  }

  // ========================================
  // ApiKey
  // ========================================

  interface ApiKeyAttributes {
    id: string;
    userId?: string | null;
    name: string;
    key: string;
    secret?: string | null;
    secretCreatedAt?: Date | null;
    type: "user" | "plugin";
    permissions: string[];
    ipRestriction: boolean;
    ipWhitelist: string[];
    lastUsedAt?: Date | null;
    lastUsedIp?: string | null;
    expiresAt?: Date | null;
    disabled?: boolean;
    disabledAt?: Date | null;
    disabledReason?: string | null;
    disabledBy?: "user" | "admin" | null;
    rateLimitOverride?: Record<string, { limit: number; windowSec: number }> | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type ApiKeyCreationAttributes = Optional<ApiKeyAttributes, "id" | "userId" | "secret" | "secretCreatedAt" | "type" | "permissions" | "ipRestriction" | "ipWhitelist" | "lastUsedAt" | "lastUsedIp" | "expiresAt" | "disabled" | "disabledAt" | "disabledReason" | "disabledBy" | "rateLimitOverride" | "createdAt" | "deletedAt" | "updatedAt">;

  interface ApiKeyInstance extends Model<ApiKeyAttributes, ApiKeyCreationAttributes>, ApiKeyAttributes {
    auditLogs?: ApiKeyAuditLogInstance[];
    user?: UserInstance;
    getAuditLogs: Sequelize.HasManyGetAssociationsMixin<ApiKeyAuditLogInstance>;
    setAuditLogs: Sequelize.HasManySetAssociationsMixin<ApiKeyAuditLogInstance, string>;
    addApiKeyAuditLog: Sequelize.HasManyAddAssociationMixin<ApiKeyAuditLogInstance, string>;
    addAuditLogs: Sequelize.HasManyAddAssociationsMixin<ApiKeyAuditLogInstance, string>;
    removeApiKeyAuditLog: Sequelize.HasManyRemoveAssociationMixin<ApiKeyAuditLogInstance, string>;
    removeAuditLogs: Sequelize.HasManyRemoveAssociationsMixin<ApiKeyAuditLogInstance, string>;
    hasApiKeyAuditLog: Sequelize.HasManyHasAssociationMixin<ApiKeyAuditLogInstance, string>;
    hasAuditLogs: Sequelize.HasManyHasAssociationsMixin<ApiKeyAuditLogInstance, string>;
    countAuditLogs: Sequelize.HasManyCountAssociationsMixin;
    createApiKeyAuditLog: Sequelize.HasManyCreateAssociationMixin<ApiKeyAuditLogInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // ApiKeyAuditLog
  // ========================================

  interface ApiKeyAuditLogAttributes {
    id: string;
    apiKeyId: string;
    userId?: string | null;
    action: ApiKeyAuditAction;
    ip?: string | null;
    userAgent?: string | null;
    routePath?: string | null;
    method?: string | null;
    statusCode?: number | null;
    metadata?: Record<string, any> | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type ApiKeyAuditLogCreationAttributes = Optional<ApiKeyAuditLogAttributes, "id" | "userId" | "ip" | "userAgent" | "routePath" | "method" | "statusCode" | "metadata" | "createdAt" | "updatedAt">;

  interface ApiKeyAuditLogInstance extends Model<ApiKeyAuditLogAttributes, ApiKeyAuditLogCreationAttributes>, ApiKeyAuditLogAttributes {
    apiKey?: ApiKeyInstance;
    user?: UserInstance;
    getApiKey: Sequelize.BelongsToGetAssociationMixin<ApiKeyInstance>;
    setApiKey: Sequelize.BelongsToSetAssociationMixin<ApiKeyInstance, string>;
    createApiKey: Sequelize.BelongsToCreateAssociationMixin<ApiKeyInstance>;
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

  type AuthorCreationAttributes = Optional<AuthorAttributes, "id" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

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
    enableStreakCooldown: boolean;
    streakThreshold: number;
    streakCooldownDuration: number;
    enableWhaleDetection: boolean;
    whaleThreshold: number;
    whaleStrategy: "REDUCE_EXPOSURE" | "ALERT_ONLY" | "FORCE_LOSS";
    whaleWinRateCap: number;
    whaleProfitMultiplier: number;
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
    enableMlAutoApply: boolean;
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
    correlationHistory?: any[];
  }

  type BinaryAiEngineCreationAttributes = Optional<BinaryAiEngineAttributes, "id" | "status" | "targetUserWinRate" | "winRateVariance" | "winRateResetHours" | "practiceMode" | "practiceTargetWinRate" | "practiceWinRateVariance" | "optimizationStrategy" | "maxPriceAdjustmentPercent" | "adjustmentLeadTimeSeconds" | "volatilityMaskingEnabled" | "volatilityNoisePercent" | "enableUserTiers" | "tierCalculationMethod" | "enableBigWinCooldown" | "bigWinThreshold" | "cooldownDurationMinutes" | "cooldownWinRateReduction" | "enableStreakCooldown" | "streakThreshold" | "streakCooldownDuration" | "enableWhaleDetection" | "whaleThreshold" | "whaleStrategy" | "whaleWinRateCap" | "whaleProfitMultiplier" | "emergencyStopLoss" | "correlationConfig" | "simulationMode" | "logSimulatedActions" | "enableExternalCorrelation" | "externalPriceSource" | "maxDeviationPercent" | "allowedOrderTypes" | "minPositionForOptimization" | "maxDailyLoss" | "maxSingleOrderExposure" | "currentPeriodWins" | "currentPeriodLosses" | "currentPeriodPlatformProfit" | "lastPeriodResetAt" | "practicePeriodWins" | "practicePeriodLosses" | "lastPracticePeriodResetAt" | "lastSnapshotId" | "mlModelWeights" | "enableMlAutoApply" | "enableWhaleAlerts" | "createdAt" | "updatedAt" | "marketMaker" | "positions" | "actions" | "dailyStats" | "userTiers" | "userCooldowns" | "snapshots" | "simulations" | "abTests" | "cohorts" | "correlationAlerts" | "correlationHistory">;

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
    correlationHistory?: BinaryAiEngineCorrelationHistoryInstance[];
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
    getCorrelationHistory: Sequelize.HasManyGetAssociationsMixin<BinaryAiEngineCorrelationHistoryInstance>;
    setCorrelationHistory: Sequelize.HasManySetAssociationsMixin<BinaryAiEngineCorrelationHistoryInstance, string>;
    addBinaryAiEngineCorrelationHistory: Sequelize.HasManyAddAssociationMixin<BinaryAiEngineCorrelationHistoryInstance, string>;
    addCorrelationHistory: Sequelize.HasManyAddAssociationsMixin<BinaryAiEngineCorrelationHistoryInstance, string>;
    removeBinaryAiEngineCorrelationHistory: Sequelize.HasManyRemoveAssociationMixin<BinaryAiEngineCorrelationHistoryInstance, string>;
    removeCorrelationHistory: Sequelize.HasManyRemoveAssociationsMixin<BinaryAiEngineCorrelationHistoryInstance, string>;
    hasBinaryAiEngineCorrelationHistory: Sequelize.HasManyHasAssociationMixin<BinaryAiEngineCorrelationHistoryInstance, string>;
    hasCorrelationHistory: Sequelize.HasManyHasAssociationsMixin<BinaryAiEngineCorrelationHistoryInstance, string>;
    countCorrelationHistory: Sequelize.HasManyCountAssociationsMixin;
    createBinaryAiEngineCorrelationHistory: Sequelize.HasManyCreateAssociationMixin<BinaryAiEngineCorrelationHistoryInstance>;
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

  type BinaryAiEngineABTestCreationAttributes = Optional<BinaryAiEngineABTestAttributes, "id" | "description" | "status" | "startedAt" | "endedAt" | "trafficSplit" | "controlOrders" | "controlWins" | "controlProfit" | "variantOrders" | "variantWins" | "variantProfit" | "winningVariant" | "confidenceLevel" | "results" | "variants" | "primaryMetric" | "targetSampleSize" | "durationDays" | "createdAt" | "updatedAt" | "engine">;

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
    closePrice: number | null;
    platformProfit: number;
    wasManipulated: boolean;
    manipulationDetails: Record<string, any> | null;
    abTestId: string | null;
    abVariant: "CONTROL" | "TREATMENT" | null;
    createdAt?: Date;
    updatedAt?: Date;
    engine?: any;
    user?: any;
  }

  type BinaryAiEnginePositionCreationAttributes = Optional<BinaryAiEnginePositionAttributes, "id" | "isDemo" | "userTier" | "isWhale" | "hasCooldown" | "outcome" | "status" | "settledAt" | "closePrice" | "platformProfit" | "wasManipulated" | "manipulationDetails" | "abTestId" | "abVariant" | "createdAt" | "updatedAt" | "engine" | "user">;

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
    maxVolume: number | null;
    minDeposit: number;
    winRateBonus: number;
    description: string | null;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    engine?: any;
  }

  type BinaryAiEngineUserTierCreationAttributes = Optional<BinaryAiEngineUserTierAttributes, "id" | "tierOrder" | "minVolume" | "maxVolume" | "minDeposit" | "winRateBonus" | "description" | "isActive" | "createdAt" | "updatedAt" | "engine">;

  interface BinaryAiEngineUserTierInstance extends Model<BinaryAiEngineUserTierAttributes, BinaryAiEngineUserTierCreationAttributes>, BinaryAiEngineUserTierAttributes {
    engine?: BinaryAiEngineInstance;
    getEngine: Sequelize.BelongsToGetAssociationMixin<BinaryAiEngineInstance>;
    setEngine: Sequelize.BelongsToSetAssociationMixin<BinaryAiEngineInstance, string>;
    createEngine: Sequelize.BelongsToCreateAssociationMixin<BinaryAiEngineInstance>;
  }

  // ========================================
  // BinaryMarket
  // ========================================

  interface BinaryMarketAttributes {
    id: string;
    currency: string;
    pair: string;
    minAmount?: number | null;
    maxAmount?: number | null;
    source: "EXCHANGE" | "ECOSYSTEM";
    isTrending?: boolean | null;
    isHot?: boolean | null;
    status: boolean;
  }

  type BinaryMarketCreationAttributes = Optional<BinaryMarketAttributes, "id" | "minAmount" | "maxAmount" | "source" | "isTrending" | "isHot" | "status">;

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
    side: "RISE" | "FALL" | "HIGHER" | "LOWER" | "TOUCH" | "NO_TOUCH" | "CALL" | "PUT" | "UP" | "DOWN";
    type: "RISE_FALL" | "HIGHER_LOWER" | "TOUCH_NO_TOUCH" | "CALL_PUT" | "TURBO";
    durationType: "TIME" | "TICKS";
    barrier?: number | null;
    strikePrice?: number | null;
    payoutPerPoint?: number | null;
    profitPercentage?: number | null;
    status: "PENDING" | "WIN" | "LOSS" | "DRAW" | "CANCELED" | "ERROR";
    isDemo: boolean;
    closedAt: Date;
    closePrice?: number | null;
    metadata?: Record<string, any> | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type BinaryOrderCreationAttributes = Optional<BinaryOrderAttributes, "id" | "durationType" | "barrier" | "strikePrice" | "payoutPerPoint" | "profitPercentage" | "isDemo" | "closePrice" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

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
    image?: string | null;
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
  // ChartWorkspace
  // ========================================

  interface ChartWorkspaceAttributes {
    id: string;
    userId: string;
    key: string;
    value: string | null;
    version: number;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type ChartWorkspaceCreationAttributes = Optional<ChartWorkspaceAttributes, "id" | "value" | "version" | "createdAt" | "updatedAt">;

  interface ChartWorkspaceInstance extends Model<ChartWorkspaceAttributes, ChartWorkspaceCreationAttributes>, ChartWorkspaceAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
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
  // ContentReport
  // ========================================

  interface ContentReportAttributes {
    id: string;
    reporterId: string;
    targetType: "BLOG_COMMENT" | "BLOG_POST" | "NFT_LISTING" | "USER_PROFILE" | "SUPPORT_TICKET";
    targetId: string;
    targetOwnerId?: string | null;
    reason: "SPAM" | "ABUSIVE_CONDUCT" | "HATE_SPEECH" | "SEXUAL_CONTENT" | "VIOLENCE" | "SCAM_OR_FRAUD" | "IMPERSONATION" | "OTHER";
    details: string;
    status: "PENDING" | "REVIEWING" | "ACTIONED" | "DISMISSED";
    resolution?: string | null;
    reviewedById?: string | null;
    reviewedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type ContentReportCreationAttributes = Optional<ContentReportAttributes, "id" | "targetOwnerId" | "status" | "resolution" | "reviewedById" | "reviewedAt" | "createdAt" | "updatedAt" | "deletedAt">;

  interface ContentReportInstance extends Model<ContentReportAttributes, ContentReportCreationAttributes>, ContentReportAttributes {
    reporter?: UserInstance;
    targetOwner?: UserInstance;
    reviewedBy?: UserInstance;
    getReporter: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setReporter: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createReporter: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getTargetOwner: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setTargetOwner: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createTargetOwner: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getReviewedBy: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setReviewedBy: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createReviewedBy: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
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
    marketType: "SPOT" | "BINARY";
    baseAmount: number;
    baseUsedAmount: number;
    quoteAmount: number;
    quoteUsedAmount: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type CopyTradingFollowerAllocationCreationAttributes = Optional<CopyTradingFollowerAllocationAttributes, "id" | "marketType" | "baseAmount" | "baseUsedAmount" | "quoteAmount" | "quoteUsedAmount" | "isActive" | "createdAt" | "updatedAt">;

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
    tradingType: "SPOT" | "BINARY" | "BOTH";
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

  type CopyTradingLeaderCreationAttributes = Optional<CopyTradingLeaderAttributes, "id" | "avatar" | "bio" | "tradingStyle" | "riskLevel" | "tradingType" | "profitSharePercent" | "minFollowAmount" | "maxFollowers" | "status" | "isPublic" | "applicationNote" | "rejectionReason" | "createdAt" | "updatedAt" | "deletedAt">;

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
    marketType: "SPOT" | "BINARY";
    baseCurrency: string;
    quoteCurrency: string;
    minBase: number;
    minQuote: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type CopyTradingLeaderMarketCreationAttributes = Optional<CopyTradingLeaderMarketAttributes, "id" | "marketType" | "minBase" | "minQuote" | "isActive" | "createdAt" | "updatedAt">;

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
    createdAt?: Date;
    updatedAt?: Date;
  }

  type CopyTradingLeaderStatsCreationAttributes = Optional<CopyTradingLeaderStatsAttributes, "id" | "trades" | "winningTrades" | "losingTrades" | "volume" | "profit" | "fees" | "createdAt" | "updatedAt">;

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
    followerOrderId?: string | null;
    closeOrderId?: string | null;
    symbol: string;
    marketType: "SPOT" | "BINARY";
    side: "BUY" | "SELL" | "RISE" | "FALL" | "HIGHER" | "LOWER" | "TOUCH" | "NO_TOUCH" | "CALL" | "PUT" | "UP" | "DOWN";
    type: "MARKET" | "LIMIT" | "RISE_FALL" | "HIGHER_LOWER" | "TOUCH_NO_TOUCH" | "CALL_PUT" | "TURBO";
    amount: number;
    price: number;
    cost: number;
    fee: number;
    feeCurrency: string;
    binaryResult?: "WIN" | "LOSS" | "DRAW" | null;
    expiresAt?: Date | null;
    executedAmount: number;
    executedPrice: number;
    slippage?: number | null;
    latencyMs?: number | null;
    profit?: number | null;
    profitPercent?: number | null;
    profitCurrency?: string | null;
    status: "PENDING" | "PENDING_REPLICATION" | "REPLICATED" | "REPLICATION_FAILED" | "OPEN" | "CLOSED" | "PARTIALLY_FILLED" | "FAILED" | "CANCELLED" | "CLOSING";
    errorMessage?: string | null;
    isLeaderTrade: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    closedAt?: Date | null;
  }

  type CopyTradingTradeCreationAttributes = Optional<CopyTradingTradeAttributes, "id" | "followerId" | "leaderOrderId" | "followerOrderId" | "closeOrderId" | "marketType" | "type" | "cost" | "fee" | "feeCurrency" | "binaryResult" | "expiresAt" | "executedAmount" | "executedPrice" | "slippage" | "latencyMs" | "profit" | "profitPercent" | "profitCurrency" | "status" | "errorMessage" | "isLeaderTrade" | "createdAt" | "updatedAt" | "closedAt">;

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

  type CurrencyCreationAttributes = Optional<CurrencyAttributes, "id" | "price" | "status">;

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
    image?: string | null;
    alias?: string | null;
    currencies?: string[] | null;
    fixedFee?: number | Record<string, number> | null;
    percentageFee?: number | Record<string, number> | null;
    minAmount?: number | Record<string, number> | null;
    maxAmount?: number | Record<string, number> | null;
    type: "FIAT" | "CRYPTO";
    status?: boolean;
    version?: string | null;
    productId?: string | null;
  }

  type DepositGatewayCreationAttributes = Optional<DepositGatewayAttributes, "id" | "image" | "alias" | "currencies" | "fixedFee" | "percentageFee" | "minAmount" | "maxAmount" | "type" | "status" | "version" | "productId">;

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
    image?: string | null;
    fixedFee: number;
    percentageFee: number;
    minAmount: number;
    maxAmount: number;
    customFields?: string | null;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type DepositMethodCreationAttributes = Optional<DepositMethodAttributes, "id" | "image" | "fixedFee" | "percentageFee" | "minAmount" | "maxAmount" | "customFields" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

  interface DepositMethodInstance extends Model<DepositMethodAttributes, DepositMethodCreationAttributes>, DepositMethodAttributes {
  }

  // ========================================
  // DexChain
  // ========================================

  interface DexChainAttributes {
    id: string;
    chainId: number;
    vm: string;
    key?: string | null;
    slug: string;
    name: string;
    status: boolean;
    rpcUrlOverride?: string | null;
    publicRpcUrl?: string | null;
    explorerUrl?: string | null;
    requiredConfirmations: number;
    feeRecipient?: string | null;
    zeroFeeAcknowledged: boolean;
    feeRecipientUpdatedAt?: Date | null;
    wrappedNative: string;
    nativeSymbol: string;
    nativeDecimals: number;
    aggregatorSupport?: string | null;
    odosReferralCode?: number | null;
    odosReferralTxHash?: string | null;
    odosReferralVerifiedAt?: Date | null;
    metadata?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type DexChainCreationAttributes = Optional<DexChainAttributes, "id" | "vm" | "key" | "status" | "rpcUrlOverride" | "publicRpcUrl" | "explorerUrl" | "requiredConfirmations" | "feeRecipient" | "zeroFeeAcknowledged" | "feeRecipientUpdatedAt" | "nativeDecimals" | "aggregatorSupport" | "odosReferralCode" | "odosReferralTxHash" | "odosReferralVerifiedAt" | "metadata" | "createdAt" | "updatedAt">;

  interface DexChainInstance extends Model<DexChainAttributes, DexChainCreationAttributes>, DexChainAttributes {
  }

  // ========================================
  // DexFeeAccrual
  // ========================================

  interface DexFeeAccrualAttributes {
    id: string;
    swapId: string;
    userId?: string | null;
    chainId: number;
    vm: string;
    tokenId?: string | null;
    tokenAddress: string;
    tokenSymbol: string;
    tokenDecimals: number;
    feeRecipient: string;
    amountRaw: string;
    amountDisplay: number;
    amountUsd?: number | null;
    feeBps: number;
    feeSide: string;
    verification: string;
    logIndex?: number | null;
    usdRateSource?: string | null;
    sweepStatus: string;
    sweepSubmittedAt?: Date | null;
    sweepAttempts: number;
    creditedTransactionId?: string | null;
    adminProfitId?: string | null;
    creditedAmount?: number | null;
    roundingResidueRaw?: string | null;
    reversalOfId?: string | null;
    sweepFailureReason?: string | null;
    sweptAt?: Date | null;
    sweepTxHash?: string | null;
    metadata?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type DexFeeAccrualCreationAttributes = Optional<DexFeeAccrualAttributes, "id" | "userId" | "vm" | "tokenId" | "amountUsd" | "logIndex" | "usdRateSource" | "sweepStatus" | "sweepSubmittedAt" | "sweepAttempts" | "creditedTransactionId" | "adminProfitId" | "creditedAmount" | "roundingResidueRaw" | "reversalOfId" | "sweepFailureReason" | "sweptAt" | "sweepTxHash" | "metadata" | "createdAt" | "updatedAt">;

  interface DexFeeAccrualInstance extends Model<DexFeeAccrualAttributes, DexFeeAccrualCreationAttributes>, DexFeeAccrualAttributes {
    swap?: DexSwapInstance;
    user?: UserInstance;
    token?: DexTokenInstance;
    getSwap: Sequelize.BelongsToGetAssociationMixin<DexSwapInstance>;
    setSwap: Sequelize.BelongsToSetAssociationMixin<DexSwapInstance, string>;
    createSwap: Sequelize.BelongsToCreateAssociationMixin<DexSwapInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getToken: Sequelize.BelongsToGetAssociationMixin<DexTokenInstance>;
    setToken: Sequelize.BelongsToSetAssociationMixin<DexTokenInstance, string>;
    createToken: Sequelize.BelongsToCreateAssociationMixin<DexTokenInstance>;
  }

  // ========================================
  // DexPair
  // ========================================

  interface DexPairAttributes {
    id: string;
    chainId: number;
    baseTokenId: string;
    quoteTokenId: string;
    currency: string;
    pair: string;
    symbol: string;
    poolAddress?: string | null;
    poolId?: string | null;
    venuePolicy: string;
    restrictedCountries?: string | string[] | null;
    marketDataSource: string;
    indexerId?: string | null;
    status: string;
    isHot: boolean;
    isTrending: boolean;
    pricePrecision: number;
    amountPrecision: number;
    defaultSlippageBps?: number | null;
    lastPrice?: number | null;
    change24h?: number | null;
    volume24hUsd?: number | null;
    liquidityUsd?: number | null;
    metadata?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type DexPairCreationAttributes = Optional<DexPairAttributes, "id" | "poolAddress" | "poolId" | "venuePolicy" | "restrictedCountries" | "marketDataSource" | "indexerId" | "status" | "isHot" | "isTrending" | "pricePrecision" | "amountPrecision" | "defaultSlippageBps" | "lastPrice" | "change24h" | "volume24hUsd" | "liquidityUsd" | "metadata" | "createdAt" | "updatedAt">;

  interface DexPairInstance extends Model<DexPairAttributes, DexPairCreationAttributes>, DexPairAttributes {
    baseToken?: DexTokenInstance;
    quoteToken?: DexTokenInstance;
    getBaseToken: Sequelize.BelongsToGetAssociationMixin<DexTokenInstance>;
    setBaseToken: Sequelize.BelongsToSetAssociationMixin<DexTokenInstance, string>;
    createBaseToken: Sequelize.BelongsToCreateAssociationMixin<DexTokenInstance>;
    getQuoteToken: Sequelize.BelongsToGetAssociationMixin<DexTokenInstance>;
    setQuoteToken: Sequelize.BelongsToSetAssociationMixin<DexTokenInstance, string>;
    createQuoteToken: Sequelize.BelongsToCreateAssociationMixin<DexTokenInstance>;
  }

  // ========================================
  // DexPool
  // ========================================

  interface DexPoolAttributes {
    id: string;
    chainId: number;
    venueName: string;
    standard: string;
    factory: string;
    router: string;
    routerAbi: string;
    quoter?: string | null;
    positionManager?: string | null;
    poolAddress?: string | null;
    predictedAddress?: string | null;
    initCodeHash?: string | null;
    token0: string;
    token1: string;
    token0Id?: string | null;
    token1Id?: string | null;
    feeTier: number;
    lpFeeShareBps: number;
    tickSpacing?: number | null;
    state: string;
    verifiedAt?: Date | null;
    verifiedAtBlock?: number | null;
    rejectedReason?: string | null;
    createTxHash?: string | null;
    createBlockNumber?: number | null;
    reserve0?: string | null;
    reserve1?: string | null;
    totalSupply?: string | null;
    sqrtPriceX96?: string | null;
    poolLiquidity?: string | null;
    reservesBlock?: number | null;
    reservesUpdatedAt?: Date | null;
    liquidityUsd?: number | null;
    seededByPlatformOperator: boolean;
    seedTxHash?: string | null;
    lastSwapBlock?: number | null;
    indexedToBlock?: number | null;
    indexedToBlockHash?: string | null;
    metadata?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
  }

  type DexPoolCreationAttributes = Optional<DexPoolAttributes, "id" | "quoter" | "positionManager" | "poolAddress" | "predictedAddress" | "initCodeHash" | "token0Id" | "token1Id" | "tickSpacing" | "state" | "verifiedAt" | "verifiedAtBlock" | "rejectedReason" | "createTxHash" | "createBlockNumber" | "reserve0" | "reserve1" | "totalSupply" | "sqrtPriceX96" | "poolLiquidity" | "reservesBlock" | "reservesUpdatedAt" | "liquidityUsd" | "seededByPlatformOperator" | "seedTxHash" | "lastSwapBlock" | "indexedToBlock" | "indexedToBlockHash" | "metadata" | "createdAt" | "updatedAt" | "deletedAt">;

  interface DexPoolInstance extends Model<DexPoolAttributes, DexPoolCreationAttributes>, DexPoolAttributes {
    positions?: DexPoolPositionInstance[];
    events?: DexPoolEventInstance[];
    baseToken?: DexTokenInstance;
    quoteToken?: DexTokenInstance;
    getPositions: Sequelize.HasManyGetAssociationsMixin<DexPoolPositionInstance>;
    setPositions: Sequelize.HasManySetAssociationsMixin<DexPoolPositionInstance, string>;
    addDexPoolPosition: Sequelize.HasManyAddAssociationMixin<DexPoolPositionInstance, string>;
    addPositions: Sequelize.HasManyAddAssociationsMixin<DexPoolPositionInstance, string>;
    removeDexPoolPosition: Sequelize.HasManyRemoveAssociationMixin<DexPoolPositionInstance, string>;
    removePositions: Sequelize.HasManyRemoveAssociationsMixin<DexPoolPositionInstance, string>;
    hasDexPoolPosition: Sequelize.HasManyHasAssociationMixin<DexPoolPositionInstance, string>;
    hasPositions: Sequelize.HasManyHasAssociationsMixin<DexPoolPositionInstance, string>;
    countPositions: Sequelize.HasManyCountAssociationsMixin;
    createDexPoolPosition: Sequelize.HasManyCreateAssociationMixin<DexPoolPositionInstance>;
    getEvents: Sequelize.HasManyGetAssociationsMixin<DexPoolEventInstance>;
    setEvents: Sequelize.HasManySetAssociationsMixin<DexPoolEventInstance, string>;
    addDexPoolEvent: Sequelize.HasManyAddAssociationMixin<DexPoolEventInstance, string>;
    addEvents: Sequelize.HasManyAddAssociationsMixin<DexPoolEventInstance, string>;
    removeDexPoolEvent: Sequelize.HasManyRemoveAssociationMixin<DexPoolEventInstance, string>;
    removeEvents: Sequelize.HasManyRemoveAssociationsMixin<DexPoolEventInstance, string>;
    hasDexPoolEvent: Sequelize.HasManyHasAssociationMixin<DexPoolEventInstance, string>;
    hasEvents: Sequelize.HasManyHasAssociationsMixin<DexPoolEventInstance, string>;
    countEvents: Sequelize.HasManyCountAssociationsMixin;
    createDexPoolEvent: Sequelize.HasManyCreateAssociationMixin<DexPoolEventInstance>;
    getBaseToken: Sequelize.BelongsToGetAssociationMixin<DexTokenInstance>;
    setBaseToken: Sequelize.BelongsToSetAssociationMixin<DexTokenInstance, string>;
    createBaseToken: Sequelize.BelongsToCreateAssociationMixin<DexTokenInstance>;
    getQuoteToken: Sequelize.BelongsToGetAssociationMixin<DexTokenInstance>;
    setQuoteToken: Sequelize.BelongsToSetAssociationMixin<DexTokenInstance, string>;
    createQuoteToken: Sequelize.BelongsToCreateAssociationMixin<DexTokenInstance>;
  }

  // ========================================
  // DexPoolEvent
  // ========================================

  interface DexPoolEventAttributes {
    id: string;
    poolId: string;
    positionId?: string | null;
    kind: string;
    chainId: number;
    txHash: string;
    logIndex: number;
    blockNumber: number;
    blockTimestamp?: Date | null;
    tokenAddress?: string | null;
    tokenSymbol?: string | null;
    tokenDecimals?: number | null;
    amount0Raw?: string | null;
    amount1Raw?: string | null;
    grossAmountRaw?: string | null;
    principalReturnedRaw?: string | null;
    feeAmountRaw?: string | null;
    amountUsd?: number | null;
    usdRateSource?: string | null;
    sweepStatus: string;
    sweepAttempts: number;
    creditedTransactionId?: string | null;
    adminProfitId?: string | null;
    creditedAmount?: number | null;
    roundingResidueRaw?: string | null;
    sweepFailureReason?: string | null;
    metadata?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type DexPoolEventCreationAttributes = Optional<DexPoolEventAttributes, "id" | "positionId" | "blockTimestamp" | "tokenAddress" | "tokenSymbol" | "tokenDecimals" | "amount0Raw" | "amount1Raw" | "grossAmountRaw" | "principalReturnedRaw" | "feeAmountRaw" | "amountUsd" | "usdRateSource" | "sweepStatus" | "sweepAttempts" | "creditedTransactionId" | "adminProfitId" | "creditedAmount" | "roundingResidueRaw" | "sweepFailureReason" | "metadata" | "createdAt" | "updatedAt">;

  interface DexPoolEventInstance extends Model<DexPoolEventAttributes, DexPoolEventCreationAttributes>, DexPoolEventAttributes {
    pool?: DexPoolInstance;
    position?: DexPoolPositionInstance;
    getPool: Sequelize.BelongsToGetAssociationMixin<DexPoolInstance>;
    setPool: Sequelize.BelongsToSetAssociationMixin<DexPoolInstance, string>;
    createPool: Sequelize.BelongsToCreateAssociationMixin<DexPoolInstance>;
    getPosition: Sequelize.BelongsToGetAssociationMixin<DexPoolPositionInstance>;
    setPosition: Sequelize.BelongsToSetAssociationMixin<DexPoolPositionInstance, string>;
    createPosition: Sequelize.BelongsToCreateAssociationMixin<DexPoolPositionInstance>;
  }

  // ========================================
  // DexPoolPosition
  // ========================================

  interface DexPoolPositionAttributes {
    id: string;
    poolId: string;
    chainId: number;
    ownerAddress: string;
    riskAckId: string;
    openedAt: Date;
    openTxHash: string;
    seeded0Raw: string;
    seeded1Raw: string;
    seeded0Usd?: number | null;
    seeded1Usd?: number | null;
    usdRateSource?: string | null;
    lpBalanceRaw?: string | null;
    nftTokenId?: string | null;
    tickLower?: number | null;
    tickUpper?: number | null;
    state: string;
    closedAt?: Date | null;
    realized0Raw?: string | null;
    realized1Raw?: string | null;
    realizedUsd?: number | null;
    metadata?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type DexPoolPositionCreationAttributes = Optional<DexPoolPositionAttributes, "id" | "openedAt" | "seeded0Usd" | "seeded1Usd" | "usdRateSource" | "lpBalanceRaw" | "nftTokenId" | "tickLower" | "tickUpper" | "state" | "closedAt" | "realized0Raw" | "realized1Raw" | "realizedUsd" | "metadata" | "createdAt" | "updatedAt">;

  interface DexPoolPositionInstance extends Model<DexPoolPositionAttributes, DexPoolPositionCreationAttributes>, DexPoolPositionAttributes {
    events?: DexPoolEventInstance[];
    pool?: DexPoolInstance;
    riskAck?: DexPoolRiskAckInstance;
    getEvents: Sequelize.HasManyGetAssociationsMixin<DexPoolEventInstance>;
    setEvents: Sequelize.HasManySetAssociationsMixin<DexPoolEventInstance, string>;
    addDexPoolEvent: Sequelize.HasManyAddAssociationMixin<DexPoolEventInstance, string>;
    addEvents: Sequelize.HasManyAddAssociationsMixin<DexPoolEventInstance, string>;
    removeDexPoolEvent: Sequelize.HasManyRemoveAssociationMixin<DexPoolEventInstance, string>;
    removeEvents: Sequelize.HasManyRemoveAssociationsMixin<DexPoolEventInstance, string>;
    hasDexPoolEvent: Sequelize.HasManyHasAssociationMixin<DexPoolEventInstance, string>;
    hasEvents: Sequelize.HasManyHasAssociationsMixin<DexPoolEventInstance, string>;
    countEvents: Sequelize.HasManyCountAssociationsMixin;
    createDexPoolEvent: Sequelize.HasManyCreateAssociationMixin<DexPoolEventInstance>;
    getPool: Sequelize.BelongsToGetAssociationMixin<DexPoolInstance>;
    setPool: Sequelize.BelongsToSetAssociationMixin<DexPoolInstance, string>;
    createPool: Sequelize.BelongsToCreateAssociationMixin<DexPoolInstance>;
    getRiskAck: Sequelize.BelongsToGetAssociationMixin<DexPoolRiskAckInstance>;
    setRiskAck: Sequelize.BelongsToSetAssociationMixin<DexPoolRiskAckInstance, string>;
    createRiskAck: Sequelize.BelongsToCreateAssociationMixin<DexPoolRiskAckInstance>;
  }

  // ========================================
  // DexPoolRiskAck
  // ========================================

  interface DexPoolRiskAckAttributes {
    id: string;
    poolId: string;
    chainId: number;
    poolAddress: string;
    adminUserId?: string | null;
    adminEmail: string;
    adminName: string;
    clauseVersion: string;
    clauseHash: string;
    clausesAccepted: string;
    typedConfirmation: string;
    feeTierBps: number;
    initialPriceQuotePerBase: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    acknowledgedAt: Date;
    waivedByUserId?: string | null;
    revokedAt?: Date | null;
    revokedReason?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type DexPoolRiskAckCreationAttributes = Optional<DexPoolRiskAckAttributes, "id" | "adminUserId" | "ipAddress" | "userAgent" | "acknowledgedAt" | "waivedByUserId" | "revokedAt" | "revokedReason" | "createdAt" | "updatedAt">;

  interface DexPoolRiskAckInstance extends Model<DexPoolRiskAckAttributes, DexPoolRiskAckCreationAttributes>, DexPoolRiskAckAttributes {
    pool?: DexPoolInstance;
    getPool: Sequelize.BelongsToGetAssociationMixin<DexPoolInstance>;
    setPool: Sequelize.BelongsToSetAssociationMixin<DexPoolInstance, string>;
    createPool: Sequelize.BelongsToCreateAssociationMixin<DexPoolInstance>;
  }

  // ========================================
  // DexProvider
  // ========================================

  interface DexProviderAttributes {
    id: string;
    name: string;
    title: string;
    description?: string | null;
    status: boolean;
    priority: number;
    version?: string | null;
    supportedChainIds: string;
    apiKeyEnvVar?: string | null;
    baseUrl?: string | null;
    feeMode?: string | null;
    lastVerifiedAt?: Date | null;
    lastError?: string | null;
    metadata?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type DexProviderCreationAttributes = Optional<DexProviderAttributes, "id" | "description" | "status" | "priority" | "version" | "supportedChainIds" | "apiKeyEnvVar" | "baseUrl" | "feeMode" | "lastVerifiedAt" | "lastError" | "metadata" | "createdAt" | "updatedAt">;

  interface DexProviderInstance extends Model<DexProviderAttributes, DexProviderCreationAttributes>, DexProviderAttributes {
  }

  // ========================================
  // DexQuote
  // ========================================

  interface DexQuoteAttributes {
    id: string;
    userId: string;
    chainId: number;
    vm: string;
    pairId?: string | null;
    sellTokenId: string;
    buyTokenId: string;
    sellTokenAddress: string;
    buyTokenAddress: string;
    sellAmountRaw: string;
    buyAmountRaw: string;
    minBuyAmountRaw: string;
    sellAmountDisplay: number;
    buyAmountDisplay: number;
    sellUsd?: number | null;
    buyUsd?: number | null;
    takerAddress: string;
    takerVerified: boolean;
    aggregator: string;
    venueKind: string;
    venueName?: string | null;
    poolId?: string | null;
    router?: string | null;
    allowanceTarget?: string | null;
    value: string;
    calldata?: string | null;
    calldataHash?: string | null;
    quoteKey: string;
    feeBps: number;
    feeRecipient?: string | null;
    feeSide?: string | null;
    estimatedFeeAmountRaw?: string | null;
    slippageBps: number;
    priceImpactBps?: number | null;
    estimatedGas?: string | null;
    latencyMs?: number | null;
    outcome: string;
    routeSummary?: string | null;
    complianceSnapshot: string;
    status: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type DexQuoteCreationAttributes = Optional<DexQuoteAttributes, "id" | "vm" | "pairId" | "sellUsd" | "buyUsd" | "takerVerified" | "venueKind" | "venueName" | "poolId" | "router" | "allowanceTarget" | "value" | "calldata" | "calldataHash" | "feeRecipient" | "feeSide" | "estimatedFeeAmountRaw" | "priceImpactBps" | "estimatedGas" | "latencyMs" | "outcome" | "routeSummary" | "status" | "ipAddress" | "userAgent" | "createdAt" | "updatedAt">;

  interface DexQuoteInstance extends Model<DexQuoteAttributes, DexQuoteCreationAttributes>, DexQuoteAttributes {
    user?: UserInstance;
    pair?: DexPairInstance;
    sellToken?: DexTokenInstance;
    buyToken?: DexTokenInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getPair: Sequelize.BelongsToGetAssociationMixin<DexPairInstance>;
    setPair: Sequelize.BelongsToSetAssociationMixin<DexPairInstance, string>;
    createPair: Sequelize.BelongsToCreateAssociationMixin<DexPairInstance>;
    getSellToken: Sequelize.BelongsToGetAssociationMixin<DexTokenInstance>;
    setSellToken: Sequelize.BelongsToSetAssociationMixin<DexTokenInstance, string>;
    createSellToken: Sequelize.BelongsToCreateAssociationMixin<DexTokenInstance>;
    getBuyToken: Sequelize.BelongsToGetAssociationMixin<DexTokenInstance>;
    setBuyToken: Sequelize.BelongsToSetAssociationMixin<DexTokenInstance, string>;
    createBuyToken: Sequelize.BelongsToCreateAssociationMixin<DexTokenInstance>;
  }

  // ========================================
  // DexSwap
  // ========================================

  interface DexSwapAttributes {
    id: string;
    userId: string;
    quoteId?: string | null;
    pairId?: string | null;
    kind: string;
    chainId: number;
    vm: string;
    txHash: string;
    nonce?: number | null;
    fromAddress: string;
    toAddress?: string | null;
    sellTokenId?: string | null;
    buyTokenId?: string | null;
    sellAmountRaw?: string | null;
    buyAmountRaw?: string | null;
    realizedBuyAmountRaw?: string | null;
    sellAmountDisplay?: number | null;
    buyAmountDisplay?: number | null;
    realizedBuyAmountDisplay?: number | null;
    sellUsd?: number | null;
    buyUsd?: number | null;
    executionPrice?: number | null;
    slippageRealizedBps?: number | null;
    status: string;
    statusReason?: string | null;
    statusHistory?: string | null;
    statusChangedAt?: Date | null;
    replacedByTxHash?: string | null;
    blockNumber?: number | null;
    blockHash?: string | null;
    blockTimestamp?: Date | null;
    confirmations: number;
    gasUsed?: string | null;
    effectiveGasPrice?: string | null;
    gasCostNativeRaw?: string | null;
    gasCostUsd?: number | null;
    aggregator?: string | null;
    venueKind: string;
    venueName?: string | null;
    poolId?: string | null;
    feeBps?: number | null;
    feeRecipient?: string | null;
    feeSide?: string | null;
    lastCheckedAt?: Date | null;
    checkAttempts: number;
    reorgCheckedAt?: Date | null;
    confirmedAt?: Date | null;
    metadata?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type DexSwapCreationAttributes = Optional<DexSwapAttributes, "id" | "quoteId" | "pairId" | "kind" | "vm" | "nonce" | "toAddress" | "sellTokenId" | "buyTokenId" | "sellAmountRaw" | "buyAmountRaw" | "realizedBuyAmountRaw" | "sellAmountDisplay" | "buyAmountDisplay" | "realizedBuyAmountDisplay" | "sellUsd" | "buyUsd" | "executionPrice" | "slippageRealizedBps" | "status" | "statusReason" | "statusHistory" | "statusChangedAt" | "replacedByTxHash" | "blockNumber" | "blockHash" | "blockTimestamp" | "confirmations" | "gasUsed" | "effectiveGasPrice" | "gasCostNativeRaw" | "gasCostUsd" | "aggregator" | "venueKind" | "venueName" | "poolId" | "feeBps" | "feeRecipient" | "feeSide" | "lastCheckedAt" | "checkAttempts" | "reorgCheckedAt" | "confirmedAt" | "metadata" | "createdAt" | "updatedAt">;

  interface DexSwapInstance extends Model<DexSwapAttributes, DexSwapCreationAttributes>, DexSwapAttributes {
    feeAccruals?: DexFeeAccrualInstance[];
    user?: UserInstance;
    quote?: DexQuoteInstance;
    pair?: DexPairInstance;
    sellToken?: DexTokenInstance;
    buyToken?: DexTokenInstance;
    getFeeAccruals: Sequelize.HasManyGetAssociationsMixin<DexFeeAccrualInstance>;
    setFeeAccruals: Sequelize.HasManySetAssociationsMixin<DexFeeAccrualInstance, string>;
    addDexFeeAccrual: Sequelize.HasManyAddAssociationMixin<DexFeeAccrualInstance, string>;
    addFeeAccruals: Sequelize.HasManyAddAssociationsMixin<DexFeeAccrualInstance, string>;
    removeDexFeeAccrual: Sequelize.HasManyRemoveAssociationMixin<DexFeeAccrualInstance, string>;
    removeFeeAccruals: Sequelize.HasManyRemoveAssociationsMixin<DexFeeAccrualInstance, string>;
    hasDexFeeAccrual: Sequelize.HasManyHasAssociationMixin<DexFeeAccrualInstance, string>;
    hasFeeAccruals: Sequelize.HasManyHasAssociationsMixin<DexFeeAccrualInstance, string>;
    countFeeAccruals: Sequelize.HasManyCountAssociationsMixin;
    createDexFeeAccrual: Sequelize.HasManyCreateAssociationMixin<DexFeeAccrualInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getQuote: Sequelize.BelongsToGetAssociationMixin<DexQuoteInstance>;
    setQuote: Sequelize.BelongsToSetAssociationMixin<DexQuoteInstance, string>;
    createQuote: Sequelize.BelongsToCreateAssociationMixin<DexQuoteInstance>;
    getPair: Sequelize.BelongsToGetAssociationMixin<DexPairInstance>;
    setPair: Sequelize.BelongsToSetAssociationMixin<DexPairInstance, string>;
    createPair: Sequelize.BelongsToCreateAssociationMixin<DexPairInstance>;
    getSellToken: Sequelize.BelongsToGetAssociationMixin<DexTokenInstance>;
    setSellToken: Sequelize.BelongsToSetAssociationMixin<DexTokenInstance, string>;
    createSellToken: Sequelize.BelongsToCreateAssociationMixin<DexTokenInstance>;
    getBuyToken: Sequelize.BelongsToGetAssociationMixin<DexTokenInstance>;
    setBuyToken: Sequelize.BelongsToSetAssociationMixin<DexTokenInstance, string>;
    createBuyToken: Sequelize.BelongsToCreateAssociationMixin<DexTokenInstance>;
  }

  // ========================================
  // DexToken
  // ========================================

  interface DexTokenAttributes {
    id: string;
    chainId: number;
    vm: string;
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    isNative: boolean;
    logoUrl?: string | null;
    coingeckoId?: string | null;
    status: boolean;
    listing: string;
    origin: string;
    issuerUserId?: string | null;
    mintable?: boolean | null;
    directPoolOnly: boolean;
    riskLevel?: string | null;
    riskScore?: number | null;
    riskSource?: string | null;
    riskFlags?: string | null;
    riskCheckedAt?: Date | null;
    verifiedSource: string;
    ecosystemTokenId?: string | null;
    sortOrder: number;
    notes?: string | null;
    metadata?: string | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type DexTokenCreationAttributes = Optional<DexTokenAttributes, "id" | "vm" | "isNative" | "logoUrl" | "coingeckoId" | "status" | "listing" | "origin" | "issuerUserId" | "mintable" | "directPoolOnly" | "riskLevel" | "riskScore" | "riskSource" | "riskFlags" | "riskCheckedAt" | "verifiedSource" | "ecosystemTokenId" | "sortOrder" | "notes" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

  interface DexTokenInstance extends Model<DexTokenAttributes, DexTokenCreationAttributes>, DexTokenAttributes {
    ecosystemToken?: EcosystemTokenInstance;
    getEcosystemToken: Sequelize.BelongsToGetAssociationMixin<EcosystemTokenInstance>;
    setEcosystemToken: Sequelize.BelongsToSetAssociationMixin<EcosystemTokenInstance, string>;
    createEcosystemToken: Sequelize.BelongsToCreateAssociationMixin<EcosystemTokenInstance>;
  }

  // ========================================
  // DexUserWallet
  // ========================================

  interface DexUserWalletAttributes {
    id: string;
    userId: string;
    vault: string;
    vaultVersion: number;
    label?: string | null;
    backedUpAt?: Date | null;
    lastUnlockedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type DexUserWalletCreationAttributes = Optional<DexUserWalletAttributes, "id" | "vaultVersion" | "label" | "backedUpAt" | "lastUnlockedAt" | "createdAt" | "updatedAt">;

  interface DexUserWalletInstance extends Model<DexUserWalletAttributes, DexUserWalletCreationAttributes>, DexUserWalletAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // DexWalletLink
  // ========================================

  interface DexWalletLinkAttributes {
    id: string;
    userId: string;
    vm: string;
    address: string;
    label?: string | null;
    verifiedAt?: Date | null;
    verificationMethod?: string | null;
    chainId?: number | null;
    lastUsedAt?: Date | null;
    nonce?: string | null;
    nonceExpiresAt?: Date | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type DexWalletLinkCreationAttributes = Optional<DexWalletLinkAttributes, "id" | "vm" | "label" | "verifiedAt" | "verificationMethod" | "chainId" | "lastUsedAt" | "nonce" | "nonceExpiresAt" | "createdAt" | "deletedAt" | "updatedAt">;

  interface DexWalletLinkInstance extends Model<DexWalletLinkAttributes, DexWalletLinkCreationAttributes>, DexWalletLinkAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // EcommerceCategory
  // ========================================

  interface EcommerceCategoryAttributes {
    id: string;
    name: string;
    slug: string;
    description: string;
    image?: string | null;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcommerceCategoryCreationAttributes = Optional<EcommerceCategoryAttributes, "id" | "image" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

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
    percentage: number | null;
    amount: number | null;
    maxUses: number | null;
    validFrom: Date | null;
    validUntil: Date;
    productId: string;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcommerceDiscountCreationAttributes = Optional<EcommerceDiscountAttributes, "id" | "type" | "percentage" | "amount" | "maxUses" | "validFrom" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

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

  type EcommerceOrderCreationAttributes = Optional<EcommerceOrderAttributes, "id" | "status" | "subtotal" | "discount" | "shippingCost" | "tax" | "total" | "currency" | "walletType" | "createdAt" | "deletedAt" | "updatedAt" | "shippingId">;

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
    image?: string | null;
    gallery?: string[] | null;
    currency: string;
    walletType: "FIAT" | "SPOT" | "ECO";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcommerceProductCreationAttributes = Optional<EcommerceProductAttributes, "id" | "shortDescription" | "status" | "image" | "gallery" | "currency" | "walletType" | "createdAt" | "deletedAt" | "updatedAt">;

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

  type EcommerceReviewCreationAttributes = Optional<EcommerceReviewAttributes, "id" | "comment" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

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
    cost?: number | null;
    tax?: number | null;
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

  type EcommerceShippingAddressCreationAttributes = Optional<EcommerceShippingAddressAttributes, "id" | "email" | "createdAt" | "updatedAt">;

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

  type EcommerceUserDiscountCreationAttributes = Optional<EcommerceUserDiscountAttributes, "id" | "status">;

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
    link?: string | null;
    status?: boolean;
    version?: string | null;
    image?: string | null;
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

  type EcosystemCustodialWalletCreationAttributes = Optional<EcosystemCustodialWalletAttributes, "id" | "network" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

  interface EcosystemCustodialWalletInstance extends Model<EcosystemCustodialWalletAttributes, EcosystemCustodialWalletCreationAttributes>, EcosystemCustodialWalletAttributes {
    masterWallet?: EcosystemMasterWalletInstance;
    getMasterWallet: Sequelize.BelongsToGetAssociationMixin<EcosystemMasterWalletInstance>;
    setMasterWallet: Sequelize.BelongsToSetAssociationMixin<EcosystemMasterWalletInstance, string>;
    createMasterWallet: Sequelize.BelongsToCreateAssociationMixin<EcosystemMasterWalletInstance>;
  }

  // ========================================
  // EcosystemCustomChain
  // ========================================

  interface EcosystemCustomChainAttributes {
    id: string;
    chain: string;
    name: string;
    chainId: number;
    currency: string;
    decimals: number;
    network: string;
    rpcUrl: string;
    rpcWssUrl?: string | null;
    explorerUrl?: string | null;
    explorerApiUrl?: string | null;
    explorerApiKey?: string | null;
    confirmations: number;
    precision: number;
    icon?: string | null;
    status: boolean;
  }

  type EcosystemCustomChainCreationAttributes = Optional<EcosystemCustomChainAttributes, "id" | "decimals" | "network" | "rpcWssUrl" | "explorerUrl" | "explorerApiUrl" | "explorerApiKey" | "confirmations" | "precision" | "icon" | "status">;

  interface EcosystemCustomChainInstance extends Model<EcosystemCustomChainAttributes, EcosystemCustomChainCreationAttributes>, EcosystemCustomChainAttributes {
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
    metadata?: string | null;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcosystemMarketCreationAttributes = Optional<EcosystemMarketAttributes, "id" | "isTrending" | "isHot" | "metadata" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

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

  type EcosystemMasterWalletCreationAttributes = Optional<EcosystemMasterWalletAttributes, "id" | "balance" | "data" | "status" | "lastIndex">;

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

  type EcosystemPrivateLedgerCreationAttributes = Optional<EcosystemPrivateLedgerAttributes, "id" | "network" | "offchainDifference" | "createdAt" | "deletedAt" | "updatedAt">;

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
    icon?: string | null;
    contractType: "PERMIT" | "NO_PERMIT" | "NATIVE";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcosystemTokenCreationAttributes = Optional<EcosystemTokenAttributes, "id" | "status" | "precision" | "limits" | "fee" | "icon" | "contractType" | "createdAt" | "deletedAt" | "updatedAt">;

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
    status: "UNSPENT" | "LOCKED" | "SPENT";
    lockedTxId?: string | null;
    origin?: "DEPOSIT" | "CHANGE" | "CONSOLIDATION" | "SYNC";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type EcosystemUtxoCreationAttributes = Optional<EcosystemUtxoAttributes, "id" | "script" | "status" | "lockedTxId" | "origin" | "createdAt" | "deletedAt" | "updatedAt">;

  interface EcosystemUtxoInstance extends Model<EcosystemUtxoAttributes, EcosystemUtxoCreationAttributes>, EcosystemUtxoAttributes {
    wallet?: WalletInstance;
    getWallet: Sequelize.BelongsToGetAssociationMixin<WalletInstance>;
    setWallet: Sequelize.BelongsToSetAssociationMixin<WalletInstance, string>;
    createWallet: Sequelize.BelongsToCreateAssociationMixin<WalletInstance>;
  }

  // ========================================
  // EngineLease
  // ========================================

  interface EngineLeaseAttributes {
    id: string;
    instanceId: string;
    hostname?: string | null;
    pid?: number | null;
    expiresAt: Date;
    epoch: number;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type EngineLeaseCreationAttributes = Optional<EngineLeaseAttributes, "id" | "hostname" | "pid" | "epoch" | "createdAt" | "updatedAt">;

  interface EngineLeaseInstance extends Model<EngineLeaseAttributes, EngineLeaseCreationAttributes>, EngineLeaseAttributes {
  }

  // ========================================
  // Exchange
  // ========================================

  interface ExchangeAttributes {
    id: string;
    name: string;
    title: string;
    description?: string | null;
    status?: boolean | null;
    username?: string | null;
    licenseStatus?: boolean | null;
    version?: string | null;
    productId?: string | null;
    type?: string | null;
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
    price?: number | null;
    fee?: number | null;
    status: boolean;
  }

  type ExchangeCurrencyCreationAttributes = Optional<ExchangeCurrencyAttributes, "id" | "price" | "fee" | "status">;

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
    metadata?: string | null;
    status: boolean;
  }

  type ExchangeMarketCreationAttributes = Optional<ExchangeMarketAttributes, "id" | "isTrending" | "isHot" | "metadata" | "status">;

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
    metadata?: any | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type ExchangeOrderCreationAttributes = Optional<ExchangeOrderAttributes, "id" | "referenceId" | "average" | "trades" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

  interface ExchangeOrderInstance extends Model<ExchangeOrderAttributes, ExchangeOrderCreationAttributes>, ExchangeOrderAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // ExchangePriceAlert
  // ========================================

  interface ExchangePriceAlertAttributes {
    id: string;
    userId: string;
    symbol: string;
    type: "SPOT" | "ECO" | "FUTURES";
    condition: "CROSSES_ABOVE" | "CROSSES_BELOW" | "CROSSES";
    targetPrice: number;
    status: "ACTIVE" | "TRIGGERED" | "EXPIRED" | "DISABLED";
    isRepeating: boolean;
    note?: string | null;
    armedPrice?: number | null;
    lastPrice?: number | null;
    triggeredPrice?: number | null;
    triggeredAt?: Date | null;
    expiresAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type ExchangePriceAlertCreationAttributes = Optional<ExchangePriceAlertAttributes, "id" | "type" | "condition" | "status" | "isRepeating" | "note" | "armedPrice" | "lastPrice" | "triggeredPrice" | "triggeredAt" | "expiresAt" | "createdAt" | "updatedAt">;

  interface ExchangePriceAlertInstance extends Model<ExchangePriceAlertAttributes, ExchangePriceAlertCreationAttributes>, ExchangePriceAlertAttributes {
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
    type: "SPOT" | "ECO" | "FUTURES";
  }

  type ExchangeWatchlistCreationAttributes = Optional<ExchangeWatchlistAttributes, "id" | "type">;

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
    link?: string | null;
    status?: boolean;
    version?: string | null;
    image?: string | null;
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
    views?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type FaqCreationAttributes = Optional<FaqAttributes, "id" | "image" | "tags" | "status" | "order" | "relatedFaqIds" | "views" | "createdAt" | "updatedAt" | "deletedAt">;

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

  type FaqQuestionCreationAttributes = Optional<FaqQuestionAttributes, "id" | "answer" | "status" | "createdAt" | "updatedAt" | "deletedAt">;

  interface FaqQuestionInstance extends Model<FaqQuestionAttributes, FaqQuestionCreationAttributes>, FaqQuestionAttributes {
  }

  // ========================================
  // FaqSearch
  // ========================================

  interface FaqSearchAttributes {
    id: string;
    userId?: string | null;
    query: string;
    resultCount: number;
    category?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FaqSearchCreationAttributes = Optional<FaqSearchAttributes, "id" | "userId" | "resultCount" | "category" | "createdAt" | "updatedAt">;

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
    userId?: string | null;
    accountId?: string | null;
    password?: string | null;
    broker?: string | null;
    mt?: number | null;
    balance: number | null;
    currency?: string | null;
    walletType?: string | null;
    leverage?: number | null;
    type: "DEMO" | "LIVE";
    status?: boolean;
    dailyWithdrawLimit?: number | null;
    monthlyWithdrawLimit?: number | null;
    dailyWithdrawn?: number | null;
    monthlyWithdrawn?: number | null;
    lastWithdrawReset?: Date | null;
    lastMonthlyWithdrawReset?: Date | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type ForexAccountCreationAttributes = Optional<ForexAccountAttributes, "id" | "userId" | "accountId" | "password" | "broker" | "mt" | "balance" | "currency" | "walletType" | "leverage" | "type" | "status" | "dailyWithdrawLimit" | "monthlyWithdrawLimit" | "dailyWithdrawn" | "monthlyWithdrawn" | "lastWithdrawReset" | "lastMonthlyWithdrawReset" | "createdAt" | "deletedAt" | "updatedAt">;

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
    planId?: string | null;
    durationId?: string | null;
    amount?: number | null;
    profit?: number | null;
    roiPercentage?: number | null;
    result?: "WIN" | "LOSS" | "DRAW" | null;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
    endDate?: Date | null;
    metadata?: string | null;
    termsAcceptedAt?: Date | null;
    termsVersion?: string | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type ForexInvestmentCreationAttributes = Optional<ForexInvestmentAttributes, "id" | "planId" | "durationId" | "amount" | "profit" | "roiPercentage" | "result" | "status" | "endDate" | "metadata" | "termsAcceptedAt" | "termsVersion" | "createdAt" | "deletedAt" | "updatedAt">;

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
    minAmount?: number | null;
    maxAmount?: number | null;
    profitPercentage: number;
    status?: boolean | null;
    defaultProfit: number;
    defaultResult: "WIN" | "LOSS" | "DRAW";
    trending?: boolean | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type ForexPlanCreationAttributes = Optional<ForexPlanAttributes, "id" | "title" | "description" | "image" | "minAmount" | "maxAmount" | "profitPercentage" | "status" | "defaultProfit" | "trending" | "createdAt" | "deletedAt" | "updatedAt">;

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

  type ForexSignalCreationAttributes = Optional<ForexSignalAttributes, "id" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

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
  // FuturesFeeReversal
  // ========================================

  interface FuturesFeeReversalAttributes {
    id: string;
    referenceId: string;
    symbol: string;
    currency: string;
    refundedFee: number;
    originalFee: number;
    creditKey: string;
    status: "PENDING" | "COMPLETED" | "ABANDONED";
    attempts: number;
    note?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FuturesFeeReversalCreationAttributes = Optional<FuturesFeeReversalAttributes, "id" | "status" | "attempts" | "note" | "createdAt" | "updatedAt">;

  interface FuturesFeeReversalInstance extends Model<FuturesFeeReversalAttributes, FuturesFeeReversalCreationAttributes>, FuturesFeeReversalAttributes {
  }

  // ========================================
  // FuturesFundingPayment
  // ========================================

  interface FuturesFundingPaymentAttributes {
    id: string;
    userId: string;
    symbol: string;
    positionId: string;
    side: "BUY" | "SELL";
    fundingTime: Date;
    rate: number;
    markPrice: number;
    notional: number;
    amount: number;
    currency: string;
    status: "SETTLED" | "UNPAID" | "SKIPPED";
    note?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FuturesFundingPaymentCreationAttributes = Optional<FuturesFundingPaymentAttributes, "id" | "status" | "note" | "createdAt" | "updatedAt">;

  interface FuturesFundingPaymentInstance extends Model<FuturesFundingPaymentAttributes, FuturesFundingPaymentCreationAttributes>, FuturesFundingPaymentAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // FuturesInsuranceLedger
  // ========================================

  interface FuturesInsuranceLedgerAttributes {
    id: string;
    currency: string;
    amount: number;
    type: "CLEARING" | "FEE_SHARE" | "LIQUIDATION_SURPLUS" | "DEFICIT" | "ADL" | "ADJUSTMENT";
    shortfall?: number | null;
    symbol?: string | null;
    positionId?: string | null;
    userId?: string | null;
    markPrice?: number | null;
    description?: string | null;
    sliceKey: string;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FuturesInsuranceLedgerCreationAttributes = Optional<FuturesInsuranceLedgerAttributes, "id" | "shortfall" | "symbol" | "positionId" | "userId" | "markPrice" | "description" | "sliceKey" | "createdAt" | "updatedAt">;

  interface FuturesInsuranceLedgerInstance extends Model<FuturesInsuranceLedgerAttributes, FuturesInsuranceLedgerCreationAttributes>, FuturesInsuranceLedgerAttributes {
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
    metadata?: string | null;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type FuturesMarketCreationAttributes = Optional<FuturesMarketAttributes, "id" | "isTrending" | "isHot" | "metadata" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

  interface FuturesMarketInstance extends Model<FuturesMarketAttributes, FuturesMarketCreationAttributes>, FuturesMarketAttributes {
  }

  // ========================================
  // FxAccount
  // ========================================

  interface FxAccountAttributes {
    id: string;
    userId: string;
    type: "DEMO" | "LIVE";
    accountCurrency: string;
    balance: number;
    equity: number;
    usedMargin: number;
    leverage: number;
    marginMode: string;
    groupId?: string | null;
    swapFree?: boolean | null;
    tradingEnabled?: boolean | null;
    status?: boolean;
    dailyWithdrawLimit?: number | null;
    monthlyWithdrawLimit?: number | null;
    dailyWithdrawn?: number | null;
    monthlyWithdrawn?: number | null;
    lastWithdrawReset?: Date | null;
    metadata?: string | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type FxAccountCreationAttributes = Optional<FxAccountAttributes, "id" | "type" | "accountCurrency" | "balance" | "equity" | "usedMargin" | "leverage" | "marginMode" | "groupId" | "swapFree" | "tradingEnabled" | "status" | "dailyWithdrawLimit" | "monthlyWithdrawLimit" | "dailyWithdrawn" | "monthlyWithdrawn" | "lastWithdrawReset" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

  interface FxAccountInstance extends Model<FxAccountAttributes, FxAccountCreationAttributes>, FxAccountAttributes {
    orders?: FxOrderInstance[];
    positions?: FxPositionInstance[];
    deals?: FxDealInstance[];
    user?: UserInstance;
    group?: FxAccountGroupInstance;
    getOrders: Sequelize.HasManyGetAssociationsMixin<FxOrderInstance>;
    setOrders: Sequelize.HasManySetAssociationsMixin<FxOrderInstance, string>;
    addFxOrder: Sequelize.HasManyAddAssociationMixin<FxOrderInstance, string>;
    addOrders: Sequelize.HasManyAddAssociationsMixin<FxOrderInstance, string>;
    removeFxOrder: Sequelize.HasManyRemoveAssociationMixin<FxOrderInstance, string>;
    removeOrders: Sequelize.HasManyRemoveAssociationsMixin<FxOrderInstance, string>;
    hasFxOrder: Sequelize.HasManyHasAssociationMixin<FxOrderInstance, string>;
    hasOrders: Sequelize.HasManyHasAssociationsMixin<FxOrderInstance, string>;
    countOrders: Sequelize.HasManyCountAssociationsMixin;
    createFxOrder: Sequelize.HasManyCreateAssociationMixin<FxOrderInstance>;
    getPositions: Sequelize.HasManyGetAssociationsMixin<FxPositionInstance>;
    setPositions: Sequelize.HasManySetAssociationsMixin<FxPositionInstance, string>;
    addFxPosition: Sequelize.HasManyAddAssociationMixin<FxPositionInstance, string>;
    addPositions: Sequelize.HasManyAddAssociationsMixin<FxPositionInstance, string>;
    removeFxPosition: Sequelize.HasManyRemoveAssociationMixin<FxPositionInstance, string>;
    removePositions: Sequelize.HasManyRemoveAssociationsMixin<FxPositionInstance, string>;
    hasFxPosition: Sequelize.HasManyHasAssociationMixin<FxPositionInstance, string>;
    hasPositions: Sequelize.HasManyHasAssociationsMixin<FxPositionInstance, string>;
    countPositions: Sequelize.HasManyCountAssociationsMixin;
    createFxPosition: Sequelize.HasManyCreateAssociationMixin<FxPositionInstance>;
    getDeals: Sequelize.HasManyGetAssociationsMixin<FxDealInstance>;
    setDeals: Sequelize.HasManySetAssociationsMixin<FxDealInstance, string>;
    addFxDeal: Sequelize.HasManyAddAssociationMixin<FxDealInstance, string>;
    addDeals: Sequelize.HasManyAddAssociationsMixin<FxDealInstance, string>;
    removeFxDeal: Sequelize.HasManyRemoveAssociationMixin<FxDealInstance, string>;
    removeDeals: Sequelize.HasManyRemoveAssociationsMixin<FxDealInstance, string>;
    hasFxDeal: Sequelize.HasManyHasAssociationMixin<FxDealInstance, string>;
    hasDeals: Sequelize.HasManyHasAssociationsMixin<FxDealInstance, string>;
    countDeals: Sequelize.HasManyCountAssociationsMixin;
    createFxDeal: Sequelize.HasManyCreateAssociationMixin<FxDealInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getGroup: Sequelize.BelongsToGetAssociationMixin<FxAccountGroupInstance>;
    setGroup: Sequelize.BelongsToSetAssociationMixin<FxAccountGroupInstance, string>;
    createGroup: Sequelize.BelongsToCreateAssociationMixin<FxAccountGroupInstance>;
  }

  // ========================================
  // FxAccountGroup
  // ========================================

  interface FxAccountGroupAttributes {
    id: string;
    name: string;
    marginCallLevel: number;
    stopOutLevel: number;
    negativeBalanceProtection?: boolean | null;
    maxLeverage: number;
    defaultForType?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FxAccountGroupCreationAttributes = Optional<FxAccountGroupAttributes, "id" | "marginCallLevel" | "stopOutLevel" | "negativeBalanceProtection" | "maxLeverage" | "defaultForType" | "createdAt" | "updatedAt">;

  interface FxAccountGroupInstance extends Model<FxAccountGroupAttributes, FxAccountGroupCreationAttributes>, FxAccountGroupAttributes {
    accounts?: FxAccountInstance[];
    getAccounts: Sequelize.HasManyGetAssociationsMixin<FxAccountInstance>;
    setAccounts: Sequelize.HasManySetAssociationsMixin<FxAccountInstance, string>;
    addFxAccount: Sequelize.HasManyAddAssociationMixin<FxAccountInstance, string>;
    addAccounts: Sequelize.HasManyAddAssociationsMixin<FxAccountInstance, string>;
    removeFxAccount: Sequelize.HasManyRemoveAssociationMixin<FxAccountInstance, string>;
    removeAccounts: Sequelize.HasManyRemoveAssociationsMixin<FxAccountInstance, string>;
    hasFxAccount: Sequelize.HasManyHasAssociationMixin<FxAccountInstance, string>;
    hasAccounts: Sequelize.HasManyHasAssociationsMixin<FxAccountInstance, string>;
    countAccounts: Sequelize.HasManyCountAssociationsMixin;
    createFxAccount: Sequelize.HasManyCreateAssociationMixin<FxAccountInstance>;
  }

  // ========================================
  // FxDeal
  // ========================================

  interface FxDealAttributes {
    id: string;
    accountId: string;
    positionId?: string | null;
    orderId?: string | null;
    kind: string;
    amount: number;
    price?: number | null;
    rawFeedBid?: number | null;
    rawFeedAsk?: number | null;
    rateUsed?: number | null;
    pnl: number;
    balanceAfter: number;
    idempotencyKey: string;
    executionProviderId?: string | null;
    externalDealId?: string | null;
    externalPrice?: string | null;
    metadata?: string | null;
    createdAt?: Date;
  }

  type FxDealCreationAttributes = Optional<FxDealAttributes, "id" | "positionId" | "orderId" | "amount" | "price" | "rawFeedBid" | "rawFeedAsk" | "rateUsed" | "pnl" | "executionProviderId" | "externalDealId" | "externalPrice" | "metadata" | "createdAt">;

  interface FxDealInstance extends Model<FxDealAttributes, FxDealCreationAttributes>, FxDealAttributes {
    account?: FxAccountInstance;
    position?: FxPositionInstance;
    getAccount: Sequelize.BelongsToGetAssociationMixin<FxAccountInstance>;
    setAccount: Sequelize.BelongsToSetAssociationMixin<FxAccountInstance, string>;
    createAccount: Sequelize.BelongsToCreateAssociationMixin<FxAccountInstance>;
    getPosition: Sequelize.BelongsToGetAssociationMixin<FxPositionInstance>;
    setPosition: Sequelize.BelongsToSetAssociationMixin<FxPositionInstance, string>;
    createPosition: Sequelize.BelongsToCreateAssociationMixin<FxPositionInstance>;
  }

  // ========================================
  // FxEconomicEvent
  // ========================================

  interface FxEconomicEventAttributes {
    id: string;
    externalId?: string | null;
    source: string;
    provider?: string | null;
    eventTime: Date;
    country?: string | null;
    currency?: string | null;
    title: string;
    impact: string;
    actual?: string | null;
    forecast?: string | null;
    previousValue?: string | null;
    unit?: string | null;
    status?: boolean | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FxEconomicEventCreationAttributes = Optional<FxEconomicEventAttributes, "id" | "externalId" | "source" | "provider" | "country" | "currency" | "impact" | "actual" | "forecast" | "previousValue" | "unit" | "status" | "createdAt" | "updatedAt">;

  interface FxEconomicEventInstance extends Model<FxEconomicEventAttributes, FxEconomicEventCreationAttributes>, FxEconomicEventAttributes {
  }

  // ========================================
  // FxExecutionAlert
  // ========================================

  interface FxExecutionAlertAttributes {
    id: string;
    executionProviderId?: string | null;
    alertKey: string;
    severity: string;
    title: string;
    message: string;
    payload?: string | null;
    acknowledgedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FxExecutionAlertCreationAttributes = Optional<FxExecutionAlertAttributes, "id" | "executionProviderId" | "severity" | "payload" | "acknowledgedAt" | "createdAt" | "updatedAt">;

  interface FxExecutionAlertInstance extends Model<FxExecutionAlertAttributes, FxExecutionAlertCreationAttributes>, FxExecutionAlertAttributes {
    executionProvider?: FxExecutionProviderInstance;
    getExecutionProvider: Sequelize.BelongsToGetAssociationMixin<FxExecutionProviderInstance>;
    setExecutionProvider: Sequelize.BelongsToSetAssociationMixin<FxExecutionProviderInstance, string>;
    createExecutionProvider: Sequelize.BelongsToCreateAssociationMixin<FxExecutionProviderInstance>;
  }

  // ========================================
  // FxExecutionProvider
  // ========================================

  interface FxExecutionProviderAttributes {
    id: string;
    name: string;
    title: string;
    description?: string | null;
    environment: string;
    status?: boolean | null;
    accountRef?: string | null;
    proxyUrl?: string | null;
    symbolMap?: string | null;
    maxSlippagePoints?: number | null;
    orderTimeoutMs?: number | null;
    hardTimeoutMs?: number | null;
    marginBufferRatio?: number | null;
    marginAlertRatio?: number | null;
    staleSyncAlertSec?: number | null;
    financingAlertDailyDelta?: number | null;
    disasterStopDistancePoints?: number | null;
    allowedAssetClasses?: string | null;
    hedgeBalance?: number | null;
    hedgeEquity?: number | null;
    hedgeMarginUsed?: number | null;
    hedgeMarginAvailable?: number | null;
    hedgeCloseoutPercent?: number | null;
    hedgeSyncedAt?: Date | null;
    syncCursor?: string | null;
    externalMeta?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FxExecutionProviderCreationAttributes = Optional<FxExecutionProviderAttributes, "id" | "description" | "environment" | "status" | "accountRef" | "proxyUrl" | "symbolMap" | "maxSlippagePoints" | "orderTimeoutMs" | "hardTimeoutMs" | "marginBufferRatio" | "marginAlertRatio" | "staleSyncAlertSec" | "financingAlertDailyDelta" | "disasterStopDistancePoints" | "allowedAssetClasses" | "hedgeBalance" | "hedgeEquity" | "hedgeMarginUsed" | "hedgeMarginAvailable" | "hedgeCloseoutPercent" | "hedgeSyncedAt" | "syncCursor" | "externalMeta" | "createdAt" | "updatedAt">;

  interface FxExecutionProviderInstance extends Model<FxExecutionProviderAttributes, FxExecutionProviderCreationAttributes>, FxExecutionProviderAttributes {
  }

  // ========================================
  // FxInstrument
  // ========================================

  interface FxInstrumentAttributes {
    id: string;
    currency: string;
    pair: string;
    assetClass: string;
    groupId?: string | null;
    status: string;
    providerSymbols?: string | null;
    swapLong: number;
    swapShort: number;
    metadata?: string | null;
    isTrending?: boolean | null;
    isHot?: boolean | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type FxInstrumentCreationAttributes = Optional<FxInstrumentAttributes, "id" | "assetClass" | "groupId" | "status" | "providerSymbols" | "swapLong" | "swapShort" | "metadata" | "isTrending" | "isHot" | "createdAt" | "deletedAt" | "updatedAt">;

  interface FxInstrumentInstance extends Model<FxInstrumentAttributes, FxInstrumentCreationAttributes>, FxInstrumentAttributes {
    group?: FxSymbolGroupInstance;
    getGroup: Sequelize.BelongsToGetAssociationMixin<FxSymbolGroupInstance>;
    setGroup: Sequelize.BelongsToSetAssociationMixin<FxSymbolGroupInstance, string>;
    createGroup: Sequelize.BelongsToCreateAssociationMixin<FxSymbolGroupInstance>;
  }

  // ========================================
  // FxMarketNews
  // ========================================

  interface FxMarketNewsAttributes {
    id: string;
    externalId?: string | null;
    source: string;
    provider?: string | null;
    publishedAt: Date;
    headline: string;
    summary?: string | null;
    url?: string | null;
    imageUrl?: string | null;
    category?: string | null;
    relatedSymbols?: string | null;
    status?: boolean | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FxMarketNewsCreationAttributes = Optional<FxMarketNewsAttributes, "id" | "externalId" | "source" | "provider" | "summary" | "url" | "imageUrl" | "category" | "relatedSymbols" | "status" | "createdAt" | "updatedAt">;

  interface FxMarketNewsInstance extends Model<FxMarketNewsAttributes, FxMarketNewsCreationAttributes>, FxMarketNewsAttributes {
  }

  // ========================================
  // FxOrder
  // ========================================

  interface FxOrderAttributes {
    id: string;
    userId: string;
    accountId: string;
    instrumentId: string;
    side: string;
    type: string;
    amount: number;
    price?: number | null;
    stopPrice?: number | null;
    slPrice?: number | null;
    tpPrice?: number | null;
    trailingDistance?: number | null;
    timeInForce: string;
    expiresAt?: Date | null;
    status: string;
    routing: string;
    executionProviderId?: string | null;
    routingRuleId?: string | null;
    reservedMargin?: number | null;
    externalRef?: string | null;
    externalOrderId?: string | null;
    externalFillPrice?: string | null;
    externalFilledAt?: Date | null;
    externalError?: string | null;
    externalMeta?: string | null;
    filledPositionId?: string | null;
    requestNonce?: string | null;
    rejectReason?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FxOrderCreationAttributes = Optional<FxOrderAttributes, "id" | "price" | "stopPrice" | "slPrice" | "tpPrice" | "trailingDistance" | "timeInForce" | "expiresAt" | "status" | "routing" | "executionProviderId" | "routingRuleId" | "reservedMargin" | "externalRef" | "externalOrderId" | "externalFillPrice" | "externalFilledAt" | "externalError" | "externalMeta" | "filledPositionId" | "requestNonce" | "rejectReason" | "createdAt" | "updatedAt">;

  interface FxOrderInstance extends Model<FxOrderAttributes, FxOrderCreationAttributes>, FxOrderAttributes {
    user?: UserInstance;
    account?: FxAccountInstance;
    instrument?: FxInstrumentInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getAccount: Sequelize.BelongsToGetAssociationMixin<FxAccountInstance>;
    setAccount: Sequelize.BelongsToSetAssociationMixin<FxAccountInstance, string>;
    createAccount: Sequelize.BelongsToCreateAssociationMixin<FxAccountInstance>;
    getInstrument: Sequelize.BelongsToGetAssociationMixin<FxInstrumentInstance>;
    setInstrument: Sequelize.BelongsToSetAssociationMixin<FxInstrumentInstance, string>;
    createInstrument: Sequelize.BelongsToCreateAssociationMixin<FxInstrumentInstance>;
  }

  // ========================================
  // FxPosition
  // ========================================

  interface FxPositionAttributes {
    id: string;
    userId: string;
    accountId: string;
    instrumentId: string;
    side: string;
    amount: number;
    entryPrice: number;
    slPrice?: number | null;
    tpPrice?: number | null;
    trailingDistance?: number | null;
    trailingHighWater?: number | null;
    usedMargin: number;
    swapAccrued: number;
    commissionPaid: number;
    status: string;
    routing: string;
    executionProviderId?: string | null;
    externalPositionId?: string | null;
    externalEntryPrice?: string | null;
    externalClosePrice?: string | null;
    hedgePnl?: number | null;
    pendingCloseAmount?: number | null;
    pendingCloseRef?: string | null;
    pendingCloseReason?: string | null;
    closeRequestedAt?: Date | null;
    externalMeta?: string | null;
    openedAt: Date;
    closedAt?: Date | null;
    closePrice?: number | null;
    realizedPnl?: number | null;
    closeReason?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FxPositionCreationAttributes = Optional<FxPositionAttributes, "id" | "slPrice" | "tpPrice" | "trailingDistance" | "trailingHighWater" | "usedMargin" | "swapAccrued" | "commissionPaid" | "status" | "routing" | "executionProviderId" | "externalPositionId" | "externalEntryPrice" | "externalClosePrice" | "hedgePnl" | "pendingCloseAmount" | "pendingCloseRef" | "pendingCloseReason" | "closeRequestedAt" | "externalMeta" | "openedAt" | "closedAt" | "closePrice" | "realizedPnl" | "closeReason" | "createdAt" | "updatedAt">;

  interface FxPositionInstance extends Model<FxPositionAttributes, FxPositionCreationAttributes>, FxPositionAttributes {
    user?: UserInstance;
    account?: FxAccountInstance;
    instrument?: FxInstrumentInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getAccount: Sequelize.BelongsToGetAssociationMixin<FxAccountInstance>;
    setAccount: Sequelize.BelongsToSetAssociationMixin<FxAccountInstance, string>;
    createAccount: Sequelize.BelongsToCreateAssociationMixin<FxAccountInstance>;
    getInstrument: Sequelize.BelongsToGetAssociationMixin<FxInstrumentInstance>;
    setInstrument: Sequelize.BelongsToSetAssociationMixin<FxInstrumentInstance, string>;
    createInstrument: Sequelize.BelongsToCreateAssociationMixin<FxInstrumentInstance>;
  }

  // ========================================
  // FxProvider
  // ========================================

  interface FxProviderAttributes {
    id: string;
    name: string;
    title: string;
    description?: string | null;
    status?: boolean | null;
    version?: string | null;
    proxyUrl?: string | null;
  }

  type FxProviderCreationAttributes = Optional<FxProviderAttributes, "id" | "description" | "status" | "version" | "proxyUrl">;

  interface FxProviderInstance extends Model<FxProviderAttributes, FxProviderCreationAttributes>, FxProviderAttributes {
  }

  // ========================================
  // FxRoutingRule
  // ========================================

  interface FxRoutingRuleAttributes {
    id: string;
    priority: number;
    enabled?: boolean | null;
    target: string;
    executionProviderId?: string | null;
    instrumentId?: string | null;
    symbolGroupId?: string | null;
    assetClass?: string | null;
    accountGroupId?: string | null;
    accountId?: string | null;
    side?: string | null;
    minAmount?: number | null;
    maxAmount?: number | null;
    note?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FxRoutingRuleCreationAttributes = Optional<FxRoutingRuleAttributes, "id" | "priority" | "enabled" | "executionProviderId" | "instrumentId" | "symbolGroupId" | "assetClass" | "accountGroupId" | "accountId" | "side" | "minAmount" | "maxAmount" | "note" | "createdAt" | "updatedAt">;

  interface FxRoutingRuleInstance extends Model<FxRoutingRuleAttributes, FxRoutingRuleCreationAttributes>, FxRoutingRuleAttributes {
    executionProvider?: FxExecutionProviderInstance;
    getExecutionProvider: Sequelize.BelongsToGetAssociationMixin<FxExecutionProviderInstance>;
    setExecutionProvider: Sequelize.BelongsToSetAssociationMixin<FxExecutionProviderInstance, string>;
    createExecutionProvider: Sequelize.BelongsToCreateAssociationMixin<FxExecutionProviderInstance>;
  }

  // ========================================
  // FxSessionCalendar
  // ========================================

  interface FxSessionCalendarAttributes {
    id: string;
    name: string;
    timezone: string;
    weeklySchedule?: string | null;
    holidays?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FxSessionCalendarCreationAttributes = Optional<FxSessionCalendarAttributes, "id" | "timezone" | "weeklySchedule" | "holidays" | "createdAt" | "updatedAt">;

  interface FxSessionCalendarInstance extends Model<FxSessionCalendarAttributes, FxSessionCalendarCreationAttributes>, FxSessionCalendarAttributes {
    symbolGroups?: FxSymbolGroupInstance[];
    getSymbolGroups: Sequelize.HasManyGetAssociationsMixin<FxSymbolGroupInstance>;
    setSymbolGroups: Sequelize.HasManySetAssociationsMixin<FxSymbolGroupInstance, string>;
    addFxSymbolGroup: Sequelize.HasManyAddAssociationMixin<FxSymbolGroupInstance, string>;
    addSymbolGroups: Sequelize.HasManyAddAssociationsMixin<FxSymbolGroupInstance, string>;
    removeFxSymbolGroup: Sequelize.HasManyRemoveAssociationMixin<FxSymbolGroupInstance, string>;
    removeSymbolGroups: Sequelize.HasManyRemoveAssociationsMixin<FxSymbolGroupInstance, string>;
    hasFxSymbolGroup: Sequelize.HasManyHasAssociationMixin<FxSymbolGroupInstance, string>;
    hasSymbolGroups: Sequelize.HasManyHasAssociationsMixin<FxSymbolGroupInstance, string>;
    countSymbolGroups: Sequelize.HasManyCountAssociationsMixin;
    createFxSymbolGroup: Sequelize.HasManyCreateAssociationMixin<FxSymbolGroupInstance>;
  }

  // ========================================
  // FxSymbolGroup
  // ========================================

  interface FxSymbolGroupAttributes {
    id: string;
    name: string;
    leverage: number;
    spreadMarkupPips: number;
    hedgedMarginRate: number;
    commissionPerLot: number;
    swapMarkupPercent: number;
    tripleSwapDay: string;
    swapDays: string;
    swapFreeAllowed?: boolean | null;
    sessionCalendarId?: string | null;
    marginCurrency: string;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type FxSymbolGroupCreationAttributes = Optional<FxSymbolGroupAttributes, "id" | "leverage" | "spreadMarkupPips" | "hedgedMarginRate" | "commissionPerLot" | "swapMarkupPercent" | "tripleSwapDay" | "swapDays" | "swapFreeAllowed" | "sessionCalendarId" | "marginCurrency" | "createdAt" | "updatedAt">;

  interface FxSymbolGroupInstance extends Model<FxSymbolGroupAttributes, FxSymbolGroupCreationAttributes>, FxSymbolGroupAttributes {
    instruments?: FxInstrumentInstance[];
    sessionCalendar?: FxSessionCalendarInstance;
    getInstruments: Sequelize.HasManyGetAssociationsMixin<FxInstrumentInstance>;
    setInstruments: Sequelize.HasManySetAssociationsMixin<FxInstrumentInstance, string>;
    addFxInstrument: Sequelize.HasManyAddAssociationMixin<FxInstrumentInstance, string>;
    addInstruments: Sequelize.HasManyAddAssociationsMixin<FxInstrumentInstance, string>;
    removeFxInstrument: Sequelize.HasManyRemoveAssociationMixin<FxInstrumentInstance, string>;
    removeInstruments: Sequelize.HasManyRemoveAssociationsMixin<FxInstrumentInstance, string>;
    hasFxInstrument: Sequelize.HasManyHasAssociationMixin<FxInstrumentInstance, string>;
    hasInstruments: Sequelize.HasManyHasAssociationsMixin<FxInstrumentInstance, string>;
    countInstruments: Sequelize.HasManyCountAssociationsMixin;
    createFxInstrument: Sequelize.HasManyCreateAssociationMixin<FxInstrumentInstance>;
    getSessionCalendar: Sequelize.BelongsToGetAssociationMixin<FxSessionCalendarInstance>;
    setSessionCalendar: Sequelize.BelongsToSetAssociationMixin<FxSessionCalendarInstance, string>;
    createSessionCalendar: Sequelize.BelongsToCreateAssociationMixin<FxSessionCalendarInstance>;
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
    website?: string | null;
    businessType?: string | null;
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

  type GatewayMerchantCreationAttributes = Optional<GatewayMerchantAttributes, "id" | "description" | "logo" | "website" | "businessType" | "phone" | "address" | "city" | "state" | "country" | "postalCode" | "testMode" | "allowedCurrencies" | "allowedWalletTypes" | "defaultCurrency" | "feeType" | "feePercentage" | "feeFixed" | "payoutSchedule" | "payoutThreshold" | "payoutWalletId" | "status" | "verificationStatus" | "dailyLimit" | "monthlyLimit" | "transactionLimit" | "metadata" | "createdAt" | "updatedAt" | "deletedAt">;

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
    customerEmail?: string | null;
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
    signature?: string | null;
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

  type GatewayWebhookCreationAttributes = Optional<GatewayWebhookAttributes, "id" | "paymentId" | "refundId" | "signature" | "status" | "attempts" | "maxAttempts" | "lastAttemptAt" | "nextRetryAt" | "responseStatus" | "responseBody" | "responseTime" | "errorMessage" | "createdAt" | "updatedAt">;

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
  // GeoAccessLog
  // ========================================

  interface GeoAccessLogAttributes {
    id: string;
    ip: string;
    countryCode?: string | null;
    countryName?: string | null;
    region?: string | null;
    city?: string | null;
    source: "CDN_HEADER" | "IP_LOOKUP" | "KYC" | "PROFILE" | "MANUAL" | "NONE";
    decision: "BLOCKED" | "ALLOWED" | "BYPASSED";
    reasonCode: string;
    reasonDetail?: string | null;
    restrictionId?: string | null;
    action?: string | null;
    path: string;
    method: string;
    userId?: string | null;
    userAgent?: string | null;
    isProxy?: boolean | null;
    isHosting?: boolean | null;
    isTor?: boolean | null;
    hitCount: number;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type GeoAccessLogCreationAttributes = Optional<GeoAccessLogAttributes, "id" | "countryCode" | "countryName" | "region" | "city" | "source" | "reasonDetail" | "restrictionId" | "action" | "userId" | "userAgent" | "isProxy" | "isHosting" | "isTor" | "hitCount" | "createdAt" | "updatedAt">;

  interface GeoAccessLogInstance extends Model<GeoAccessLogAttributes, GeoAccessLogCreationAttributes>, GeoAccessLogAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // GeoRestriction
  // ========================================

  interface GeoRestrictionAttributes {
    id: string;
    countryCode: string;
    countryName: string;
    type: "BLOCK" | "ALLOW";
    scope: "FULL" | "PARTIAL";
    restrictedActions?: string[] | null;
    reason: "SANCTIONS" | "UNLICENSED" | "REGULATORY" | "HIGH_RISK" | "INTERNAL_POLICY" | "OTHER";
    legalReference?: string | null;
    notes?: string | null;
    status: boolean;
    effectiveFrom?: Date | null;
    effectiveTo?: Date | null;
    createdBy?: string | null;
    updatedBy?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type GeoRestrictionCreationAttributes = Optional<GeoRestrictionAttributes, "id" | "type" | "scope" | "restrictedActions" | "reason" | "legalReference" | "notes" | "status" | "effectiveFrom" | "effectiveTo" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt" | "deletedAt">;

  interface GeoRestrictionInstance extends Model<GeoRestrictionAttributes, GeoRestrictionCreationAttributes>, GeoRestrictionAttributes {
  }

  // ========================================
  // HbInstance
  // ========================================

  interface HbInstanceAttributes {
    id: string;
    name: string;
    description?: string | null;
    installPath: string;
    pythonPath: string;
    presetId?: string | null;
    tradingPair?: string | null;
    controllerConfig: string;
    apiKeyId?: string | null;
    baseUrl: string;
    configPassword?: string | null;
    paperTrade: boolean;
    paperBalances?: Record<string, number> | null;
    desiredStatus: "RUNNING" | "STOPPED";
    restartRequestedAt?: Date | null;
    status: "STOPPED" | "STARTING" | "RUNNING" | "STOPPING" | "CRASHED";
    pid?: number | null;
    autoRestart: boolean;
    memoryLimitMb: number;
    restartCount: number;
    lastStartedAt?: Date | null;
    lastStoppedAt?: Date | null;
    lastExitCode?: number | null;
    lastError?: string | null;
    createdBy?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type HbInstanceCreationAttributes = Optional<HbInstanceAttributes, "id" | "description" | "presetId" | "tradingPair" | "controllerConfig" | "apiKeyId" | "baseUrl" | "configPassword" | "paperTrade" | "paperBalances" | "desiredStatus" | "restartRequestedAt" | "status" | "pid" | "autoRestart" | "memoryLimitMb" | "restartCount" | "lastStartedAt" | "lastStoppedAt" | "lastExitCode" | "lastError" | "createdBy" | "createdAt" | "updatedAt">;

  interface HbInstanceInstance extends Model<HbInstanceAttributes, HbInstanceCreationAttributes>, HbInstanceAttributes {
    preset?: HbStrategyPresetInstance;
    apiKey?: ApiKeyInstance;
    creator?: UserInstance;
    getPreset: Sequelize.BelongsToGetAssociationMixin<HbStrategyPresetInstance>;
    setPreset: Sequelize.BelongsToSetAssociationMixin<HbStrategyPresetInstance, string>;
    createPreset: Sequelize.BelongsToCreateAssociationMixin<HbStrategyPresetInstance>;
    getApiKey: Sequelize.BelongsToGetAssociationMixin<ApiKeyInstance>;
    setApiKey: Sequelize.BelongsToSetAssociationMixin<ApiKeyInstance, string>;
    createApiKey: Sequelize.BelongsToCreateAssociationMixin<ApiKeyInstance>;
    getCreator: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setCreator: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createCreator: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // HbStrategyPreset
  // ========================================

  interface HbStrategyPresetAttributes {
    id: string;
    name: string;
    description?: string | null;
    family: "pmm" | "xemm";
    pair: string;
    makerConnector: string;
    takerConnector?: string | null;
    config: Record<string, any>;
    status: "draft" | "published";
    version: number;
    createdBy?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type HbStrategyPresetCreationAttributes = Optional<HbStrategyPresetAttributes, "id" | "description" | "makerConnector" | "takerConnector" | "config" | "status" | "version" | "createdBy" | "createdAt" | "updatedAt">;

  interface HbStrategyPresetInstance extends Model<HbStrategyPresetAttributes, HbStrategyPresetCreationAttributes>, HbStrategyPresetAttributes {
    creator?: UserInstance;
    getCreator: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setCreator: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createCreator: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
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
    linkedin?: string | null;
    twitter?: string | null;
    website?: string | null;
    github?: string | null;
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
    vestingEnabled: boolean;
    vestingType?: "LINEAR" | "CLIFF" | "MILESTONE" | null;
    vestingDurationMonths?: number | null;
    vestingCliffMonths?: number | null;
    vestingMilestones?: any | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type IcoTokenDetailCreationAttributes = Optional<IcoTokenDetailAttributes, "id" | "vestingEnabled" | "vestingType" | "vestingDurationMonths" | "vestingCliffMonths" | "vestingMilestones" | "createdAt" | "updatedAt" | "deletedAt">;

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
    status: "ACTIVE" | "SUCCESS" | "FAILED" | "UPCOMING" | "PENDING" | "REJECTED" | "DISABLED" | "CANCELLED";
    purchaseWalletCurrency: string;
    purchaseWalletType: string;
    tokenPrice: number;
    targetAmount: number;
    startDate: Date;
    endDate: Date;
    participants: number;
    currentPrice?: number | null;
    priceChange?: number | null;
    submittedAt?: Date | null;
    approvedAt?: Date | null;
    rejectedAt?: Date | null;
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

  type IcoTokenOfferingCreationAttributes = Optional<IcoTokenOfferingAttributes, "id" | "status" | "participants" | "currentPrice" | "priceChange" | "submittedAt" | "approvedAt" | "rejectedAt" | "reviewNotes" | "isPaused" | "isFlagged" | "featured" | "website" | "cancelledAt" | "cancelledBy" | "cancellationReason" | "createdAt" | "updatedAt" | "deletedAt">;

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

  type IcoTokenOfferingPhaseCreationAttributes = Optional<IcoTokenOfferingPhaseAttributes, "id" | "sequence" | "startDate" | "endDate" | "createdAt" | "updatedAt">;

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
    phaseId?: string | null;
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

  type IcoTransactionCreationAttributes = Optional<IcoTransactionAttributes, "id" | "phaseId" | "status" | "releaseUrl" | "walletAddress" | "notes" | "createdAt" | "updatedAt" | "deletedAt">;

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
    profit?: number | null;
    roiPercentage?: number | null;
    result?: "WIN" | "LOSS" | "DRAW" | null;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
    endDate?: Date | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type InvestmentCreationAttributes = Optional<InvestmentAttributes, "id" | "profit" | "roiPercentage" | "result" | "status" | "endDate" | "createdAt" | "deletedAt" | "updatedAt">;

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
    image?: string | null;
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
    trending?: boolean | null;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type InvestmentPlanCreationAttributes = Optional<InvestmentPlanAttributes, "id" | "image" | "profitPercentage" | "invested" | "defaultProfit" | "trending" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

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

  type KycApplicationCreationAttributes = Optional<KycApplicationAttributes, "id" | "status" | "adminNotes" | "reviewedAt" | "createdAt" | "updatedAt" | "deletedAt">;

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

  type KycLevelCreationAttributes = Optional<KycLevelAttributes, "id" | "serviceId" | "description" | "fields" | "features" | "status" | "createdAt" | "updatedAt">;

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
    score?: number | null;
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
    category?: string | null;
    design: string;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type MailwizardBlockCreationAttributes = Optional<MailwizardBlockAttributes, "id" | "category" | "createdAt" | "deletedAt" | "updatedAt">;

  interface MailwizardBlockInstance extends Model<MailwizardBlockAttributes, MailwizardBlockCreationAttributes>, MailwizardBlockAttributes {
  }

  // ========================================
  // MailwizardCampaign
  // ========================================

  interface MailwizardCampaignAttributes {
    id: string;
    name: string;
    subject: string;
    status: "PENDING" | "PAUSED" | "ACTIVE" | "STOPPED" | "COMPLETED" | "CANCELLED";
    speed: number;
    targets?: string | null;
    templateId: string;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type MailwizardCampaignCreationAttributes = Optional<MailwizardCampaignAttributes, "id" | "status" | "speed" | "targets" | "createdAt" | "deletedAt" | "updatedAt">;

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
  // MarketNews
  // ========================================

  interface MarketNewsAttributes {
    id: string;
    externalId?: string | null;
    source: string;
    provider?: string | null;
    publishedAt: Date;
    headline: string;
    summary?: string | null;
    url?: string | null;
    imageUrl?: string | null;
    category?: string | null;
    relatedSymbols?: string | null;
    status?: boolean | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type MarketNewsCreationAttributes = Optional<MarketNewsAttributes, "id" | "externalId" | "source" | "provider" | "summary" | "url" | "imageUrl" | "category" | "relatedSymbols" | "status" | "createdAt" | "updatedAt">;

  interface MarketNewsInstance extends Model<MarketNewsAttributes, MarketNewsCreationAttributes>, MarketNewsAttributes {
  }

  // ========================================
  // MarketNewsProvider
  // ========================================

  interface MarketNewsProviderAttributes {
    id: string;
    name: string;
    title: string;
    description?: string | null;
    status?: boolean | null;
    apiKey?: string | null;
    categories?: string | null;
    fetchLimit?: number | null;
    retentionDays?: number | null;
    config?: string | null;
    lastSyncAt?: Date | null;
    lastSyncStatus?: string | null;
    lastSyncCount?: number | null;
    lastSyncMessage?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type MarketNewsProviderCreationAttributes = Optional<MarketNewsProviderAttributes, "id" | "description" | "status" | "apiKey" | "categories" | "fetchLimit" | "retentionDays" | "config" | "lastSyncAt" | "lastSyncStatus" | "lastSyncCount" | "lastSyncMessage" | "createdAt" | "updatedAt">;

  interface MarketNewsProviderInstance extends Model<MarketNewsProviderAttributes, MarketNewsProviderCreationAttributes>, MarketNewsProviderAttributes {
  }

  // ========================================
  // MlmBinaryNode
  // ========================================

  interface MlmBinaryNodeAttributes {
    id: string;
    referralId: string;
    parentId?: string | null;
    leftChildId?: string | null;
    rightChildId?: string | null;
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

  type MlmReferralCreationAttributes = Optional<MlmReferralAttributes, "id" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

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
    type: "DEPOSIT" | "TRADE" | "SPOT_TRADE" | "BINARY_WIN" | "INVESTMENT" | "AI_INVESTMENT" | "FOREX_INVESTMENT" | "FOREX_TRADING" | "ICO_CONTRIBUTION" | "STAKING" | "ECOMMERCE_PURCHASE" | "P2P_TRADE" | "NFT_TRADE" | "COPY_TRADING" | "FUTURES_TRADE" | "TOKEN_PURCHASE";
    reward: number;
    rewardType: "PERCENTAGE" | "FIXED";
    rewardWalletType: "FIAT" | "SPOT" | "ECO";
    rewardCurrency: string;
    rewardChain?: string | null;
    image?: string | null;
    minAmount: number;
    status: boolean;
    period: "DAILY" | "WEEKLY" | "MONTHLY";
  }

  type MlmReferralConditionCreationAttributes = Optional<MlmReferralConditionAttributes, "id" | "rewardChain" | "image" | "minAmount" | "status" | "period">;

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
  // MobileDevice
  // ========================================

  interface MobileDeviceAttributes {
    id: string;
    userId: string;
    deviceId: string;
    platform: "ios" | "android";
    pushToken: string;
    appVersion?: string | null;
    locale?: string | null;
    lastSeenAt: Date;
    revokedAt?: Date | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type MobileDeviceCreationAttributes = Optional<MobileDeviceAttributes, "id" | "appVersion" | "locale" | "lastSeenAt" | "revokedAt" | "createdAt" | "deletedAt" | "updatedAt">;

  interface MobileDeviceInstance extends Model<MobileDeviceAttributes, MobileDeviceCreationAttributes>, MobileDeviceAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NftActivity
  // ========================================

  interface NftActivityAttributes {
    id: string;
    type: "MINT" | "TRANSFER" | "SALE" | "LIST" | "DELIST" | "BID" | "OFFER" | "BURN" | "COLLECTION_CREATED" | "COLLECTION_DEPLOYED" | "AUCTION_ENDED";
    tokenId?: string | null;
    collectionId?: string | null;
    listingId?: string | null;
    offerId?: string | null;
    bidId?: string | null;
    fromUserId?: string | null;
    toUserId?: string | null;
    price?: number | null;
    currency?: string | null;
    transactionHash?: string | null;
    blockNumber?: number | null;
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
    tokenId?: string | null;
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

  type NftBidCreationAttributes = Optional<NftBidAttributes, "id" | "tokenId" | "currency" | "transactionHash" | "expiresAt" | "status" | "acceptedAt" | "rejectedAt" | "outbidAt" | "cancelledAt" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

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
    image?: string | null;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftCategoryCreationAttributes = Optional<NftCategoryAttributes, "id" | "description" | "image" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

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
    contractAddress?: string | null;
    chain: string;
    network: string;
    standard: "ERC721" | "ERC1155";
    totalSupply?: number | null;
    maxSupply?: number | null;
    mintPrice?: number | null;
    currency?: string | null;
    royaltyPercentage?: number | null;
    royaltyAddress?: string | null;
    creatorId: string;
    categoryId?: string | null;
    bannerImage?: string | null;
    logoImage?: string | null;
    featuredImage?: string | null;
    website?: string | null;
    discord?: string | null;
    twitter?: string | null;
    telegram?: string | null;
    isVerified?: boolean;
    isLazyMinted?: boolean;
    isPublicMintEnabled?: boolean;
    status: "DRAFT" | "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
    metadata?: any | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftCollectionCreationAttributes = Optional<NftCollectionAttributes, "id" | "description" | "contractAddress" | "network" | "standard" | "totalSupply" | "maxSupply" | "mintPrice" | "currency" | "royaltyPercentage" | "royaltyAddress" | "categoryId" | "bannerImage" | "logoImage" | "featuredImage" | "website" | "discord" | "twitter" | "telegram" | "isVerified" | "isLazyMinted" | "isPublicMintEnabled" | "status" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

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
    tokenId?: string | null;
    collectionId?: string | null;
    userId: string;
    parentId?: string | null;
    content: string;
    likes: number;
    isEdited: boolean;
    isDeleted: boolean;
    metadata?: any | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type NftCommentCreationAttributes = Optional<NftCommentAttributes, "id" | "tokenId" | "collectionId" | "parentId" | "likes" | "isEdited" | "isDeleted" | "metadata" | "createdAt" | "updatedAt">;

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
    displayName?: string | null;
    bio?: string | null;
    banner?: string | null;
    isVerified: boolean;
    verificationTier?: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | null;
    totalSales?: number;
    totalVolume?: number;
    totalItems?: number;
    floorPrice?: number | null;
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
    listingId?: string | null;
    tokenId?: string | null;
    transactionHash?: string | null;
    disputeType: "FAKE_NFT" | "COPYRIGHT_INFRINGEMENT" | "SCAM" | "NOT_RECEIVED" | "WRONG_ITEM" | "UNAUTHORIZED_SALE" | "OTHER";
    status: "PENDING" | "INVESTIGATING" | "AWAITING_RESPONSE" | "RESOLVED" | "REJECTED" | "ESCALATED";
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    reporterId: string;
    respondentId?: string | null;
    assignedToId?: string | null;
    title: string;
    description: string;
    evidence?: any | null;
    resolution?: string | null;
    resolutionType?: "REFUND" | "CANCEL_SALE" | "REMOVE_LISTING" | "BAN_USER" | "WARNING" | "NO_ACTION" | null;
    refundAmount?: number | null;
    escalatedAt?: Date | null;
    investigatedAt?: Date | null;
    resolvedAt?: Date | null;
    resolvedById?: string | null;
    metadata?: any | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type NftDisputeCreationAttributes = Optional<NftDisputeAttributes, "id" | "listingId" | "tokenId" | "transactionHash" | "status" | "priority" | "respondentId" | "assignedToId" | "evidence" | "resolution" | "resolutionType" | "refundAmount" | "escalatedAt" | "investigatedAt" | "resolvedAt" | "resolvedById" | "metadata" | "createdAt" | "updatedAt">;

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
    tokenId?: string | null;
    collectionId?: string | null;
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
    vaultAddress?: string | null;
    totalShares: number;
    availableShares: number;
    sharePrice: number;
    currency: string;
    minPurchase: number;
    maxPurchase: number;
    buyoutPrice?: number | null;
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

  type NftFractionalCreationAttributes = Optional<NftFractionalAttributes, "id" | "vaultAddress" | "availableShares" | "currency" | "minPurchase" | "maxPurchase" | "buyoutPrice" | "buyoutEnabled" | "votingEnabled" | "status" | "deployedAt" | "buyoutAt" | "metadata" | "createdAt" | "updatedAt">;

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
    price?: number | null;
    currency: string;
    currentBid?: number | null;
    startingBid?: number | null;
    reservePrice?: number | null;
    minBidIncrement?: number | null;
    buyNowPrice?: number | null;
    auctionContractAddress?: string | null;
    bundleTokenIds?: string | null;
    startTime?: Date | null;
    endTime?: Date | null;
    status: "ACTIVE" | "SOLD" | "CANCELLED" | "EXPIRED";
    soldAt?: Date | null;
    cancelledAt?: Date | null;
    endedAt?: Date | null;
    settlementBlockedAt?: Date | null;
    views?: number;
    likes?: number;
    metadata?: any | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftListingCreationAttributes = Optional<NftListingAttributes, "id" | "type" | "price" | "currency" | "currentBid" | "startingBid" | "reservePrice" | "minBidIncrement" | "buyNowPrice" | "auctionContractAddress" | "bundleTokenIds" | "startTime" | "endTime" | "status" | "soldAt" | "cancelledAt" | "endedAt" | "settlementBlockedAt" | "views" | "likes" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

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
    deployedBy?: string | null;
    feeRecipient: string;
    feePercentage: number;
    listingFee?: number | null;
    maxRoyaltyPercentage?: number | null;
    transactionHash: string;
    blockNumber: number;
    gasUsed?: string | null;
    deploymentCost?: string | null;
    status: "ACTIVE" | "PAUSED" | "DEPRECATED";
    pauseReason?: string | null;
    pausedAt?: Date | null;
    pausedBy?: string | null;
    version?: string | null;
    metadata?: any | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type NftMarketplaceCreationAttributes = Optional<NftMarketplaceAttributes, "id" | "network" | "deployedBy" | "listingFee" | "maxRoyaltyPercentage" | "gasUsed" | "deploymentCost" | "status" | "pauseReason" | "pausedAt" | "pausedBy" | "version" | "metadata" | "createdAt" | "updatedAt">;

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
    tokenId?: string | null;
    collectionId?: string | null;
    listingId?: string | null;
    userId: string;
    sellerId?: string | null;
    flaggedAt?: Date | null;
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

  type NftOfferCreationAttributes = Optional<NftOfferAttributes, "id" | "tokenId" | "collectionId" | "listingId" | "sellerId" | "flaggedAt" | "currency" | "expiresAt" | "status" | "type" | "message" | "acceptedAt" | "rejectedAt" | "cancelledAt" | "expiredAt" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

  interface NftOfferInstance extends Model<NftOfferAttributes, NftOfferCreationAttributes>, NftOfferAttributes {
    token?: NftTokenInstance;
    collection?: NftCollectionInstance;
    listing?: NftListingInstance;
    user?: UserInstance;
    seller?: UserInstance;
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
    getSeller: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setSeller: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createSeller: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // NftPriceHistory
  // ========================================

  interface NftPriceHistoryAttributes {
    id: string;
    tokenId: string;
    collectionId?: string | null;
    price: number;
    currency: string;
    priceUSD?: number | null;
    saleType: "DIRECT" | "AUCTION" | "OFFER";
    buyerId?: string | null;
    sellerId?: string | null;
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
    tokenId?: string | null;
    collectionId?: string | null;
    creatorId?: string | null;
    rating: number;
    title?: string | null;
    comment?: string;
    isVerified?: boolean;
    helpfulCount?: number;
    status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftReviewCreationAttributes = Optional<NftReviewAttributes, "id" | "tokenId" | "collectionId" | "creatorId" | "title" | "comment" | "isVerified" | "helpfulCount" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

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
    transactionHash?: string | null;
    blockNumber?: number | null;
    status: "PENDING" | "PAID" | "FAILED";
    paidAt?: Date | null;
    metadata?: any | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftRoyaltyCreationAttributes = Optional<NftRoyaltyAttributes, "id" | "transactionHash" | "blockNumber" | "status" | "paidAt" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

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
    listingId?: string | null;
    sellerId: string;
    buyerId: string;
    price: number;
    currency: string;
    marketplaceFee: number;
    royaltyFee: number;
    totalFee: number;
    netAmount: number;
    transactionHash?: string | null;
    blockNumber?: number | null;
    status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
    metadata?: any | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftSaleCreationAttributes = Optional<NftSaleAttributes, "id" | "listingId" | "currency" | "marketplaceFee" | "royaltyFee" | "totalFee" | "transactionHash" | "blockNumber" | "status" | "metadata" | "createdAt" | "deletedAt" | "updatedAt">;

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
    metadataUri?: string | null;
    metadataHash?: string | null;
    ownerWalletAddress?: string | null;
    ownerId?: string | null;
    creatorId: string;
    mintedAt?: Date | null;
    isMinted: boolean;
    isListed: boolean;
    views?: number;
    likes?: number;
    rarity?: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | null;
    rarityScore?: number | null;
    status: "DRAFT" | "MINTED" | "BURNED";
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type NftTokenCreationAttributes = Optional<NftTokenAttributes, "id" | "blockchainTokenId" | "description" | "image" | "attributes" | "metadataUri" | "metadataHash" | "ownerWalletAddress" | "ownerId" | "mintedAt" | "isMinted" | "isListed" | "views" | "likes" | "rarity" | "rarityScore" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

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
    eventKey?: string | null;
    channels?: any | null;
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type NotificationCreationAttributes = Optional<NotificationAttributes, "id" | "relatedId" | "details" | "link" | "actions" | "read" | "idempotencyKey" | "eventKey" | "channels" | "priority" | "createdAt" | "updatedAt" | "deletedAt">;

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
    tokenType?: "RESET" | null;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type OneTimeTokenCreationAttributes = Optional<OneTimeTokenAttributes, "id" | "tokenType" | "createdAt" | "updatedAt">;

  interface OneTimeTokenInstance extends Model<OneTimeTokenAttributes, OneTimeTokenCreationAttributes>, OneTimeTokenAttributes {
  }

  // ========================================
  // OperatorAttestation
  // ========================================

  interface OperatorAttestationAttributes {
    id: string;
    moduleId: string;
    countryCode: string;
    entityName: string;
    regulator: string;
    licenceNumber: string;
    expiresAt: Date;
    notes?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type OperatorAttestationCreationAttributes = Optional<OperatorAttestationAttributes, "id" | "notes" | "createdAt" | "updatedAt" | "deletedAt">;

  interface OperatorAttestationInstance extends Model<OperatorAttestationAttributes, OperatorAttestationCreationAttributes>, OperatorAttestationAttributes {
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
    tradeId?: string | null;
    offerId?: string | null;
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
    appealedAt?: Date | null;
    appealedById?: string | null;
    appealStatement?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type P2pDisputeCreationAttributes = Optional<P2pDisputeAttributes, "id" | "details" | "status" | "resolution" | "resolvedOn" | "messages" | "evidence" | "activityLog" | "appealedAt" | "appealedById" | "appealStatement" | "createdAt" | "updatedAt" | "deletedAt">;

  interface P2pDisputeInstance extends Model<P2pDisputeAttributes, P2pDisputeCreationAttributes>, P2pDisputeAttributes {
    trade?: P2pTradeInstance;
    reportedBy?: UserInstance;
    against?: UserInstance;
    appealedBy?: UserInstance;
    getTrade: Sequelize.BelongsToGetAssociationMixin<P2pTradeInstance>;
    setTrade: Sequelize.BelongsToSetAssociationMixin<P2pTradeInstance, string>;
    createTrade: Sequelize.BelongsToCreateAssociationMixin<P2pTradeInstance>;
    getReportedBy: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setReportedBy: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createReportedBy: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getAgainst: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setAgainst: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createAgainst: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getAppealedBy: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setAppealedBy: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createAppealedBy: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
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
    priceWalletType?: "FIAT" | "SPOT" | "ECO" | null;
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
  } | null;
    userRequirements?: {
    minCompletedTrades?: number;
    minSuccessRate?: number;
    minAccountAge?: number;
    trustedOnly?: boolean;
    /**
     * "Verified" here is the same fact the board publishes as
     * `trader.verified` — `user.emailVerified`. It is deliberately NOT KYC:
     * `tradeSettings.kycRequired` is the KYC gate, and a taker-facing badge
     * that meant one thing on the board and another in the maker's filter
     * would make the board lie. See `offer/[id]/initiate-trade.post.ts`.
     */
    verifiedOnly?: boolean;
  } | null;
    status: "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED" | "REJECTED" | "EXPIRED";
    escrowAmount: number;
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

  type P2pOfferCreationAttributes = Optional<P2pOfferAttributes, "id" | "priceCurrency" | "priceWalletType" | "locationSettings" | "userRequirements" | "status" | "escrowAmount" | "views" | "systemTags" | "adminNotes" | "activityLog" | "createdAt" | "updatedAt" | "deletedAt">;

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
    userId?: string | null;
    railId?: string | null;
    name: string;
    icon: string;
    description?: string | null;
    instructions?: string | null;
    metadata?: Record<string, string> | null;
    processingTime?: string | null;
    fees?: string | null;
    available: boolean;
    isGlobal: boolean;
    popularityRank: number;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type P2pPaymentMethodCreationAttributes = Optional<P2pPaymentMethodAttributes, "id" | "userId" | "railId" | "description" | "instructions" | "metadata" | "processingTime" | "fees" | "available" | "isGlobal" | "popularityRank" | "createdAt" | "updatedAt" | "deletedAt">;

  interface P2pPaymentMethodInstance extends Model<P2pPaymentMethodAttributes, P2pPaymentMethodCreationAttributes>, P2pPaymentMethodAttributes {
    rail?: P2pPaymentRailInstance;
    user?: UserInstance;
    offers?: P2pOfferInstance[];
    getRail: Sequelize.BelongsToGetAssociationMixin<P2pPaymentRailInstance>;
    setRail: Sequelize.BelongsToSetAssociationMixin<P2pPaymentRailInstance, string>;
    createRail: Sequelize.BelongsToCreateAssociationMixin<P2pPaymentRailInstance>;
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
  // P2pPaymentRail
  // ========================================

  interface P2pPaymentRailAttributes {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    description?: string | null;
    fields: {
    /** Stable key. Also the metadata key an account stores its value under. */
    key: string;
    /** What the trader is asked for. */
    label: string;
    required: boolean;
    placeholder?: string;
    /** One line of help, where the label alone is not enough. */
    help?: string;
  }[];
    isCustom: boolean;
    createdByUserId?: string | null;
    listed: boolean;
    available: boolean;
    popularityRank: number;
    processingTime?: string | null;
    fees?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type P2pPaymentRailCreationAttributes = Optional<P2pPaymentRailAttributes, "id" | "icon" | "description" | "fields" | "isCustom" | "createdByUserId" | "listed" | "available" | "popularityRank" | "processingTime" | "fees" | "createdAt" | "updatedAt" | "deletedAt">;

  interface P2pPaymentRailInstance extends Model<P2pPaymentRailAttributes, P2pPaymentRailCreationAttributes>, P2pPaymentRailAttributes {
    accounts?: P2pPaymentMethodInstance[];
    author?: UserInstance;
    getAccounts: Sequelize.HasManyGetAssociationsMixin<P2pPaymentMethodInstance>;
    setAccounts: Sequelize.HasManySetAssociationsMixin<P2pPaymentMethodInstance, string>;
    addP2pPaymentMethod: Sequelize.HasManyAddAssociationMixin<P2pPaymentMethodInstance, string>;
    addAccounts: Sequelize.HasManyAddAssociationsMixin<P2pPaymentMethodInstance, string>;
    removeP2pPaymentMethod: Sequelize.HasManyRemoveAssociationMixin<P2pPaymentMethodInstance, string>;
    removeAccounts: Sequelize.HasManyRemoveAssociationsMixin<P2pPaymentMethodInstance, string>;
    hasP2pPaymentMethod: Sequelize.HasManyHasAssociationMixin<P2pPaymentMethodInstance, string>;
    hasAccounts: Sequelize.HasManyHasAssociationsMixin<P2pPaymentMethodInstance, string>;
    countAccounts: Sequelize.HasManyCountAssociationsMixin;
    createP2pPaymentMethod: Sequelize.HasManyCreateAssociationMixin<P2pPaymentMethodInstance>;
    getAuthor: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setAuthor: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createAuthor: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // P2pReview
  // ========================================

  interface P2pReviewAttributes {
    id: string;
    reviewerId: string;
    revieweeId: string;
    tradeId?: string | null;
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
    escrowAmount?: number | null;
    escrowStatus: "NONE" | "HELD" | "RELEASED" | "REFUNDED";
    escrowCurrency?: string | null;
    escrowWalletType?: "FIAT" | "SPOT" | "ECO" | null;
    escrowOwnerId?: string | null;
    completedAt?: Date | null;
    cancelledAt?: Date | null;
    disputedAt?: Date | null;
    cancelledBy?: string | null;
    cancellationReason?: string | null;
    resolution?: any | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type P2pTradeCreationAttributes = Optional<P2pTradeAttributes, "id" | "status" | "paymentMethod" | "paymentDetails" | "timeline" | "terms" | "escrowFee" | "escrowTime" | "paymentConfirmedAt" | "paymentReference" | "escrowAmount" | "escrowStatus" | "escrowCurrency" | "escrowWalletType" | "escrowOwnerId" | "completedAt" | "cancelledAt" | "disputedAt" | "cancelledBy" | "cancellationReason" | "resolution" | "createdAt" | "updatedAt" | "deletedAt">;

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
  // P2pTraderRelation
  // ========================================

  interface P2pTraderRelationAttributes {
    id: string;
    userId: string;
    traderId: string;
    type: "FOLLOW" | "BLOCK";
    note?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type P2pTraderRelationCreationAttributes = Optional<P2pTraderRelationAttributes, "id" | "note" | "createdAt" | "updatedAt">;

  interface P2pTraderRelationInstance extends Model<P2pTraderRelationAttributes, P2pTraderRelationCreationAttributes>, P2pTraderRelationAttributes {
    user?: UserInstance;
    trader?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getTrader: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setTrader: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createTrader: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // P2pUserReport
  // ========================================

  interface P2pUserReportAttributes {
    id: string;
    reporterId: string;
    reportedId: string;
    tradeId?: string | null;
    reason: "PAYMENT_OUTSIDE_PLATFORM" | "THIRD_PARTY_PAYMENT" | "ABUSIVE_CONDUCT" | "CONTACT_DETAILS_IN_ADVERT" | "SUSPECTED_FRAUD" | "IMPERSONATION" | "OTHER";
    details: string;
    status: "PENDING" | "REVIEWING" | "ACTIONED" | "DISMISSED";
    resolution?: string | null;
    reviewedById?: string | null;
    reviewedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type P2pUserReportCreationAttributes = Optional<P2pUserReportAttributes, "id" | "tradeId" | "status" | "resolution" | "reviewedById" | "reviewedAt" | "createdAt" | "updatedAt" | "deletedAt">;

  interface P2pUserReportInstance extends Model<P2pUserReportAttributes, P2pUserReportCreationAttributes>, P2pUserReportAttributes {
    reporter?: UserInstance;
    reported?: UserInstance;
    trade?: P2pTradeInstance;
    reviewedBy?: UserInstance;
    getReporter: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setReporter: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createReporter: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getReported: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setReported: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createReported: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getTrade: Sequelize.BelongsToGetAssociationMixin<P2pTradeInstance>;
    setTrade: Sequelize.BelongsToSetAssociationMixin<P2pTradeInstance, string>;
    createTrade: Sequelize.BelongsToCreateAssociationMixin<P2pTradeInstance>;
    getReviewedBy: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setReviewedBy: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createReviewedBy: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
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
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoKeywords?: string | null;
    ogImage?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    settings?: string | null;
    customCss?: string | null;
    customJs?: string | null;
    lastModifiedBy?: string | null;
    publishedAt?: Date | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type PageCreationAttributes = Optional<PageAttributes, "id" | "path" | "content" | "description" | "image" | "status" | "visits" | "order" | "isHome" | "isBuilderPage" | "template" | "category" | "seoTitle" | "seoDescription" | "seoKeywords" | "ogImage" | "ogTitle" | "ogDescription" | "settings" | "customCss" | "customJs" | "lastModifiedBy" | "publishedAt" | "createdAt" | "deletedAt" | "updatedAt">;

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
  // PoolBackingCurrency
  // ========================================

  interface PoolBackingCurrencyAttributes {
    currency: string;
    capUsd?: number | null;
    thresholdUsd?: number | null;
    networkMap?: Record<string, any> | null;
    lastResidual?: number | null;
    residualStreak: number;
    drift?: number | null;
    driftFirstSeenAt?: Date | null;
    driftAcknowledgedAt?: Date | null;
    driftAcknowledgedBy?: string | null;
    driftAcknowledgedAmount?: number | null;
    notes?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type PoolBackingCurrencyCreationAttributes = Optional<PoolBackingCurrencyAttributes, "capUsd" | "thresholdUsd" | "networkMap" | "lastResidual" | "residualStreak" | "drift" | "driftFirstSeenAt" | "driftAcknowledgedAt" | "driftAcknowledgedBy" | "driftAcknowledgedAmount" | "notes" | "createdAt" | "updatedAt">;

  interface PoolBackingCurrencyInstance extends Model<PoolBackingCurrencyAttributes, PoolBackingCurrencyCreationAttributes>, PoolBackingCurrencyAttributes {
  }

  // ========================================
  // PoolBackingCustodyRead
  // ========================================

  interface PoolBackingCustodyReadAttributes {
    id: string;
    currency: string;
    chain: string;
    address: string;
    walletId?: string | null;
    kind: "treasury" | "master" | "custodial" | "customer";
    balance?: number | null;
    readAt?: Date | null;
    error?: string | null;
    attemptedAt?: Date | null;
    source: "chain" | "utxo_pool" | "mirror";
    createdAt?: Date;
    updatedAt?: Date;
  }

  type PoolBackingCustodyReadCreationAttributes = Optional<PoolBackingCustodyReadAttributes, "id" | "walletId" | "balance" | "readAt" | "error" | "attemptedAt" | "source" | "createdAt" | "updatedAt">;

  interface PoolBackingCustodyReadInstance extends Model<PoolBackingCustodyReadAttributes, PoolBackingCustodyReadCreationAttributes>, PoolBackingCustodyReadAttributes {
  }

  // ========================================
  // PoolBackingObligation
  // ========================================

  interface PoolBackingObligationAttributes {
    id: string;
    currency: string;
    side: "both" | "exchange" | "ecosystem";
    chain?: string | null;
    amount: number;
    source: "transfer" | "conversion" | "fiat_transfer" | "admin" | "minted" | "exchange_fee";
    status: "OPEN" | "CLAIMED" | "SETTLED" | "WAIVED" | "CANCELLED";
    nettable: boolean;
    sourceRef?: string | null;
    legs?: Record<string, any> | null;
    evidence?: Record<string, any> | null;
    settlementId?: string | null;
    createdBy?: string | null;
    waivedBy?: string | null;
    waiveReason?: string | null;
    waivedAt?: Date | null;
    settledAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type PoolBackingObligationCreationAttributes = Optional<PoolBackingObligationAttributes, "id" | "side" | "chain" | "status" | "nettable" | "sourceRef" | "legs" | "evidence" | "settlementId" | "createdBy" | "waivedBy" | "waiveReason" | "waivedAt" | "settledAt" | "createdAt" | "updatedAt">;

  interface PoolBackingObligationInstance extends Model<PoolBackingObligationAttributes, PoolBackingObligationCreationAttributes>, PoolBackingObligationAttributes {
  }

  // ========================================
  // PoolBackingReconciliation
  // ========================================

  interface PoolBackingReconciliationAttributes {
    id: string;
    runId: string;
    currency: string;
    at: Date;
    status: "ok" | "h_unknown";
    liabilities: number;
    liabilitiesSplit?: Record<string, any> | null;
    holdings?: number | null;
    holdingsSplit?: Record<string, any> | null;
    ecosystemSplit?: Record<string, any> | null;
    ecosystemError?: string | null;
    inFlight: number;
    gap?: number | null;
    openObligations: number;
    residual?: number | null;
    drift?: number | null;
    driftRunStreak: number;
    holdingsStale: boolean;
    createdAt?: Date;
  }

  type PoolBackingReconciliationCreationAttributes = Optional<PoolBackingReconciliationAttributes, "id" | "status" | "liabilitiesSplit" | "holdings" | "holdingsSplit" | "ecosystemSplit" | "ecosystemError" | "inFlight" | "gap" | "openObligations" | "residual" | "drift" | "driftRunStreak" | "holdingsStale" | "createdAt">;

  interface PoolBackingReconciliationInstance extends Model<PoolBackingReconciliationAttributes, PoolBackingReconciliationCreationAttributes>, PoolBackingReconciliationAttributes {
  }

  // ========================================
  // PoolBackingSettlement
  // ========================================

  interface PoolBackingSettlementAttributes {
    id: string;
    currency: string;
    direction: "eco_to_exchange" | "exchange_to_eco" | "external" | "exchange_convert";
    chain?: string | null;
    network?: string | null;
    amountRequested: number;
    amountSent?: number | null;
    amountReceived?: number | null;
    status: "PLANNED" | "DISPATCHED" | "CONFIRMED" | "SETTLED" | "NEEDS_REVIEW" | "FAILED" | "RECORDED";
    activeKey?: string | null;
    txid?: string | null;
    proof?: Record<string, any> | null;
    fees?: Record<string, any> | null;
    initiatedBy?: string | null;
    note?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type PoolBackingSettlementCreationAttributes = Optional<PoolBackingSettlementAttributes, "id" | "chain" | "network" | "amountSent" | "amountReceived" | "status" | "activeKey" | "txid" | "proof" | "fees" | "initiatedBy" | "note" | "createdAt" | "updatedAt">;

  interface PoolBackingSettlementInstance extends Model<PoolBackingSettlementAttributes, PoolBackingSettlementCreationAttributes>, PoolBackingSettlementAttributes {
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

  type PostCreationAttributes = Optional<PostAttributes, "id" | "description" | "status" | "image" | "views" | "createdAt" | "deletedAt" | "updatedAt">;

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
    isPrimary?: boolean | null;
    chainId?: number | null;
    verifiedAt?: Date | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type ProviderUserCreationAttributes = Optional<ProviderUserAttributes, "id" | "isPrimary" | "chainId" | "verifiedAt" | "createdAt" | "deletedAt" | "updatedAt">;

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
  // SiteChrome
  // ========================================

  interface SiteChromeAttributes {
    id: string;
    navbarVariant: string;
    footerVariant: string;
    menuOverrides?: any | null;
    footerContent?: any | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
  }

  type SiteChromeCreationAttributes = Optional<SiteChromeAttributes, "id" | "navbarVariant" | "footerVariant" | "menuOverrides" | "footerContent" | "createdAt" | "updatedAt">;

  interface SiteChromeInstance extends Model<SiteChromeAttributes, SiteChromeCreationAttributes>, SiteChromeAttributes {
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
  // SpotDepositIntent
  // ========================================

  interface SpotDepositIntentAttributes {
    id: string;
    userId: string;
    walletId?: string | null;
    currency: string;
    network: string;
    chain?: string | null;
    mode: "hash_claim" | "amount_match" | "ecosystem_custody";
    declaredAmount?: number | null;
    expectedAmount?: number | null;
    address?: string | null;
    tag?: string | null;
    status: "OPEN" | "MATCHED" | "SWEEPING" | "CREDITED" | "EXPIRED" | "CANCELLED" | "FAILED" | "REVIEW";
    activeAmountKey?: string | null;
    claimedTxid?: string | null;
    matchedDepositId?: string | null;
    sweepTransactionId?: string | null;
    spotTransactionId?: string | null;
    metadata?: Record<string, any> | null;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type SpotDepositIntentCreationAttributes = Optional<SpotDepositIntentAttributes, "id" | "walletId" | "chain" | "declaredAmount" | "expectedAmount" | "address" | "tag" | "status" | "activeAmountKey" | "claimedTxid" | "matchedDepositId" | "sweepTransactionId" | "spotTransactionId" | "metadata" | "createdAt" | "updatedAt">;

  interface SpotDepositIntentInstance extends Model<SpotDepositIntentAttributes, SpotDepositIntentCreationAttributes>, SpotDepositIntentAttributes {
    user?: UserInstance;
    wallet?: WalletInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getWallet: Sequelize.BelongsToGetAssociationMixin<WalletInstance>;
    setWallet: Sequelize.BelongsToSetAssociationMixin<WalletInstance, string>;
    createWallet: Sequelize.BelongsToCreateAssociationMixin<WalletInstance>;
  }

  // ========================================
  // StakingAdminActivity
  // ========================================

  interface StakingAdminActivityAttributes {
    id: string;
    userId: string | null;
    action: "create" | "update" | "delete" | "approve" | "reject" | "distribute";
    type: "pool" | "position" | "earnings" | "settings" | "withdrawal";
    relatedId: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    metadata?: string | null;
  }

  type StakingAdminActivityCreationAttributes = Optional<StakingAdminActivityAttributes, "id" | "userId" | "relatedId" | "createdAt" | "updatedAt" | "deletedAt" | "metadata">;

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
    type: "PLATFORM_FEE" | "EARLY_WITHDRAWAL_FEE" | "PERFORMANCE_FEE" | "OTHER" | "STAKING_COMMISSION";
    currency: string;
    periodBucket: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type StakingAdminEarningCreationAttributes = Optional<StakingAdminEarningAttributes, "id" | "isClaimed" | "periodBucket" | "createdAt" | "updatedAt" | "deletedAt">;

  interface StakingAdminEarningInstance extends Model<StakingAdminEarningAttributes, StakingAdminEarningCreationAttributes>, StakingAdminEarningAttributes {
    pool?: StakingPoolInstance;
    getPool: Sequelize.BelongsToGetAssociationMixin<StakingPoolInstance>;
    setPool: Sequelize.BelongsToSetAssociationMixin<StakingPoolInstance, string>;
    createPool: Sequelize.BelongsToCreateAssociationMixin<StakingPoolInstance>;
  }

  // ========================================
  // StakingBatch
  // ========================================

  interface StakingBatchAttributes {
    id: string;
    poolId: string | null;
    chain: string;
    network: string;
    kind: "GATHER" | "DELEGATE" | "EXIT" | "CLAIM" | "RETURN" | "REFUND" | "COMMISSION_EXIT" | "SWEEP" | "LIQUID_EXIT";
    status: "PENDING" | "BROADCAST" | "CONFIRMED" | "RETRYING" | "FAILED";
    stakingWalletId: string | null;
    intentDigest: string | null;
    intent: string | null;
    txHash: string | null;
    broadcastMeta: string | null;
    metadata: string | null;
    networkFee: number;
    amount: number;
    attempts: number;
    lastError: string | null;
    broadcastAt: Date | null;
    confirmedAt: Date | null;
    createdBy: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type StakingBatchCreationAttributes = Optional<StakingBatchAttributes, "id" | "poolId" | "status" | "stakingWalletId" | "intentDigest" | "intent" | "txHash" | "broadcastMeta" | "metadata" | "networkFee" | "amount" | "attempts" | "lastError" | "broadcastAt" | "confirmedAt" | "createdBy" | "createdAt" | "updatedAt">;

  interface StakingBatchInstance extends Model<StakingBatchAttributes, StakingBatchCreationAttributes>, StakingBatchAttributes {
    pool?: StakingPoolInstance;
    stakingWallet?: StakingChainWalletInstance;
    getPool: Sequelize.BelongsToGetAssociationMixin<StakingPoolInstance>;
    setPool: Sequelize.BelongsToSetAssociationMixin<StakingPoolInstance, string>;
    createPool: Sequelize.BelongsToCreateAssociationMixin<StakingPoolInstance>;
    getStakingWallet: Sequelize.BelongsToGetAssociationMixin<StakingChainWalletInstance>;
    setStakingWallet: Sequelize.BelongsToSetAssociationMixin<StakingChainWalletInstance, string>;
    createStakingWallet: Sequelize.BelongsToCreateAssociationMixin<StakingChainWalletInstance>;
  }

  // ========================================
  // StakingChainActivation
  // ========================================

  interface StakingChainActivationAttributes {
    id: string;
    chain: string;
    network: string;
    venue: "SOLANA_NATIVE" | "LIDO_STETH";
    status: "DRAFT" | "ACTIVE" | "PAUSED" | "RETIRED";
    stakingWalletId: string | null;
    validatorSetId: string | null;
    defaultCommissionPercent: number;
    commissionNoticeDays: number;
    slashingPolicy: "PASS_THROUGH" | "REIMBURSE_CAPPED";
    slashingReimburseCap: number | null;
    licensed: boolean;
    regulator: string | null;
    licenceReference: string | null;
    jurisdictionsServed: string | null;
    ringFenceAcknowledged: boolean;
    noGuaranteeAcknowledged: boolean;
    validatorDueDiligence: string | null;
    sfcAttestation: boolean;
    disclosureVersion: string | null;
    disclosureHash: string | null;
    disclosureText: string | null;
    acceptedBy: string | null;
    acceptedAt: Date | null;
    acceptedIp: string | null;
    acceptedUserAgent: string | null;
    activatedAt: Date | null;
    pausedAt: Date | null;
    pausedBy: string | null;
    pausedReason: string | null;
    retiredAt: Date | null;
    createdBy: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type StakingChainActivationCreationAttributes = Optional<StakingChainActivationAttributes, "id" | "status" | "stakingWalletId" | "validatorSetId" | "defaultCommissionPercent" | "commissionNoticeDays" | "slashingPolicy" | "slashingReimburseCap" | "licensed" | "regulator" | "licenceReference" | "jurisdictionsServed" | "ringFenceAcknowledged" | "noGuaranteeAcknowledged" | "validatorDueDiligence" | "sfcAttestation" | "disclosureVersion" | "disclosureHash" | "disclosureText" | "acceptedBy" | "acceptedAt" | "acceptedIp" | "acceptedUserAgent" | "activatedAt" | "pausedAt" | "pausedBy" | "pausedReason" | "retiredAt" | "createdBy" | "createdAt" | "updatedAt">;

  interface StakingChainActivationInstance extends Model<StakingChainActivationAttributes, StakingChainActivationCreationAttributes>, StakingChainActivationAttributes {
    pools?: StakingPoolInstance[];
    consents?: StakingConsentInstance[];
    stakingWallet?: StakingChainWalletInstance;
    validatorSet?: StakingValidatorSetInstance;
    getPools: Sequelize.HasManyGetAssociationsMixin<StakingPoolInstance>;
    setPools: Sequelize.HasManySetAssociationsMixin<StakingPoolInstance, string>;
    addStakingPool: Sequelize.HasManyAddAssociationMixin<StakingPoolInstance, string>;
    addPools: Sequelize.HasManyAddAssociationsMixin<StakingPoolInstance, string>;
    removeStakingPool: Sequelize.HasManyRemoveAssociationMixin<StakingPoolInstance, string>;
    removePools: Sequelize.HasManyRemoveAssociationsMixin<StakingPoolInstance, string>;
    hasStakingPool: Sequelize.HasManyHasAssociationMixin<StakingPoolInstance, string>;
    hasPools: Sequelize.HasManyHasAssociationsMixin<StakingPoolInstance, string>;
    countPools: Sequelize.HasManyCountAssociationsMixin;
    createStakingPool: Sequelize.HasManyCreateAssociationMixin<StakingPoolInstance>;
    getConsents: Sequelize.HasManyGetAssociationsMixin<StakingConsentInstance>;
    setConsents: Sequelize.HasManySetAssociationsMixin<StakingConsentInstance, string>;
    addStakingConsent: Sequelize.HasManyAddAssociationMixin<StakingConsentInstance, string>;
    addConsents: Sequelize.HasManyAddAssociationsMixin<StakingConsentInstance, string>;
    removeStakingConsent: Sequelize.HasManyRemoveAssociationMixin<StakingConsentInstance, string>;
    removeConsents: Sequelize.HasManyRemoveAssociationsMixin<StakingConsentInstance, string>;
    hasStakingConsent: Sequelize.HasManyHasAssociationMixin<StakingConsentInstance, string>;
    hasConsents: Sequelize.HasManyHasAssociationsMixin<StakingConsentInstance, string>;
    countConsents: Sequelize.HasManyCountAssociationsMixin;
    createStakingConsent: Sequelize.HasManyCreateAssociationMixin<StakingConsentInstance>;
    getStakingWallet: Sequelize.BelongsToGetAssociationMixin<StakingChainWalletInstance>;
    setStakingWallet: Sequelize.BelongsToSetAssociationMixin<StakingChainWalletInstance, string>;
    createStakingWallet: Sequelize.BelongsToCreateAssociationMixin<StakingChainWalletInstance>;
    getValidatorSet: Sequelize.BelongsToGetAssociationMixin<StakingValidatorSetInstance>;
    setValidatorSet: Sequelize.BelongsToSetAssociationMixin<StakingValidatorSetInstance, string>;
    createValidatorSet: Sequelize.BelongsToCreateAssociationMixin<StakingValidatorSetInstance>;
  }

  // ========================================
  // StakingChainWallet
  // ========================================

  interface StakingChainWalletAttributes {
    id: string;
    chain: string;
    network: string;
    currency: string;
    address: string;
    data: string;
    role: "STAKING";
    status: "ACTIVE" | "FROZEN";
    balance: number;
    gasReserveFloor: number;
    lastObservedAt: Date | null;
    frozenAt: Date | null;
    frozenBy: string | null;
    frozenReason: string | null;
    createdBy: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type StakingChainWalletCreationAttributes = Optional<StakingChainWalletAttributes, "id" | "role" | "status" | "balance" | "gasReserveFloor" | "lastObservedAt" | "frozenAt" | "frozenBy" | "frozenReason" | "createdBy" | "createdAt" | "updatedAt">;

  interface StakingChainWalletInstance extends Model<StakingChainWalletAttributes, StakingChainWalletCreationAttributes>, StakingChainWalletAttributes {
    pools?: StakingPoolInstance[];
    activations?: StakingChainActivationInstance[];
    getPools: Sequelize.HasManyGetAssociationsMixin<StakingPoolInstance>;
    setPools: Sequelize.HasManySetAssociationsMixin<StakingPoolInstance, string>;
    addStakingPool: Sequelize.HasManyAddAssociationMixin<StakingPoolInstance, string>;
    addPools: Sequelize.HasManyAddAssociationsMixin<StakingPoolInstance, string>;
    removeStakingPool: Sequelize.HasManyRemoveAssociationMixin<StakingPoolInstance, string>;
    removePools: Sequelize.HasManyRemoveAssociationsMixin<StakingPoolInstance, string>;
    hasStakingPool: Sequelize.HasManyHasAssociationMixin<StakingPoolInstance, string>;
    hasPools: Sequelize.HasManyHasAssociationsMixin<StakingPoolInstance, string>;
    countPools: Sequelize.HasManyCountAssociationsMixin;
    createStakingPool: Sequelize.HasManyCreateAssociationMixin<StakingPoolInstance>;
    getActivations: Sequelize.HasManyGetAssociationsMixin<StakingChainActivationInstance>;
    setActivations: Sequelize.HasManySetAssociationsMixin<StakingChainActivationInstance, string>;
    addStakingChainActivation: Sequelize.HasManyAddAssociationMixin<StakingChainActivationInstance, string>;
    addActivations: Sequelize.HasManyAddAssociationsMixin<StakingChainActivationInstance, string>;
    removeStakingChainActivation: Sequelize.HasManyRemoveAssociationMixin<StakingChainActivationInstance, string>;
    removeActivations: Sequelize.HasManyRemoveAssociationsMixin<StakingChainActivationInstance, string>;
    hasStakingChainActivation: Sequelize.HasManyHasAssociationMixin<StakingChainActivationInstance, string>;
    hasActivations: Sequelize.HasManyHasAssociationsMixin<StakingChainActivationInstance, string>;
    countActivations: Sequelize.HasManyCountAssociationsMixin;
    createStakingChainActivation: Sequelize.HasManyCreateAssociationMixin<StakingChainActivationInstance>;
  }

  // ========================================
  // StakingCommissionExit
  // ========================================

  interface StakingCommissionExitAttributes {
    id: string;
    poolId: string;
    chain: string;
    network: string;
    status: "QUEUED" | "UNBONDING" | "SETTLED" | "PAID" | "FAILED";
    shares: number;
    requestSharePrice: number;
    requestedValue: number;
    settledAmount: number | null;
    settledAt: Date | null;
    destination: string | null;
    exitBatchId: string | null;
    payoutBatchId: string | null;
    txHash: string | null;
    networkFee: number;
    failureReason: string | null;
    requestedBy: string | null;
    requestedAt: Date;
    paidAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type StakingCommissionExitCreationAttributes = Optional<StakingCommissionExitAttributes, "id" | "status" | "shares" | "requestSharePrice" | "requestedValue" | "settledAmount" | "settledAt" | "destination" | "exitBatchId" | "payoutBatchId" | "txHash" | "networkFee" | "failureReason" | "requestedBy" | "requestedAt" | "paidAt" | "createdAt" | "updatedAt">;

  interface StakingCommissionExitInstance extends Model<StakingCommissionExitAttributes, StakingCommissionExitCreationAttributes>, StakingCommissionExitAttributes {
    pool?: StakingPoolInstance;
    getPool: Sequelize.BelongsToGetAssociationMixin<StakingPoolInstance>;
    setPool: Sequelize.BelongsToSetAssociationMixin<StakingPoolInstance, string>;
    createPool: Sequelize.BelongsToCreateAssociationMixin<StakingPoolInstance>;
  }

  // ========================================
  // StakingConsent
  // ========================================

  interface StakingConsentAttributes {
    id: string;
    userId: string;
    poolId: string;
    activationId: string | null;
    version: string;
    hash: string;
    text: string;
    acknowledgements: string | null;
    acceptedAt: Date;
    ip: string | null;
    userAgent: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type StakingConsentCreationAttributes = Optional<StakingConsentAttributes, "id" | "activationId" | "acknowledgements" | "ip" | "userAgent" | "createdAt" | "updatedAt">;

  interface StakingConsentInstance extends Model<StakingConsentAttributes, StakingConsentCreationAttributes>, StakingConsentAttributes {
    positions?: StakingPositionInstance[];
    user?: UserInstance;
    pool?: StakingPoolInstance;
    activation?: StakingChainActivationInstance;
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
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getPool: Sequelize.BelongsToGetAssociationMixin<StakingPoolInstance>;
    setPool: Sequelize.BelongsToSetAssociationMixin<StakingPoolInstance, string>;
    createPool: Sequelize.BelongsToCreateAssociationMixin<StakingPoolInstance>;
    getActivation: Sequelize.BelongsToGetAssociationMixin<StakingChainActivationInstance>;
    setActivation: Sequelize.BelongsToSetAssociationMixin<StakingChainActivationInstance, string>;
    createActivation: Sequelize.BelongsToCreateAssociationMixin<StakingChainActivationInstance>;
  }

  // ========================================
  // StakingDuration
  // ========================================

  interface StakingDurationAttributes {
    id: string;
    poolId: string;
    name: string | null;
    lockPeriod: number;
    apr: number;
    earningFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM";
    autoCompound: boolean | null;
    minStake: number | null;
    maxStake: number | null;
    adminFeePercentage: number | null;
    earlyWithdrawalFee: number | null;
    status: "ACTIVE" | "INACTIVE";
    isFeatured: boolean;
    order: number;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type StakingDurationCreationAttributes = Optional<StakingDurationAttributes, "id" | "name" | "earningFrequency" | "autoCompound" | "minStake" | "maxStake" | "adminFeePercentage" | "earlyWithdrawalFee" | "status" | "isFeatured" | "order" | "createdAt" | "updatedAt" | "deletedAt">;

  interface StakingDurationInstance extends Model<StakingDurationAttributes, StakingDurationCreationAttributes>, StakingDurationAttributes {
    positions?: StakingPositionInstance[];
    pool?: StakingPoolInstance;
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
    settlement: "CLAIMABLE" | "COMPOUNDED" | null;
    observationId: string | null;
    description: string;
    isClaimed: boolean;
    claimedAt: Date | null;
    periodBucket: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type StakingEarningRecordCreationAttributes = Optional<StakingEarningRecordAttributes, "id" | "type" | "settlement" | "observationId" | "isClaimed" | "claimedAt" | "periodBucket" | "createdAt" | "updatedAt" | "deletedAt">;

  interface StakingEarningRecordInstance extends Model<StakingEarningRecordAttributes, StakingEarningRecordCreationAttributes>, StakingEarningRecordAttributes {
    position?: StakingPositionInstance;
    observation?: StakingObservationInstance;
    getPosition: Sequelize.BelongsToGetAssociationMixin<StakingPositionInstance>;
    setPosition: Sequelize.BelongsToSetAssociationMixin<StakingPositionInstance, string>;
    createPosition: Sequelize.BelongsToCreateAssociationMixin<StakingPositionInstance>;
    getObservation: Sequelize.BelongsToGetAssociationMixin<StakingObservationInstance>;
    setObservation: Sequelize.BelongsToSetAssociationMixin<StakingObservationInstance, string>;
    createObservation: Sequelize.BelongsToCreateAssociationMixin<StakingObservationInstance>;
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
    notes: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type StakingExternalPoolPerformanceCreationAttributes = Optional<StakingExternalPoolPerformanceAttributes, "id" | "notes" | "createdAt" | "updatedAt" | "deletedAt">;

  interface StakingExternalPoolPerformanceInstance extends Model<StakingExternalPoolPerformanceAttributes, StakingExternalPoolPerformanceCreationAttributes>, StakingExternalPoolPerformanceAttributes {
    pool?: StakingPoolInstance;
    getPool: Sequelize.BelongsToGetAssociationMixin<StakingPoolInstance>;
    setPool: Sequelize.BelongsToSetAssociationMixin<StakingPoolInstance, string>;
    createPool: Sequelize.BelongsToCreateAssociationMixin<StakingPoolInstance>;
  }

  // ========================================
  // StakingIncident
  // ========================================

  interface StakingIncidentAttributes {
    id: string;
    poolId: string | null;
    chain: string | null;
    kind: "SLASHING" | "DRIFT" | "LOW_GAS" | "VALIDATOR_BREACH" | "BATCH_STUCK" | "OBSERVER_LAG" | "UNBONDING_OVERDUE" | "DELEGATION_STALE" | "COMMISSION" | "OTHER";
    severity: "INFO" | "WARNING" | "CRITICAL";
    status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
    title: string;
    detail: string | null;
    lossAmount: number | null;
    reimbursedAmount: number;
    dedupeKey: string;
    occurrences: number;
    firstSeenAt: Date;
    lastSeenAt: Date;
    acknowledgedBy: string | null;
    acknowledgedAt: Date | null;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    resolution: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type StakingIncidentCreationAttributes = Optional<StakingIncidentAttributes, "id" | "poolId" | "chain" | "severity" | "status" | "detail" | "lossAmount" | "reimbursedAmount" | "occurrences" | "acknowledgedBy" | "acknowledgedAt" | "resolvedBy" | "resolvedAt" | "resolution" | "createdAt" | "updatedAt">;

  interface StakingIncidentInstance extends Model<StakingIncidentAttributes, StakingIncidentCreationAttributes>, StakingIncidentAttributes {
    pool?: StakingPoolInstance;
    getPool: Sequelize.BelongsToGetAssociationMixin<StakingPoolInstance>;
    setPool: Sequelize.BelongsToSetAssociationMixin<StakingPoolInstance, string>;
    createPool: Sequelize.BelongsToCreateAssociationMixin<StakingPoolInstance>;
  }

  // ========================================
  // StakingObservation
  // ========================================

  interface StakingObservationAttributes {
    id: string;
    poolId: string;
    chain: string;
    window: string;
    epoch: number | null;
    observedAt: Date;
    valueBefore: number;
    valueAfter: number;
    grossReward: number;
    commissionAmount: number;
    commissionShares: number;
    netReward: number;
    sharePriceBefore: number;
    sharePriceAfter: number;
    totalShares: number;
    positionsCredited: number;
    detail: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type StakingObservationCreationAttributes = Optional<StakingObservationAttributes, "id" | "epoch" | "valueBefore" | "valueAfter" | "grossReward" | "commissionAmount" | "commissionShares" | "netReward" | "sharePriceBefore" | "sharePriceAfter" | "totalShares" | "positionsCredited" | "detail" | "createdAt" | "updatedAt">;

  interface StakingObservationInstance extends Model<StakingObservationAttributes, StakingObservationCreationAttributes>, StakingObservationAttributes {
    earnings?: StakingEarningRecordInstance[];
    pool?: StakingPoolInstance;
    getEarnings: Sequelize.HasManyGetAssociationsMixin<StakingEarningRecordInstance>;
    setEarnings: Sequelize.HasManySetAssociationsMixin<StakingEarningRecordInstance, string>;
    addStakingEarningRecord: Sequelize.HasManyAddAssociationMixin<StakingEarningRecordInstance, string>;
    addEarnings: Sequelize.HasManyAddAssociationsMixin<StakingEarningRecordInstance, string>;
    removeStakingEarningRecord: Sequelize.HasManyRemoveAssociationMixin<StakingEarningRecordInstance, string>;
    removeEarnings: Sequelize.HasManyRemoveAssociationsMixin<StakingEarningRecordInstance, string>;
    hasStakingEarningRecord: Sequelize.HasManyHasAssociationMixin<StakingEarningRecordInstance, string>;
    hasEarnings: Sequelize.HasManyHasAssociationsMixin<StakingEarningRecordInstance, string>;
    countEarnings: Sequelize.HasManyCountAssociationsMixin;
    createStakingEarningRecord: Sequelize.HasManyCreateAssociationMixin<StakingEarningRecordInstance>;
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
    mode: "SYNTHETIC" | "REAL";
    apr: number | null;
    lockPeriod: number | null;
    minStake: number;
    maxStake: number | null;
    availableToStake: number | null;
    earlyWithdrawalFee: number | null;
    adminFeePercentage: number;
    status: "ACTIVE" | "INACTIVE" | "COMING_SOON";
    isPromoted: boolean;
    order: number;
    earningFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM" | null;
    autoCompound: boolean | null;
    externalPoolUrl: string | null;
    profitSource: string | null;
    fundAllocation: string | null;
    risks: string;
    rewards: string;
    venue: "SOLANA_NATIVE" | "LIDO_STETH" | null;
    activationId: string | null;
    stakingWalletId: string | null;
    validatorSetId: string | null;
    totalShares: number;
    sharePrice: number;
    onchainValue: number;
    unallocatedValue: number;
    treasuryShares: number;
    lastObservedAt: Date | null;
    lastObservedEpoch: number | null;
    trailingRewardRateBps: number | null;
    activationDelaySeconds: number | null;
    unbondingEstimateSeconds: number | null;
    unbondingBoundSeconds: number | null;
    disclosureVersion: string | null;
    commissionEffectiveAt: Date | null;
    pendingAdminFeePercentage: number | null;
    slashingPolicy: "PASS_THROUGH" | "REIMBURSE_CAPPED" | null;
    slashingReimburseCap: number | null;
    intakeStatus: "OPEN" | "PAUSED";
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
    liquidExitEnabled?: boolean;
    liquidExitMaxSlippageBps?: number;
  }

  type StakingPoolCreationAttributes = Optional<StakingPoolAttributes, "id" | "icon" | "walletType" | "walletChain" | "mode" | "apr" | "lockPeriod" | "maxStake" | "availableToStake" | "earlyWithdrawalFee" | "adminFeePercentage" | "status" | "isPromoted" | "order" | "earningFrequency" | "autoCompound" | "externalPoolUrl" | "profitSource" | "fundAllocation" | "venue" | "activationId" | "stakingWalletId" | "validatorSetId" | "totalShares" | "sharePrice" | "onchainValue" | "unallocatedValue" | "treasuryShares" | "lastObservedAt" | "lastObservedEpoch" | "trailingRewardRateBps" | "activationDelaySeconds" | "unbondingEstimateSeconds" | "unbondingBoundSeconds" | "disclosureVersion" | "commissionEffectiveAt" | "pendingAdminFeePercentage" | "slashingPolicy" | "slashingReimburseCap" | "intakeStatus" | "createdAt" | "updatedAt" | "deletedAt" | "liquidExitEnabled" | "liquidExitMaxSlippageBps">;

  interface StakingPoolInstance extends Model<StakingPoolAttributes, StakingPoolCreationAttributes>, StakingPoolAttributes {
    positions?: StakingPositionInstance[];
    durations?: StakingDurationInstance[];
    adminEarnings?: StakingAdminEarningInstance[];
    performances?: StakingExternalPoolPerformanceInstance[];
    tranches?: StakingTrancheInstance[];
    observations?: StakingObservationInstance[];
    batches?: StakingBatchInstance[];
    incidents?: StakingIncidentInstance[];
    activation?: StakingChainActivationInstance;
    stakingWallet?: StakingChainWalletInstance;
    validatorSet?: StakingValidatorSetInstance;
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
    getDurations: Sequelize.HasManyGetAssociationsMixin<StakingDurationInstance>;
    setDurations: Sequelize.HasManySetAssociationsMixin<StakingDurationInstance, string>;
    addStakingDuration: Sequelize.HasManyAddAssociationMixin<StakingDurationInstance, string>;
    addDurations: Sequelize.HasManyAddAssociationsMixin<StakingDurationInstance, string>;
    removeStakingDuration: Sequelize.HasManyRemoveAssociationMixin<StakingDurationInstance, string>;
    removeDurations: Sequelize.HasManyRemoveAssociationsMixin<StakingDurationInstance, string>;
    hasStakingDuration: Sequelize.HasManyHasAssociationMixin<StakingDurationInstance, string>;
    hasDurations: Sequelize.HasManyHasAssociationsMixin<StakingDurationInstance, string>;
    countDurations: Sequelize.HasManyCountAssociationsMixin;
    createStakingDuration: Sequelize.HasManyCreateAssociationMixin<StakingDurationInstance>;
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
    getTranches: Sequelize.HasManyGetAssociationsMixin<StakingTrancheInstance>;
    setTranches: Sequelize.HasManySetAssociationsMixin<StakingTrancheInstance, string>;
    addStakingTranche: Sequelize.HasManyAddAssociationMixin<StakingTrancheInstance, string>;
    addTranches: Sequelize.HasManyAddAssociationsMixin<StakingTrancheInstance, string>;
    removeStakingTranche: Sequelize.HasManyRemoveAssociationMixin<StakingTrancheInstance, string>;
    removeTranches: Sequelize.HasManyRemoveAssociationsMixin<StakingTrancheInstance, string>;
    hasStakingTranche: Sequelize.HasManyHasAssociationMixin<StakingTrancheInstance, string>;
    hasTranches: Sequelize.HasManyHasAssociationsMixin<StakingTrancheInstance, string>;
    countTranches: Sequelize.HasManyCountAssociationsMixin;
    createStakingTranche: Sequelize.HasManyCreateAssociationMixin<StakingTrancheInstance>;
    getObservations: Sequelize.HasManyGetAssociationsMixin<StakingObservationInstance>;
    setObservations: Sequelize.HasManySetAssociationsMixin<StakingObservationInstance, string>;
    addStakingObservation: Sequelize.HasManyAddAssociationMixin<StakingObservationInstance, string>;
    addObservations: Sequelize.HasManyAddAssociationsMixin<StakingObservationInstance, string>;
    removeStakingObservation: Sequelize.HasManyRemoveAssociationMixin<StakingObservationInstance, string>;
    removeObservations: Sequelize.HasManyRemoveAssociationsMixin<StakingObservationInstance, string>;
    hasStakingObservation: Sequelize.HasManyHasAssociationMixin<StakingObservationInstance, string>;
    hasObservations: Sequelize.HasManyHasAssociationsMixin<StakingObservationInstance, string>;
    countObservations: Sequelize.HasManyCountAssociationsMixin;
    createStakingObservation: Sequelize.HasManyCreateAssociationMixin<StakingObservationInstance>;
    getBatches: Sequelize.HasManyGetAssociationsMixin<StakingBatchInstance>;
    setBatches: Sequelize.HasManySetAssociationsMixin<StakingBatchInstance, string>;
    addStakingBatch: Sequelize.HasManyAddAssociationMixin<StakingBatchInstance, string>;
    addBatches: Sequelize.HasManyAddAssociationsMixin<StakingBatchInstance, string>;
    removeStakingBatch: Sequelize.HasManyRemoveAssociationMixin<StakingBatchInstance, string>;
    removeBatches: Sequelize.HasManyRemoveAssociationsMixin<StakingBatchInstance, string>;
    hasStakingBatch: Sequelize.HasManyHasAssociationMixin<StakingBatchInstance, string>;
    hasBatches: Sequelize.HasManyHasAssociationsMixin<StakingBatchInstance, string>;
    countBatches: Sequelize.HasManyCountAssociationsMixin;
    createStakingBatch: Sequelize.HasManyCreateAssociationMixin<StakingBatchInstance>;
    getIncidents: Sequelize.HasManyGetAssociationsMixin<StakingIncidentInstance>;
    setIncidents: Sequelize.HasManySetAssociationsMixin<StakingIncidentInstance, string>;
    addStakingIncident: Sequelize.HasManyAddAssociationMixin<StakingIncidentInstance, string>;
    addIncidents: Sequelize.HasManyAddAssociationsMixin<StakingIncidentInstance, string>;
    removeStakingIncident: Sequelize.HasManyRemoveAssociationMixin<StakingIncidentInstance, string>;
    removeIncidents: Sequelize.HasManyRemoveAssociationsMixin<StakingIncidentInstance, string>;
    hasStakingIncident: Sequelize.HasManyHasAssociationMixin<StakingIncidentInstance, string>;
    hasIncidents: Sequelize.HasManyHasAssociationsMixin<StakingIncidentInstance, string>;
    countIncidents: Sequelize.HasManyCountAssociationsMixin;
    createStakingIncident: Sequelize.HasManyCreateAssociationMixin<StakingIncidentInstance>;
    getActivation: Sequelize.BelongsToGetAssociationMixin<StakingChainActivationInstance>;
    setActivation: Sequelize.BelongsToSetAssociationMixin<StakingChainActivationInstance, string>;
    createActivation: Sequelize.BelongsToCreateAssociationMixin<StakingChainActivationInstance>;
    getStakingWallet: Sequelize.BelongsToGetAssociationMixin<StakingChainWalletInstance>;
    setStakingWallet: Sequelize.BelongsToSetAssociationMixin<StakingChainWalletInstance, string>;
    createStakingWallet: Sequelize.BelongsToCreateAssociationMixin<StakingChainWalletInstance>;
    getValidatorSet: Sequelize.BelongsToGetAssociationMixin<StakingValidatorSetInstance>;
    setValidatorSet: Sequelize.BelongsToSetAssociationMixin<StakingValidatorSetInstance, string>;
    createValidatorSet: Sequelize.BelongsToCreateAssociationMixin<StakingValidatorSetInstance>;
  }

  // ========================================
  // StakingPosition
  // ========================================

  interface StakingPositionAttributes {
    id: string;
    userId: string;
    poolId: string;
    durationId: string | null;
    mode: "SYNTHETIC" | "REAL";
    amount: number;
    startDate: Date;
    endDate: Date | null;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "PENDING_WITHDRAWAL" | "PENDING_DELEGATION" | "UNSTAKE_REQUESTED" | "UNBONDING" | "WITHDRAWABLE" | "FAILED";
    withdrawalRequested: boolean;
    withdrawalRequestDate: Date | null;
    adminNotes: string | null;
    completedAt: Date | null;
    apr: number | null;
    adminFeePercentage: number | null;
    earlyWithdrawalFee: number | null;
    earningFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM" | null;
    autoCompound: boolean | null;
    lockPeriod: number | null;
    lastDistributionDate: Date | null;
    consentId: string | null;
    shares: number | null;
    entrySharePrice: number | null;
    principalOnchain: number | null;
    gatherTxHash: string | null;
    returnTxHash: string | null;
    gatherNetworkFee: number | null;
    returnNetworkFee: number | null;
    unstakeRequestedAt: Date | null;
    unstakeShares: number | null;
    unstakeSharePrice: number | null;
    unbondingEndsAt: Date | null;
    unbondingBoundAt: Date | null;
    settledAmount: number | null;
    settledAt: Date | null;
    failureReason: string | null;
    forceUnstakedBy: string | null;
    forceUnstakeReason: string | null;
    gatherBatchId: string | null;
    exitBatchId: string | null;
    returnBatchId: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type StakingPositionCreationAttributes = Optional<StakingPositionAttributes, "id" | "durationId" | "mode" | "endDate" | "status" | "withdrawalRequested" | "withdrawalRequestDate" | "adminNotes" | "completedAt" | "apr" | "adminFeePercentage" | "earlyWithdrawalFee" | "earningFrequency" | "autoCompound" | "lockPeriod" | "lastDistributionDate" | "consentId" | "shares" | "entrySharePrice" | "principalOnchain" | "gatherTxHash" | "returnTxHash" | "gatherNetworkFee" | "returnNetworkFee" | "unstakeRequestedAt" | "unstakeShares" | "unstakeSharePrice" | "unbondingEndsAt" | "unbondingBoundAt" | "settledAmount" | "settledAt" | "failureReason" | "forceUnstakedBy" | "forceUnstakeReason" | "gatherBatchId" | "exitBatchId" | "returnBatchId" | "createdAt" | "updatedAt" | "deletedAt">;

  interface StakingPositionInstance extends Model<StakingPositionAttributes, StakingPositionCreationAttributes>, StakingPositionAttributes {
    earningHistory?: StakingEarningRecordInstance[];
    pool?: StakingPoolInstance;
    duration?: StakingDurationInstance;
    user?: UserInstance;
    consent?: StakingConsentInstance;
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
    getDuration: Sequelize.BelongsToGetAssociationMixin<StakingDurationInstance>;
    setDuration: Sequelize.BelongsToSetAssociationMixin<StakingDurationInstance, string>;
    createDuration: Sequelize.BelongsToCreateAssociationMixin<StakingDurationInstance>;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
    getConsent: Sequelize.BelongsToGetAssociationMixin<StakingConsentInstance>;
    setConsent: Sequelize.BelongsToSetAssociationMixin<StakingConsentInstance, string>;
    createConsent: Sequelize.BelongsToCreateAssociationMixin<StakingConsentInstance>;
  }

  // ========================================
  // StakingStatement
  // ========================================

  interface StakingStatementAttributes {
    id: string;
    userId: string;
    period: string;
    periodStart: Date;
    periodEnd: Date;
    format: "CSV";
    content: string;
    hash: string;
    totalStaked: number;
    totalRewards: number;
    totalCommission: number;
    summary: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type StakingStatementCreationAttributes = Optional<StakingStatementAttributes, "id" | "format" | "totalStaked" | "totalRewards" | "totalCommission" | "summary" | "createdAt" | "updatedAt">;

  interface StakingStatementInstance extends Model<StakingStatementAttributes, StakingStatementCreationAttributes>, StakingStatementAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // StakingTranche
  // ========================================

  interface StakingTrancheAttributes {
    id: string;
    poolId: string;
    chain: string;
    network: string;
    kind: "SOLANA_STAKE_ACCOUNT" | "LIDO_SHARES";
    stakeAccount: string | null;
    seed: string | null;
    validatorId: string | null;
    status: "CREATING" | "ACTIVATING" | "ACTIVE" | "DEACTIVATING" | "INACTIVE" | "WITHDRAWN" | "FAILED";
    amount: number;
    observedValue: number;
    activationEpoch: number | null;
    deactivationEpoch: number | null;
    lastObservedEpoch: number | null;
    lastObservedAt: Date | null;
    createBatchId: string | null;
    exitBatchId: string | null;
    withdrawBatchId: string | null;
    failureReason: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type StakingTrancheCreationAttributes = Optional<StakingTrancheAttributes, "id" | "stakeAccount" | "seed" | "validatorId" | "status" | "amount" | "observedValue" | "activationEpoch" | "deactivationEpoch" | "lastObservedEpoch" | "lastObservedAt" | "createBatchId" | "exitBatchId" | "withdrawBatchId" | "failureReason" | "createdAt" | "updatedAt">;

  interface StakingTrancheInstance extends Model<StakingTrancheAttributes, StakingTrancheCreationAttributes>, StakingTrancheAttributes {
    pool?: StakingPoolInstance;
    validator?: StakingValidatorInstance;
    getPool: Sequelize.BelongsToGetAssociationMixin<StakingPoolInstance>;
    setPool: Sequelize.BelongsToSetAssociationMixin<StakingPoolInstance, string>;
    createPool: Sequelize.BelongsToCreateAssociationMixin<StakingPoolInstance>;
    getValidator: Sequelize.BelongsToGetAssociationMixin<StakingValidatorInstance>;
    setValidator: Sequelize.BelongsToSetAssociationMixin<StakingValidatorInstance, string>;
    createValidator: Sequelize.BelongsToCreateAssociationMixin<StakingValidatorInstance>;
  }

  // ========================================
  // StakingValidator
  // ========================================

  interface StakingValidatorAttributes {
    id: string;
    validatorSetId: string;
    chain: string;
    voteAccount: string;
    identity: string | null;
    name: string | null;
    weight: number;
    commissionPercent: number | null;
    mevCommissionPercent: number | null;
    asn: string | null;
    status: "ACTIVE" | "SUSPENDED" | "REMOVED";
    lastHealth: string | null;
    lastHealthAt: Date | null;
    breach: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type StakingValidatorCreationAttributes = Optional<StakingValidatorAttributes, "id" | "identity" | "name" | "weight" | "commissionPercent" | "mevCommissionPercent" | "asn" | "status" | "lastHealth" | "lastHealthAt" | "breach" | "createdAt" | "updatedAt">;

  interface StakingValidatorInstance extends Model<StakingValidatorAttributes, StakingValidatorCreationAttributes>, StakingValidatorAttributes {
    tranches?: StakingTrancheInstance[];
    validatorSet?: StakingValidatorSetInstance;
    getTranches: Sequelize.HasManyGetAssociationsMixin<StakingTrancheInstance>;
    setTranches: Sequelize.HasManySetAssociationsMixin<StakingTrancheInstance, string>;
    addStakingTranche: Sequelize.HasManyAddAssociationMixin<StakingTrancheInstance, string>;
    addTranches: Sequelize.HasManyAddAssociationsMixin<StakingTrancheInstance, string>;
    removeStakingTranche: Sequelize.HasManyRemoveAssociationMixin<StakingTrancheInstance, string>;
    removeTranches: Sequelize.HasManyRemoveAssociationsMixin<StakingTrancheInstance, string>;
    hasStakingTranche: Sequelize.HasManyHasAssociationMixin<StakingTrancheInstance, string>;
    hasTranches: Sequelize.HasManyHasAssociationsMixin<StakingTrancheInstance, string>;
    countTranches: Sequelize.HasManyCountAssociationsMixin;
    createStakingTranche: Sequelize.HasManyCreateAssociationMixin<StakingTrancheInstance>;
    getValidatorSet: Sequelize.BelongsToGetAssociationMixin<StakingValidatorSetInstance>;
    setValidatorSet: Sequelize.BelongsToSetAssociationMixin<StakingValidatorSetInstance, string>;
    createValidatorSet: Sequelize.BelongsToCreateAssociationMixin<StakingValidatorSetInstance>;
  }

  // ========================================
  // StakingValidatorSet
  // ========================================

  interface StakingValidatorSetAttributes {
    id: string;
    chain: string;
    network: string;
    name: string;
    status: "ACTIVE" | "RETIRED";
    policy: string | null;
    lastEvaluatedAt: Date | null;
    lastEvaluation: string | null;
    healthy: boolean;
    createdBy: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type StakingValidatorSetCreationAttributes = Optional<StakingValidatorSetAttributes, "id" | "status" | "policy" | "lastEvaluatedAt" | "lastEvaluation" | "healthy" | "createdBy" | "createdAt" | "updatedAt">;

  interface StakingValidatorSetInstance extends Model<StakingValidatorSetAttributes, StakingValidatorSetCreationAttributes>, StakingValidatorSetAttributes {
    validators?: StakingValidatorInstance[];
    pools?: StakingPoolInstance[];
    activations?: StakingChainActivationInstance[];
    getValidators: Sequelize.HasManyGetAssociationsMixin<StakingValidatorInstance>;
    setValidators: Sequelize.HasManySetAssociationsMixin<StakingValidatorInstance, string>;
    addStakingValidator: Sequelize.HasManyAddAssociationMixin<StakingValidatorInstance, string>;
    addValidators: Sequelize.HasManyAddAssociationsMixin<StakingValidatorInstance, string>;
    removeStakingValidator: Sequelize.HasManyRemoveAssociationMixin<StakingValidatorInstance, string>;
    removeValidators: Sequelize.HasManyRemoveAssociationsMixin<StakingValidatorInstance, string>;
    hasStakingValidator: Sequelize.HasManyHasAssociationMixin<StakingValidatorInstance, string>;
    hasValidators: Sequelize.HasManyHasAssociationsMixin<StakingValidatorInstance, string>;
    countValidators: Sequelize.HasManyCountAssociationsMixin;
    createStakingValidator: Sequelize.HasManyCreateAssociationMixin<StakingValidatorInstance>;
    getPools: Sequelize.HasManyGetAssociationsMixin<StakingPoolInstance>;
    setPools: Sequelize.HasManySetAssociationsMixin<StakingPoolInstance, string>;
    addStakingPool: Sequelize.HasManyAddAssociationMixin<StakingPoolInstance, string>;
    addPools: Sequelize.HasManyAddAssociationsMixin<StakingPoolInstance, string>;
    removeStakingPool: Sequelize.HasManyRemoveAssociationMixin<StakingPoolInstance, string>;
    removePools: Sequelize.HasManyRemoveAssociationsMixin<StakingPoolInstance, string>;
    hasStakingPool: Sequelize.HasManyHasAssociationMixin<StakingPoolInstance, string>;
    hasPools: Sequelize.HasManyHasAssociationsMixin<StakingPoolInstance, string>;
    countPools: Sequelize.HasManyCountAssociationsMixin;
    createStakingPool: Sequelize.HasManyCreateAssociationMixin<StakingPoolInstance>;
    getActivations: Sequelize.HasManyGetAssociationsMixin<StakingChainActivationInstance>;
    setActivations: Sequelize.HasManySetAssociationsMixin<StakingChainActivationInstance, string>;
    addStakingChainActivation: Sequelize.HasManyAddAssociationMixin<StakingChainActivationInstance, string>;
    addActivations: Sequelize.HasManyAddAssociationsMixin<StakingChainActivationInstance, string>;
    removeStakingChainActivation: Sequelize.HasManyRemoveAssociationMixin<StakingChainActivationInstance, string>;
    removeActivations: Sequelize.HasManyRemoveAssociationsMixin<StakingChainActivationInstance, string>;
    hasStakingChainActivation: Sequelize.HasManyHasAssociationMixin<StakingChainActivationInstance, string>;
    hasActivations: Sequelize.HasManyHasAssociationsMixin<StakingChainActivationInstance, string>;
    countActivations: Sequelize.HasManyCountAssociationsMixin;
    createStakingChainActivation: Sequelize.HasManyCreateAssociationMixin<StakingChainActivationInstance>;
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
    lastMessageAt?: Date | null;
    lastMessageFrom?: "client" | "agent" | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type SupportTicketCreationAttributes = Optional<SupportTicketAttributes, "id" | "agentId" | "agentName" | "importance" | "status" | "messages" | "type" | "tags" | "responseTime" | "satisfaction" | "lastMessageAt" | "lastMessageFrom" | "createdAt" | "deletedAt" | "updatedAt">;

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
    type: "DCA" | "GRID" | "INDICATOR" | "TRAILING_STOP" | "CUSTOM";
    mode: "LIVE" | "PAPER";
    status: "DRAFT" | "RUNNING" | "PAUSED" | "STOPPED" | "ERROR" | "LIMIT_REACHED";
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
    flattenRequestedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  type TradingBotCreationAttributes = Optional<TradingBotAttributes, "id" | "description" | "type" | "mode" | "status" | "strategyConfig" | "maxPositionSize" | "maxConcurrentTrades" | "dailyLossLimit" | "dailyLossLimitPercent" | "maxDrawdownPercent" | "cooldownSeconds" | "stopLossPercent" | "takeProfitPercent" | "allocatedAmount" | "usedAmount" | "totalTrades" | "winningTrades" | "losingTrades" | "totalProfit" | "totalVolume" | "totalFees" | "dailyTrades" | "dailyProfit" | "dailyVolume" | "dailyResetAt" | "peakEquity" | "currentDrawdown" | "purchaseId" | "lastTickAt" | "lastTradeAt" | "lastErrorAt" | "lastError" | "errorCount" | "startedAt" | "stoppedAt" | "pausedAt" | "flattenRequestedAt" | "createdAt" | "updatedAt" | "deletedAt">;

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
    entityType: "BOT" | "TRADE" | "ORDER" | "STRATEGY" | "PURCHASE";
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
    side: "BUY" | "SELL";
    type: "MARKET" | "LIMIT" | "STOP_LIMIT";
    status: "PENDING" | "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED" | "EXPIRED" | "FAILED";
    amount: number;
    price: number;
    stopPrice?: number | null;
    filledAmount: number;
    remainingAmount: number;
    purpose: "ENTRY" | "EXIT" | "STOP_LOSS" | "TAKE_PROFIT" | "GRID_BUY" | "GRID_SELL" | "DCA";
    gridLevel?: number | null;
    isPaper: boolean;
    expiresAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type TradingBotOrderCreationAttributes = Optional<TradingBotOrderAttributes, "id" | "tradeId" | "ecosystemOrderId" | "status" | "stopPrice" | "filledAmount" | "gridLevel" | "isPaper" | "expiresAt" | "createdAt" | "updatedAt">;

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
    status: "PENDING" | "COMPLETED" | "REFUNDED" | "FAILED";
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
    rating?: number | null;
    review?: string | null;
    reviewedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type TradingBotPurchaseCreationAttributes = Optional<TradingBotPurchaseAttributes, "id" | "status" | "currency" | "transactionId" | "walletId" | "timesUsed" | "lastUsedAt" | "rating" | "review" | "reviewedAt" | "createdAt" | "updatedAt">;

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
    type: "DCA" | "GRID" | "INDICATOR" | "TRAILING_STOP" | "CUSTOM";
    category?: string | null;
    tags: string[];
    defaultConfig: Record<string, any>;
    customNodes?: Record<string, any> | null;
    recommendedSymbols: string[];
    recommendedTimeframe?: string | null;
    minAllocation?: number | null;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";
    visibility: "PRIVATE" | "PUBLIC";
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

  type TradingBotStrategyCreationAttributes = Optional<TradingBotStrategyAttributes, "id" | "shortDescription" | "icon" | "coverImage" | "category" | "tags" | "customNodes" | "recommendedSymbols" | "recommendedTimeframe" | "minAllocation" | "riskLevel" | "status" | "visibility" | "price" | "currency" | "isFeatured" | "featuredOrder" | "totalPurchases" | "totalUsers" | "avgRating" | "totalRatings" | "totalRevenue" | "creatorRevenue" | "platformRevenue" | "reviewedAt" | "reviewedBy" | "rejectionReason" | "version" | "changelog" | "createdAt" | "updatedAt" | "deletedAt">;

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
    status: "PENDING" | "APPROVED" | "REJECTED";
    adminNote?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type TradingBotStrategyReviewCreationAttributes = Optional<TradingBotStrategyReviewAttributes, "id" | "status" | "adminNote" | "createdAt" | "updatedAt">;

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
    side: "BUY" | "SELL";
    type: "MARKET" | "LIMIT";
    status: "PENDING" | "OPEN" | "CLOSED" | "CANCELLED" | "FAILED";
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

  type TradingBotTradeCreationAttributes = Optional<TradingBotTradeAttributes, "id" | "ecosystemOrderId" | "type" | "status" | "fee" | "feeCurrency" | "executedAmount" | "executedPrice" | "executedCost" | "entryPrice" | "exitPrice" | "profit" | "profitPercent" | "stopLossPrice" | "takeProfitPrice" | "stopLossTriggered" | "takeProfitTriggered" | "strategySignal" | "strategyContext" | "isPaper" | "openedAt" | "closedAt" | "errorMessage" | "createdAt" | "updatedAt">;

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
    type: "FAILED" | "DEPOSIT" | "WITHDRAW" | "OUTGOING_TRANSFER" | "INCOMING_TRANSFER" | "PAYMENT" | "REFUND" | "BINARY_ORDER" | "EXCHANGE_ORDER" | "FUTURES_ORDER" | "INVESTMENT" | "INVESTMENT_ROI" | "AI_INVESTMENT" | "AI_INVESTMENT_ROI" | "INVOICE" | "FOREX_DEPOSIT" | "FOREX_WITHDRAW" | "FX_TRADING_DEPOSIT" | "FX_TRADING_WITHDRAW" | "FOREX_INVESTMENT" | "FOREX_INVESTMENT_ROI" | "ICO_CONTRIBUTION" | "REFERRAL_REWARD" | "STAKING" | "STAKING_REWARD" | "P2P_OFFER_TRANSFER" | "P2P_TRADE" | "NFT_PURCHASE" | "NFT_SALE" | "NFT_MINT" | "NFT_BURN" | "NFT_TRANSFER" | "NFT_AUCTION_BID" | "NFT_AUCTION_SETTLE" | "NFT_OFFER" | "ECOMMERCE_PURCHASE" | "TRADING_FEE" | "PLATFORM_FEE" | "PLATFORM_LOSS" | "ORDER_PASSTHROUGH" | "GATEWAY_PAYMENT" | "MARKETPLACE_PURCHASE" | "MARKETPLACE_SALE" | "ADJUSTMENT_ANCHOR";
    status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED" | "REJECTED" | "REFUNDED" | "FROZEN" | "PROCESSING" | "TIMEOUT";
    amount: number;
    fee?: number | null;
    description?: string | null;
    metadata?: any | null;
    referenceId?: string | null;
    trxId?: string | null;
    idempotencyKey?: string | null;
    txHashPending?: string | null;
    flow?: "IN" | "OUT" | "INTERNAL" | null;
    previousBalance?: number | null;
    newBalance?: number | null;
    previousInOrder?: number | null;
    newInOrder?: number | null;
    operationType?: string | null;
    claimedBy?: string | null;
    claimedAt?: Date | null;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type TransactionCreationAttributes = Optional<TransactionAttributes, "id" | "status" | "fee" | "description" | "metadata" | "referenceId" | "trxId" | "idempotencyKey" | "txHashPending" | "flow" | "previousBalance" | "newBalance" | "previousInOrder" | "newInOrder" | "operationType" | "claimedBy" | "claimedAt" | "createdAt" | "deletedAt" | "updatedAt">;

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
  // TransactionArchive
  // ========================================

  interface TransactionArchiveAttributes {
    id: string;
    userId: string;
    walletId: string;
    type: "FAILED" | "DEPOSIT" | "WITHDRAW" | "OUTGOING_TRANSFER" | "INCOMING_TRANSFER" | "PAYMENT" | "REFUND" | "BINARY_ORDER" | "EXCHANGE_ORDER" | "FUTURES_ORDER" | "INVESTMENT" | "INVESTMENT_ROI" | "AI_INVESTMENT" | "AI_INVESTMENT_ROI" | "INVOICE" | "FOREX_DEPOSIT" | "FOREX_WITHDRAW" | "FX_TRADING_DEPOSIT" | "FX_TRADING_WITHDRAW" | "FOREX_INVESTMENT" | "FOREX_INVESTMENT_ROI" | "ICO_CONTRIBUTION" | "REFERRAL_REWARD" | "STAKING" | "STAKING_REWARD" | "P2P_OFFER_TRANSFER" | "P2P_TRADE" | "NFT_PURCHASE" | "NFT_SALE" | "NFT_MINT" | "NFT_BURN" | "NFT_TRANSFER" | "NFT_AUCTION_BID" | "NFT_AUCTION_SETTLE" | "NFT_OFFER" | "ECOMMERCE_PURCHASE" | "TRADING_FEE" | "PLATFORM_FEE" | "PLATFORM_LOSS" | "ORDER_PASSTHROUGH" | "GATEWAY_PAYMENT" | "MARKETPLACE_PURCHASE" | "MARKETPLACE_SALE" | "ADJUSTMENT_ANCHOR";
    status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED" | "REJECTED" | "REFUNDED" | "FROZEN" | "PROCESSING" | "TIMEOUT";
    amount: number;
    fee?: number | null;
    description?: string | null;
    metadata?: any | null;
    referenceId?: string | null;
    trxId?: string | null;
    idempotencyKey?: string | null;
    txHashPending?: string | null;
    flow?: "IN" | "OUT" | "INTERNAL" | null;
    previousBalance?: number | null;
    newBalance?: number | null;
    previousInOrder?: number | null;
    newInOrder?: number | null;
    operationType?: string | null;
    claimedBy?: string | null;
    claimedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
  }

  type TransactionArchiveCreationAttributes = Optional<TransactionArchiveAttributes, "id" | "status" | "fee" | "description" | "metadata" | "referenceId" | "trxId" | "idempotencyKey" | "txHashPending" | "flow" | "previousBalance" | "newBalance" | "previousInOrder" | "newInOrder" | "operationType" | "claimedBy" | "claimedAt" | "createdAt" | "updatedAt" | "deletedAt">;

  interface TransactionArchiveInstance extends Model<TransactionArchiveAttributes, TransactionArchiveCreationAttributes>, TransactionArchiveAttributes {
  }

  // ========================================
  // TransferPin
  // ========================================

  interface TransferPinAttributes {
    id: string;
    userId: string;
    pinHash: string;
    enabled: boolean;
    failedAttempts: number;
    lockoutCount: number;
    lockedUntil?: Date | null;
    lastVerifiedAt?: Date | null;
    lastChangedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type TransferPinCreationAttributes = Optional<TransferPinAttributes, "id" | "enabled" | "failedAttempts" | "lockoutCount" | "lockedUntil" | "lastVerifiedAt" | "lastChangedAt" | "createdAt" | "updatedAt">;

  interface TransferPinInstance extends Model<TransferPinAttributes, TransferPinCreationAttributes>, TransferPinAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // TransfiIban
  // ========================================

  interface TransfiIbanAttributes {
    id: string;
    userId: string;
    ibId: string;
    transfiUserId: string;
    currency: string;
    iban: string;
    bic?: string | null;
    accountNumber?: string | null;
    bankName?: string | null;
    bankAddress?: string | null;
    accountHolderName?: string | null;
    status: string;
    lastSyncedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type TransfiIbanCreationAttributes = Optional<TransfiIbanAttributes, "id" | "bic" | "accountNumber" | "bankName" | "bankAddress" | "accountHolderName" | "status" | "lastSyncedAt" | "createdAt" | "updatedAt">;

  interface TransfiIbanInstance extends Model<TransfiIbanAttributes, TransfiIbanCreationAttributes>, TransfiIbanAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // TransfiRecipient
  // ========================================

  interface TransfiRecipientAttributes {
    id: string;
    userId: string;
    transfiRecipientId: string;
    firstName: string;
    lastName: string;
    country: string;
    accountType: "bank_account" | "iban" | "e_wallet" | "mobile_wallet";
    accountValue: string;
    currency?: string | null;
    label?: string | null;
    fingerprint: string;
    lastUsedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type TransfiRecipientCreationAttributes = Optional<TransfiRecipientAttributes, "id" | "currency" | "label" | "lastUsedAt" | "createdAt" | "updatedAt">;

  interface TransfiRecipientInstance extends Model<TransfiRecipientAttributes, TransfiRecipientCreationAttributes>, TransfiRecipientAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
  }

  // ========================================
  // TransfiUser
  // ========================================

  interface TransfiUserAttributes {
    id: string;
    userId: string;
    transfiUserId: string;
    status: string;
    basicKycStatus?: string | null;
    standardKycStatus?: string | null;
    advancedKycStatus?: string | null;
    email?: string | null;
    failureMessage?: string | null;
    lastSyncedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type TransfiUserCreationAttributes = Optional<TransfiUserAttributes, "id" | "status" | "basicKycStatus" | "standardKycStatus" | "advancedKycStatus" | "email" | "failureMessage" | "lastSyncedAt" | "createdAt" | "updatedAt">;

  interface TransfiUserInstance extends Model<TransfiUserAttributes, TransfiUserCreationAttributes>, TransfiUserAttributes {
    user?: UserInstance;
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
    username?: string | null;
    firstName?: string;
    lastName?: string;
    emailVerified: boolean;
    phone?: string;
    phoneVerified: boolean;
    roleId: number;
    profile?: Record<string, any> | null;
    lastLogin?: Date;
    lastFailedLogin?: Date | null;
    failedLoginAttempts?: number;
    walletAddress?: string;
    walletProvider?: string;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BANNED";
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

  type UserCreationAttributes = Optional<UserAttributes, "id" | "email" | "password" | "avatar" | "username" | "firstName" | "lastName" | "phone" | "profile" | "lastLogin" | "lastFailedLogin" | "failedLoginAttempts" | "walletAddress" | "walletProvider" | "status" | "settings" | "createdAt" | "deletedAt" | "updatedAt">;

  interface UserInstance extends Model<UserAttributes, UserCreationAttributes>, UserAttributes {
    author?: AuthorInstance;
    ecommerceShippingAddress?: EcommerceShippingAddressInstance;
    twoFactor?: TwoFactorInstance;
    transferPin?: TransferPinInstance;
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
    getTransferPin: Sequelize.HasOneGetAssociationMixin<TransferPinInstance>;
    setTransferPin: Sequelize.HasOneSetAssociationMixin<TransferPinInstance, string>;
    createTransferPin: Sequelize.HasOneCreateAssociationMixin<TransferPinInstance>;
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
  // UserActivity
  // ========================================

  interface UserActivityAttributes {
    id: string;
    userId: string;
    type: UserActivityType;
    title: string;
    description?: string | null;
    severity: "success" | "warning" | "info";
    ip?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, any> | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type UserActivityCreationAttributes = Optional<UserActivityAttributes, "id" | "description" | "severity" | "ip" | "userAgent" | "metadata" | "createdAt" | "updatedAt">;

  interface UserActivityInstance extends Model<UserActivityAttributes, UserActivityCreationAttributes>, UserActivityAttributes {
    user?: UserInstance;
    getUser: Sequelize.BelongsToGetAssociationMixin<UserInstance>;
    setUser: Sequelize.BelongsToSetAssociationMixin<UserInstance, string>;
    createUser: Sequelize.BelongsToCreateAssociationMixin<UserInstance>;
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
    duration?: number | null;
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
  } | null;
    addressLookupKey?: string | null;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type WalletCreationAttributes = Optional<WalletAttributes, "id" | "balance" | "inOrder" | "address" | "addressLookupKey" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

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
  // WalletAuditLog
  // ========================================

  interface WalletAuditLogAttributes {
    id: string;
    userId: string;
    walletId: string;
    operation: "WALLET_CREATED" | "CREDIT" | "DEBIT" | "HOLD" | "RELEASE" | "TRANSFER_OUT" | "TRANSFER_IN" | "EXECUTE_FROM_HOLD";
    amount: number;
    previousBalance?: number | null;
    newBalance?: number | null;
    previousInOrder?: number | null;
    newInOrder?: number | null;
    transactionId?: string | null;
    idempotencyKey: string;
    metadata?: Record<string, any> | null;
    createdAt?: Date;
  }

  type WalletAuditLogCreationAttributes = Optional<WalletAuditLogAttributes, "id" | "previousBalance" | "newBalance" | "previousInOrder" | "newInOrder" | "transactionId" | "metadata" | "createdAt">;

  interface WalletAuditLogInstance extends Model<WalletAuditLogAttributes, WalletAuditLogCreationAttributes>, WalletAuditLogAttributes {
    wallet?: WalletInstance;
    getWallet: Sequelize.BelongsToGetAssociationMixin<WalletInstance>;
    setWallet: Sequelize.BelongsToSetAssociationMixin<WalletInstance, string>;
    createWallet: Sequelize.BelongsToCreateAssociationMixin<WalletInstance>;
  }

  // ========================================
  // WalletAuditLogArchive
  // ========================================

  interface WalletAuditLogArchiveAttributes {
    id: string;
    userId: string;
    walletId: string;
    operation: "WALLET_CREATED" | "CREDIT" | "DEBIT" | "HOLD" | "RELEASE" | "TRANSFER_OUT" | "TRANSFER_IN" | "EXECUTE_FROM_HOLD";
    amount: number;
    previousBalance?: number | null;
    newBalance?: number | null;
    previousInOrder?: number | null;
    newInOrder?: number | null;
    transactionId?: string | null;
    idempotencyKey: string;
    metadata?: Record<string, any> | null;
    createdAt?: Date;
  }

  type WalletAuditLogArchiveCreationAttributes = Optional<WalletAuditLogArchiveAttributes, "id" | "previousBalance" | "newBalance" | "previousInOrder" | "newInOrder" | "transactionId" | "metadata" | "createdAt">;

  interface WalletAuditLogArchiveInstance extends Model<WalletAuditLogArchiveAttributes, WalletAuditLogArchiveCreationAttributes>, WalletAuditLogArchiveAttributes {
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
    index: number | null;
    data: string;
  }

  type WalletDataCreationAttributes = Optional<WalletDataAttributes, "id" | "balance" | "index">;

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
    /**
     * OPTIONAL because rows written before 2026-08-03 do not have it.
     *
     * All three writers of this row (this job's cron, `/api/finance/wallet?pnl=true`
     * and `/api/finance/wallet/stats`) now record FUTURES, but the stats route
     * derives the "24h change" chip by SUBTRACTING a stored row from its own
     * live total — so a historical row must still read cleanly, and every
     * consumer has to treat a missing key as 0 rather than assume it is there.
     */
    FUTURES?: number;
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
  // WithdrawGateway
  // ========================================

  interface WithdrawGatewayAttributes {
    id: string;
    name: string;
    title: string;
    description?: string | null;
    image?: string | null;
    alias: string;
    status: boolean;
    version?: string | null;
    currencies?: any | null;
    fixedFee?: any | null;
    percentageFee?: any | null;
    minAmount?: any | null;
    maxAmount?: any | null;
    type: string;
    autoDispatch: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }

  type WithdrawGatewayCreationAttributes = Optional<WithdrawGatewayAttributes, "id" | "description" | "image" | "status" | "version" | "currencies" | "fixedFee" | "percentageFee" | "minAmount" | "maxAmount" | "type" | "autoDispatch" | "createdAt" | "updatedAt">;

  interface WithdrawGatewayInstance extends Model<WithdrawGatewayAttributes, WithdrawGatewayCreationAttributes>, WithdrawGatewayAttributes {
    // Instance methods
    getFixedFee(CurrencyInstance?: string): number;
    getPercentageFee(CurrencyInstance?: string): number;
    getMinAmount(CurrencyInstance?: string): number;
    getMaxAmount(CurrencyInstance?: string): number | null;
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
    customFields?: string | null;
    gatewayAlias?: string | null;
    status: boolean;
    createdAt?: Date;
    deletedAt?: Date;
    updatedAt?: Date;
  }

  type WithdrawMethodCreationAttributes = Optional<WithdrawMethodAttributes, "id" | "image" | "fixedFee" | "percentageFee" | "minAmount" | "maxAmount" | "customFields" | "gatewayAlias" | "status" | "createdAt" | "deletedAt" | "updatedAt">;

  interface WithdrawMethodInstance extends Model<WithdrawMethodAttributes, WithdrawMethodCreationAttributes>, WithdrawMethodAttributes {
  }

  // ========================================
  // Models Registry
  // ========================================

  interface Models {
    sequelize: Sequelize.Sequelize;
    adminAuditLog: ModelStatic<AdminAuditLogInstance>;
    adminProfit: ModelStatic<AdminProfitInstance>;
    aiBot: ModelStatic<AiBotInstance>;
    aiInvestment: ModelStatic<AiInvestmentInstance>;
    aiInvestmentDuration: ModelStatic<AiInvestmentDurationInstance>;
    aiInvestmentPlan: ModelStatic<AiInvestmentPlanInstance>;
    aiInvestmentPlanDuration: ModelStatic<AiInvestmentPlanDurationInstance>;
    aiMarketMaker: ModelStatic<AiMarketMakerInstance>;
    aiMarketMakerEngineLease: ModelStatic<AiMarketMakerEngineLeaseInstance>;
    aiMarketMakerHistory: ModelStatic<AiMarketMakerHistoryInstance>;
    aiMarketMakerPool: ModelStatic<AiMarketMakerPoolInstance>;
    aiSupportAdminAction: ModelStatic<AiSupportAdminActionInstance>;
    aiSupportAdminSession: ModelStatic<AiSupportAdminSessionInstance>;
    aiSupportAdminTurn: ModelStatic<AiSupportAdminTurnInstance>;
    aiSupportAgent: ModelStatic<AiSupportAgentInstance>;
    aiSupportArticle: ModelStatic<AiSupportArticleInstance>;
    aiSupportChunk: ModelStatic<AiSupportChunkInstance>;
    aiSupportDeflection: ModelStatic<AiSupportDeflectionInstance>;
    aiSupportFeedback: ModelStatic<AiSupportFeedbackInstance>;
    aiSupportGap: ModelStatic<AiSupportGapInstance>;
    aiSupportGlossary: ModelStatic<AiSupportGlossaryInstance>;
    aiSupportHandover: ModelStatic<AiSupportHandoverInstance>;
    aiSupportOperation: ModelStatic<AiSupportOperationInstance>;
    aiSupportRule: ModelStatic<AiSupportRuleInstance>;
    aiSupportSession: ModelStatic<AiSupportSessionInstance>;
    aiSupportSource: ModelStatic<AiSupportSourceInstance>;
    aiSupportTurn: ModelStatic<AiSupportTurnInstance>;
    aiSupportWorkflow: ModelStatic<AiSupportWorkflowInstance>;
    announcement: ModelStatic<AnnouncementInstance>;
    apiKey: ModelStatic<ApiKeyInstance>;
    apiKeyAuditLog: ModelStatic<ApiKeyAuditLogInstance>;
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
    chartWorkspace: ModelStatic<ChartWorkspaceInstance>;
    comment: ModelStatic<CommentInstance>;
    contentReport: ModelStatic<ContentReportInstance>;
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
    dexChain: ModelStatic<DexChainInstance>;
    dexFeeAccrual: ModelStatic<DexFeeAccrualInstance>;
    dexPair: ModelStatic<DexPairInstance>;
    dexPool: ModelStatic<DexPoolInstance>;
    dexPoolEvent: ModelStatic<DexPoolEventInstance>;
    dexPoolPosition: ModelStatic<DexPoolPositionInstance>;
    dexPoolRiskAck: ModelStatic<DexPoolRiskAckInstance>;
    dexProvider: ModelStatic<DexProviderInstance>;
    dexQuote: ModelStatic<DexQuoteInstance>;
    dexSwap: ModelStatic<DexSwapInstance>;
    dexToken: ModelStatic<DexTokenInstance>;
    dexUserWallet: ModelStatic<DexUserWalletInstance>;
    dexWalletLink: ModelStatic<DexWalletLinkInstance>;
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
    ecosystemCustomChain: ModelStatic<EcosystemCustomChainInstance>;
    ecosystemMarket: ModelStatic<EcosystemMarketInstance>;
    ecosystemMasterWallet: ModelStatic<EcosystemMasterWalletInstance>;
    ecosystemPrivateLedger: ModelStatic<EcosystemPrivateLedgerInstance>;
    ecosystemToken: ModelStatic<EcosystemTokenInstance>;
    ecosystemUtxo: ModelStatic<EcosystemUtxoInstance>;
    engineLease: ModelStatic<EngineLeaseInstance>;
    exchange: ModelStatic<ExchangeInstance>;
    exchangeCurrency: ModelStatic<ExchangeCurrencyInstance>;
    exchangeMarket: ModelStatic<ExchangeMarketInstance>;
    exchangeOrder: ModelStatic<ExchangeOrderInstance>;
    exchangePriceAlert: ModelStatic<ExchangePriceAlertInstance>;
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
    futuresFeeReversal: ModelStatic<FuturesFeeReversalInstance>;
    futuresFundingPayment: ModelStatic<FuturesFundingPaymentInstance>;
    futuresInsuranceLedger: ModelStatic<FuturesInsuranceLedgerInstance>;
    futuresMarket: ModelStatic<FuturesMarketInstance>;
    fxAccount: ModelStatic<FxAccountInstance>;
    fxAccountGroup: ModelStatic<FxAccountGroupInstance>;
    fxDeal: ModelStatic<FxDealInstance>;
    fxEconomicEvent: ModelStatic<FxEconomicEventInstance>;
    fxExecutionAlert: ModelStatic<FxExecutionAlertInstance>;
    fxExecutionProvider: ModelStatic<FxExecutionProviderInstance>;
    fxInstrument: ModelStatic<FxInstrumentInstance>;
    fxMarketNews: ModelStatic<FxMarketNewsInstance>;
    fxOrder: ModelStatic<FxOrderInstance>;
    fxPosition: ModelStatic<FxPositionInstance>;
    fxProvider: ModelStatic<FxProviderInstance>;
    fxRoutingRule: ModelStatic<FxRoutingRuleInstance>;
    fxSessionCalendar: ModelStatic<FxSessionCalendarInstance>;
    fxSymbolGroup: ModelStatic<FxSymbolGroupInstance>;
    gasHistory: ModelStatic<GasHistoryInstance>;
    gatewayApiKey: ModelStatic<GatewayApiKeyInstance>;
    gatewayMerchant: ModelStatic<GatewayMerchantInstance>;
    gatewayMerchantBalance: ModelStatic<GatewayMerchantBalanceInstance>;
    gatewayPayment: ModelStatic<GatewayPaymentInstance>;
    gatewayPayout: ModelStatic<GatewayPayoutInstance>;
    gatewayRefund: ModelStatic<GatewayRefundInstance>;
    gatewayWebhook: ModelStatic<GatewayWebhookInstance>;
    geoAccessLog: ModelStatic<GeoAccessLogInstance>;
    geoRestriction: ModelStatic<GeoRestrictionInstance>;
    hbInstance: ModelStatic<HbInstanceInstance>;
    hbStrategyPreset: ModelStatic<HbStrategyPresetInstance>;
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
    marketNews: ModelStatic<MarketNewsInstance>;
    marketNewsProvider: ModelStatic<MarketNewsProviderInstance>;
    mlmBinaryNode: ModelStatic<MlmBinaryNodeInstance>;
    mlmReferral: ModelStatic<MlmReferralInstance>;
    mlmReferralCondition: ModelStatic<MlmReferralConditionInstance>;
    mlmReferralReward: ModelStatic<MlmReferralRewardInstance>;
    mlmUnilevelNode: ModelStatic<MlmUnilevelNodeInstance>;
    mobileDevice: ModelStatic<MobileDeviceInstance>;
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
    operatorAttestation: ModelStatic<OperatorAttestationInstance>;
    p2pActivityLog: ModelStatic<P2pActivityLogInstance>;
    p2pAdminActivity: ModelStatic<P2pAdminActivityInstance>;
    p2pCommission: ModelStatic<P2pCommissionInstance>;
    p2pDispute: ModelStatic<P2pDisputeInstance>;
    p2pOffer: ModelStatic<P2pOfferInstance>;
    p2pOfferFlag: ModelStatic<P2pOfferFlagInstance>;
    p2pOfferPaymentMethod: ModelStatic<P2pOfferPaymentMethodInstance>;
    p2pPaymentMethod: ModelStatic<P2pPaymentMethodInstance>;
    p2pPaymentRail: ModelStatic<P2pPaymentRailInstance>;
    p2pReview: ModelStatic<P2pReviewInstance>;
    p2pTrade: ModelStatic<P2pTradeInstance>;
    p2pTraderRelation: ModelStatic<P2pTraderRelationInstance>;
    p2pUserReport: ModelStatic<P2pUserReportInstance>;
    page: ModelStatic<PageInstance>;
    permission: ModelStatic<PermissionInstance>;
    poolBackingCurrency: ModelStatic<PoolBackingCurrencyInstance>;
    poolBackingCustodyRead: ModelStatic<PoolBackingCustodyReadInstance>;
    poolBackingObligation: ModelStatic<PoolBackingObligationInstance>;
    poolBackingReconciliation: ModelStatic<PoolBackingReconciliationInstance>;
    poolBackingSettlement: ModelStatic<PoolBackingSettlementInstance>;
    post: ModelStatic<PostInstance>;
    postTag: ModelStatic<PostTagInstance>;
    providerUser: ModelStatic<ProviderUserInstance>;
    role: ModelStatic<RoleInstance>;
    rolePermission: ModelStatic<RolePermissionInstance>;
    settings: ModelStatic<SettingsInstance>;
    siteChrome: ModelStatic<SiteChromeInstance>;
    slider: ModelStatic<SliderInstance>;
    spotDepositIntent: ModelStatic<SpotDepositIntentInstance>;
    stakingAdminActivity: ModelStatic<StakingAdminActivityInstance>;
    stakingAdminEarning: ModelStatic<StakingAdminEarningInstance>;
    stakingBatch: ModelStatic<StakingBatchInstance>;
    stakingChainActivation: ModelStatic<StakingChainActivationInstance>;
    stakingChainWallet: ModelStatic<StakingChainWalletInstance>;
    stakingCommissionExit: ModelStatic<StakingCommissionExitInstance>;
    stakingConsent: ModelStatic<StakingConsentInstance>;
    stakingDuration: ModelStatic<StakingDurationInstance>;
    stakingEarningRecord: ModelStatic<StakingEarningRecordInstance>;
    stakingExternalPoolPerformance: ModelStatic<StakingExternalPoolPerformanceInstance>;
    stakingIncident: ModelStatic<StakingIncidentInstance>;
    stakingObservation: ModelStatic<StakingObservationInstance>;
    stakingPool: ModelStatic<StakingPoolInstance>;
    stakingPosition: ModelStatic<StakingPositionInstance>;
    stakingStatement: ModelStatic<StakingStatementInstance>;
    stakingTranche: ModelStatic<StakingTrancheInstance>;
    stakingValidator: ModelStatic<StakingValidatorInstance>;
    stakingValidatorSet: ModelStatic<StakingValidatorSetInstance>;
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
    transactionArchive: ModelStatic<TransactionArchiveInstance>;
    transferPin: ModelStatic<TransferPinInstance>;
    transfiIban: ModelStatic<TransfiIbanInstance>;
    transfiRecipient: ModelStatic<TransfiRecipientInstance>;
    transfiUser: ModelStatic<TransfiUserInstance>;
    twoFactor: ModelStatic<TwoFactorInstance>;
    user: ModelStatic<UserInstance>;
    userActivity: ModelStatic<UserActivityInstance>;
    userBlock: ModelStatic<UserBlockInstance>;
    wallet: ModelStatic<WalletInstance>;
    walletAuditLog: ModelStatic<WalletAuditLogInstance>;
    walletAuditLogArchive: ModelStatic<WalletAuditLogArchiveInstance>;
    walletData: ModelStatic<WalletDataInstance>;
    walletPnl: ModelStatic<WalletPnlInstance>;
    withdrawGateway: ModelStatic<WithdrawGatewayInstance>;
    withdrawMethod: ModelStatic<WithdrawMethodInstance>;
  }

  // ========================================
  // Type Aliases (for backward compatibility)
  // ========================================

  type adminAuditLogAttributes = AdminAuditLogAttributes;
  type adminAuditLogCreationAttributes = AdminAuditLogCreationAttributes;
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
  type aiMarketMakerEngineLeaseAttributes = AiMarketMakerEngineLeaseAttributes;
  type aiMarketMakerEngineLeaseCreationAttributes = AiMarketMakerEngineLeaseCreationAttributes;
  type aiMarketMakerHistoryAttributes = AiMarketMakerHistoryAttributes;
  type aiMarketMakerHistoryCreationAttributes = AiMarketMakerHistoryCreationAttributes;
  type aiMarketMakerPoolAttributes = AiMarketMakerPoolAttributes;
  type aiMarketMakerPoolCreationAttributes = AiMarketMakerPoolCreationAttributes;
  type aiSupportAdminActionAttributes = AiSupportAdminActionAttributes;
  type aiSupportAdminActionCreationAttributes = AiSupportAdminActionCreationAttributes;
  type aiSupportAdminSessionAttributes = AiSupportAdminSessionAttributes;
  type aiSupportAdminSessionCreationAttributes = AiSupportAdminSessionCreationAttributes;
  type aiSupportAdminTurnAttributes = AiSupportAdminTurnAttributes;
  type aiSupportAdminTurnCreationAttributes = AiSupportAdminTurnCreationAttributes;
  type aiSupportAgentAttributes = AiSupportAgentAttributes;
  type aiSupportAgentCreationAttributes = AiSupportAgentCreationAttributes;
  type aiSupportArticleAttributes = AiSupportArticleAttributes;
  type aiSupportArticleCreationAttributes = AiSupportArticleCreationAttributes;
  type aiSupportChunkAttributes = AiSupportChunkAttributes;
  type aiSupportChunkCreationAttributes = AiSupportChunkCreationAttributes;
  type aiSupportDeflectionAttributes = AiSupportDeflectionAttributes;
  type aiSupportDeflectionCreationAttributes = AiSupportDeflectionCreationAttributes;
  type aiSupportFeedbackAttributes = AiSupportFeedbackAttributes;
  type aiSupportFeedbackCreationAttributes = AiSupportFeedbackCreationAttributes;
  type aiSupportGapAttributes = AiSupportGapAttributes;
  type aiSupportGapCreationAttributes = AiSupportGapCreationAttributes;
  type aiSupportGlossaryAttributes = AiSupportGlossaryAttributes;
  type aiSupportGlossaryCreationAttributes = AiSupportGlossaryCreationAttributes;
  type aiSupportHandoverAttributes = AiSupportHandoverAttributes;
  type aiSupportHandoverCreationAttributes = AiSupportHandoverCreationAttributes;
  type aiSupportOperationAttributes = AiSupportOperationAttributes;
  type aiSupportOperationCreationAttributes = AiSupportOperationCreationAttributes;
  type aiSupportRuleAttributes = AiSupportRuleAttributes;
  type aiSupportRuleCreationAttributes = AiSupportRuleCreationAttributes;
  type aiSupportSessionAttributes = AiSupportSessionAttributes;
  type aiSupportSessionCreationAttributes = AiSupportSessionCreationAttributes;
  type aiSupportSourceAttributes = AiSupportSourceAttributes;
  type aiSupportSourceCreationAttributes = AiSupportSourceCreationAttributes;
  type aiSupportTurnAttributes = AiSupportTurnAttributes;
  type aiSupportTurnCreationAttributes = AiSupportTurnCreationAttributes;
  type aiSupportWorkflowAttributes = AiSupportWorkflowAttributes;
  type aiSupportWorkflowCreationAttributes = AiSupportWorkflowCreationAttributes;
  type announcementAttributes = AnnouncementAttributes;
  type announcementCreationAttributes = AnnouncementCreationAttributes;
  type apiKeyAttributes = ApiKeyAttributes;
  type apiKeyCreationAttributes = ApiKeyCreationAttributes;
  type apiKeyAuditLogAttributes = ApiKeyAuditLogAttributes;
  type apiKeyAuditLogCreationAttributes = ApiKeyAuditLogCreationAttributes;
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
  type chartWorkspaceAttributes = ChartWorkspaceAttributes;
  type chartWorkspaceCreationAttributes = ChartWorkspaceCreationAttributes;
  type commentAttributes = CommentAttributes;
  type commentCreationAttributes = CommentCreationAttributes;
  type contentReportAttributes = ContentReportAttributes;
  type contentReportCreationAttributes = ContentReportCreationAttributes;
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
  type dexChainAttributes = DexChainAttributes;
  type dexChainCreationAttributes = DexChainCreationAttributes;
  type dexFeeAccrualAttributes = DexFeeAccrualAttributes;
  type dexFeeAccrualCreationAttributes = DexFeeAccrualCreationAttributes;
  type dexPairAttributes = DexPairAttributes;
  type dexPairCreationAttributes = DexPairCreationAttributes;
  type dexPoolAttributes = DexPoolAttributes;
  type dexPoolCreationAttributes = DexPoolCreationAttributes;
  type dexPoolEventAttributes = DexPoolEventAttributes;
  type dexPoolEventCreationAttributes = DexPoolEventCreationAttributes;
  type dexPoolPositionAttributes = DexPoolPositionAttributes;
  type dexPoolPositionCreationAttributes = DexPoolPositionCreationAttributes;
  type dexPoolRiskAckAttributes = DexPoolRiskAckAttributes;
  type dexPoolRiskAckCreationAttributes = DexPoolRiskAckCreationAttributes;
  type dexProviderAttributes = DexProviderAttributes;
  type dexProviderCreationAttributes = DexProviderCreationAttributes;
  type dexQuoteAttributes = DexQuoteAttributes;
  type dexQuoteCreationAttributes = DexQuoteCreationAttributes;
  type dexSwapAttributes = DexSwapAttributes;
  type dexSwapCreationAttributes = DexSwapCreationAttributes;
  type dexTokenAttributes = DexTokenAttributes;
  type dexTokenCreationAttributes = DexTokenCreationAttributes;
  type dexUserWalletAttributes = DexUserWalletAttributes;
  type dexUserWalletCreationAttributes = DexUserWalletCreationAttributes;
  type dexWalletLinkAttributes = DexWalletLinkAttributes;
  type dexWalletLinkCreationAttributes = DexWalletLinkCreationAttributes;
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
  type ecosystemCustomChainAttributes = EcosystemCustomChainAttributes;
  type ecosystemCustomChainCreationAttributes = EcosystemCustomChainCreationAttributes;
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
  type engineLeaseAttributes = EngineLeaseAttributes;
  type engineLeaseCreationAttributes = EngineLeaseCreationAttributes;
  type exchangeAttributes = ExchangeAttributes;
  type exchangeCreationAttributes = ExchangeCreationAttributes;
  type exchangeCurrencyAttributes = ExchangeCurrencyAttributes;
  type exchangeCurrencyCreationAttributes = ExchangeCurrencyCreationAttributes;
  type exchangeMarketAttributes = ExchangeMarketAttributes;
  type exchangeMarketCreationAttributes = ExchangeMarketCreationAttributes;
  type exchangeOrderAttributes = ExchangeOrderAttributes;
  type exchangeOrderCreationAttributes = ExchangeOrderCreationAttributes;
  type exchangePriceAlertAttributes = ExchangePriceAlertAttributes;
  type exchangePriceAlertCreationAttributes = ExchangePriceAlertCreationAttributes;
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
  type futuresFeeReversalAttributes = FuturesFeeReversalAttributes;
  type futuresFeeReversalCreationAttributes = FuturesFeeReversalCreationAttributes;
  type futuresFundingPaymentAttributes = FuturesFundingPaymentAttributes;
  type futuresFundingPaymentCreationAttributes = FuturesFundingPaymentCreationAttributes;
  type futuresInsuranceLedgerAttributes = FuturesInsuranceLedgerAttributes;
  type futuresInsuranceLedgerCreationAttributes = FuturesInsuranceLedgerCreationAttributes;
  type futuresMarketAttributes = FuturesMarketAttributes;
  type futuresMarketCreationAttributes = FuturesMarketCreationAttributes;
  type fxAccountAttributes = FxAccountAttributes;
  type fxAccountCreationAttributes = FxAccountCreationAttributes;
  type fxAccountGroupAttributes = FxAccountGroupAttributes;
  type fxAccountGroupCreationAttributes = FxAccountGroupCreationAttributes;
  type fxDealAttributes = FxDealAttributes;
  type fxDealCreationAttributes = FxDealCreationAttributes;
  type fxEconomicEventAttributes = FxEconomicEventAttributes;
  type fxEconomicEventCreationAttributes = FxEconomicEventCreationAttributes;
  type fxExecutionAlertAttributes = FxExecutionAlertAttributes;
  type fxExecutionAlertCreationAttributes = FxExecutionAlertCreationAttributes;
  type fxExecutionProviderAttributes = FxExecutionProviderAttributes;
  type fxExecutionProviderCreationAttributes = FxExecutionProviderCreationAttributes;
  type fxInstrumentAttributes = FxInstrumentAttributes;
  type fxInstrumentCreationAttributes = FxInstrumentCreationAttributes;
  type fxMarketNewsAttributes = FxMarketNewsAttributes;
  type fxMarketNewsCreationAttributes = FxMarketNewsCreationAttributes;
  type fxOrderAttributes = FxOrderAttributes;
  type fxOrderCreationAttributes = FxOrderCreationAttributes;
  type fxPositionAttributes = FxPositionAttributes;
  type fxPositionCreationAttributes = FxPositionCreationAttributes;
  type fxProviderAttributes = FxProviderAttributes;
  type fxProviderCreationAttributes = FxProviderCreationAttributes;
  type fxRoutingRuleAttributes = FxRoutingRuleAttributes;
  type fxRoutingRuleCreationAttributes = FxRoutingRuleCreationAttributes;
  type fxSessionCalendarAttributes = FxSessionCalendarAttributes;
  type fxSessionCalendarCreationAttributes = FxSessionCalendarCreationAttributes;
  type fxSymbolGroupAttributes = FxSymbolGroupAttributes;
  type fxSymbolGroupCreationAttributes = FxSymbolGroupCreationAttributes;
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
  type geoAccessLogAttributes = GeoAccessLogAttributes;
  type geoAccessLogCreationAttributes = GeoAccessLogCreationAttributes;
  type geoRestrictionAttributes = GeoRestrictionAttributes;
  type geoRestrictionCreationAttributes = GeoRestrictionCreationAttributes;
  type hbInstanceAttributes = HbInstanceAttributes;
  type hbInstanceCreationAttributes = HbInstanceCreationAttributes;
  type hbStrategyPresetAttributes = HbStrategyPresetAttributes;
  type hbStrategyPresetCreationAttributes = HbStrategyPresetCreationAttributes;
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
  type marketNewsAttributes = MarketNewsAttributes;
  type marketNewsCreationAttributes = MarketNewsCreationAttributes;
  type marketNewsProviderAttributes = MarketNewsProviderAttributes;
  type marketNewsProviderCreationAttributes = MarketNewsProviderCreationAttributes;
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
  type mobileDeviceAttributes = MobileDeviceAttributes;
  type mobileDeviceCreationAttributes = MobileDeviceCreationAttributes;
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
  type operatorAttestationAttributes = OperatorAttestationAttributes;
  type operatorAttestationCreationAttributes = OperatorAttestationCreationAttributes;
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
  type p2pPaymentRailAttributes = P2pPaymentRailAttributes;
  type p2pPaymentRailCreationAttributes = P2pPaymentRailCreationAttributes;
  type p2pReviewAttributes = P2pReviewAttributes;
  type p2pReviewCreationAttributes = P2pReviewCreationAttributes;
  type p2pTradeAttributes = P2pTradeAttributes;
  type p2pTradeCreationAttributes = P2pTradeCreationAttributes;
  type p2pTraderRelationAttributes = P2pTraderRelationAttributes;
  type p2pTraderRelationCreationAttributes = P2pTraderRelationCreationAttributes;
  type p2pUserReportAttributes = P2pUserReportAttributes;
  type p2pUserReportCreationAttributes = P2pUserReportCreationAttributes;
  type pageAttributes = PageAttributes;
  type pageCreationAttributes = PageCreationAttributes;
  type permissionAttributes = PermissionAttributes;
  type permissionCreationAttributes = PermissionCreationAttributes;
  type poolBackingCurrencyAttributes = PoolBackingCurrencyAttributes;
  type poolBackingCurrencyCreationAttributes = PoolBackingCurrencyCreationAttributes;
  type poolBackingCustodyReadAttributes = PoolBackingCustodyReadAttributes;
  type poolBackingCustodyReadCreationAttributes = PoolBackingCustodyReadCreationAttributes;
  type poolBackingObligationAttributes = PoolBackingObligationAttributes;
  type poolBackingObligationCreationAttributes = PoolBackingObligationCreationAttributes;
  type poolBackingReconciliationAttributes = PoolBackingReconciliationAttributes;
  type poolBackingReconciliationCreationAttributes = PoolBackingReconciliationCreationAttributes;
  type poolBackingSettlementAttributes = PoolBackingSettlementAttributes;
  type poolBackingSettlementCreationAttributes = PoolBackingSettlementCreationAttributes;
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
  type siteChromeAttributes = SiteChromeAttributes;
  type siteChromeCreationAttributes = SiteChromeCreationAttributes;
  type sliderAttributes = SliderAttributes;
  type sliderCreationAttributes = SliderCreationAttributes;
  type spotDepositIntentAttributes = SpotDepositIntentAttributes;
  type spotDepositIntentCreationAttributes = SpotDepositIntentCreationAttributes;
  type stakingAdminActivityAttributes = StakingAdminActivityAttributes;
  type stakingAdminActivityCreationAttributes = StakingAdminActivityCreationAttributes;
  type stakingAdminEarningAttributes = StakingAdminEarningAttributes;
  type stakingAdminEarningCreationAttributes = StakingAdminEarningCreationAttributes;
  type stakingBatchAttributes = StakingBatchAttributes;
  type stakingBatchCreationAttributes = StakingBatchCreationAttributes;
  type stakingChainActivationAttributes = StakingChainActivationAttributes;
  type stakingChainActivationCreationAttributes = StakingChainActivationCreationAttributes;
  type stakingChainWalletAttributes = StakingChainWalletAttributes;
  type stakingChainWalletCreationAttributes = StakingChainWalletCreationAttributes;
  type stakingCommissionExitAttributes = StakingCommissionExitAttributes;
  type stakingCommissionExitCreationAttributes = StakingCommissionExitCreationAttributes;
  type stakingConsentAttributes = StakingConsentAttributes;
  type stakingConsentCreationAttributes = StakingConsentCreationAttributes;
  type stakingDurationAttributes = StakingDurationAttributes;
  type stakingDurationCreationAttributes = StakingDurationCreationAttributes;
  type stakingEarningRecordAttributes = StakingEarningRecordAttributes;
  type stakingEarningRecordCreationAttributes = StakingEarningRecordCreationAttributes;
  type stakingExternalPoolPerformanceAttributes = StakingExternalPoolPerformanceAttributes;
  type stakingExternalPoolPerformanceCreationAttributes = StakingExternalPoolPerformanceCreationAttributes;
  type stakingIncidentAttributes = StakingIncidentAttributes;
  type stakingIncidentCreationAttributes = StakingIncidentCreationAttributes;
  type stakingObservationAttributes = StakingObservationAttributes;
  type stakingObservationCreationAttributes = StakingObservationCreationAttributes;
  type stakingPoolAttributes = StakingPoolAttributes;
  type stakingPoolCreationAttributes = StakingPoolCreationAttributes;
  type stakingPositionAttributes = StakingPositionAttributes;
  type stakingPositionCreationAttributes = StakingPositionCreationAttributes;
  type stakingStatementAttributes = StakingStatementAttributes;
  type stakingStatementCreationAttributes = StakingStatementCreationAttributes;
  type stakingTrancheAttributes = StakingTrancheAttributes;
  type stakingTrancheCreationAttributes = StakingTrancheCreationAttributes;
  type stakingValidatorAttributes = StakingValidatorAttributes;
  type stakingValidatorCreationAttributes = StakingValidatorCreationAttributes;
  type stakingValidatorSetAttributes = StakingValidatorSetAttributes;
  type stakingValidatorSetCreationAttributes = StakingValidatorSetCreationAttributes;
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
  type transactionArchiveAttributes = TransactionArchiveAttributes;
  type transactionArchiveCreationAttributes = TransactionArchiveCreationAttributes;
  type transferPinAttributes = TransferPinAttributes;
  type transferPinCreationAttributes = TransferPinCreationAttributes;
  type transfiIbanAttributes = TransfiIbanAttributes;
  type transfiIbanCreationAttributes = TransfiIbanCreationAttributes;
  type transfiRecipientAttributes = TransfiRecipientAttributes;
  type transfiRecipientCreationAttributes = TransfiRecipientCreationAttributes;
  type transfiUserAttributes = TransfiUserAttributes;
  type transfiUserCreationAttributes = TransfiUserCreationAttributes;
  type twoFactorAttributes = TwoFactorAttributes;
  type twoFactorCreationAttributes = TwoFactorCreationAttributes;
  type userAttributes = UserAttributes;
  type userCreationAttributes = UserCreationAttributes;
  type userActivityAttributes = UserActivityAttributes;
  type userActivityCreationAttributes = UserActivityCreationAttributes;
  type userBlockAttributes = UserBlockAttributes;
  type userBlockCreationAttributes = UserBlockCreationAttributes;
  type walletAttributes = WalletAttributes;
  type walletCreationAttributes = WalletCreationAttributes;
  type walletAuditLogAttributes = WalletAuditLogAttributes;
  type walletAuditLogCreationAttributes = WalletAuditLogCreationAttributes;
  type walletAuditLogArchiveAttributes = WalletAuditLogArchiveAttributes;
  type walletAuditLogArchiveCreationAttributes = WalletAuditLogArchiveCreationAttributes;
  type walletDataAttributes = WalletDataAttributes;
  type walletDataCreationAttributes = WalletDataCreationAttributes;
  type walletPnlAttributes = WalletPnlAttributes;
  type walletPnlCreationAttributes = WalletPnlCreationAttributes;
  type withdrawGatewayAttributes = WithdrawGatewayAttributes;
  type withdrawGatewayCreationAttributes = WithdrawGatewayCreationAttributes;
  type withdrawMethodAttributes = WithdrawMethodAttributes;
  type withdrawMethodCreationAttributes = WithdrawMethodCreationAttributes;

  // ========================================
  // Plain Types for API Responses
  // These types represent the plain object form of models,
  // useful for frontend consumption and API responses.
  // ========================================

  /** Plain object type for AdminAuditLog, suitable for API responses */
  interface AdminAuditLogPlain extends AdminAuditLogAttributes {
    user?: UserPlain;
  }

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
    futuresMarket?: FuturesMarketPlain;
  }

  /** Plain object type for AiMarketMakerEngineLease, suitable for API responses */
  interface AiMarketMakerEngineLeasePlain extends AiMarketMakerEngineLeaseAttributes {
  }

  /** Plain object type for AiMarketMakerHistory, suitable for API responses */
  interface AiMarketMakerHistoryPlain extends AiMarketMakerHistoryAttributes {
    marketMaker?: AiMarketMakerPlain;
  }

  /** Plain object type for AiMarketMakerPool, suitable for API responses */
  interface AiMarketMakerPoolPlain extends AiMarketMakerPoolAttributes {
    marketMaker?: AiMarketMakerPlain;
  }

  /** Plain object type for AiSupportAdminAction, suitable for API responses */
  interface AiSupportAdminActionPlain extends AiSupportAdminActionAttributes {
  }

  /** Plain object type for AiSupportAdminSession, suitable for API responses */
  interface AiSupportAdminSessionPlain extends AiSupportAdminSessionAttributes {
  }

  /** Plain object type for AiSupportAdminTurn, suitable for API responses */
  interface AiSupportAdminTurnPlain extends AiSupportAdminTurnAttributes {
  }

  /** Plain object type for AiSupportAgent, suitable for API responses */
  interface AiSupportAgentPlain extends AiSupportAgentAttributes {
    sessions?: AiSupportSessionPlain[];
  }

  /** Plain object type for AiSupportArticle, suitable for API responses */
  interface AiSupportArticlePlain extends AiSupportArticleAttributes {
  }

  /** Plain object type for AiSupportChunk, suitable for API responses */
  interface AiSupportChunkPlain extends AiSupportChunkAttributes {
    source?: AiSupportSourcePlain;
  }

  /** Plain object type for AiSupportDeflection, suitable for API responses */
  interface AiSupportDeflectionPlain extends AiSupportDeflectionAttributes {
  }

  /** Plain object type for AiSupportFeedback, suitable for API responses */
  interface AiSupportFeedbackPlain extends AiSupportFeedbackAttributes {
    turn?: AiSupportTurnPlain;
  }

  /** Plain object type for AiSupportGap, suitable for API responses */
  interface AiSupportGapPlain extends AiSupportGapAttributes {
  }

  /** Plain object type for AiSupportGlossary, suitable for API responses */
  interface AiSupportGlossaryPlain extends AiSupportGlossaryAttributes {
  }

  /** Plain object type for AiSupportHandover, suitable for API responses */
  interface AiSupportHandoverPlain extends AiSupportHandoverAttributes {
    session?: AiSupportSessionPlain;
  }

  /** Plain object type for AiSupportOperation, suitable for API responses */
  interface AiSupportOperationPlain extends AiSupportOperationAttributes {
  }

  /** Plain object type for AiSupportRule, suitable for API responses */
  interface AiSupportRulePlain extends AiSupportRuleAttributes {
  }

  /** Plain object type for AiSupportSession, suitable for API responses */
  interface AiSupportSessionPlain extends AiSupportSessionAttributes {
    turns?: AiSupportTurnPlain[];
    handovers?: AiSupportHandoverPlain[];
    ticket?: SupportTicketPlain;
    agent?: AiSupportAgentPlain;
  }

  /** Plain object type for AiSupportSource, suitable for API responses */
  interface AiSupportSourcePlain extends AiSupportSourceAttributes {
    chunks?: AiSupportChunkPlain[];
  }

  /** Plain object type for AiSupportTurn, suitable for API responses */
  interface AiSupportTurnPlain extends AiSupportTurnAttributes {
    feedback?: AiSupportFeedbackPlain[];
    session?: AiSupportSessionPlain;
  }

  /** Plain object type for AiSupportWorkflow, suitable for API responses */
  interface AiSupportWorkflowPlain extends AiSupportWorkflowAttributes {
  }

  /** Plain object type for Announcement, suitable for API responses */
  interface AnnouncementPlain extends AnnouncementAttributes {
  }

  /** Plain object type for ApiKey, suitable for API responses */
  interface ApiKeyPlain extends ApiKeyAttributes {
    auditLogs?: ApiKeyAuditLogPlain[];
    user?: UserPlain;
  }

  /** Plain object type for ApiKeyAuditLog, suitable for API responses */
  interface ApiKeyAuditLogPlain extends ApiKeyAuditLogAttributes {
    apiKey?: ApiKeyPlain;
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
    correlationHistory?: BinaryAiEngineCorrelationHistoryPlain[];
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

  /** Plain object type for ChartWorkspace, suitable for API responses */
  interface ChartWorkspacePlain extends ChartWorkspaceAttributes {
    user?: UserPlain;
  }

  /** Plain object type for Comment, suitable for API responses */
  interface CommentPlain extends CommentAttributes {
    user?: UserPlain;
    post?: PostPlain;
  }

  /** Plain object type for ContentReport, suitable for API responses */
  interface ContentReportPlain extends ContentReportAttributes {
    reporter?: UserPlain;
    targetOwner?: UserPlain;
    reviewedBy?: UserPlain;
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

  /** Plain object type for DexChain, suitable for API responses */
  interface DexChainPlain extends DexChainAttributes {
  }

  /** Plain object type for DexFeeAccrual, suitable for API responses */
  interface DexFeeAccrualPlain extends DexFeeAccrualAttributes {
    swap?: DexSwapPlain;
    user?: UserPlain;
    token?: DexTokenPlain;
  }

  /** Plain object type for DexPair, suitable for API responses */
  interface DexPairPlain extends DexPairAttributes {
    baseToken?: DexTokenPlain;
    quoteToken?: DexTokenPlain;
  }

  /** Plain object type for DexPool, suitable for API responses */
  interface DexPoolPlain extends DexPoolAttributes {
    positions?: DexPoolPositionPlain[];
    events?: DexPoolEventPlain[];
    baseToken?: DexTokenPlain;
    quoteToken?: DexTokenPlain;
  }

  /** Plain object type for DexPoolEvent, suitable for API responses */
  interface DexPoolEventPlain extends DexPoolEventAttributes {
    pool?: DexPoolPlain;
    position?: DexPoolPositionPlain;
  }

  /** Plain object type for DexPoolPosition, suitable for API responses */
  interface DexPoolPositionPlain extends DexPoolPositionAttributes {
    events?: DexPoolEventPlain[];
    pool?: DexPoolPlain;
    riskAck?: DexPoolRiskAckPlain;
  }

  /** Plain object type for DexPoolRiskAck, suitable for API responses */
  interface DexPoolRiskAckPlain extends DexPoolRiskAckAttributes {
    pool?: DexPoolPlain;
  }

  /** Plain object type for DexProvider, suitable for API responses */
  interface DexProviderPlain extends DexProviderAttributes {
  }

  /** Plain object type for DexQuote, suitable for API responses */
  interface DexQuotePlain extends DexQuoteAttributes {
    user?: UserPlain;
    pair?: DexPairPlain;
    sellToken?: DexTokenPlain;
    buyToken?: DexTokenPlain;
  }

  /** Plain object type for DexSwap, suitable for API responses */
  interface DexSwapPlain extends DexSwapAttributes {
    feeAccruals?: DexFeeAccrualPlain[];
    user?: UserPlain;
    quote?: DexQuotePlain;
    pair?: DexPairPlain;
    sellToken?: DexTokenPlain;
    buyToken?: DexTokenPlain;
  }

  /** Plain object type for DexToken, suitable for API responses */
  interface DexTokenPlain extends DexTokenAttributes {
    ecosystemToken?: EcosystemTokenPlain;
  }

  /** Plain object type for DexUserWallet, suitable for API responses */
  interface DexUserWalletPlain extends DexUserWalletAttributes {
    user?: UserPlain;
  }

  /** Plain object type for DexWalletLink, suitable for API responses */
  interface DexWalletLinkPlain extends DexWalletLinkAttributes {
    user?: UserPlain;
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

  /** Plain object type for EcosystemCustomChain, suitable for API responses */
  interface EcosystemCustomChainPlain extends EcosystemCustomChainAttributes {
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

  /** Plain object type for EngineLease, suitable for API responses */
  interface EngineLeasePlain extends EngineLeaseAttributes {
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

  /** Plain object type for ExchangePriceAlert, suitable for API responses */
  interface ExchangePriceAlertPlain extends ExchangePriceAlertAttributes {
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

  /** Plain object type for FuturesFeeReversal, suitable for API responses */
  interface FuturesFeeReversalPlain extends FuturesFeeReversalAttributes {
  }

  /** Plain object type for FuturesFundingPayment, suitable for API responses */
  interface FuturesFundingPaymentPlain extends FuturesFundingPaymentAttributes {
    user?: UserPlain;
  }

  /** Plain object type for FuturesInsuranceLedger, suitable for API responses */
  interface FuturesInsuranceLedgerPlain extends FuturesInsuranceLedgerAttributes {
  }

  /** Plain object type for FuturesMarket, suitable for API responses */
  interface FuturesMarketPlain extends FuturesMarketAttributes {
  }

  /** Plain object type for FxAccount, suitable for API responses */
  interface FxAccountPlain extends FxAccountAttributes {
    orders?: FxOrderPlain[];
    positions?: FxPositionPlain[];
    deals?: FxDealPlain[];
    user?: UserPlain;
    group?: FxAccountGroupPlain;
  }

  /** Plain object type for FxAccountGroup, suitable for API responses */
  interface FxAccountGroupPlain extends FxAccountGroupAttributes {
    accounts?: FxAccountPlain[];
  }

  /** Plain object type for FxDeal, suitable for API responses */
  interface FxDealPlain extends FxDealAttributes {
    account?: FxAccountPlain;
    position?: FxPositionPlain;
  }

  /** Plain object type for FxEconomicEvent, suitable for API responses */
  interface FxEconomicEventPlain extends FxEconomicEventAttributes {
  }

  /** Plain object type for FxExecutionAlert, suitable for API responses */
  interface FxExecutionAlertPlain extends FxExecutionAlertAttributes {
    executionProvider?: FxExecutionProviderPlain;
  }

  /** Plain object type for FxExecutionProvider, suitable for API responses */
  interface FxExecutionProviderPlain extends FxExecutionProviderAttributes {
  }

  /** Plain object type for FxInstrument, suitable for API responses */
  interface FxInstrumentPlain extends FxInstrumentAttributes {
    group?: FxSymbolGroupPlain;
  }

  /** Plain object type for FxMarketNews, suitable for API responses */
  interface FxMarketNewsPlain extends FxMarketNewsAttributes {
  }

  /** Plain object type for FxOrder, suitable for API responses */
  interface FxOrderPlain extends FxOrderAttributes {
    user?: UserPlain;
    account?: FxAccountPlain;
    instrument?: FxInstrumentPlain;
  }

  /** Plain object type for FxPosition, suitable for API responses */
  interface FxPositionPlain extends FxPositionAttributes {
    user?: UserPlain;
    account?: FxAccountPlain;
    instrument?: FxInstrumentPlain;
  }

  /** Plain object type for FxProvider, suitable for API responses */
  interface FxProviderPlain extends FxProviderAttributes {
  }

  /** Plain object type for FxRoutingRule, suitable for API responses */
  interface FxRoutingRulePlain extends FxRoutingRuleAttributes {
    executionProvider?: FxExecutionProviderPlain;
  }

  /** Plain object type for FxSessionCalendar, suitable for API responses */
  interface FxSessionCalendarPlain extends FxSessionCalendarAttributes {
    symbolGroups?: FxSymbolGroupPlain[];
  }

  /** Plain object type for FxSymbolGroup, suitable for API responses */
  interface FxSymbolGroupPlain extends FxSymbolGroupAttributes {
    instruments?: FxInstrumentPlain[];
    sessionCalendar?: FxSessionCalendarPlain;
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

  /** Plain object type for GeoAccessLog, suitable for API responses */
  interface GeoAccessLogPlain extends GeoAccessLogAttributes {
    user?: UserPlain;
  }

  /** Plain object type for GeoRestriction, suitable for API responses */
  interface GeoRestrictionPlain extends GeoRestrictionAttributes {
  }

  /** Plain object type for HbInstance, suitable for API responses */
  interface HbInstancePlain extends HbInstanceAttributes {
    preset?: HbStrategyPresetPlain;
    apiKey?: ApiKeyPlain;
    creator?: UserPlain;
  }

  /** Plain object type for HbStrategyPreset, suitable for API responses */
  interface HbStrategyPresetPlain extends HbStrategyPresetAttributes {
    creator?: UserPlain;
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

  /** Plain object type for MarketNews, suitable for API responses */
  interface MarketNewsPlain extends MarketNewsAttributes {
  }

  /** Plain object type for MarketNewsProvider, suitable for API responses */
  interface MarketNewsProviderPlain extends MarketNewsProviderAttributes {
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

  /** Plain object type for MobileDevice, suitable for API responses */
  interface MobileDevicePlain extends MobileDeviceAttributes {
    user?: UserPlain;
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
    seller?: UserPlain;
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

  /** Plain object type for OperatorAttestation, suitable for API responses */
  interface OperatorAttestationPlain extends OperatorAttestationAttributes {
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
    appealedBy?: UserPlain;
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
    rail?: P2pPaymentRailPlain;
    user?: UserPlain;
    offers?: P2pOfferPlain[];
  }

  /** Plain object type for P2pPaymentRail, suitable for API responses */
  interface P2pPaymentRailPlain extends P2pPaymentRailAttributes {
    accounts?: P2pPaymentMethodPlain[];
    author?: UserPlain;
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

  /** Plain object type for P2pTraderRelation, suitable for API responses */
  interface P2pTraderRelationPlain extends P2pTraderRelationAttributes {
    user?: UserPlain;
    trader?: UserPlain;
  }

  /** Plain object type for P2pUserReport, suitable for API responses */
  interface P2pUserReportPlain extends P2pUserReportAttributes {
    reporter?: UserPlain;
    reported?: UserPlain;
    trade?: P2pTradePlain;
    reviewedBy?: UserPlain;
  }

  /** Plain object type for Page, suitable for API responses */
  interface PagePlain extends PageAttributes {
  }

  /** Plain object type for Permission, suitable for API responses */
  interface PermissionPlain extends PermissionAttributes {
    roles?: RolePlain[];
  }

  /** Plain object type for PoolBackingCurrency, suitable for API responses */
  interface PoolBackingCurrencyPlain extends PoolBackingCurrencyAttributes {
  }

  /** Plain object type for PoolBackingCustodyRead, suitable for API responses */
  interface PoolBackingCustodyReadPlain extends PoolBackingCustodyReadAttributes {
  }

  /** Plain object type for PoolBackingObligation, suitable for API responses */
  interface PoolBackingObligationPlain extends PoolBackingObligationAttributes {
  }

  /** Plain object type for PoolBackingReconciliation, suitable for API responses */
  interface PoolBackingReconciliationPlain extends PoolBackingReconciliationAttributes {
  }

  /** Plain object type for PoolBackingSettlement, suitable for API responses */
  interface PoolBackingSettlementPlain extends PoolBackingSettlementAttributes {
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

  /** Plain object type for SiteChrome, suitable for API responses */
  interface SiteChromePlain extends SiteChromeAttributes {
  }

  /** Plain object type for Slider, suitable for API responses */
  interface SliderPlain extends SliderAttributes {
  }

  /** Plain object type for SpotDepositIntent, suitable for API responses */
  interface SpotDepositIntentPlain extends SpotDepositIntentAttributes {
    user?: UserPlain;
    wallet?: WalletPlain;
  }

  /** Plain object type for StakingAdminActivity, suitable for API responses */
  interface StakingAdminActivityPlain extends StakingAdminActivityAttributes {
    user?: UserPlain;
  }

  /** Plain object type for StakingAdminEarning, suitable for API responses */
  interface StakingAdminEarningPlain extends StakingAdminEarningAttributes {
    pool?: StakingPoolPlain;
  }

  /** Plain object type for StakingBatch, suitable for API responses */
  interface StakingBatchPlain extends StakingBatchAttributes {
    pool?: StakingPoolPlain;
    stakingWallet?: StakingChainWalletPlain;
  }

  /** Plain object type for StakingChainActivation, suitable for API responses */
  interface StakingChainActivationPlain extends StakingChainActivationAttributes {
    pools?: StakingPoolPlain[];
    consents?: StakingConsentPlain[];
    stakingWallet?: StakingChainWalletPlain;
    validatorSet?: StakingValidatorSetPlain;
  }

  /** Plain object type for StakingChainWallet, suitable for API responses */
  interface StakingChainWalletPlain extends StakingChainWalletAttributes {
    pools?: StakingPoolPlain[];
    activations?: StakingChainActivationPlain[];
  }

  /** Plain object type for StakingCommissionExit, suitable for API responses */
  interface StakingCommissionExitPlain extends StakingCommissionExitAttributes {
    pool?: StakingPoolPlain;
  }

  /** Plain object type for StakingConsent, suitable for API responses */
  interface StakingConsentPlain extends StakingConsentAttributes {
    positions?: StakingPositionPlain[];
    user?: UserPlain;
    pool?: StakingPoolPlain;
    activation?: StakingChainActivationPlain;
  }

  /** Plain object type for StakingDuration, suitable for API responses */
  interface StakingDurationPlain extends StakingDurationAttributes {
    positions?: StakingPositionPlain[];
    pool?: StakingPoolPlain;
  }

  /** Plain object type for StakingEarningRecord, suitable for API responses */
  interface StakingEarningRecordPlain extends StakingEarningRecordAttributes {
    position?: StakingPositionPlain;
    observation?: StakingObservationPlain;
  }

  /** Plain object type for StakingExternalPoolPerformance, suitable for API responses */
  interface StakingExternalPoolPerformancePlain extends StakingExternalPoolPerformanceAttributes {
    pool?: StakingPoolPlain;
  }

  /** Plain object type for StakingIncident, suitable for API responses */
  interface StakingIncidentPlain extends StakingIncidentAttributes {
    pool?: StakingPoolPlain;
  }

  /** Plain object type for StakingObservation, suitable for API responses */
  interface StakingObservationPlain extends StakingObservationAttributes {
    earnings?: StakingEarningRecordPlain[];
    pool?: StakingPoolPlain;
  }

  /** Plain object type for StakingPool, suitable for API responses */
  interface StakingPoolPlain extends StakingPoolAttributes {
    positions?: StakingPositionPlain[];
    durations?: StakingDurationPlain[];
    adminEarnings?: StakingAdminEarningPlain[];
    performances?: StakingExternalPoolPerformancePlain[];
    tranches?: StakingTranchePlain[];
    observations?: StakingObservationPlain[];
    batches?: StakingBatchPlain[];
    incidents?: StakingIncidentPlain[];
    activation?: StakingChainActivationPlain;
    stakingWallet?: StakingChainWalletPlain;
    validatorSet?: StakingValidatorSetPlain;
  }

  /** Plain object type for StakingPosition, suitable for API responses */
  interface StakingPositionPlain extends StakingPositionAttributes {
    earningHistory?: StakingEarningRecordPlain[];
    pool?: StakingPoolPlain;
    duration?: StakingDurationPlain;
    user?: UserPlain;
    consent?: StakingConsentPlain;
  }

  /** Plain object type for StakingStatement, suitable for API responses */
  interface StakingStatementPlain extends StakingStatementAttributes {
    user?: UserPlain;
  }

  /** Plain object type for StakingTranche, suitable for API responses */
  interface StakingTranchePlain extends StakingTrancheAttributes {
    pool?: StakingPoolPlain;
    validator?: StakingValidatorPlain;
  }

  /** Plain object type for StakingValidator, suitable for API responses */
  interface StakingValidatorPlain extends StakingValidatorAttributes {
    tranches?: StakingTranchePlain[];
    validatorSet?: StakingValidatorSetPlain;
  }

  /** Plain object type for StakingValidatorSet, suitable for API responses */
  interface StakingValidatorSetPlain extends StakingValidatorSetAttributes {
    validators?: StakingValidatorPlain[];
    pools?: StakingPoolPlain[];
    activations?: StakingChainActivationPlain[];
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

  /** Plain object type for TransactionArchive, suitable for API responses */
  interface TransactionArchivePlain extends TransactionArchiveAttributes {
  }

  /** Plain object type for TransferPin, suitable for API responses */
  interface TransferPinPlain extends TransferPinAttributes {
    user?: UserPlain;
  }

  /** Plain object type for TransfiIban, suitable for API responses */
  interface TransfiIbanPlain extends TransfiIbanAttributes {
    user?: UserPlain;
  }

  /** Plain object type for TransfiRecipient, suitable for API responses */
  interface TransfiRecipientPlain extends TransfiRecipientAttributes {
    user?: UserPlain;
  }

  /** Plain object type for TransfiUser, suitable for API responses */
  interface TransfiUserPlain extends TransfiUserAttributes {
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
    transferPin?: TransferPinPlain;
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

  /** Plain object type for UserActivity, suitable for API responses */
  interface UserActivityPlain extends UserActivityAttributes {
    user?: UserPlain;
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

  /** Plain object type for WalletAuditLog, suitable for API responses */
  interface WalletAuditLogPlain extends WalletAuditLogAttributes {
    wallet?: WalletPlain;
  }

  /** Plain object type for WalletAuditLogArchive, suitable for API responses */
  interface WalletAuditLogArchivePlain extends WalletAuditLogArchiveAttributes {
  }

  /** Plain object type for WalletData, suitable for API responses */
  interface WalletDataPlain extends WalletDataAttributes {
    wallet?: WalletPlain;
  }

  /** Plain object type for WalletPnl, suitable for API responses */
  interface WalletPnlPlain extends WalletPnlAttributes {
    user?: UserPlain;
  }

  /** Plain object type for WithdrawGateway, suitable for API responses */
  interface WithdrawGatewayPlain extends WithdrawGatewayAttributes {
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
