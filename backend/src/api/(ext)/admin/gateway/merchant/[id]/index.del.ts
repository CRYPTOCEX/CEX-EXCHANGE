import { handleSingleDelete, deleteRecordResponses } from "@b/utils/query";
import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Delete gateway merchant",
  description: "Permanently deletes a gateway merchant account and all associated data including API keys, payments, and balances. This action cannot be undone.",
  operationId: "deleteGatewayMerchant",
  tags: ["Admin", "Gateway", "Merchant"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "Merchant UUID",
      schema: { type: "string", format: "uuid" },
    },
  ],
  responses: {
    200: {
      description: "Merchant deleted successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Merchant"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "delete.gateway.merchant",
  logModule: "ADMIN_GATEWAY",
  logTitle: "Delete merchant",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;
  const { id } = params;

  ctx?.step(`Deleting merchant ${id}`);

  const result = await handleSingleDelete({
    model: "gatewayMerchant",
    id,
    query,
  });

  ctx?.success(`Merchant ${id} deleted successfully`);

  return result;
};
