import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { verifyResetToken } from "@b/utils/token";
import { addOneTimeToken } from "../utils";
import { emailQueue } from "@b/utils/emails";

export const metadata: OperationObject = {
  summary: "Check account deletion code and delete user",
  operationId: "checkAccountDeletionCode",
  tags: ["Account"],
  description:
    "Checks the deletion code, deletes the user's account if valid, and sends a confirmation email.",
  requiresAuth: false,
  logModule: "ACCOUNT",
  logTitle: "Confirm account deletion",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Email of the user confirming account deletion",
            },
            token: {
              type: "string",
              description: "Account deletion confirmation token",
            },
          },
          required: ["email", "token"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "User account deleted successfully",
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
      description: "Invalid request or token",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Error message",
              },
            },
          },
        },
      },
    },
  },
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { email, token } = body;

  try {
    ctx?.step("Validating account deletion confirmation");
    if (!email || !token) {
      ctx?.fail("Email and token are required");
      throw createError({
        statusCode: 400,
        message: "Email and token are required",
      });
    }

    ctx?.step(`Looking up user: ${email}`);
    const user = await models.user.findOne({ where: { email } });
    if (!user) {
      ctx?.fail("User not found");
      throw createError({ message: "User not found", statusCode: 404 });
    }

    ctx?.step("Verifying deletion token");
    const decodedToken = await verifyResetToken(token);
    if (!decodedToken) {
      ctx?.fail("Invalid or expired token");
      throw createError({ message: "Invalid or expired token", statusCode: 400 });
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
        message: "Token has already been used",
      });
    }

    ctx?.step("Deleting user account");
    await models.user.destroy({ where: { id: user.id } });

    try {
      ctx?.step("Sending deletion confirmation email");
      await emailQueue.add({
        emailData: {
          TO: user.email,
          FIRSTNAME: user.firstName,
        },
        emailType: "AccountDeletionConfirmed",
      });

      ctx?.success(`User account ${email} deleted successfully`);
      return {
        message: "User account deleted successfully",
      };
    } catch (error) {
      ctx?.fail("Failed to send deletion confirmation email");
      throw createError({ message: error.message, statusCode: 500 });
    }
  } catch (error) {
    ctx?.fail(error.message || "Account deletion confirmation failed");
    throw error;
  }
};
