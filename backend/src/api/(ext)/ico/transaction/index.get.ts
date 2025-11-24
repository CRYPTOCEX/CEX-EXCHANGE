import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { baseTransactionSchema } from "../../../finance/transaction/utils";
import { fn, literal } from "sequelize";

export const metadata = {
  summary: "Lists ICO transactions with optional filters",
  operationId: "listIcoTransactions",
  tags: ["User", "Ico", "Transaction"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Paginated list of ICO transactions retrieved successfully",
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
  permission: "access.transaction",
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user) {
    throw new Error("Unauthorized");
  }

  return getFiltered({
    model: models.icoTransaction,
    where: { userId: user.id },
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.icoTokenOffering,
        as: "offering",
        attributes: ["id", "name", "symbol", "tokenPrice", "targetAmount"],
      },
    ],
  });
};
