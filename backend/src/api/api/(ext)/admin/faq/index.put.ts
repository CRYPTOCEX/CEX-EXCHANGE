import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Bulk Update FAQs",
  description: "Updates multiple FAQs in bulk.",
  operationId: "bulkUpdateFAQs",
  tags: ["FAQ", "Admin"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: { type: "array", items: { type: "string" } },
            data: { type: "object", description: "Fields to update" },
          },
          required: ["ids", "data"],
        },
      },
    },
  },
  responses: {
    200: { description: "FAQs updated successfully" },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "edit.faq",
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { ids, data: updateData } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw createError({ statusCode: 400, message: "No FAQ IDs provided" });
  }
  await models.faq.update(updateData, { where: { id: ids } });
  return { message: "FAQs updated successfully" };
};
