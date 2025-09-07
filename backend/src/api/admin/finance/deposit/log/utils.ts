import { baseNumberSchema, baseStringSchema } from "@b/utils/schema";

// Status enum for deposit transactions
const depositStatus = {
  ...baseStringSchema("Status of the deposit transaction"),
  enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REJECTED", "EXPIRED"],
};

// Amount for deposit transactions
const amount = {
  ...baseNumberSchema("Deposit amount"),
  minimum: 0.01,
};

// Fee for deposit transactions
const fee = {
  ...baseNumberSchema("Processing fee for the deposit"),
  minimum: 0,
};

// Description for deposit transactions
const description = baseStringSchema("Description of the deposit transaction");

// Reference ID - required for COMPLETED deposits to track payment
const referenceId = {
  ...baseStringSchema("Payment reference ID from the payment processor"),
  minLength: 1,
  nullable: false,
};

// Transaction ID from payment processor
const trxId = {
  ...baseStringSchema("Transaction ID from the payment processor"),
  nullable: true,
};

// Metadata for additional deposit information
const metadata = {
  type: "object",
  description: "Additional metadata for the deposit transaction",
  properties: {
    method: {
      ...baseStringSchema("Payment method used"),
      nullable: true,
    },
    message: {
      ...baseStringSchema("Admin message or notes"),
      nullable: true,
    },
  },
  nullable: true,
  additionalProperties: true,
};

// Schema for updating deposit transactions by admin
export const depositUpdateSchema = {
  type: "object",
  properties: {
    status: depositStatus,
    amount,
    fee,
    description,
    referenceId,
    trxId,
    metadata,
  },
  required: ["status", "amount", "fee", "description"],
  // Conditional validation: referenceId is required when status is COMPLETED
  if: {
    properties: { status: { const: "COMPLETED" } },
  },
  then: {
    required: ["status", "amount", "fee", "description", "referenceId"],
  },
};