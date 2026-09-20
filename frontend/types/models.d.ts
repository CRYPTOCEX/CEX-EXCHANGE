// ==========================
// Core Type Utilities
// ==========================
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ==========================
// User Profile Types
// ==========================
interface UserProfile {
  bio: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    zip: string;
  };
  social: {
    twitter: string;
    dribbble: string;
    instagram: string;
    github: string;
    gitlab: string;
    telegram: string;
  };
}

// ==========================
// Permission & Role Types
// ==========================
interface permissionAttributes {
  id: number;
  name: string;
}

interface roleAttributes {
  id: number;
  name: string;
}

interface Role extends roleAttributes {
  permissions: permissionAttributes[];
}

// ==========================
// User Types
// ==========================
interface userAttributes {
  id: string;
  email?: string;
  password?: string;
  avatar?: string | null;
  /**
   * The public handle, and the ONLY name other users see.
   *
   * Nullable because every account that predates it has none;
   * `backend/src/utils/display-name.ts` falls back to "First L." for those.
   * `firstName`/`lastName` are the account's own record and are shown to the
   * account holder, to operators, and to nobody else.
   */
  username?: string | null;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified?: boolean;
  roleId: number;
  profile?: UserProfile | string;
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
  };
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

interface User extends userAttributes {
  twoFactor: twoFactorAttributes;
  role: Role;
  kyc: UserKycStatus | null;
  kycApplications?: KycApplicationWithLevel[];
  kycLevel: number;
  featureAccess: string[];
  apiKeys: apiKeyAttributes[];
  nftCount?: number;
  followersCount?: number;
  isFollowing?: boolean;
  providers: providerUserAttributes[];
}

