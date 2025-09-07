import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Blockchain Configurations",
  description: "Retrieves all blockchain configurations for ICO admin.",
  operationId: "getBlockchainConfigs",
  tags: ["ICO", "Admin", "Blockchain"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Blockchain configurations retrieved successfully.",
      content: {
        "application/json": {
          schema: { type: "array", items: { type: "object" } },
        },
      },
    },
    401: { description: "Unauthorized – Admin privileges required." },
    500: { description: "Internal Server Error" },
  },
  permission: "view.ico.settings",
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Admin privileges required.",
    });
  }

  // Check if only status blockchains are requested.
  const statusOnly = query?.status === "true";
  const whereClause = statusOnly ? { status: true } : {};

  const blockchains = await models.icoBlockchain.findAll({
    where: whereClause,
  });
  return blockchains;
};
