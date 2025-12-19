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
  logModule: "ADMIN_BLOG",
  logTitle: "Get author options",
};

export default async (data: Handler) => {
  const { user, ctx } = data;

  ctx?.step("Validating user authorization");
  if (!user?.id) throw createError(401, "Unauthorized");

  ctx?.step("Fetching approved authors");
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

  ctx?.step("Formatting author options");
  const formatted = authors.map((author) => ({
    id: author.id,
    name: `${author.user.firstName} ${author.user.lastName}`,
  }));

  ctx?.success(`${formatted.length} author options retrieved`);
  return formatted;
};
