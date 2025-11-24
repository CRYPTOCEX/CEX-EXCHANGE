import { baseGatewaySchema } from "./../utils";
// /server/api/admin/deposit/gateways/[id]/index.get.ts

import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";

export const metadata = {
  summary: "Retrieves detailed information of a specific deposit gateway by ID",
  operationId: "getDepositGatewayById",
  tags: ["Admin", "Deposit Gateways"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the deposit gateway to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Deposit gateway details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseGatewaySchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Deposit Gateway"),
    500: serverErrorResponse,
  },
  permission: "view.deposit.gateway",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params } = data;

  return await getRecord("depositGateway", params.id);
};
