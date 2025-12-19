import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { getWalletSafe } from "./utils";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Retrieves details of a specific wallet",
  description:
    "Fetches detailed information about a specific wallet based on its unique identifier.",
  operationId: "getWallet",
  tags: ["Finance", "Wallets"],
  requiresAuth: true,
  parameters: [
    {
      in: "query",
      name: "type",
      required: true,
      schema: {
        type: "string",
        enum: ["ECO", "SPOT"],
      },
      description: "The type of wallet to retrieve",
    },
    {
      in: "query",
      name: "currency",
      required: true,
      schema: {
        type: "string",
      },
      description: "The currency of the wallet to retrieve",
    },
    {
      in: "query",
      name: "pair",
      required: true,
      schema: {
        type: "string",
      },
      description: "The pair of the wallet to retrieve",
    },
  ],
  responses: {
    200: {
      description: "Wallet details retrieved successfully",
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Wallet"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, query, ctx } = data;

  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  const { type, currency, pair } = query;

  ctx?.step(`Fetching wallet balances for ${currency}/${pair}`);
  // Get wallet balances safely, defaulting to 0 if wallet doesn't exist
  const currencyWallet = await getWalletSafe(user.id, type, currency);
  const pairWallet = await getWalletSafe(user.id, type, pair);

  // Return detailed balance information
  // balance = available to use (spendable)
  // inOrder = locked in orders
  // total = balance + inOrder (total owned)
  const CURRENCY = {
    balance: currencyWallet?.balance || 0,        // Available/spendable
    inOrder: currencyWallet?.inOrder || 0,        // Locked in orders
    total: (currencyWallet?.balance || 0) + (currencyWallet?.inOrder || 0), // Total owned
  };

  const PAIR = {
    balance: pairWallet?.balance || 0,            // Available/spendable
    inOrder: pairWallet?.inOrder || 0,            // Locked in orders
    total: (pairWallet?.balance || 0) + (pairWallet?.inOrder || 0),         // Total owned
  };

  ctx?.success("Wallet balances retrieved successfully");
  return { CURRENCY, PAIR };
};
