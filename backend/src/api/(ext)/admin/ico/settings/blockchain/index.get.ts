import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "List ICO Blockchain Configurations",
  description:
    "Retrieves all blockchain configurations available for ICO token offerings. Supports optional filtering by status to retrieve only active blockchains.",
  operationId: "getIcoBlockchains",
  tags: ["Admin", "ICO", "Settings"],
  requiresAuth: true,
  parameters: [
    {
      name: "status",
      in: "query",
      description: "Filter by status - set to 'true' to retrieve only active blockchains",
      required: false,
      schema: { type: "string", enum: ["true", "false"] },
    },
  ],
  responses: {
    200: {
      description: "Blockchain configurations retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", description: "Display name of the blockchain" },
                value: { type: "string", description: "Unique identifier value for the blockchain" },
                status: { type: "boolean", description: "Whether the blockchain is active" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: "string", format: "date-time", nullable: true },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "view.ico.settings",
  logModule: "ADMIN_ICO",
  logTitle: "Get blockchain configurations",
};

export default async (data: Handler) => {
  const { user, query, ctx } = data;

  ctx?.step("Validating user permissions");
  if (!user?.id) {
    ctx?.fail("Unauthorized access");
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Admin privileges required.",
    });
  }

  ctx?.step("Building query filters");
  // Check if only status blockchains are requested.
  const statusOnly = query?.status === "true";
  const whereClause = statusOnly ? { status: true } : {};

  ctx?.step("Fetching blockchain configurations");
  const blockchains = await models.icoBlockchain.findAll({
    where: whereClause,
  });

  ctx?.success(`Retrieved ${blockchains.length} blockchain configurations`);
  return blockchains;
};
