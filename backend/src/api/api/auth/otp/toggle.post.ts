import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Toggles OTP status",
  operationId: "toggleOtp",
  tags: ["Auth"],
  description: "Enables or disables OTP for the user",
  requiresAuth: true,
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
  const { body, user } = data;
  if (!user) throw createError({ statusCode: 401, message: "unauthorized" });

  return await toggleOTPQuery(user.id, body.status);
};

async function toggleOTPQuery(userId: string, status: boolean) {
  return await models.twoFactor.update(
    { enabled: status },
    { where: { userId }, returning: true }
  );
}
