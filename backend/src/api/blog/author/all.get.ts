// /server/api/blog/authors/index.get.ts

import { models } from "@b/db";
import { baseAuthorSchema } from "./utils";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Lists all authors based on status and posts",
  description:
    "This endpoint retrieves all available authors based on their status and optionally includes their posts.",
  operationId: "getAuthors",
  tags: ["Content", "Author"],
  requiresAuth: false,
  parameters: [
    {
      name: "status",
      in: "query",
      description: "Filter authors by status",
      required: false,
      schema: {
        type: "string",
        enum: ["PENDING", "APPROVED", "REJECTED"],
      },
    },
    {
      name: "posts",
      in: "query",
      description: "Include posts for each author",
      required: false,
      schema: {
        type: "boolean",
      },
    },
  ],
  responses: {
    200: {
      description: "Authors retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: baseAuthorSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Author"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { query } = data;
  return getAuthors(query.posts === "true", query.status);
};

export async function getAuthors(
  includePosts: boolean,
  status?: string
): Promise<any[]> {
  const includes: any = [
    {
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar", "profile"],
    },
  ];

  // Conditionally include posts if requested
  if (includePosts) {
    includes.push({
      model: models.post,
      as: "post",
    });
  }

  const where = {};
  if (status) {
    where["status"] = status; // Apply status filter if provided
  }

  const authors = await models.author.findAll({
    where: where,
    include: includes,
  });

  // Convert each Sequelize model instance in the array to a plain object
  return authors.map((author) => author.get({ plain: true }));
}
