import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  successMessageResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update FAQ Status by Page",
  description:
    "Enables or disables all FAQs associated with a specific page path. Updates the status field for all FAQs on the specified page.",
  operationId: "updateFaqStatusByPage",
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
              description: "Page path to update FAQs for",
            },
            status: {
              type: "boolean",
              description: "New status for all FAQs (true=active, false=inactive)",
            },
          },
          required: ["pagePath", "status"],
        },
      },
    },
  },
  responses: {
    200: successMessageResponse("FAQs status updated successfully"),
    400: badRequestResponse,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "edit.faq",
  logModule: "ADMIN_FAQ",
  logTitle: "Update FAQ status by page",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { pagePath, status } = body;
  if (typeof pagePath !== "string") {
    ctx?.fail("pagePath is required");
    throw createError({ statusCode: 400, message: "pagePath is required" });
  }

  ctx?.step("Updating FAQ status by page");
  await models.faq.update({ status }, { where: { pagePath } });

  ctx?.success("FAQs status updated successfully");
  return { message: "FAQs status updated successfully" };
};
