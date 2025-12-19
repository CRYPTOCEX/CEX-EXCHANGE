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
  logModule: "EMAIL",
  logTitle: "Email verification",
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
  const { body, ctx } = data;
  const { token } = body;
  return verifyEmailTokenQuery(token, ctx);
};

export const verifyEmailTokenQuery = async (token: string, ctx?: any) => {
  try {
    ctx?.step("Validating email verification token");
    if (!token) {
      ctx?.fail("Token is required");
      throw createError({
        statusCode: 400,
        message: "Token is required",
      });
    }

    ctx?.step("Verifying token");
    // Use verifyEmailCode to check if the code is valid and get the associated userId
    const userId = await verifyEmailCode(token);

    if (!userId) {
      ctx?.fail("Token not found or expired");
      throw createError({
        statusCode: 404,
        message: "Token not found or expired",
      });
    }

    ctx?.step("Looking up user");
    // Find the user by userId
    const user = await models.user.findByPk(userId);
    if (!user) {
      ctx?.fail("User not found");
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    ctx?.step("Updating email verification status");
    // Update user's emailVerified status
    await user.update({
      emailVerified: true,
    });

    ctx?.step("Generating session tokens");
    // Return the user with success message
    const result = await returnUserWithTokens({
      user,
      message: "Email verified successfully",
    });

    ctx?.success(`Email verified for user ${user.email}`);
    return result;
  } catch (error) {
    ctx?.fail(error.message || "Email verification failed");
    throw error;
  }
};
