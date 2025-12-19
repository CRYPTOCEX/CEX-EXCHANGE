// /server/api/blog/categories/index.get.ts
import { models } from "@b/db";
import { fn, col } from "sequelize";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseCategorySchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists categories with post count",
  description:
    "This endpoint retrieves all categories that have at least one published post along with the count of their associated posts.",
  operationId: "getCategories",
  tags: ["Blog"],
  requiresAuth: false,
  logModule: "BLOG",
  logTitle: "Get Categories",
  responses: {
    200: {
      description: "Categories retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ...baseCategorySchema,
                postCount: { type: "number" },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Category"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { ctx } = data;

  ctx?.step("Fetching categories with post counts");
  const categories = await models.category.findAll({
    attributes: {
      include: [
        // Compute the count of published posts for each category
        [fn("COUNT", col("posts.id")), "postCount"],
      ],
    },
    include: [
      {
        model: models.post,
        as: "posts",
        attributes: [], // Do not include any post fields
        where: { status: "PUBLISHED" },
        required: true, // Only include categories with published posts
      },
    ],
    group: ["category.id"],
  });

  ctx?.success(`Retrieved ${categories.length} categories`);
  return categories.map((category) => category.get({ plain: true }));
};
