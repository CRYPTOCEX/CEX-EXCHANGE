import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { col, fn } from "sequelize";

export const metadata = {
  summary: "Get FAQ Categories",
  description: "Retrieves distinct FAQ categories.",
  operationId: "getFAQCategories",
  tags: ["FAQ", "User"],
  logModule: "FAQ",
  logTitle: "Get FAQ Categories",
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
};

export default async (data: Handler) => {
  const { ctx } = data;

  try {
    ctx?.step("Fetching distinct FAQ categories");
    // Use Sequelize's DISTINCT function to extract unique categories
    const categories = await models.faq.findAll({
      where: { status: true },
      attributes: [[fn("DISTINCT", col("category")), "category"]],
      raw: true,
    });

    ctx?.step("Mapping categories to result array");
    // Map the results to a plain array of strings.
    const result = categories.map((item: any) => item.category);

    ctx?.success(`Retrieved ${result.length} categories`);
    return result;
  } catch (error) {
    console.error("Error fetching FAQ categories:", error);
    ctx?.fail(error instanceof Error ? error.message : "Failed to fetch FAQ categories");
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch FAQ categories",
    });
  }
};
