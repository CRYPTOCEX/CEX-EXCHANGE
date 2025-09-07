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
  const { email, token } = data.body;

  const user = await models.user.findOne({ where: { email } });
  if (!user) {
    throw createError({ message: "User not found", statusCode: 404 });
  }

  const decodedToken = await verifyResetToken(token);
  if (!decodedToken) {
    throw createError({ message: "Invalid or expired token", statusCode: 400 });
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
      message: "Token has already been used",
    });
  }

  await models.user.destroy({ where: { id: user.id } });

  try {
    await emailQueue.add({
      emailData: {
        TO: user.email,
        FIRSTNAME: user.firstName,
      },
      emailType: "AccountDeletionConfirmed",
    });

    return {
      message: "User account deleted successfully",
    };
  } catch (error) {
    throw createError({ message: error.message, statusCode: 500 });
  }
};
