import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Get Token Offering Updates",
  description: "Fetches updates for a specific token offering.",
  operationId: "getTokenOfferingUpdates",
  tags: ["ICO", "Creator", "Updates"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Token offering updates retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                offeringId: { type: "string" },
                userId: { type: "string" },
                title: { type: "string" },
                content: { type: "string" },
                attachments: { type: "array", items: { type: "object" } },
                createdAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { tokenId } = query;
  if (!tokenId) {
    throw createError({
      statusCode: 400,
      message: "Missing tokenId parameter",
    });
  }
  const updates = await models.icoTokenOfferingUpdate.findAll({
    where: { offeringId: tokenId },
    order: [["createdAt", "DESC"]],
  });
  return updates;
};
