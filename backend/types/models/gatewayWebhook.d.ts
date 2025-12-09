type GatewayWebhookStatus = "PENDING" | "SENT" | "FAILED" | "RETRYING";
type GatewayWebhookEvent =
  | "payment.created"
  | "payment.completed"
  | "payment.failed"
  | "payment.cancelled"
  | "payment.expired"
  | "refund.created"
  | "refund.completed"
  | "refund.failed";

interface gatewayWebhookAttributes {
  id: string;
  merchantId: string;
  paymentId?: string;
  refundId?: string;
  eventType: GatewayWebhookEvent;
  url: string;
  payload: Record<string, any>;
  signature: string;
  status: GatewayWebhookStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  responseStatus?: number;
  responseBody?: string;
  responseTime?: number;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type gatewayWebhookPk = "id";
type gatewayWebhookId = gatewayWebhookAttributes[gatewayWebhookPk];
type gatewayWebhookOptionalAttributes =
  | "id"
  | "paymentId"
  | "refundId"
  | "status"
  | "attempts"
  | "maxAttempts"
  | "lastAttemptAt"
  | "nextRetryAt"
  | "responseStatus"
  | "responseBody"
  | "responseTime"
  | "errorMessage"
  | "createdAt"
  | "updatedAt";
type gatewayWebhookCreationAttributes = Optional<
  gatewayWebhookAttributes,
  gatewayWebhookOptionalAttributes
>;
