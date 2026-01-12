// ============================================
// STATUS ENUMS
// ============================================
type BinaryAiEngineStatus = "ACTIVE" | "PAUSED" | "STOPPED";
type PracticeModeOption = "DISABLED" | "SAME_AS_LIVE" | "CUSTOM";
type OptimizationStrategy = "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
type WhaleStrategy = "REDUCE_EXPOSURE" | "ALERT_ONLY" | "FORCE_LOSS";
type TierCalculationMethod = "VOLUME" | "DEPOSIT" | "MANUAL";
type CooldownReason = "BIG_WIN" | "STREAK" | "MANUAL";
type PositionOutcome = "PENDING" | "WIN" | "LOSS" | "DRAW";
type PositionSide = "RISE" | "FALL";
type SnapshotReason = "AUTO" | "MANUAL" | "PRE_CHANGE";
type SimulationStatus = "RUNNING" | "COMPLETED" | "CANCELLED";
type ABTestStatus = "DRAFT" | "RUNNING" | "COMPLETED" | "CANCELLED";
type ABTestWinner = "CONTROL" | "VARIANT" | "TIE" | "INCONCLUSIVE";
type CohortType = "SIGNUP_DATE" | "DEPOSIT_AMOUNT" | "TRADE_FREQUENCY" | "CUSTOM";
type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
type EngineActionType =
  | "PRICE_ADJUSTMENT"
  | "OUTCOME_OVERRIDE"
  | "PERIOD_RESET"
  | "CONFIG_CHANGE"
  | "ENGINE_START"
  | "ENGINE_STOP"
  | "ENGINE_PAUSE"
  | "EMERGENCY_STOP"
  | "MANUAL_OVERRIDE"
  | "TIER_ADJUSTMENT"
  | "COOLDOWN_APPLIED"
  | "COOLDOWN_REMOVED"
  | "WHALE_DETECTED"
  | "WHALE_HANDLED"
  | "SIMULATION_RUN"
  | "ROLLBACK_EXECUTED"
  | "CORRELATION_ALERT"
  | "AB_TEST_STARTED"
  | "AB_TEST_ENDED";

// ============================================
// MAIN ENGINE
// ============================================
interface binaryAiEngineAttributes {
  id: string;
  marketMakerId: string;
  status: BinaryAiEngineStatus;
  targetUserWinRate: number;
  winRateVariance: number;
  winRateResetHours: number;
  practiceMode: PracticeModeOption;
  practiceTargetWinRate: number;
  practiceWinRateVariance: number;
  optimizationStrategy: OptimizationStrategy;
  maxPriceAdjustmentPercent: number;
  adjustmentLeadTimeSeconds: number;
  volatilityMaskingEnabled: boolean;
  volatilityNoisePercent: number;
  enableUserTiers: boolean;
  tierCalculationMethod: TierCalculationMethod;
  enableBigWinCooldown: boolean;
  bigWinThreshold: number;
  cooldownDurationMinutes: number;
  cooldownWinRateReduction: number;
  enableWhaleDetection: boolean;
  whaleThreshold: number;
  whaleStrategy: WhaleStrategy;
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
  createdAt?: Date;
  updatedAt?: Date;
}

interface binaryAiEngineCreationAttributes
  extends Optional<
    binaryAiEngineAttributes,
    | "id"
    | "status"
    | "targetUserWinRate"
    | "winRateVariance"
    | "winRateResetHours"
    | "practiceMode"
    | "practiceTargetWinRate"
    | "practiceWinRateVariance"
    | "optimizationStrategy"
    | "maxPriceAdjustmentPercent"
    | "adjustmentLeadTimeSeconds"
    | "volatilityMaskingEnabled"
    | "volatilityNoisePercent"
    | "enableUserTiers"
    | "tierCalculationMethod"
    | "enableBigWinCooldown"
    | "bigWinThreshold"
    | "cooldownDurationMinutes"
    | "cooldownWinRateReduction"
    | "enableWhaleDetection"
    | "whaleThreshold"
    | "whaleStrategy"
    | "simulationMode"
    | "logSimulatedActions"
    | "enableExternalCorrelation"
    | "externalPriceSource"
    | "maxDeviationPercent"
    | "allowedOrderTypes"
    | "minPositionForOptimization"
    | "maxDailyLoss"
    | "maxSingleOrderExposure"
    | "currentPeriodWins"
    | "currentPeriodLosses"
    | "currentPeriodPlatformProfit"
    | "lastPeriodResetAt"
    | "practicePeriodWins"
    | "practicePeriodLosses"
    | "lastPracticePeriodResetAt"
    | "lastSnapshotId"
  > {}

