// /server/api/admin/wallets/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { walletSchema } from "./utils";

export const metadata = {
  summary: "Lists all wallets with optional filters",
  operationId: "listWallets",
  tags: ["Admin", "Wallets"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of wallets with pagination metadata",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: walletSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Wallets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.wallet",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.wallet,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
    excludeFields: ["userId"],
  });
};
