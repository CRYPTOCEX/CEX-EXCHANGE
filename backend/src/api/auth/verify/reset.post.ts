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
  logModule: "PASSWORD",
  logTitle: "Password reset confirmation",
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
  const { body, ctx } = data;
  const { token, newPassword } = body;

  try {
    ctx?.step("Validating password reset token");
    if (!token || !newPassword) {
      ctx?.fail("Token and new password are required");
      throw createError({
        statusCode: 400,
        message: "Token and new password are required",
      });
    }

    ctx?.step("Verifying reset token");
    const decodedToken = await verifyResetToken(token);

    if (!decodedToken) {
      ctx?.fail("Invalid or expired token");
      throw new Error("Invalid token");
    }

    ctx?.step("Checking token usage");
    try {
      if (
        decodedToken.jti !== (await addOneTimeToken(decodedToken.jti, new Date()))
      ) {
        ctx?.fail("Token already used");
        throw createError({
          statusCode: 500,
          message: "Token has already been used",
        });
      }
    } catch (error) {
      ctx?.fail("Token validation failed");
      throw createError({
        statusCode: 500,
        message: error.message,
      });
    }

    ctx?.step("Hashing new password");
    const errorOrHashedPassword = await hashPassword(newPassword);
    const hashedPassword = errorOrHashedPassword as string;

    ctx?.step("Looking up user");
    const user = await models.user.findByPk(decodedToken.sub.user.id);
    if (!user) {
      ctx?.fail("User not found");
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    ctx?.step("Updating password");
    await user.update({ password: hashedPassword });

    ctx?.step("Generating session tokens");
    const result = await returnUserWithTokens({
      user,
      message: "Password reset successfully",
    });

    ctx?.success(`Password reset successfully for user ${user.email}`);
    return result;
  } catch (error) {
    ctx?.fail(error.message || "Password reset failed");
    throw error;
  }
};
