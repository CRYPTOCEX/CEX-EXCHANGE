import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successMessageResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Delete FAQs by Page Path",
  description: "Deletes all FAQ entries associated with a specific page path. This operation removes all FAQs belonging to the specified page.",
  operationId: "deleteFaqsByPage",
  tags: ["Admin", "FAQ", "Pages"],
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
    200: successMessageResponse("FAQs deleted successfully for the page"),
    400: badRequestResponse,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "delete.faq",
  logModule: "ADMIN_FAQ",
  logTitle: "Delete FAQs by page",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { pagePath } = body;
  if (!pagePath) {
    ctx?.fail("pagePath is required");
    throw createError({ statusCode: 400, message: "pagePath is required" });
  }

  ctx?.step("Deleting FAQs by page");
  await models.faq.destroy({ where: { pagePath } });

  ctx?.success("FAQs deleted successfully for the page");
  return { message: "FAQs deleted successfully for the page" };
};
