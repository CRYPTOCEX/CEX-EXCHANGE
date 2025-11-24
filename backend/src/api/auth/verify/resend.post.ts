import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { sendEmailVerificationToken } from "../utils";

export const metadata: OperationObject = {
  summary: "Resends email verification token",
  operationId: "resendEmailVerification",
  tags: ["Auth"],
  description: "Resends email verification token to user's email address",
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
              description: "User's email address",
            },
          },
          required: ["email"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Verification email sent successfully",
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
      description: "Invalid request (e.g., email already verified)",
    },
    404: {
      description: "User not found",
    },
  },
};

export default async (data: Handler) => {
  const { body } = data;
  const { email } = body;

  if (!email) {
    throw createError({
      statusCode: 400,
      message: "Email is required",
    });
  }

  // Find the user by email
  const user = await models.user.findOne({
    where: { email },
  });

  if (!user) {
    throw createError({
      statusCode: 404,
      message: "User not found with this email address",
    });
  }

  // Check if email is already verified
  if (user.emailVerified) {
    throw createError({
      statusCode: 400,
      message: "Email is already verified",
    });
  }

  // Check if email verification is enabled
  if (process.env.NEXT_PUBLIC_VERIFY_EMAIL_STATUS !== "true") {
    throw createError({
      statusCode: 400,
      message: "Email verification is not enabled on this platform",
    });
  }

  try {
    await sendEmailVerificationToken(user.id, user.email);
    
    return {
      message: "Verification email sent successfully. Please check your inbox.",
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: "Failed to send verification email. Please try again later.",
    });
  }
}; 