import {
  baseStringSchema,
  baseNumberSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the Admin Profit");
const transactionId = baseStringSchema("Transaction ID of the Admin Profit");
const type = {
  type: "string",
  description: "Type of the Admin Profit",
  enum: [
    "DEPOSIT",
    "WITHDRAW",
    "TRANSFER",
    "BINARY_ORDER",
    "EXCHANGE_ORDER",
    "INVESTMENT",
    "AI_INVESTMENT",
    "FOREX_DEPOSIT",
    "FOREX_WITHDRAW",
    "FOREX_INVESTMENT",
    "ICO_CONTRIBUTION",
    "STAKING",
    "P2P_TRADE",
  ],
};
const amount = baseNumberSchema("Amount of the Admin Profit");
const currency = baseStringSchema("Currency code of the Admin Profit");
const chain = baseStringSchema("Blockchain or chain ID (optional)");
const description = baseStringSchema("Description of the Admin Profit", 500);

export const adminProfitSchema = {
  id,
  transactionId,
  type,
  amount,
  currency,
  chain,
  description,
};

export const adminProfitUpdateSchema = {
  type: "object",
  properties: adminProfitSchema,
  required: ["transactionId", "type", "amount", "currency"],
};

export const adminProfitStoreSchema = {
  description: "Admin Profit created or updated successfully",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: adminProfitSchema,
      },
    },
  },
};

export const adminProfitStructure = () => ({
  type: {
    type: "select",
    label: "Type",
    name: "type",
    options: [
      "DEPOSIT",
      "WITHDRAW",
      "TRANSFER",
      "BINARY_ORDER",
      "EXCHANGE_ORDER",
      "INVESTMENT",
      "AI_INVESTMENT",
      "FOREX_DEPOSIT",
      "FOREX_WITHDRAW",
      "FOREX_INVESTMENT",
      "ICO_CONTRIBUTION",
      "STAKING",
      "P2P_TRADE",
    ],
  },
  amount: {
    type: "input",
    label: "Amount",
    name: "amount",
    placeholder: "Enter the amount",
  },
  currency: {
    type: "input",
    label: "Currency",
    name: "currency",
    placeholder: "Enter the currency",
  },
  transactionId: {
    type: "input",
    label: "Transaction ID",
    name: "transactionId",
    placeholder: "Enter the transaction ID",
  },
  description: {
    type: "textarea",
    label: "Description",
    name: "description",
    placeholder: "Enter a description",
  },
  chain: {
    type: "input",
    label: "Chain",
    name: "chain",
    placeholder: "Enter the chain identifier",
  },
});
