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
    country: string;
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
  kyc: KycApplication;
  kycLevel?: number;
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

interface KycApplication {
  id: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  level: number;
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
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface stakingPositionAttributes {
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

interface stakingEarningRecordAttributes {
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
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "PENDING" | "SUCCESS" | "FAILED";
  isPaused?: boolean;
  isFlagged?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface icoTeamMemberAttributes {
  id: string;
  tokenOfferingId: string;
  name: string;
  role: string;
  bio?: string;
  avatar?: string;
  socialLinks?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface icoTokenOfferingUpdateAttributes {
  id: string;
  tokenOfferingId: string;
  offeringId?: string;
  title: string;
  content: string;
  attachments?: string[] | string;
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface icoLaunchPlanAttributes {
  id: string;
  tokenOfferingId: string;
  phase: string;
  startDate: Date;
  endDate: Date;
  name: string;
  price: number;
  currency: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  recommended: boolean;
  status: boolean;
  sortOrder: number;
  description?: string;
  features?: string[] | string;
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
  useOfFunds?: string | any[];
  links?: string[] | string | any;
  createdAt?: Date;
  updatedAt?: Date;
}

interface icoRoadmapItemAttributes {
  id: string;
  tokenOfferingId: string;
  quarter: string;
  year: number;
  milestone: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  createdAt?: Date;
  updatedAt?: Date;
}

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
// ==========================
interface investmentPlanAttributes {
  id: string;
  name: string;
  description?: string;
  minAmount: number;
  maxAmount: number;
  dailyProfit: number;
  duration: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: Date;
  updatedAt?: Date;
}

interface investmentAttributes {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  profit?: number;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  startDate?: Date;
  endDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
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