// /server/api/admin/deposit/methods/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { baseDepositMethodSchema } from "./utils";

export const metadata = {
  summary: "Lists all deposit methods",
  operationId: "listDepositMethods",
  tags: ["Admin", "Deposit Methods"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Paginated list of deposit methods retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: baseDepositMethodSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Deposit Methods"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.deposit.method",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.depositMethod,
    query,
    sortField: query.sortField || "createdAt",
    numericFields: ["fixedFee", "percentageFee", "minAmount", "maxAmount"],
  });
};
