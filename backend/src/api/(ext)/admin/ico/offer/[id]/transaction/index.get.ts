// /server/api/admin/wallets/transactions/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters } from "@b/utils/constants";
import { literal } from "sequelize";

export const metadata = {
  summary: "Lists ICO transactions with optional filters",
  operationId: "listIcoTransactions",
  tags: ["User", "Ico", "Transaction"],
  parameters: {
    query: [
      {
        name: "id",
        in: "path",
        description: "Offering ID",
        required: true,
        schema: {
          type: "string",
        },
      },
    ],
    ...crudParameters,
  },
  responses: {
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Transactions"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ico.offer",
};

export default async (data: Handler) => {
  const { user, query, params } = data;
  if (!user) {
    throw new Error("Unauthorized");
  }

  const { id } = params;
  return getFiltered({
    model: models.icoTransaction,
    where: { offeringId: id },
    query: query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.icoTokenOffering,
        as: "offering",
        attributes: ["id", "name", "symbol", "tokenPrice", "targetAmount"],
      },
    ],
    compute: [
      [
        literal(`(
          SELECT COALESCE(SUM(t.price * t.amount), 0)
          FROM ico_transaction t
          WHERE t.offeringId = icoTokenOffering.id
            AND t.status IN ('PENDING', 'RELEASED')
        )`),
        "currentRaised",
      ],
    ],
  });
};
