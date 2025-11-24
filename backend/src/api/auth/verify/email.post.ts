import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { verifyEmailCode } from "@b/utils/token";
import { returnUserWithTokens } from "../utils";

export const metadata: OperationObject = {
  summary: "Verifies the email with the provided token",
  operationId: "verifyEmailToken",
  tags: ["Auth"],
  description: "Verifies the email with the provided token",
  requiresAuth: false,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "The email verification token",
            },
          },
          required: ["token"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Email verified successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid request (e.g., missing or invalid token)",
    },
    404: {
      description: "Token not found or expired",
    },
  },
};

export default async (data: Handler) => {
  const { body } = data;
  const { token } = body;
  return verifyEmailTokenQuery(token);
};

export const verifyEmailTokenQuery = async (token: string) => {
  // Use verifyEmailCode to check if the code is valid and get the associated userId
  const userId = await verifyEmailCode(token);

  if (!userId) {
    throw createError({
      statusCode: 404,
      message: "Token not found or expired",
    });
  }

  // Find the user by userId
  const user = await models.user.findByPk(userId);
  if (!user) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  // Update user's emailVerified status
  await user.update({
    emailVerified: true,
  });

  // Return the user with success message
  return await returnUserWithTokens({
    user,
    message: "Email verified successfully",
  });
};
