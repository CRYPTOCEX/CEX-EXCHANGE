type GatewayPaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

type GatewayWalletType = "FIAT" | "SPOT" | "ECO";

interface GatewayLineItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
}

interface GatewayBillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

interface GatewayPaymentAllocation {
  walletId: string;
  walletType: GatewayWalletType;
  currency: string;
  amount: number;
  equivalentInPaymentCurrency: number;
}

interface gatewayPaymentAttributes {
  id: string;
  merchantId: string;
  customerId?: string;
  transactionId?: string;
  paymentIntentId: string;
  merchantOrderId?: string;
  amount: number;
  currency: string;
  walletType: GatewayWalletType;
  feeAmount: number;
  netAmount: number;
  status: GatewayPaymentStatus;
  checkoutUrl: string;
  returnUrl: string;
  cancelUrl?: string;
  webhookUrl?: string;
  description?: string;
  metadata?: Record<string, any>;
  lineItems?: GatewayLineItem[];
  customerEmail?: string;
  customerName?: string;
  billingAddress?: GatewayBillingAddress;
  expiresAt: Date;
  completedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  allocations?: GatewayPaymentAllocation[];
  testMode: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type gatewayPaymentPk = "id";
type gatewayPaymentId = gatewayPaymentAttributes[gatewayPaymentPk];
type gatewayPaymentOptionalAttributes =
  | "id"
  | "customerId"
  | "transactionId"
  | "merchantOrderId"
  | "feeAmount"
  | "netAmount"
  | "status"
  | "cancelUrl"
  | "webhookUrl"
  | "description"
  | "metadata"
  | "lineItems"
  | "customerEmail"
  | "customerName"
  | "billingAddress"
  | "completedAt"
  | "ipAddress"
  | "userAgent"
  | "allocations"
  | "testMode"
  | "createdAt"
  | "updatedAt"
  | "deletedAt";
type gatewayPaymentCreationAttributes = Optional<
  gatewayPaymentAttributes,
  gatewayPaymentOptionalAttributes
>;
