import { createError } from "@b/utils/error";
import { verifyResetToken } from "@b/utils/token";
import { models } from "@b/db";
import { hashPassword } from "@b/utils/passwords";
import { addOneTimeToken, returnUserWithTokens } from "../utils";

export const metadata: OperationObject = {
  summary: "Verifies a password reset token and sets the new password",
  operationId: "verifyPasswordReset",
  tags: ["Auth"],
  description: "Verifies a password reset token and sets the new password",
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
              description: "The password reset token",
            },
            newPassword: {
              type: "string",
              description: "The new password",
            },
          },
          required: ["token", "newPassword"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Password reset successfully, new password set",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
              cookies: {
                type: "object",
                properties: {
                  accessToken: {
                    type: "string",
                    description: "The new access token",
                  },
                  refreshToken: {
                    type: "string",
                    description: "The new refresh token",
                  },
                  sessionId: {
                    type: "string",
                    description: "The new session ID",
                  },
                  csrfToken: {
                    type: "string",
                    description: "The new CSRF token",
                  },
                },
                required: ["accessToken", "refreshToken", "csrfToken"],
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid request (e.g., missing token or newPassword)",
    },
    401: {
      description: "Unauthorized or invalid token",
    },
  },
};

export default async (data: Handler) => {
  const { body } = data;
  const { token, newPassword } = body;

  const decodedToken = await verifyResetToken(token);

  if (!decodedToken) {
    throw new Error("Invalid token");
  }

  try {
    if (
      decodedToken.jti !== (await addOneTimeToken(decodedToken.jti, new Date()))
    ) {
      throw createError({
        statusCode: 500,
        message: "Token has already been used",
      });
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }

  const errorOrHashedPassword = await hashPassword(newPassword);

  const hashedPassword = errorOrHashedPassword as string;

  const user = await models.user.findByPk(decodedToken.sub.user.id);
  if (!user) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  await user.update({ password: hashedPassword });

  return await returnUserWithTokens({
    user,
    message: "Password reset successfully",
  });
};
