import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves a list of users",
  description:
    "This endpoint retrieves active users for selection in the UI. Each option includes the user's ID and full name (or email if a full name is not available).",
  operationId: "getUserOptions",
  tags: ["User"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Users retrieved successfully",
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
    404: notFoundMetadataResponse("User"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    // Retrieve only active users.
    const users = await models.user.findAll({
      where: { status: "ACTIVE" },
    });

    // Map each user to an option with their full name or fallback to email.
    const formatted = users.map((u) => {
      const fullName =
        u.firstName && u.lastName
          ? `${u.firstName} ${u.lastName} - ${u.id}`
          : u.email;
      return {
        id: u.id,
        name: fullName,
      };
    });

    return formatted;
  } catch (error) {
    throw createError(500, "An error occurred while fetching users");
  }
};
