// /server/api/forex/accounts/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { forexAccountSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all Forex accounts with pagination and optional details",
  operationId: "listForexAccounts",
  tags: ["Admin", "Forex"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of Forex accounts",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: forexAccountSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Accounts"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.forex.account",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.forexAccount,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
    numericFields: ["balance", "leverage", "mt"],
  });
};
