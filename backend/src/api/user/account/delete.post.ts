import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { verifyPassword } from "@b/utils/passwords";

export const metadata: OperationObject = {
  summary: "Delete own user account",
  description: "Allow users to delete their own account (soft delete)",
  operationId: "deleteOwnAccount",
  tags: ["User", "Account"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {

            confirmPassword: {
              type: "string",
              description: "User's current password for confirmation",
            },
          },
          required: ["confirmPassword"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Account deleted successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    400: { description: "Bad request" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { body, user } = data;
  const { confirmPassword } = body;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  // Get current user with password for verification
  const currentUser = await models.user.findOne({
    where: { id: user.id },
    include: [
      {
        model: models.role,
        as: "role",
        attributes: ["name"],
      },
    ],
  });

  if (!currentUser) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  // Prevent super admin deletion
  if (currentUser.role && currentUser.role.name === "Super Admin") {
    throw createError({
      statusCode: 403,
      message: "Super Admin accounts cannot be self-deleted",
    });
  }

  // Verify password if provided
  if (confirmPassword && currentUser.password) {
    const isPasswordValid = await verifyPassword(currentUser.password, confirmPassword);
    
    if (!isPasswordValid) {
      throw createError({
        statusCode: 400,
        message: "Incorrect password",
      });
    }
  }

  // Soft delete the user account (sets deletedAt timestamp)
  await currentUser.destroy();

  return {
    message: "Your account has been successfully deleted",
  };
}; 