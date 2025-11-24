import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { createError } from "@b/utils/error";
import { baseTransactionSchema } from "@b/api/finance/transaction/utils";

export const metadata: OperationObject = {
  summary: "Lists transactions with optional filters",
  operationId: "listForexTransactions",
  tags: ["User", "Forex", "Transactions"],
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
};

export default async (data: Handler) => {
  const { user } = data;

  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { filter, ...query } = data.query;

  let where: any = { userId: user.id };

  const typeParsed = filter?.includes("type");
  if (!typeParsed) {
    where = { ...where, type: ["FOREX_DEPOSIT", "FOREX_WITHDRAW"] };
  }

  return getFiltered({
    model: models.transaction,
    query: data.query,
    where,
    sortField: query.sortField || "createdAt",
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
