import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Update gateway merchant status",
  description: "Updates the operational status of a gateway merchant account. Status determines whether the merchant can process payments: PENDING (awaiting approval), ACTIVE (can process payments), SUSPENDED (temporarily disabled), or REJECTED (permanently denied).",
  operationId: "updateGatewayMerchantStatus",
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
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"],
              description: "New merchant status",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Merchant status updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              merchant: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  status: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Merchant"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.gateway.merchant",
  logModule: "ADMIN_GATEWAY",
  logTitle: "Update merchant status",
};

export default async (data: Handler) => {
  const { params, body, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Validating status for merchant ${id}`);

  const validStatuses = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"];
  if (!validStatuses.includes(status)) {
    ctx?.fail(`Invalid status: ${status}`);
    throw createError({
      statusCode: 400,
      message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    });
  }

  ctx?.step(`Finding merchant ${id}`);

  const merchant = await models.gatewayMerchant.findByPk(id);

  if (!merchant) {
    ctx?.fail("Merchant not found");
    throw createError({
      statusCode: 404,
      message: "Merchant not found",
    });
  }

  ctx?.step(`Updating merchant status to ${status}`);

  await merchant.update({ status });

  ctx?.success(`Merchant status updated to ${status}`);

  return {
    message: `Merchant status updated to ${status}`,
    merchant: {
      id: merchant.id,
      name: merchant.name,
      status: merchant.status,
    },
  };
};
