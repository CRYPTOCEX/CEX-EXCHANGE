import { baseNumberSchema, baseStringSchema } from "@b/utils/schema";

// Reusable schema components for transactions
const id = {
  ...baseStringSchema("ID of the transaction"),
  nullable: true,
};
const type = baseStringSchema(
  "Type of the transaction (DEPOSIT, WITHDRAW, etc.)"
);
const status = {
  ...baseStringSchema(
    "Current status of the transaction (PENDING, COMPLETED, etc.)"
  ),
  enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REJECTED", "EXPIRED"],
};
const amount = baseNumberSchema("Amount involved in the transaction");
const fee = baseNumberSchema("Fee associated with the transaction");
const description = baseStringSchema("Description of the transaction");
const metadata = {
  type: "object",
  description: "Additional metadata of the transaction",
  nullable: true,
};
const referenceId = {
  ...baseStringSchema("Reference ID of the transaction"),
  nullable: true,
};
const trxId = {
  ...baseStringSchema("Transaction ID from the payment processor"),
  nullable: true,
};

// Base schema definition for transactions
export const baseTransactionSchema = {
  id,
  type,
  status,
  amount,
  fee,
  description,
  metadata,
  referenceId,
  trxId,
};

// Full schema for a transaction including user and wallet details
export const transactionSchema = {
  ...baseTransactionSchema,
  id: {
    ...id,
    nullable: false, // ID should always be present for a created transaction
  },
  user: {
    type: "object",
    properties: {
      id: { type: "string", description: "User ID" },
      firstName: {
        ...baseStringSchema("User's first name"),
        nullable: true,
      },
      lastName: {
        ...baseStringSchema("User's last name"),
        nullable: true,
      },
      avatar: {
        ...baseStringSchema("User's avatar"),
        nullable: true,
      },
    },
    nullable: true,
  },
  wallet: {
    type: "object",
    properties: {
      currency: { type: "string", description: "Currency of the wallet" },
      type: { type: "string", description: "Type of the wallet" },
    },
    nullable: true,
  },
};

// Schema for updating a transaction
export const transactionUpdateSchema = {
  type: "object",
  properties: {
    status,
    amount,
    fee,
    description,
    referenceId,
    trxId,
    metadata,
  },
  required: ["status", "amount"],
};
