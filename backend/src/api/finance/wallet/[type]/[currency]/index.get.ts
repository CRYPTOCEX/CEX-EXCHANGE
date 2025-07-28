import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { getWallet } from "../../utils";
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
      index: 0,
      name: "type",
      in: "path",
      required: true,
      description: "The type of wallet to retrieve",
      schema: { 
        type: "string",
        enum: ["FIAT", "SPOT", "ECO", "FUTURES"],
      },
    },
    {
      index: 1,
      name: "currency",
      in: "path",
      required: true,
      description: "The currency of the wallet to retrieve",
      schema: { type: "string" },
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
  const { user, params } = data;
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });
  
  const { type, currency } = params;
  
  return getWallet(user.id, type, currency);
};
