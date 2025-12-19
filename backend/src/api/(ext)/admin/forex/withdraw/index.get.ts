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
  summary: "Lists all Forex withdrawal transactions",
  description: "Retrieves a paginated list of all Forex withdrawal transactions with filtering and sorting options. Includes associated wallet and user details.",
  operationId: "listForexWithdrawals",
  tags: ["Admin", "Forex", "Withdraw"],
  parameters: crudParameters,
  logModule: "ADMIN_FOREX",
  logTitle: "Get Forex Withdrawals",
  responses: {
    200: {
      description:
        "Paginated list of forex_withdraw transactions retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
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
  permission: "view.forex.withdraw",
  demoMask: ["items.user.email"],
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching forex withdrawal transactions");
  const result = await getFiltered({
    model: models.transaction,
    where: {
      type: "FOREX_WITHDRAW",
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

  ctx?.success(`Retrieved ${result.items?.length || 0} forex withdrawals`);
  return result;
};
