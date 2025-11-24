import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get referrer information",
  description: "Retrieves basic information about a referrer by their ID",
  operationId: "getReferrerInfo",
  tags: ["Public"],
  requiresAuth: false,
  parameters: [
    {
      in: "path",
      name: "id",
      required: true,
      description: "Referrer user ID",
      schema: {
        type: "string"
      }
    }
  ],
  responses: {
    200: {
      description: "Referrer information retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "User ID"
              },
              name: {
                type: "string",
                description: "Full name of the referrer"
              },
              avatar: {
                type: "string",
                description: "Avatar URL",
                nullable: true
              }
            }
          }
        }
      }
    },
    404: {
      description: "Referrer not found"
    },
    500: {
      description: "Internal server error"
    }
  }
};

export default async (data: Handler) => {
  const { params } = data;
  const { id } = params;

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Referrer ID is required"
    });
  }

  try {
    // Find the user by ID
    const user = await models.user.findOne({
      where: { id },
      attributes: ["id", "firstName", "lastName", "avatar"],
    });

    if (!user) {
      throw createError({
        statusCode: 404,
        message: "Referrer not found"
      });
    }

    // Return basic info only
    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      avatar: user.avatar || null
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    
    console.error("Error fetching referrer info:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch referrer information"
    });
  }
};