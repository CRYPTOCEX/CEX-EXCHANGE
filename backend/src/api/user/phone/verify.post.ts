import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Verify phone number with code",
  operationId: "verifyPhoneNumber",
  tags: ["User", "Phone"],
  requiresAuth: true,
  logModule: "USER",
  logTitle: "Verify phone number",
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
  const { user, body, ctx } = data;
  if (!user) {
    ctx?.fail("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { code } = body;

  ctx?.step("Retrieving user record");
  const userRecord = await models.user.findByPk(user.id);

  ctx?.step("Validating verification code");
  if (
    !userRecord.phoneVerificationCode ||
    !userRecord.phoneVerificationExpiresAt ||
    userRecord.phoneVerificationCode !== code ||
    new Date(userRecord.phoneVerificationExpiresAt) < new Date()
  ) {
    ctx?.fail("Invalid or expired verification code");
    throw createError({ statusCode: 400, message: "Invalid or expired code" });
  }

  ctx?.step("Updating phone verification status");
  // Verification successful - set phone and mark as verified
  await userRecord.update({
    phone: userRecord.phoneTemp,
    phoneVerified: true,
    phoneVerificationCode: null,
    phoneVerificationExpiresAt: null,
    phoneTemp: null,
  });

  ctx?.success("Phone number verified successfully");
  return { message: "Phone number verified successfully." };
};
