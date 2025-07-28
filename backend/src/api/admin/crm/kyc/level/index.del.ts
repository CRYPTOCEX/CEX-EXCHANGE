import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Bulk Delete KYC Levels",
  description: "Deletes multiple KYC levels by their IDs.",
  operationId: "bulkDeleteKycLevels",
  tags: ["KYC", "Levels"],
  requestBody: {
    description: "Array of KYC level IDs to delete",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of KYC level IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "KYC levels deleted successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              count: { type: "number" },
            },
          },
        },
      },
    },
    400: { description: "Missing required fields." },
    404: { description: "No KYC levels found for the provided IDs." },
    500: { description: "Internal Server Error." },
  },
  permission: "delete.kyc.level",
  requiresAuth: true,
};

export default async (data: Handler): Promise<any> => {
  const { body } = data;
  const { ids } = body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw createError({ statusCode: 400, message: "Missing or invalid ids" });
  }

  // Bulk deletion: destroy all levels with matching IDs.
  const deletedCount = await models.kycLevel.destroy({
    where: { id: ids },
  });
  if (deletedCount === 0) {
    throw createError({
      statusCode: 404,
      message: "No KYC levels found for the provided IDs",
    });
  }
  return { message: "KYC levels deleted successfully.", count: deletedCount };
};
