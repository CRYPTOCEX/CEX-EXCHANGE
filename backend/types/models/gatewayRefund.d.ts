type GatewayRefundStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
type GatewayRefundReason = "REQUESTED_BY_CUSTOMER" | "DUPLICATE" | "FRAUDULENT" | "OTHER";

interface gatewayRefundAttributes {
  id: string;
  paymentId: string;
  merchantId: string;
  transactionId?: string;
  refundId: string;
  amount: number;
  currency: string;
  reason: GatewayRefundReason;
  description?: string;
  status: GatewayRefundStatus;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type gatewayRefundPk = "id";
type gatewayRefundId = gatewayRefundAttributes[gatewayRefundPk];
type gatewayRefundOptionalAttributes =
  | "id"
  | "transactionId"
  | "reason"
  | "description"
  | "status"
  | "metadata"
  | "createdAt"
  | "updatedAt"
  | "deletedAt";
type gatewayRefundCreationAttributes = Optional<
  gatewayRefundAttributes,
  gatewayRefundOptionalAttributes
>;
