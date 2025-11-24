// /server/api/admin/wallets/transactions/deposit.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { baseTransactionSchema } from "@b/api/finance/transaction/utils";

export const metadata = {
  summary: "Lists deposit transactions only",
  operationId: "listDepositTransactions",
  tags: ["Admin", "Wallets"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "Paginated list of deposit transactions retrieved successfully",
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
  permission: "view.deposit",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.transaction,
    where: {
      type: "DEPOSIT",
    },
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.wallet,
        as: "wallet",
        attributes: ["id", "currency", "type"],
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });
};
