import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Delete FAQ",
  description: "Deletes an FAQ entry.",
  operationId: "deleteFAQ",
  tags: ["FAQ", "Admin"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "FAQ ID",
    },
  ],
  responses: {
    200: { description: "FAQ deleted successfully" },
    401: { description: "Unauthorized" },
    404: { description: "FAQ not found" },
    500: { description: "Internal Server Error" },
  },
  permission: "delete.faq.feedback",
};

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const faq = await models.faq.findByPk(params.id);
  if (!faq) {
    throw createError({ statusCode: 404, message: "FAQ not found" });
  }
  await faq.destroy();
  return { message: "FAQ deleted successfully" };
};
