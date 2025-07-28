import { models } from "@b/db";
import {
  baseNumberSchema,
  baseStringSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

export async function getUserID(id: string) {
  const user = await models.user.findOne({
    where: { id },
  });
  if (!user) throw new Error("Invalid user UUID");
  return user.id;
}

export async function updateUserWalletBalance(
  id: string,
  amount: number,
  fee: number,
  type: "DEPOSIT" | "WITHDRAWAL" | "REFUND_WITHDRAWAL"
) {
  const wallet = await models.wallet.findOne({
    where: {
      id,
    },
  });

  if (!wallet) {
    return new Error("Wallet not found");
  }

  let balance;
  switch (type) {
    case "WITHDRAWAL":
      balance = wallet.balance - (amount + fee);
      break;
    case "DEPOSIT":
      balance = wallet.balance + (amount - fee);
      break;
    case "REFUND_WITHDRAWAL":
      balance = wallet.balance + amount + fee;
      break;
    default:
      break;
  }

  if (balance < 0) {
    throw new Error("Insufficient balance");
  }

  await models.wallet.update(
    {
      balance: balance,
    },
    {
      where: {
        id: wallet.id,
      },
    }
  );

  const response = await models.wallet.findOne({
    where: {
      id: wallet.id,
    },
  });

  if (!response) {
    throw new Error("Wallet not found");
  }

  return response;
}

// Reusable schema components for wallets
const id = baseStringSchema("ID of the wallet");
const type = baseStringSchema("Type of the wallet");
const currency = baseStringSchema("Currency of the wallet");
const balance = baseNumberSchema("Current balance of the wallet");
const inOrder = baseNumberSchema("Amount currently held in orders");
const address = {
  type: "object",
  additionalProperties: true, // Assuming dynamic keys for address
  description: "Crypto address associated with the wallet",
};
const status = baseBooleanSchema("Status of the wallet (active or inactive)");

// Base schema definition for wallet properties
const baseWalletProperties = {
  id,
  type,
  currency,
  balance,
  inOrder,
  status,
};

// Full schema for a wallet including user and transaction details
export const walletSchema = {
  ...baseWalletProperties,
  user: {
    type: "object",
    properties: {
      id: { type: "string", description: "User ID" },
      firstName: { type: "string", description: "First name of the user" },
      lastName: { type: "string", description: "Last name of the user" },
      avatar: { type: "string", description: "Avatar URL of the user" },
    },
  },
  transactions: {
    type: "array",
    description: "List of transactions associated with the wallet",
    items: {
      type: "object",
      properties: {
        id: { type: "string", description: "Transaction ID" },
        amount: { type: "number", description: "Amount of the transaction" },
        fee: { type: "number", description: "Transaction fee" },
        type: { type: "string", description: "Type of the transaction" },
        status: { type: "string", description: "Status of the transaction" },
        createdAt: {
          type: "string",
          format: "date-time",
          description: "Creation date of the transaction",
        },
        metadata: {
          type: "object",
          description: "Metadata of the transaction",
        },
      },
    },
  },
};

// Schema for updating a wallet
export const walletUpdateSchema = {
  type: "object",
  properties: {
    type,
    currency,
    balance,
    inOrder,
    status,
  },
  required: ["type", "currency", "balance", "status"],
};
