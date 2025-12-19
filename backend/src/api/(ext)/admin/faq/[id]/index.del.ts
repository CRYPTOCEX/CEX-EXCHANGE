import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  successMessageResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Delete Single FAQ",
  description: "Deletes a specific FAQ entry by ID. This is a soft delete operation that marks the FAQ as deleted.",
  operationId: "deleteFaq",
  tags: ["Admin", "FAQ", "Delete"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "FAQ ID to delete",
    },
  ],
  responses: {
    200: successMessageResponse("FAQ deleted successfully"),
    401: unauthorizedResponse,
    404: notFoundResponse("FAQ"),
    500: serverErrorResponse,
  },
  permission: "delete.faq",
  logModule: "ADMIN_FAQ",
  logTitle: "Delete FAQ entry",
};

export default async (data: Handler) => {
  const { user, params, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Fetching FAQ");
  const faq = await models.faq.findByPk(params.id);
  if (!faq) {
    ctx?.fail("FAQ not found");
    throw createError({ statusCode: 404, message: "FAQ not found" });
  }

  ctx?.step("Deleting FAQ");
  await faq.destroy();

  ctx?.success("FAQ deleted successfully");
  return { message: "FAQ deleted successfully" };
};