// ==========================
// Blog Types
// ==========================
interface postAttributes {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  authorId: string;
  slug: string;
  description?: string;
  status: "PUBLISHED" | "DRAFT";
  image?: string;
  views?: number;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

interface authorAttributes {
  id: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

interface categoryAttributes {
  id: string;
  name: string;
  slug: string;
  image?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface tagAttributes {
  id: string;
  name: string;
  slug: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface commentAttributes {
  id: string;
  content: string;
  userId: string;
  postId: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

// ==========================
// Notification Types
// ==========================
interface notificationAttributes {
  id: string;
  userId: string;
  relatedId?: string;
  title: string;
  type: "investment" | "message" | "user" | "alert" | "system";
  message: string;
  details?: string;
  link?: string;
  actions?: any;
  read: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// ==========================
// Additional Types (placeholders for commonly referenced types)
// ==========================
interface twoFactorAttributes {
  id: string;
  userId: string;
  secret: string;
  type?: "TOTP" | "SMS" | "EMAIL";
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface apiKeyAttributes {
  id: string;
  userId: string;
  name: string;
  key: string;
  permissions: string[];
  ipRestriction?: boolean;
  ipWhitelist?: string[] | string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface providerUserAttributes {
  id: string;
  provider: "GOOGLE" | "WALLET";
  providerUserId: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// The computed KYC status returned in user profile
interface UserKycStatus {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED";
  level: KycLevelInfo | null;
}

interface KycLevelInfo {
  id: string;
  name: string;
  level: number;
  features?: string[] | string;
}

// Full application with level (for KYC dashboard and admin)
interface KycApplicationWithLevel {
  id: string;
  userId: string;
  levelId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED";
  data?: any;
  adminNotes?: string;
  reviewedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  level: KycLevelInfo;
}

// Keep old interface for backward compatibility but mark deprecated
/** @deprecated Use UserKycStatus or KycApplicationWithLevel instead */
interface KycApplication {
  id: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  level: number | KycLevelInfo;
  createdAt?: Date;
  updatedAt?: Date;
}

// ==========================
// Staking Types
// ==========================
interface stakingPoolAttributes {
  id: string;
  name: string;
  token: string;
  symbol: string;
  icon?: string;
  description: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  walletChain?: string;
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
  mode: "SYNTHETIC" | "REAL";
  venue?: "SOLANA_NATIVE" | "LIDO_STETH" | null;
  activationId?: string | null;
  stakingWalletId?: string | null;
  validatorSetId?: string | null;
  totalShares?: number;
  sharePrice?: number;
  onchainValue?: number;
  unallocatedValue?: number;
  treasuryShares?: number;
  lastObservedAt?: Date | null;
  lastObservedEpoch?: number | null;
  trailingRewardRateBps?: number | null;
  activationDelaySeconds?: number | null;
  unbondingEstimateSeconds?: number | null;
  unbondingBoundSeconds?: number | null;
  disclosureVersion?: string | null;
  commissionEffectiveAt?: Date | null;
  pendingAdminFeePercentage?: number | null;
  slashingPolicy?: "PASS_THROUGH" | "REIMBURSE_CAPPED" | null;
  slashingReimburseCap?: number | null;
  intakeStatus?: "OPEN" | "PAUSED";
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface stakingChainWalletAttributes {
  id: string;
  chain: string;
  network: string;
  currency: string;
  address: string;
  role: "STAKING";
  status: "ACTIVE" | "FROZEN";
  balance: number;
  gasReserveFloor: number;
  lastObservedAt?: Date | null;
  frozenAt?: Date | null;
  frozenBy?: string | null;
  frozenReason?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface stakingChainActivationAttributes {
  id: string;
  chain: string;
  network: string;
  venue: "SOLANA_NATIVE" | "LIDO_STETH";
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "RETIRED";
  stakingWalletId?: string | null;
  validatorSetId?: string | null;
  defaultCommissionPercent: number;
  commissionNoticeDays: number;
  slashingPolicy: "PASS_THROUGH" | "REIMBURSE_CAPPED";
  slashingReimburseCap?: number | null;
  licensed: boolean;
  regulator?: string | null;
  licenceReference?: string | null;
  jurisdictionsServed?: string | null;
  ringFenceAcknowledged: boolean;
  noGuaranteeAcknowledged: boolean;
  validatorDueDiligence?: string | null;
  sfcAttestation: boolean;
  disclosureVersion?: string | null;
  disclosureHash?: string | null;
  disclosureText?: string | null;
  acceptedBy?: string | null;
  acceptedAt?: Date | null;
  acceptedIp?: string | null;
  acceptedUserAgent?: string | null;
  activatedAt?: Date | null;
  pausedAt?: Date | null;
  pausedBy?: string | null;
  pausedReason?: string | null;
  retiredAt?: Date | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface stakingValidatorSetAttributes {
  id: string;
  chain: string;
  network: string;
  name: string;
  status: "ACTIVE" | "RETIRED";
  policy?: string | null;
  lastEvaluatedAt?: Date | null;
  lastEvaluation?: string | null;
  healthy: boolean;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface stakingValidatorAttributes {
  id: string;
  validatorSetId: string;
  chain: string;
  voteAccount: string;
  identity?: string | null;
  name?: string | null;
  weight: number;
  commissionPercent?: number | null;
  mevCommissionPercent?: number | null;
  asn?: string | null;
  status: "ACTIVE" | "SUSPENDED" | "REMOVED";
  lastHealth?: string | null;
  lastHealthAt?: Date | null;
  breach?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface stakingTrancheAttributes {
  id: string;
  poolId: string;
  chain: string;
  network: string;
  kind: "SOLANA_STAKE_ACCOUNT" | "LIDO_SHARES";
  stakeAccount?: string | null;
  seed?: string | null;
  validatorId?: string | null;
  status: "CREATING" | "ACTIVATING" | "ACTIVE" | "DEACTIVATING" | "INACTIVE" | "WITHDRAWN" | "FAILED";
  amount: number;
  observedValue: number;
  activationEpoch?: number | null;
  deactivationEpoch?: number | null;
  lastObservedEpoch?: number | null;
  lastObservedAt?: Date | null;
  createBatchId?: string | null;
  exitBatchId?: string | null;
  withdrawBatchId?: string | null;
  failureReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface stakingBatchAttributes {
  id: string;
  poolId?: string | null;
  chain: string;
  network: string;
  kind: "GATHER" | "DELEGATE" | "EXIT" | "CLAIM" | "RETURN" | "REFUND" | "COMMISSION_EXIT" | "SWEEP";
  status: "PENDING" | "BROADCAST" | "CONFIRMED" | "RETRYING" | "FAILED";
  stakingWalletId?: string | null;
  intentDigest?: string | null;
  intent?: string | null;
  txHash?: string | null;
  broadcastMeta?: string | null;
  metadata?: string | null;
  networkFee: number;
  amount: number;
  attempts: number;
  lastError?: string | null;
  broadcastAt?: Date | null;
  confirmedAt?: Date | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface stakingObservationAttributes {
  id: string;
  poolId: string;
  chain: string;
  window: string;
  epoch?: number | null;
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
  detail?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface stakingConsentAttributes {
  id: string;
  userId: string;
  poolId: string;
  activationId?: string | null;
  version: string;
  hash: string;
  text: string;
  acknowledgements?: string | null;
  acceptedAt: Date;
  ip?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface stakingStatementAttributes {
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
  summary?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface stakingIncidentAttributes {
  id: string;
  poolId?: string | null;
  chain?: string | null;
  kind: "SLASHING" | "DRIFT" | "LOW_GAS" | "VALIDATOR_BREACH" | "BATCH_STUCK" | "OBSERVER_LAG" | "UNBONDING_OVERDUE" | "DELEGATION_STALE" | "COMMISSION" | "OTHER";
  severity: "INFO" | "WARNING" | "CRITICAL";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  title: string;
  detail?: string | null;
  lossAmount?: number | null;
  reimbursedAmount: number;
  dedupeKey: string;
  occurrences: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  acknowledgedBy?: string | null;
  acknowledgedAt?: Date | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  resolution?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A DURATION TIER of a staking pool: one lock term, its own APR, and its own
 * payout schedule. A pool offers zero or more; zero means it uses its own
 * `apr` / `lockPeriod` / `earningFrequency` as a single implicit term.
 *
 * The nullable fields are OVERRIDES — null means "use the pool's value".
 */
interface stakingDurationAttributes {
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
  /**
   * The term the pool ADVERTISES. At most one OPEN term per pool carries it;
   * false on every row means the shortest open term is the headline.
   */
  isFeatured: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface stakingPositionAttributes {
  id: string;
  userId: string;
  poolId: string;
  /** The tier staked into. Null for legacy rows and tier-less pools. */
  durationId: string | null;
  amount: number;
  startDate: Date;
  endDate: Date | null;
  status:
    | "ACTIVE"
    | "COMPLETED"
    | "CANCELLED"
    | "PENDING_WITHDRAWAL"
    | "PENDING_DELEGATION"
    | "UNSTAKE_REQUESTED"
    | "UNBONDING"
    | "WITHDRAWABLE"
    | "FAILED";
  withdrawalRequested: boolean;
  withdrawalRequestDate: Date | null;
  adminNotes: string | null;
  completedAt: Date | null;
  /**
   * Terms SNAPSHOTTED at stake time. These — not the pool's or the tier's
   * current values — are what the position actually earns and costs to exit, so
   * a later admin edit cannot re-price a lock the user already agreed to. Null
   * on legacy rows written before the snapshot existed.
   */
  apr: number | null;
  adminFeePercentage: number | null;
  earlyWithdrawalFee: number | null;
  earningFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM" | null;
  autoCompound: boolean | null;
  lockPeriod: number | null;
  lastDistributionDate: Date | null;
  mode: "SYNTHETIC" | "REAL";
  consentId?: string | null;
  shares?: number | null;
  entrySharePrice?: number | null;
  principalOnchain?: number | null;
  gatherTxHash?: string | null;
  returnTxHash?: string | null;
  gatherNetworkFee?: number | null;
  returnNetworkFee?: number | null;
  unstakeRequestedAt?: Date | null;
  unstakeShares?: number | null;
  unstakeSharePrice?: number | null;
  unbondingEndsAt?: Date | null;
  unbondingBoundAt?: Date | null;
  settledAmount?: number | null;
  settledAt?: Date | null;
  failureReason?: string | null;
  forceUnstakedBy?: string | null;
  forceUnstakeReason?: string | null;
  gatherBatchId?: string | null;
  exitBatchId?: string | null;
  returnBatchId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface stakingEarningRecordAttributes {
  id: string;
  positionId: string;
  amount: number;
  type: "REGULAR" | "BONUS" | "REFERRAL";
  description: string;
  isClaimed: boolean;
  claimedAt: Date | null;
  settlement?: "CLAIMABLE" | "COMPOUNDED" | null;
  observationId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface stakingAdminEarningAttributes {
  id: string;
  poolId: string;
  currency: string;
  amount: number;
  type: "PLATFORM_FEE" | "EARLY_WITHDRAWAL_FEE" | "PERFORMANCE_FEE" | "OTHER";
  isClaimed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface stakingExternalPoolPerformanceAttributes {
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

// ==========================
// KYC Types
// ==========================
type KycFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "EMAIL"
  | "PHONE"
  | "NUMBER"
  | "DATE"
  | "SELECT"
  | "CHECKBOX"
  | "RADIO"
  | "IMAGE"
  | "FILE"
  | "SECTION"
  | "ADDRESS"
  | "IDENTITY";

interface KycFieldOption {
  label: string;
  value: string;
}

interface KycFieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  message?: string;
  minDate?: string;
  maxDate?: string;
  maxSize?: number;
}

interface KycFieldConditional {
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "NOT_CONTAINS"
    | "GREATER_THAN"
    | "LESS_THAN";
  value: string | number | boolean;
}

interface IdentityDocumentField {
  id: string;
  label: string;
  description?: string;
  required: boolean;
  type: "FILE";
  accept?: string;
}

interface IdentityType {
  value: string;
  label: string;
  fields: IdentityDocumentField[];
}

interface KycField {
  id: string;
  order?: number;
  type: KycFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: KycFieldOption[];
  fields?: KycField[];
  validation?: KycFieldValidation;
  conditional?: KycFieldConditional;
  rows?: number;
  min?: number;
  step?: number;
  format?: string;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  verificationField?: {
    serviceFieldId: string;
    mappingType: string;
  };
  identityTypes?: IdentityType[];
  defaultType?: string;
  requireSelfie?: boolean;
  hidden?: boolean;
}

interface VerificationService {
  id: string;
  name: string;
  type: "SUMSUB" | "GEMINI" | "MANUAL" | "DEEPSEEK";
  status: "ACTIVE" | "INACTIVE";
  description?: string;
  config?: any;
  integrationDetails?: string | {
    features: string[];
    [key: string]: any;
  };
  templates?: VerificationTemplate[];
}

interface KycLevel {
  id: string;
  serviceId?: string;
  name: string;
  description?: string;
  level: number;
  fields?: KycField[];
  features?: any;
  status: "ACTIVE" | "DRAFT" | "INACTIVE";
  verificationService?: VerificationService;
  completionRate?: number;
  usersVerified?: number;
  pendingVerifications?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// ==========================
// ICO Types
// ==========================
interface icoTokenOfferingAttributes {
  id: string;
  name: string;
  symbol: string;
  totalSupply: number;
  pricePerToken: number;
  startDate: Date;
  endDate: Date;
  description?: string;
  image?: string;
  icon?: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "PENDING" | "SUCCESS" | "FAILED" | "REJECTED";
  isPaused?: boolean;
  isFlagged?: boolean;
  targetAmount?: number;
  currentRaised?: number;
  participants?: number;
  // Additional properties used by components
  purchaseWalletCurrency?: string;
  featured?: boolean;
  website?: string;
  tokenPrice?: number;
  currentPrice?: number;
  priceChange?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface icoTeamMemberAttributes {
  id: string;
  tokenOfferingId?: string;
  name: string;
  role: string;
  bio?: string;
  avatar?: string;
  socialLinks?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  github?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IcoAttachment {
  type: "image" | "document" | "link";
  url: string;
  name: string;
  file?: File;
}

interface icoTokenOfferingUpdateAttributes {
  id: string;
  tokenOfferingId: string;
  offeringId?: string;
  title: string;
  content: string;
  attachments?: string[] | string | IcoAttachment[];
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IcoLaunchPlanFeatures {
  maxTeamMembers?: number;
  maxRoadmapItems?: number;
  maxOfferingPhases?: number;
  maxUpdatePosts?: number;
  supportLevel?: "basic" | "standard" | "premium";
  marketingSupport?: boolean;
  auditIncluded?: boolean;
  customTokenomics?: boolean;
  priorityListing?: boolean;
  kycRequired?: boolean;
}

interface icoLaunchPlanAttributes {
  id: string;
  tokenOfferingId?: string;
  phase?: string;
  startDate?: Date;
  endDate?: Date;
  name: string;
  price: number;
  currency: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  recommended: boolean;
  status: boolean;
  sortOrder: number;
  description?: string;
  features?: IcoLaunchPlanFeatures | string[] | string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface icoTokenOfferingPhaseAttributes {
  id: string;
  tokenOfferingId: string;
  name: string;
  pricePerToken: number;
  tokensAllocated: number;
  tokensSold?: number;
  startDate: Date;
  endDate: Date;
  // Additional properties used by components
  remaining?: number;
  tokenPrice?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface icoTokenDetailAttributes {
  id: string;
  tokenOfferingId: string;
  type: string;
  blockchain: string;
  contractAddress?: string;
  decimals?: number;
  totalSupply?: number;
  tokensForSale?: number;
  useOfFunds?: string | any[];
  links?: string[] | string | any;
  tokenTypeData?: {
    name?: string;
    value?: string;
    description?: string;
  };
  // Additional properties used by components
  description?: string;
  tokenType?: string;
  salePercentage?: number;
  // Vesting terms. Every buyer of an offering vests on the same terms; the
  // per-buyer tranche schedule lives in ico_token_vesting(_release).
  vestingEnabled?: boolean;
  vestingType?: "LINEAR" | "CLIFF" | "MILESTONE" | null;
  vestingDurationMonths?: number | null;
  vestingCliffMonths?: number | null;
  vestingMilestones?:
    | { monthsAfterPurchase: number; percentage: number }[]
    | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface icoRoadmapItemAttributes {
  id: string;
  offeringId: string;
  title: string;
  description: string;
  date: string;
  completed: boolean;
  // Additional properties used by components
  tokenOfferingId?: string;
  quarter?: string;
  year?: number;
  milestone?: string;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type icoRoadmapItemCreationAttributes = Partial<icoRoadmapItemAttributes>;

interface icoBlockchainAttributes {
  id: string;
  name: string;
  symbol: string;
  network: string;
  value: string;
  status: boolean;
  chainId?: number;
  rpcUrl?: string;
  explorerUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface icoTokenTypeAttributes {
  id: string;
  name: string;
  value: string;
  description?: string;
  status: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface icoAdminActivityAttributes {
  id: string;
  adminId: string;
  action: string;
  type?: string;
  offeringName?: string;
  offeringId?: string;
  description?: string;
  metadata?: any;
  createdAt?: Date;
}

// ==========================
// Investment Types
//
// These describe what `/api/finance/investment*` ACTUALLY SENDS, which is not
// what they used to say. The previous pair declared `name`, `dailyProfit`,
// `duration` and `status: "ACTIVE" | "INACTIVE"` as REQUIRED fields of a plan —
// `dailyProfit` exists nowhere in the schema at all, `duration` is a join table
// on this model, and the plan endpoints select an explicit attribute list that
// includes none of the four. On the investment side the status union carried a
// "PENDING" the ENUM does not have and omitted the "REJECTED" it does, and it
// was missing `durationId`, `roiPercentage`, `result` and the `duration`
// include — every one of which the UI needs to state a term or an outcome.
//
// A type that overstates a payload is worse than no type: it is what let a page
// read `plan.name` and render `undefined` with the compiler's blessing.
// ==========================

/** The three ways an investment can settle. See `kit/outcome.ts`. */
type investmentResult = "WIN" | "LOSS" | "DRAW";

/** One selectable term on a plan. `timeframe` is the backend's raw enum. */
interface investmentDurationAttributes {
  id: string;
  duration: number;
  timeframe: "HOUR" | "DAY" | "WEEK" | "MONTH";
}

/**
 * A plan as the USER-FACING endpoints return it
 * (`GET /api/finance/investment/plan` and `.../plan/:id`).
 */
interface investmentPlanAttributes {
  id: string;
  title: string;
  description: string;
  image?: string | null;
  minAmount: number;
  maxAmount: number;
  /**
   * The rate, as a percentage of the principal, for the WHOLE term — not per
   * day and not per year. The settlement cron computes
   * `roi = (profitPercentage / 100) * amount` once, at maturity, regardless of
   * which duration was chosen.
   */
  profitPercentage: number;
  currency: string;
  /** Which wallet funds it: "FIAT" | "SPOT" | "ECO". */
  walletType: string;
  trending?: boolean;
  /**
   * WHAT MATURITY DOES TO THE PRINCIPAL — the direction `profitPercentage`
   * lacks. WIN pays principal + rate, DRAW returns the principal alone, LOSS
   * returns principal - rate. Optional here only because an install running an
   * older backend will not send it; `kit/outcome.ts` treats absent as unstated
   * rather than as WIN.
   */
  defaultResult?: investmentResult;
  durations?: investmentDurationAttributes[];
}

/**
 * One of the viewer's own investments, as the paginated branch of
 * `GET /api/finance/investment?type=general&page=…` returns it.
 */
interface investmentAttributes {
  id: string;
  userId: string;
  planId: string;
  durationId: string;
  amount: number;
  /**
   * ABSOLUTE ROI, AND ALWAYS POSITIVE — never a signed P&L.
   *
   * The purchase route writes `(plan.profitPercentage / 100) * amount` here at
   * creation time, so a brand-new ACTIVE investment already carries a non-zero
   * "profit" that has not been earned; and the settlement cron overwrites it
   * with the same unsigned magnitude even when `result` is LOSS, i.e. when that
   * amount was DEDUCTED. Read `result` to learn the sign. Anything that renders
   * this as a gain without consulting `result` is stating the opposite of what
   * happened.
   */
  profit?: number;
  /** Set only at settlement: `profit` as a percentage of `amount`. */
  roiPercentage?: number;
  /** Null until settlement decides it. */
  result?: investmentResult | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
  /** When the term matures. Present on every row the purchase route creates. */
  endDate?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  /** Trimmed by the list endpoint to exactly these four fields. */
  plan?: Pick<investmentPlanAttributes, "id" | "title" | "image" | "currency">;
  duration?: investmentDurationAttributes;
}

// ==========================
// Type Aliases for IDs
// ==========================
type userId = string;
type postId = string;
type authorId = string;
type categoryId = string;
type tagId = string;
type commentId = string;
type notificationId = string;
type roleId = number;
type permissionId = number;
type stakingPoolId = string;
type stakingPositionId = string;
/**
 * THE PLATFORM'S OWN EXIT FROM AN ON-CHAIN POOL: treasury shares queued
 * behind the users' exits, settled from the treasury after them, paid to
 * the chain's ecosystem master wallet.
 */
interface stakingCommissionExitAttributes {
  id: string;
  poolId: string;
  chain: string;
  network: string;
  status: "QUEUED" | "UNBONDING" | "SETTLED" | "PAID" | "FAILED";
  shares: number;
  requestSharePrice: number;
  requestedValue: number;
  settledAmount?: number | null;
  settledAt?: Date | null;
  destination?: string | null;
  exitBatchId?: string | null;
  payoutBatchId?: string | null;
  txHash?: string | null;
  networkFee: number;
  failureReason?: string | null;
  requestedBy?: string | null;
  requestedAt: Date;
  paidAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** One user's monthly on-chain staking statement: CSV, hashed, written once. */
interface stakingStatementAttributes {
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
  summary?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
