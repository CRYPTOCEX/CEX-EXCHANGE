// /server/api/auth/reset.post.ts

import { generateResetToken } from "@b/utils/token";
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { emailQueue } from "@b/utils/emails";
import { verifyRecaptcha } from "../utils";

const recaptchaEnabled =
  process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_STATUS === "true";

export const metadata: OperationObject = {
  summary: "Initiates a password reset process for a user",
  operationId: "resetPassword",
  tags: ["Auth"],
  description:
    "Initiates a password reset process for a user and sends an email with a reset link",
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
              description: "Email of the user",
            },
            recaptchaToken: {
              type: "string",
              description: "Recaptcha token if enabled",
              nullable: !recaptchaEnabled,
            },
          },
          required: [
            "email",
            ...(recaptchaEnabled ? ["recaptchaToken"] : []),
          ],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Password reset process initiated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              status: {
                type: "boolean",
                description: "Indicates if the request was successful",
              },
              statusCode: {
                type: "number",
                description: "HTTP status code",
                example: 200,
              },
              data: {
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
      },
    },
    400: {
      description: "Invalid request (e.g., missing email)",
    },
    404: {
      description: "User not found with the provided email",
    },
  },
};

export default (data: Handler) => {
  const { body } = data;
  const { email, recaptchaToken } = body;
  return resetPasswordQuery(email, recaptchaToken);
};

const resetPasswordQuery = async (email: string, recaptchaToken?: string) => {
  // Verify reCAPTCHA if enabled
  if (recaptchaEnabled) {
    if (!recaptchaToken) {
      throw createError({
        statusCode: 400,
        message: "reCAPTCHA token is required",
      });
    }
    
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      throw createError({
        statusCode: 400,
        message: "reCAPTCHA verification failed",
      });
    }
  }

  const user = await models.user.findOne({ where: { email } });
  if (!user) {
    throw new Error("User not found");
  }

  const resetToken = await generateResetToken({
    user: {
      id: user.id,
    },
  });

  try {
    await emailQueue.add({
      emailData: {
        TO: user.email,
        FIRSTNAME: user.firstName,
        LAST_LOGIN: user.lastLogin,
        TOKEN: resetToken,
      },
      emailType: "PasswordReset",
    });

    return {
      message: "Email with reset instructions sent successfully",
    };
  } catch (error) {
    throw createError({
      message: error.message,
      statusCode: 500,
    });
  }
};
