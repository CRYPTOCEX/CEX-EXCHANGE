// /server/api/blog/author/post.get.ts

import { models } from "@b/db";
import { notFoundMetadataResponse, serverErrorResponse } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Retrieve author with his posts",
  description:
    "This endpoint retrieves the author profile associated with a given user id along with the posts linked to that profile.",
  operationId: "getAuthorWithPosts",
  tags: ["Content", "Author"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Author and posts retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              author: {
                type: "object", // Define your author schema here if needed
              },
              posts: {
                type: "array",
                items: {
                  type: "object", // Define your post schema here if needed
                },
              },
            },
          },
        },
      },
    },
    404: notFoundMetadataResponse("Author"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { query, user } = data;
  if (!user?.id) {
    throw new Error("Missing userId parameter");
  }

  // Find the author by matching on userId and include associated posts
  const author = await models.author.findOne({
    where: { userId: user.id },
    include: [
      {
        model: models.post,
        as: "posts",
        include: [
          {
            model: models.category,
            as: "category",
          },
        ],
      },
    ],
  });

  if (!author) {
    // If no author is found for the given user id, throw an error (to be handled appropriately)
    throw new Error("Author not found");
  }

  return author;
};
