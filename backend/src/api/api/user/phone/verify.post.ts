import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Verify phone number with code",
  operationId: "verifyPhoneNumber",
  tags: ["User", "Phone"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "Verification code sent to phone",
            },
          },
          required: ["code"],
        },
      },
    },
  },
  responses: {
    200: { description: "Phone verified" },
    400: { description: "Invalid or expired code" },
    401: { description: "Unauthorized" },
  },
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  const { code } = body;

  const userRecord = await models.user.findByPk(user.id);

  if (
    !userRecord.phoneVerificationCode ||
    !userRecord.phoneVerificationExpiresAt ||
    userRecord.phoneVerificationCode !== code ||
    new Date(userRecord.phoneVerificationExpiresAt) < new Date()
  ) {
    throw createError({ statusCode: 400, message: "Invalid or expired code" });
  }

  // Verification successful - set phone and mark as verified
  await userRecord.update({
    phone: userRecord.phoneTemp,
    phoneVerified: true,
    phoneVerificationCode: null,
    phoneVerificationExpiresAt: null,
    phoneTemp: null,
  });

  return { message: "Phone number verified successfully." };
};
