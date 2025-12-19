import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Update gateway merchant verification",
  description: "Updates the verification status of a gateway merchant account. Verification status indicates whether the merchant's identity and business documentation has been reviewed: UNVERIFIED (no verification submitted), PENDING (under review), or VERIFIED (approved).",
  operationId: "updateGatewayMerchantVerification",
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
            verificationStatus: {
              type: "string",
              enum: ["UNVERIFIED", "PENDING", "VERIFIED"],
              description: "New verification status",
            },
          },
          required: ["verificationStatus"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Verification status updated successfully",
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
                  verificationStatus: { type: "string" },
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
  logTitle: "Update merchant verification",
};

export default async (data: Handler) => {
  const { params, body, ctx } = data;
  const { id } = params;
  const { verificationStatus } = body;

  ctx?.step(`Validating verification status for merchant ${id}`);

  const validStatuses = ["UNVERIFIED", "PENDING", "VERIFIED"];
  if (!validStatuses.includes(verificationStatus)) {
    ctx?.fail(`Invalid verification status: ${verificationStatus}`);
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

  ctx?.step(`Updating verification status to ${verificationStatus}`);

  await merchant.update({ verificationStatus });

  ctx?.success(`Merchant verification updated to ${verificationStatus}`);

  return {
    message: `Merchant verification updated to ${verificationStatus}`,
    merchant: {
      id: merchant.id,
      name: merchant.name,
      verificationStatus: merchant.verificationStatus,
    },
  };
};
