// /server/api/blog/tags/show.get.ts
import { models } from "@b/db";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseTagSchema, tagPostsSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves a single tag by slug with optional inclusion of posts",
  description:
    "This endpoint retrieves a single tag by its slug with optional inclusion of posts.",
  operationId: "getTagBySlug",
  tags: ["Blog"],
  requiresAuth: false,
  parameters: [
    {
      index: 0,
      name: "slug",
      in: "path",
      description: "The slug of the tag to retrieve",
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      name: "posts",
      in: "query",
      description: "Include posts tagged with this tag",
      required: false,
      schema: {
        type: "boolean",
      },
    },
  ],
  responses: {
    200: {
      description: "Tag retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...baseTagSchema,
              posts: tagPostsSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Tag"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { params, query } = data;
  return getTag(params.slug, query.posts === "true");
};
export async function getTag(
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
            {
              model: models.category,
              as: "category",
            },
          ],
        },
      ]
    : [];

  return await models.tag
    .findOne({
      where: { slug },
      include: includes,
    })
    .then((result) => (result ? result.get({ plain: true }) : null));
}
