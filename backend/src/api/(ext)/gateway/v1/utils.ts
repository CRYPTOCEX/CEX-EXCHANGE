import {
  baseStringSchema,
  baseNumberSchema,
  baseBooleanSchema,
  baseEnumSchema,
} from "@b/utils/schema";

// ============================================
// Common Schemas
// ============================================

export const paymentIntentIdSchema = baseStringSchema(
  "Unique payment intent identifier",
  64
);

export const refundIdSchema = baseStringSchema("Unique refund identifier", 64);

export const amountSchema = {
  type: "number",
  description: "Payment amount",
  minimum: 0.01,
};

export const currencySchema = baseStringSchema("Currency code (e.g., USD, EUR)", 20);

export const walletTypeSchema = baseEnumSchema("Wallet type", [
  "FIAT",
  "SPOT",
  "ECO",
]);

export const urlSchema = {
  type: "string",
  description: "A valid URL",
  // Note: We use runtime validation instead of format: "uri" because
  // JSON Schema's URI validation is overly strict and rejects valid URLs
  // with query parameters or localhost URLs in some implementations
};

// ============================================
// Line Item Schema
// ============================================

export const lineItemSchema = {
  type: "object",
  properties: {
    name: baseStringSchema("Item name", 191),
    description: baseStringSchema("Item description", 500, 0, true),
    quantity: {
      type: "integer",
      description: "Item quantity",
      minimum: 1,
    },
    unitPrice: amountSchema,
    imageUrl: {
      ...urlSchema,
      description: "Item image URL",
    },
  },
  required: ["name", "quantity", "unitPrice"],
};

// ============================================
// Create Payment Request Schema
// ============================================

export const createPaymentSchema = {
  type: "object",
  properties: {
    amount: amountSchema,
    currency: currencySchema,
    walletType: {
      ...walletTypeSchema,
      default: "FIAT",
    },
    merchantOrderId: baseStringSchema("Your order reference ID", 255, 0, true),
    description: baseStringSchema("Payment description", 1000, 0, true),
    returnUrl: {
      ...urlSchema,
      description: "URL to redirect after successful payment",
    },
    cancelUrl: {
      ...urlSchema,
      description: "URL to redirect if payment is cancelled",
    },
    webhookUrl: {
      ...urlSchema,
      description: "URL to receive webhook notifications",
    },
    lineItems: {
      type: "array",
      items: lineItemSchema,
      description: "List of items being purchased",
    },
    customerEmail: {
      type: "string",
      format: "email",
      description: "Customer email address",
    },
    customerName: baseStringSchema("Customer name", 191, 0, true),
    metadata: {
      type: "object",
      description: "Custom metadata for your use",
      additionalProperties: true,
    },
    expiresIn: {
      type: "integer",
      description: "Session expiry in seconds (default: 3600)",
      minimum: 300,
      maximum: 86400,
      default: 3600,
    },
  },
  required: ["amount", "currency", "returnUrl"],
};

// ============================================
// Payment Response Schema
// ============================================

export const paymentResponseSchema = {
  type: "object",
  properties: {
    id: paymentIntentIdSchema,
    status: baseEnumSchema("Payment status", [
      "PENDING",
      "PROCESSING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
      "EXPIRED",
      "REFUNDED",
      "PARTIALLY_REFUNDED",
    ]),
    amount: amountSchema,
    currency: currencySchema,
    walletType: walletTypeSchema,
    merchantOrderId: baseStringSchema("Merchant order ID"),
    description: baseStringSchema("Payment description"),
    feeAmount: amountSchema,
    netAmount: amountSchema,
    checkoutUrl: urlSchema,
    customerEmail: baseStringSchema("Customer email"),
    customerName: baseStringSchema("Customer name"),
    metadata: {
      type: "object",
      additionalProperties: true,
    },
    expiresAt: baseStringSchema("Expiration timestamp"),
    completedAt: baseStringSchema("Completion timestamp"),
    createdAt: baseStringSchema("Creation timestamp"),
  },
};

// ============================================
// Create Refund Request Schema
// ============================================

export const createRefundSchema = {
  type: "object",
  properties: {
    paymentId: paymentIntentIdSchema,
    amount: {
      ...amountSchema,
      description: "Refund amount (optional, defaults to full amount)",
    },
    reason: baseEnumSchema("Refund reason", [
      "REQUESTED_BY_CUSTOMER",
      "DUPLICATE",
      "FRAUDULENT",
      "OTHER",
    ]),
    description: baseStringSchema("Refund description", 1000, 0, true),
    metadata: {
      type: "object",
      description: "Custom metadata",
      additionalProperties: true,
    },
  },
  required: ["paymentId"],
};

// ============================================
// Refund Response Schema
// ============================================

export const refundResponseSchema = {
  type: "object",
  properties: {
    id: refundIdSchema,
    paymentId: paymentIntentIdSchema,
    amount: amountSchema,
    currency: currencySchema,
    status: baseEnumSchema("Refund status", [
      "PENDING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
    ]),
    reason: baseEnumSchema("Refund reason", [
      "REQUESTED_BY_CUSTOMER",
      "DUPLICATE",
      "FRAUDULENT",
      "OTHER",
    ]),
    description: baseStringSchema("Refund description"),
    createdAt: baseStringSchema("Creation timestamp"),
  },
};

// ============================================
// Webhook Event Schema
// ============================================

export const webhookEventSchema = {
  type: "object",
  properties: {
    id: baseStringSchema("Event ID"),
    type: baseEnumSchema("Event type", [
      "payment.created",
      "payment.completed",
      "payment.failed",
      "payment.cancelled",
      "payment.expired",
      "refund.created",
      "refund.completed",
      "refund.failed",
    ]),
    createdAt: baseStringSchema("Event timestamp"),
    data: {
      type: "object",
      description: "Event data",
    },
  },
};

// ============================================
// Error Response Schema
// ============================================

export const errorResponseSchema = {
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: {
        code: baseStringSchema("Error code"),
        message: baseStringSchema("Error message"),
      },
    },
  },
};
