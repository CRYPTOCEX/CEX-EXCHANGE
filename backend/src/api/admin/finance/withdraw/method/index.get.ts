// /server/api/admin/withdraw/methods/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { baseWithdrawMethodSchema } from "./utils";

export const metadata = {
  summary: "Lists all withdrawal methods",
  operationId: "listWithdrawMethods",
  tags: ["Admin", "Withdraw Methods"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "Paginated list of withdrawal methods retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: baseWithdrawMethodSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Withdraw Methods"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.withdraw.method",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.withdrawMethod,
    query,
    sortField: query.sortField || "createdAt",
  });
};