// ============================================
// POSITION
// ============================================
interface binaryAiEnginePositionAttributes {
  id: string;
  engineId: string;
  binaryOrderId: string;
  userId: string;
  symbol: string;
  side: PositionSide;
  amount: number;
  entryPrice: number;
  expiryTime: Date;
  isDemo: boolean;
  userTier: string | null;
  isWhale: boolean;
  hasCooldown: boolean;
  outcome: PositionOutcome;
  settledAt: Date | null;
  wasManipulated: boolean;
  manipulationDetails: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface binaryAiEnginePositionCreationAttributes
  extends Optional<
    binaryAiEnginePositionAttributes,
    "id" | "isDemo" | "userTier" | "isWhale" | "hasCooldown" | "outcome" | "settledAt" | "wasManipulated" | "manipulationDetails"
  > {}

// ============================================
// ACTION
// ============================================
interface binaryAiEngineActionAttributes {
  id: string;
  engineId: string;
  actionType: EngineActionType;
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
}

interface binaryAiEngineActionCreationAttributes
  extends Optional<
    binaryAiEngineActionAttributes,
    "id" | "symbol" | "details" | "previousValue" | "newValue" | "triggeredBy" | "isDemo" | "isSimulated" | "affectedUserId"
  > {}

// ============================================
// DAILY STATS
// ============================================
interface binaryAiEngineDailyStatsAttributes {
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
}

interface binaryAiEngineDailyStatsCreationAttributes
  extends Optional<
    binaryAiEngineDailyStatsAttributes,
    | "id"
    | "isDemo"
    | "totalOrdersProcessed"
    | "totalWins"
    | "totalLosses"
    | "totalDraws"
    | "platformProfit"
    | "effectiveUserWinRate"
    | "targetUserWinRate"
    | "profitMargin"
    | "priceAdjustmentCount"
    | "avgAdjustmentPercent"
    | "largestAdjustmentPercent"
    | "whaleOrdersCount"
    | "cooldownsApplied"
    | "tierBreakdown"
  > {}

// ============================================
// USER TIER
// ============================================
interface binaryAiEngineUserTierAttributes {
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
}

interface binaryAiEngineUserTierCreationAttributes
  extends Optional<
    binaryAiEngineUserTierAttributes,
    "id" | "tierOrder" | "minVolume" | "minDeposit" | "winRateBonus" | "description" | "isActive"
  > {}

// ============================================
// USER COOLDOWN
// ============================================
interface binaryAiEngineUserCooldownAttributes {
  id: string;
  engineId: string;
  userId: string;
  reason: CooldownReason;
  triggerOrderId: string | null;
  triggerAmount: number | null;
  winRateReduction: number;
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface binaryAiEngineUserCooldownCreationAttributes
  extends Optional<
    binaryAiEngineUserCooldownAttributes,
    "id" | "reason" | "triggerOrderId" | "triggerAmount" | "isActive"
  > {}

// ============================================
// SNAPSHOT
// ============================================
interface binaryAiEngineSnapshotAttributes {
  id: string;
  engineId: string;
  snapshotName: string | null;
  configData: Record<string, any>;
  tierData: Record<string, any>[] | null;
  reason: SnapshotReason;
  createdBy: string;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface binaryAiEngineSnapshotCreationAttributes
  extends Optional<
    binaryAiEngineSnapshotAttributes,
    "id" | "snapshotName" | "tierData" | "reason" | "createdBy" | "notes"
  > {}

// ============================================
// SIMULATION
// ============================================
interface binaryAiEngineSimulationAttributes {
  id: string;
  engineId: string;
  startedAt: Date;
  endedAt: Date | null;
  status: SimulationStatus;
  ordersAnalyzed: number;
  simulatedWins: number;
  simulatedLosses: number;
  simulatedProfit: number;
  priceAdjustmentsWouldHaveMade: number;
  configUsed: Record<string, any> | null;
  summary: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface binaryAiEngineSimulationCreationAttributes
  extends Optional<
    binaryAiEngineSimulationAttributes,
    | "id"
    | "endedAt"
    | "status"
    | "ordersAnalyzed"
    | "simulatedWins"
    | "simulatedLosses"
    | "simulatedProfit"
    | "priceAdjustmentsWouldHaveMade"
    | "configUsed"
    | "summary"
  > {}

// ============================================
// A/B TEST
// ============================================
interface binaryAiEngineABTestAttributes {
  id: string;
  engineId: string;
  testName: string;
  status: ABTestStatus;
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
  winningVariant: ABTestWinner | null;
  confidenceLevel: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface binaryAiEngineABTestCreationAttributes
  extends Optional<
    binaryAiEngineABTestAttributes,
    | "id"
    | "status"
    | "startedAt"
    | "endedAt"
    | "trafficSplit"
    | "controlOrders"
    | "controlWins"
    | "controlProfit"
    | "variantOrders"
    | "variantWins"
    | "variantProfit"
    | "winningVariant"
    | "confidenceLevel"
  > {}

// ============================================
// COHORT
// ============================================
interface binaryAiEngineCohortAttributes {
  id: string;
  engineId: string;
  cohortName: string;
  cohortType: CohortType;
  startDate: Date | null;
  endDate: Date | null;
  minValue: number | null;
  maxValue: number | null;
  customCriteria: Record<string, any> | null;
  userCount: number;
  totalOrders: number;
  totalWins: number;
  avgWinRate: number;
  totalProfit: number;
  lastCalculatedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface binaryAiEngineCohortCreationAttributes
  extends Optional<
    binaryAiEngineCohortAttributes,
    | "id"
    | "startDate"
    | "endDate"
    | "minValue"
    | "maxValue"
    | "customCriteria"
    | "userCount"
    | "totalOrders"
    | "totalWins"
    | "avgWinRate"
    | "totalProfit"
    | "lastCalculatedAt"
  > {}

// ============================================
// CORRELATION ALERT
// ============================================
interface binaryAiEngineCorrelationAlertAttributes {
  id: string;
  engineId: string;
  symbol: string;
  internalPrice: number;
  externalPrice: number;
  deviationPercent: number;
  priceSource: string;
  severity: AlertSeverity;
  status: AlertStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface binaryAiEngineCorrelationAlertCreationAttributes
  extends Optional<
    binaryAiEngineCorrelationAlertAttributes,
    "id" | "severity" | "status" | "acknowledgedBy" | "acknowledgedAt" | "resolvedAt"
  > {}

// ============================================
// ENGINE CONFIGURATION (for utility functions)
// ============================================
interface EngineConfig {
  targetUserWinRate: number;
  winRateVariance: number;
  winRateResetHours: number;
  practiceMode: PracticeModeOption;
  practiceTargetWinRate: number;
  practiceWinRateVariance: number;
  optimizationStrategy: OptimizationStrategy;
  maxPriceAdjustmentPercent: number;
  adjustmentLeadTimeSeconds: number;
  volatilityMaskingEnabled: boolean;
  volatilityNoisePercent: number;
  enableUserTiers: boolean;
  tierCalculationMethod: TierCalculationMethod;
  enableBigWinCooldown: boolean;
  bigWinThreshold: number;
  cooldownDurationMinutes: number;
  cooldownWinRateReduction: number;
  enableWhaleDetection: boolean;
  whaleThreshold: number;
  whaleStrategy: WhaleStrategy;
  simulationMode: boolean;
  logSimulatedActions: boolean;
  enableExternalCorrelation: boolean;
  externalPriceSource: string | null;
  maxDeviationPercent: number;
  allowedOrderTypes: string[];
  minPositionForOptimization: number;
  maxDailyLoss: number;
  maxSingleOrderExposure: number;
}

// ============================================
// POSITION ANALYSIS (for utility functions)
// ============================================
interface BinaryOrder {
  id: string;
  userId: string;
  symbol: string;
  side: PositionSide;
  amount: number;
  entryPrice: number;
  expiryTime: Date;
  isDemo: boolean;
  userTier?: string;
  isWhale?: boolean;
  hasCooldown?: boolean;
}

interface ExpiryBucket {
  expiryTime: Date;
  orders: BinaryOrder[];
  totalRise: number;
  totalFall: number;
  riseCount: number;
  fallCount: number;
  netExposure: number;
  dominantSide: PositionSide | "BALANCED";
  hasWhales: boolean;
  whaleOrders: BinaryOrder[];
}

interface PositionAnalysis {
  symbol: string;
  currentPrice: number;
  buckets: ExpiryBucket[];
  totalRiseAmount: number;
  totalFallAmount: number;
  totalPositions: number;
  netExposure: number;
  mostProfitableOutcome: PositionSide;
  profitIfRise: number;
  profitIfFall: number;
  whaleExposure: number;
  tierBreakdown: Record<string, number>;
}

// ============================================
// WIN RATE DECISION (for utility functions)
// ============================================
interface WinRateDecision {
  forceUserWin: boolean;
  forceUserLoss: boolean;
  reason: string;
  currentWinRate?: number;
  targetRate?: number;
  deficit?: number;
  excess?: number;
  tierAdjustment?: number;
  cooldownAdjustment?: number;
  effectiveTargetRate?: number;
}

// ============================================
// OPTIMAL OUTCOME (for utility functions)
// ============================================
interface OptimalOutcome {
  targetSide: PositionSide;
  targetPrice: number;
  priceDirection: "UP" | "DOWN";
  expectedProfit: number;
  winRateImpact: number;
  adjustmentNeeded: number;
  confidence: number;
  whaleConsiderations?: {
    hasWhales: boolean;
    whaleOutcome: "WIN" | "LOSS";
    exposureReduction: number;
  };
}

// ============================================
// USER TIER STATUS (for utility functions)
// ============================================
interface UserTierStatus {
  userId: string;
  currentTier: string;
  tierOrder: number;
  winRateBonus: number;
  totalVolume: number;
  totalDeposits: number;
  nextTier?: string;
  progressToNextTier?: number;
}

// ============================================
// COOLDOWN STATUS (for utility functions)
// ============================================
interface CooldownStatus {
  userId: string;
  isActive: boolean;
  reason?: CooldownReason;
  winRateReduction: number;
  expiresAt?: Date;
  triggerAmount?: number;
  remainingMinutes?: number;
}
