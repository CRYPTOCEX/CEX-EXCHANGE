import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Get gateway payout details",
  description: "Retrieves detailed information about a specific gateway payout including merchant details and payout period statistics.",
  operationId: "getGatewayPayout",
  tags: ["Admin", "Gateway", "Payout"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "Payout UUID",
      schema: { type: "string", format: "uuid" },
    },
  ],
  responses: {
    200: {
      description: "Payout details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            description: "Payout object with merchant information",
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Payout"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.gateway.payout",
  demoMask: ["merchant.email", "merchant.phone"],
  logModule: "ADMIN_GATEWAY",
  logTitle: "Get payout details",
};

export default async (data: Handler) => {
  const { params, ctx } = data;
  const { id } = params;

  ctx?.step(`Fetching payout details for ${id}`);

  const payout = await models.gatewayPayout.findByPk(id, {
    include: [
      {
        model: models.gatewayMerchant,
        as: "merchant",
        attributes: ["id", "name", "email", "phone"],
      },
    ],
  });

  if (!payout) {
    ctx?.fail("Payout not found");
    throw createError({
      statusCode: 404,
      message: "Payout not found",
    });
  }

  ctx?.success(`Retrieved payout ${payout.payoutId}`);

  return payout;
};
