// /server/api/admin/wallets/transactions/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters } from "@b/utils/constants";

export const metadata = {
  summary: "Lists ICO transactions with optional filters",
  operationId: "listIcoTransactions",
  tags: ["Admin", "Ico", "Transaction"],
  parameters: crudParameters,
  responses: {
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Transactions"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ico.transaction",
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user) {
    throw new Error("Unauthorized");
  }

  return getFiltered({
    model: models.icoTransaction,
    query: query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.icoTokenOffering,
        as: "offering",
        attributes: ["id", "name", "symbol", "tokenPrice", "targetAmount"],
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "email", "firstName", "lastName", "avatar"],
      },
    ],
  });
};
