import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successMessageResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Bulk Delete FAQs",
  description: "Deletes multiple FAQ entries in a single operation. Accepts an array of FAQ IDs to delete.",
  operationId: "bulkDeleteFaqs",
  tags: ["Admin", "FAQ", "BulkOperations"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description: "Array of FAQ IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: {
    200: successMessageResponse("FAQs deleted successfully"),
    400: badRequestResponse,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "delete.faq",
  logModule: "ADMIN_FAQ",
  logTitle: "Bulk delete FAQs",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { ids } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    ctx?.fail("No FAQ IDs provided");
    throw createError({ statusCode: 400, message: "No FAQ IDs provided" });
  }

  ctx?.step("Deleting FAQs");
  await models.faq.destroy({ where: { id: ids } });

  ctx?.success("FAQs deleted successfully");
  return { message: "FAQs deleted successfully" };
};
