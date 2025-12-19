import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Toggles OTP status",
  operationId: "toggleOtp",
  tags: ["Auth"],
  description: "Enables or disables OTP for the user",
  requiresAuth: true,
  logModule: "2FA",
  logTitle: "Toggle 2FA status",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description: "Status to set for OTP (enabled or disabled)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "OTP status updated successfully",
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
    },
    401: {
      description: "Unauthorized",
    },
  },
};

export default async (data: Handler) => {
  const { body, user, ctx } = data;

  try {
    ctx?.step("Validating user authentication");
    if (!user) {
      ctx?.fail("User not authenticated");
      throw createError({ statusCode: 401, message: "unauthorized" });
    }

    ctx?.step("Validating status value");
    if (typeof body.status !== "boolean") {
      ctx?.fail("Status must be a boolean");
      throw createError({
        statusCode: 400,
        message: "Status must be a boolean value",
      });
    }

    ctx?.step(`${body.status ? "Enabling" : "Disabling"} 2FA`);
    const result = await toggleOTPQuery(user.id, body.status);

    ctx?.success(`2FA ${body.status ? "enabled" : "disabled"} successfully`);
    return result;
  } catch (error) {
    ctx?.fail(error.message || "Failed to toggle 2FA");
    throw error;
  }
};

async function toggleOTPQuery(userId: string, status: boolean) {
  return await models.twoFactor.update(
    { enabled: status },
    { where: { userId }, returning: true }
  );
}
