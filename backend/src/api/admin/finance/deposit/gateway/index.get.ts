// /server/api/admin/deposit/gateways/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { baseGatewaySchema } from "./utils";

export const metadata = {
  summary: "Lists all deposit gateways",
  operationId: "listDepositGateways",
  tags: ["Admin", "Deposit Gateways"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Paginated list of deposit gateways retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: baseGatewaySchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Deposit Gateways"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.deposit.gateway",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.depositGateway,
    query,
    sortField: query.sortField || "title",
    timestamps: false,
  });
};
