type GatewayPayoutStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

interface gatewayPayoutAttributes {
  id: string;
  merchantId: string;
  transactionId?: string;
  payoutId: string;
  amount: number;
  currency: string;
  walletType: string;
  status: GatewayPayoutStatus;
  periodStart: Date;
  periodEnd: Date;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  paymentCount: number;
  refundCount: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

type gatewayPayoutPk = "id";
type gatewayPayoutId = gatewayPayoutAttributes[gatewayPayoutPk];
type gatewayPayoutOptionalAttributes =
  | "id"
  | "transactionId"
  | "status"
  | "grossAmount"
  | "feeAmount"
  | "netAmount"
  | "paymentCount"
  | "refundCount"
  | "metadata"
  | "createdAt"
  | "updatedAt";
type gatewayPayoutCreationAttributes = Optional<
  gatewayPayoutAttributes,
  gatewayPayoutOptionalAttributes
>;
