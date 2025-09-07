import { generateEmailToken } from "@b/utils/token";
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { emailQueue } from "@b/utils/emails";

export const metadata: OperationObject = {
  summary: "Generate account deletion confirmation code",
  operationId: "generateAccountDeletionCode",
  tags: ["Account"],
  description:
    "Generates a code for confirming account deletion and sends it to the user's email.",
  requiresAuth: true,
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
              description: "Email of the user requesting account deletion",
            },
          },
          required: ["email"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Deletion confirmation code generated successfully",
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
      description: "Invalid request",
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
  const { email } = data.body;

  const user = await models.user.findOne({ where: { email } });
  if (!user) {
    throw createError({ message: "User not found", statusCode: 404 });
  }

  const token = await generateEmailToken({ user: { id: user.id } });

  try {
    await emailQueue.add({
      emailData: {
        TO: user.email,
        FIRSTNAME: user.firstName,
        TOKEN: token,
      },
      emailType: "AccountDeletionConfirmation",
    });

    return {
      message: "Deletion confirmation code sent successfully",
    };
  } catch (error) {
    throw createError({ message: error.message, statusCode: 500 });
  }
};
