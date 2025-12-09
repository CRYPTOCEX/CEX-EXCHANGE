type GatewayMerchantStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
type GatewayVerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED";
type GatewayFeeType = "PERCENTAGE" | "FIXED" | "BOTH";
type GatewayPayoutSchedule = "INSTANT" | "DAILY" | "WEEKLY" | "MONTHLY";

interface gatewayMerchantAttributes {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  apiKey: string;
  secretKey: string;
  webhookSecret: string;
  testMode: boolean;
  allowedCurrencies: string[];
  allowedWalletTypes: string[];
  defaultCurrency: string;
  feeType: GatewayFeeType;
  feePercentage: number;
  feeFixed: number;
  payoutSchedule: GatewayPayoutSchedule;
  payoutThreshold: number;
  payoutWalletId?: string;
  status: GatewayMerchantStatus;
  verificationStatus: GatewayVerificationStatus;
  dailyLimit: number;
  monthlyLimit: number;
  transactionLimit: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type gatewayMerchantPk = "id";
type gatewayMerchantId = gatewayMerchantAttributes[gatewayMerchantPk];
type gatewayMerchantOptionalAttributes =
  | "id"
  | "description"
  | "logo"
  | "website"
  | "phone"
  | "address"
  | "city"
  | "state"
  | "country"
  | "postalCode"
  | "testMode"
  | "allowedCurrencies"
  | "allowedWalletTypes"
  | "defaultCurrency"
  | "feeType"
  | "feePercentage"
  | "feeFixed"
  | "payoutSchedule"
  | "payoutThreshold"
  | "payoutWalletId"
  | "status"
  | "verificationStatus"
  | "dailyLimit"
  | "monthlyLimit"
  | "transactionLimit"
  | "metadata"
  | "createdAt"
  | "updatedAt"
  | "deletedAt";
type gatewayMerchantCreationAttributes = Optional<
  gatewayMerchantAttributes,
  gatewayMerchantOptionalAttributes
>;
