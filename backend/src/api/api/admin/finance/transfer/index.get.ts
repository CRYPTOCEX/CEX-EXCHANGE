// /server/api/admin/finance/transfer/index.get.ts

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
  summary: "Lists incoming_transfer transactions only",
  operationId: "listINCOMING_TRANSFERTransactions",
  tags: ["Admin", "Wallets"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "Paginated list of incoming_transfer transactions retrieved successfully",
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
  permission: "view.transfer",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.transaction,
    where: {
      type: "INCOMING_TRANSFER",
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
