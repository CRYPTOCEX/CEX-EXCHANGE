import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Bulk Delete FAQs",
  description: "Deletes multiple FAQs in bulk.",
  operationId: "bulkDeleteFAQs",
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
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: {
    200: { description: "FAQs deleted successfully" },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "delete.faq",
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { ids } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw createError({ statusCode: 400, message: "No FAQ IDs provided" });
  }
  await models.faq.destroy({ where: { id: ids } });
  return { message: "FAQs deleted successfully" };
};
