// /server/api/blog/categories/show.get.ts
import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseCategorySchema, categoryPostsSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves a single category by ID with optional inclusion of posts",
  description:
    "This endpoint retrieves a single category by its ID with optional inclusion of posts.",
  operationId: "getCategoryById",
  tags: ["Blog"],
  requiresAuth: false,
  parameters: [
    {
      index: 0,
      name: "slug",
      in: "path",
      description: "The ID of the category to retrieve",
      required: true,
      schema: {
        type: "string",
        description: "Category ID",
      },
    },
    {
      name: "posts",
      in: "query",
      description: "Include posts in the category",
      required: false,
      schema: {
        type: "boolean",
      },
    },
  ],
  responses: {
    200: {
      description: "Category retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...baseCategorySchema,
              posts: categoryPostsSchema,
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
  return getCategory(data.params.slug, data.query.posts === "true");
};

export async function getCategory(
  slug: string,
  includePosts: boolean
): Promise<any | null> {
  const includes = includePosts
    ? [
        {
          model: models.post,
          as: "posts",
          include: [
            {
              model: models.author,
              as: "author",
              include: [
                {
                  model: models.user,
                  as: "user",
                  attributes: [
                    "id",
                    "firstName",
                    "lastName",
                    "email",
                    "avatar",
                  ],
                },
              ],
            },
          ],
        },
      ]
    : [];

  return await models.category
    .findOne({
      where: { slug },
      include: includes, // Pass the constructed array to the include option
    })
    .then((result) => (result ? result.get({ plain: true }) : null)); // Convert to plain object if result is not null
}
