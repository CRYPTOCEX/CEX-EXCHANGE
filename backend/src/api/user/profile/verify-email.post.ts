import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { sendEmailVerificationToken } from "../../auth/utils";

export const metadata: OperationObject = {
  summary: "Resend Email Verification for Authenticated User",
  description:
    "Sends a verification email to the authenticated user's email address",
  operationId: "resendEmailVerificationAuth",
  tags: ["User", "Profile"],
  requiresAuth: true,
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
      description: "Email already verified or invalid request",
    },
    500: {
      description: "Internal server error",
    },
  },
};

export default async (data: Handler) => {
  const { user } = data;

  if (!user) {
    throw createError({
      statusCode: 401,
      message: "User not authenticated",
    });
  }

  // Get the full user record to check email verification status
  const fullUser = await models.user.findByPk(user.id);

  if (!fullUser) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  // Check if email is already verified
  if (fullUser.emailVerified) {
    return {
      message: "Email is already verified",
    };
  }

  // Check if email verification is enabled
  if (process.env.NEXT_PUBLIC_VERIFY_EMAIL_STATUS !== "true") {
    throw createError({
      statusCode: 400,
      message: "Email verification is not enabled on this platform",
    });
  }

  try {
    await sendEmailVerificationToken(fullUser.id, fullUser.email);

    return {
      message: "Verification email sent successfully. Please check your inbox.",
    };
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to send verification email. Please try again later.",
    });
  }
};
