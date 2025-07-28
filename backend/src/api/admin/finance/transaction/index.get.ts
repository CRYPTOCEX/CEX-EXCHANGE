// /server/api/admin/wallets/transactions/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { baseTransactionSchema } from "../../../finance/transaction/utils";
import { Op } from "sequelize";

export const metadata = {
  summary: "Lists transactions with optional filters",
  operationId: "listWalletTransactions",
  tags: ["Admin", "Wallets"],
  parameters: crudParameters,
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
  permission: "view.transaction",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.transaction,
    where: {
      type: {
        [Op.notIn]: [
          "DEPOSIT",
          "WITHDRAW",
          "INCOMING_TRANSFER",
          "BINARY_ORDER",
          "EXCHANGE_ORDER",
          "FOREX_DEPOSIT",
          "FOREX_WITHDRAW",
          "ICO_CONTRIBUTION",
        ],
      },
    },
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.wallet,
        as: "wallet",
        attributes: ["currency", "type"],
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });
};
