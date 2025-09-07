// /server/api/admin/wallets/transactions/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { baseTransactionSchema } from "./utils";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Lists transactions with optional filters",
  operationId: "listTransactions",
  tags: ["Finance", "Transactions"],
  parameters: [
    ...crudParameters,
    {
      name: "walletType",
      in: "query",
      description: "Type of the wallet",
      schema: {
        type: "string",
      },
    },
    {
      name: "currency",
      in: "query",
      description: "Currency of the wallet",
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    200: {
      description: "Paginated list of transactions retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: baseTransactionSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Transactions"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};
export default async (data: Handler) => {
  const { user, query } = data;

  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { walletType, currency, ...others } = query;

  const walletWhere: any = { userId: user.id };
  if (walletType) walletWhere.type = walletType;
  if (currency) walletWhere.currency = currency;

  let wallet: typeof models.wallet | null = null;
  if (walletType || currency) {
    wallet = await models.wallet.findOne({ where: walletWhere });
    if (!wallet)
      throw createError({
        statusCode: 404,
        message: "Wallet not found",
      });
  }

  return getFiltered({
    model: models.transaction,
    query: others,
    where: {
      userId: user.id,
      ...(wallet ? { walletId: wallet.id } : {}),
    },
    sortField: others.sortField || "createdAt",
    numericFields: ["amount", "fee"],
    includeModels: [
      {
        model: models.wallet,
        as: "wallet",
        attributes: ["currency", "type"],
      },
    ],
  });
};
