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
  const { user, query } = data;
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  const { type, currency, pair } = query;
  
  // Get wallet balances safely, defaulting to 0 if wallet doesn't exist
  const currencyWallet = await getWalletSafe(user.id, type, currency);
  const pairWallet = await getWalletSafe(user.id, type, pair);
  
  const CURRENCY = currencyWallet?.balance || 0;
  const PAIR = pairWallet?.balance || 0;
  
  return { CURRENCY, PAIR };
};
