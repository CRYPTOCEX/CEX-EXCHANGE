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
  logModule: "ACCOUNT",
  logTitle: "Request account deletion",
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
  const { body, ctx } = data;
  const { email } = body;

  try {
    ctx?.step("Validating account deletion request");
    if (!email) {
      ctx?.fail("Email is required");
      throw createError({
        statusCode: 400,
        message: "Email is required",
      });
    }

    ctx?.step(`Looking up user: ${email}`);
    const user = await models.user.findOne({ where: { email } });
    if (!user) {
      ctx?.fail("User not found");
      throw createError({ message: "User not found", statusCode: 404 });
    }

    ctx?.step("Generating deletion confirmation token");
    const token = await generateEmailToken({ user: { id: user.id } });

    try {
      ctx?.step("Sending deletion confirmation email");
      await emailQueue.add({
        emailData: {
          TO: user.email,
          FIRSTNAME: user.firstName,
          TOKEN: token,
        },
        emailType: "AccountDeletionConfirmation",
      });

      ctx?.success(`Deletion confirmation sent to ${email}`);
      return {
        message: "Deletion confirmation code sent successfully",
      };
    } catch (error) {
      ctx?.fail("Failed to send deletion confirmation email");
      throw createError({ message: error.message, statusCode: 500 });
    }
  } catch (error) {
    ctx?.fail(error.message || "Account deletion request failed");
    throw error;
  }
};
