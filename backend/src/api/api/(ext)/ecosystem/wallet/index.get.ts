import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseWalletSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all wallets for the logged-in user",
  description:
    "Retrieves all wallets associated with the logged-in user, optionally including transactions and address.",
  operationId: "listWallets",
  tags: ["Wallet", "User"],
  parameters: [
    {
      name: "transactions",
      in: "query",
      schema: { type: "boolean", default: false },
      description: "Whether to include transaction details",
    },
    {
      name: "address",
      in: "query",
      schema: { type: "boolean", default: false },
      description: "Whether to include wallet address",
    },
  ],
  responses: {
    200: {
      description: "Wallets retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseWalletSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Wallet"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { transactions, address } = query;
  try {
    const include: any[] = [];
    if (transactions === "true") {
      include.push({
        model: models.transaction,
        as: "transactions",
        attributes: [
          "id",
          "type",
          "status",
          "amount",
          "fee",
          "description",
          "metadata",
          "referenceId",
          "createdAt",
        ],
      });
    }
    const attributes = ["id", "type", "currency", "balance"];
    if (address === "true") {
      attributes.push("address");
    }
    return await models.wallet.findAll({
      where: { userId: user.id, type: "ECO" },
      include,
      attributes,
    });
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch wallets: ${error.message}`,
    });
  }
};
