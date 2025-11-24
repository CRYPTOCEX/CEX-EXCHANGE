import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Update FAQ Status by Page",
  description:
    "Enables or disables all FAQs associated with a specific page path.",
  operationId: "updateFAQsStatusByPage",
  tags: ["FAQ", "Admin"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            pagePath: {
              type: "string",
              description: "Page path to update FAQs for",
            },
            status: { type: "boolean", description: "New status for FAQs" },
          },
          required: ["pagePath", "status"],
        },
      },
    },
  },
  responses: {
    200: { description: "FAQs status updated successfully" },
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
  const { pagePath, status } = body;
  if (typeof pagePath !== "string") {
    throw createError({ statusCode: 400, message: "pagePath is required" });
  }
  await models.faq.update({ status }, { where: { pagePath } });
  return { message: "FAQs status updated successfully" };
};
