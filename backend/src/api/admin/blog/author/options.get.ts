import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves a list of authors",
  description:
    "This endpoint retrieves a list of authors with their associated user names. Optionally, you can filter by status.",
  operationId: "getAuthors",
  tags: ["Author"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "status",
      in: "query",
      required: false,
      schema: {
        type: "string",
        enum: ["PENDING", "APPROVED", "REJECTED"],
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
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
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
  const { user } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  const authors = await models.author.findAll({
    where: { status: "APPROVED" },
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email"],
      },
    ],
  });
  const formatted = authors.map((author) => ({
    id: author.id,
    name: `${author.user.firstName} ${author.user.lastName}`,
  }));
  return formatted;
};
