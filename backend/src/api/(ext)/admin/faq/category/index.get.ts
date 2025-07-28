import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { col, fn } from "sequelize";

export const metadata = {
  summary: "Get FAQ Categories",
  description: "Retrieves distinct FAQ categories for admin.",
  operationId: "getFAQCategories",
  tags: ["FAQ", "Admin"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Categories retrieved successfully",
      content: {
        "application/json": {
          schema: { type: "array", items: { type: "string" } },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "view.faq.category",
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const categories = await models.faq.findAll({
    attributes: [[fn("DISTINCT", col("category")), "category"]],
    raw: true,
  });
  const result = categories.map((c: any) => c.category);
  return result;
};
