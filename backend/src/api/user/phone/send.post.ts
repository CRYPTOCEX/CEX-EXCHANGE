import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { authenticator } from "otplib";

import {
  APP_TWILIO_ACCOUNT_SID,
  APP_TWILIO_AUTH_TOKEN,
} from "@b/utils/constants";

export const metadata: OperationObject = {
  summary: "Send phone verification code",
  operationId: "sendPhoneVerificationCode",
  tags: ["User", "Phone"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            phoneNumber: {
              type: "string",
              description: "Phone number to verify",
            },
          },
          required: ["phoneNumber"],
        },
      },
    },
  },
  responses: {
    200: { description: "Code sent" },
    400: { description: "Bad request" },
    401: { description: "Unauthorized" },
  },
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  const { phoneNumber } = body;
  if (!phoneNumber)
    throw createError({ statusCode: 400, message: "Phone required" });

  // Generate code (6 digits)
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Send SMS via Twilio
  try {
    const twilio = (await import("twilio")).default;
    const twilioClient = twilio(APP_TWILIO_ACCOUNT_SID, APP_TWILIO_AUTH_TOKEN);
    await twilioClient.messages.create({
      body: `Your verification code is: ${code}`,
      from: process.env.APP_TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
  } catch (err) {
    throw createError({ statusCode: 500, message: "Error sending SMS" });
  }

  // Store code in DB (expires in 10 min)
  await models.user.update(
    {
      phoneVerificationCode: code,
      phoneVerificationExpiresAt: new Date(Date.now() + 10 * 60000),
      phoneTemp: phoneNumber, // so user can't verify a random phone
    },
    { where: { id: user.id } }
  );

  return { message: "Verification code sent to phone." };
};
