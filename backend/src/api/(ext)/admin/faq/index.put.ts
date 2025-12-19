import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successMessageResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Bulk Update FAQs",
  description: "Updates multiple FAQ entries in a single operation. Applies the same update data to all specified FAQ IDs.",
  operationId: "bulkUpdateFaqs",
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
              description: "Array of FAQ IDs to update",
            },
            data: {
              type: "object",
              description: "Fields to update on all FAQs",
            },
          },
          required: ["ids", "data"],
        },
      },
    },
  },
  responses: {
    200: successMessageResponse("FAQs updated successfully"),
    400: badRequestResponse,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "edit.faq",
  logModule: "ADMIN_FAQ",
  logTitle: "Bulk update FAQs",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { ids, data: updateData } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    ctx?.fail("No FAQ IDs provided");
    throw createError({ statusCode: 400, message: "No FAQ IDs provided" });
  }

  ctx?.step("Updating FAQs");
  await models.faq.update(updateData, { where: { id: ids } });

  ctx?.success("FAQs updated successfully");
  return { message: "FAQs updated successfully" };
};
