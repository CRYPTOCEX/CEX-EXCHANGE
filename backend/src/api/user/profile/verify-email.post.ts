import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { sendEmailVerificationToken } from "../../auth/utils";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Resend Email Verification for Authenticated User",
  description:
    "Sends a verification email to the authenticated user's email address",
  operationId: "resendEmailVerificationAuth",
  tags: ["User", "Profile"],
  requiresAuth: true,
  logModule: "USER",
  logTitle: "Resend email verification",
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
  const { user, ctx } = data;

  if (!user) {
    ctx?.fail("User not authenticated");
    throw createError({
      statusCode: 401,
      message: "User not authenticated",
    });
  }

  ctx?.step("Retrieving user record");
  // Get the full user record to check email verification status
  const fullUser = await models.user.findByPk(user.id);

  if (!fullUser) {
    ctx?.fail("User not found");
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  // Check if email is already verified
  if (fullUser.emailVerified) {
    ctx?.warn("Email already verified");
    return {
      message: "Email is already verified",
    };
  }

  ctx?.step("Checking email verification configuration");
  // Check if email verification is enabled
  if (process.env.NEXT_PUBLIC_VERIFY_EMAIL_STATUS !== "true") {
    ctx?.fail("Email verification not enabled");
    throw createError({
      statusCode: 400,
      message: "Email verification is not enabled on this platform",
    });
  }

  try {
    ctx?.step("Sending verification email");
    await sendEmailVerificationToken(fullUser.id, fullUser.email);

    ctx?.success("Verification email sent successfully");
    return {
      message: "Verification email sent successfully. Please check your inbox.",
    };
  } catch (error) {
    logger.error("USER", "Error sending verification email", error);
    ctx?.fail("Failed to send verification email");
    throw createError({
      statusCode: 500,
      message: "Failed to send verification email. Please try again later.",
    });
  }
};
