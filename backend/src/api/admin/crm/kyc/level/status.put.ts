import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Bulk Update KYC Levels",
  description:
    "Updates multiple KYC levels by their IDs with a specified status.",
  operationId: "bulkUpdateKycLevelsStatus",
  tags: ["KYC", "Levels"],
  logModule: "ADMIN_CRM",
  logTitle: "Bulk update KYC level status",
  requestBody: {
    description:
      "Object containing an array of KYC level IDs and the new status",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of KYC level IDs to update",
            },
            status: {
              type: "string",
              description: "The new status to set for the selected KYC levels",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "KYC levels updated successfully.",
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
    400: { description: "Missing or invalid required fields." },
    404: { description: "No KYC levels found for the provided IDs." },
    500: { description: "Internal Server Error." },
  },
  permission: "edit.kyc.level",
  requiresAuth: true,
};

export default async (data: Handler): Promise<any> => {
  const { body, ctx } = data;
  const { ids, status } = body;

  if (
    !ids ||
    !Array.isArray(ids) ||
    ids.length === 0 ||
    typeof status !== "string"
  ) {
    throw createError({
      statusCode: 400,
      message: "Missing or invalid ids or status",
    });
  }

  ctx?.step(`Bulk updating ${ids.length} KYC levels to status: ${status}`);
  // Bulk update: set status to the provided value and update the updatedAt timestamp.
  const [affectedCount] = await models.kycLevel.update(
    { status, updatedAt: new Date() },
    { where: { id: ids } }
  );

  if (affectedCount === 0) {
    throw createError({
      statusCode: 404,
      message: "No KYC levels found for the provided IDs",
    });
  }

  ctx?.success(`${affectedCount} KYC levels updated to ${status}`);
  return {
    message: "KYC levels updated successfully.",
    count: affectedCount,
  };
};
