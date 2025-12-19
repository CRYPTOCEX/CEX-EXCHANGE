import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { col, fn } from "sequelize";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Get FAQ Categories",
  description: "Retrieves a list of distinct FAQ categories. Returns all unique category names from the FAQ database.",
  operationId: "getFaqCategories",
  tags: ["Admin", "FAQ", "Categories"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Categories retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: { type: "string", description: "Category name" },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "view.faq.category",
  logModule: "ADMIN_FAQ",
  logTitle: "Get FAQ categories",
};

export default async (data: Handler) => {
  const { user, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  ctx?.step("Fetching FAQ categories");
  const categories = await models.faq.findAll({
    attributes: [[fn("DISTINCT", col("category")), "category"]],
    raw: true,
  });
  const result = categories.map((c: any) => c.category);
  ctx?.success("FAQ categories retrieved successfully");
  return result;
};
