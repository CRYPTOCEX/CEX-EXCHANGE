import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Delete FAQs by Page",
  description: "Deletes all FAQs associated with a specific page path.",
  operationId: "deleteFAQsByPage",
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
              description: "Page path to delete FAQs from",
            },
          },
          required: ["pagePath"],
        },
      },
    },
  },
  responses: {
    200: { description: "FAQs deleted successfully for the page" },
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
  const { pagePath } = body;
  if (!pagePath) {
    throw createError({ statusCode: 400, message: "pagePath is required" });
  }
  await models.faq.destroy({ where: { pagePath } });
  return { message: "FAQs deleted successfully for the page" };
};
