import {
  APP_TWILIO_ACCOUNT_SID,
  APP_TWILIO_AUTH_TOKEN,
  appName,
} from "@b/utils/constants";
import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { emailQueue } from "@b/utils/emails";
import { getUserById } from "./utils";

export const metadata: OperationObject = {
  summary: "Generates an OTP secret",
  operationId: "generateOTPSecret",
  tags: ["Auth"],
  description: "Generates an OTP secret for the user",
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["EMAIL", "SMS", "APP"],
              description: "Type of 2FA",
            },
            phoneNumber: {
              type: "string",
              description: "Phone number for SMS OTP",
            },
          },
          required: ["type"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "OTP secret generated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              secret: {
                type: "string",
                description: "Generated OTP secret",
              },
              qrCode: {
                type: "string",
                description: "QR code for APP OTP",
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

  const userRecord = await getUserById(user.id);
  const { type, phoneNumber } = body;

  authenticator.options = { window: 2 };
  const secret = authenticator.generateSecret();

  switch (type) {
    case "SMS":
      return await handleSms2FA(userRecord, secret, phoneNumber);
    case "APP":
      return await handleApp2FA(userRecord, secret);
    case "EMAIL":
      return await handleEmail2FA(userRecord, secret);
    default:
      throw createError({
        statusCode: 400,
        message: "Invalid type or 2FA method not enabled",
      });
  }
};

// Handle SMS 2FA
async function handleSms2FA(user: any, secret: string, phoneNumber?: string) {
  if (process.env.NEXT_PUBLIC_2FA_SMS_STATUS !== "true") {
    throw createError({
      statusCode: 400,
      message: "SMS 2FA is not enabled",
    });
  }

  if (!process.env.APP_TWILIO_VERIFY_SERVICE_SID) {
    throw createError({
      statusCode: 500,
      message: "Service SID is not set",
    });
  }

  if (!phoneNumber) {
    throw createError({
      statusCode: 400,
      message: "Phone number is required for SMS",
    });
  }

  try {
    await savePhoneQuery(user.id, phoneNumber);
  } catch (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  const otp = authenticator.generate(secret);

  try {
    const twilio = (await import("twilio")).default;
    const twilioClient = twilio(APP_TWILIO_ACCOUNT_SID, APP_TWILIO_AUTH_TOKEN);
    await twilioClient.messages.create({
      body: `Your OTP code is: ${otp}`,
      from: process.env.APP_TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
  } catch (error) {
    console.error("Error sending SMS OTP", error);
    throw createError({ statusCode: 500, message: error.message });
  }

  return { secret };
}

// Handle APP 2FA
async function handleApp2FA(user: any, secret: string) {
  if (process.env.NEXT_PUBLIC_2FA_APP_STATUS !== "true") {
    throw createError({
      statusCode: 400,
      message: "App 2FA is not enabled",
    });
  }

  if (!user.email) {
    throw createError({
      statusCode: 400,
      message: "Email is required for APP OTP",
    });
  }

  const otpAuth = authenticator.keyuri(user.email, appName, secret);
  const qrCode = await QRCode.toDataURL(otpAuth);

  return { secret, qrCode };
}

// Handle Email 2FA
async function handleEmail2FA(user: any, secret: string) {
  if (process.env.NEXT_PUBLIC_2FA_EMAIL_STATUS !== "true") {
    throw createError({
      statusCode: 400,
      message: "Email 2FA is not enabled",
    });
  }

  const email = user.email;
  const otp = authenticator.generate(secret);

  try {
    await emailQueue.add({
      emailData: {
        TO: email,
        FIRSTNAME: user.firstName,
        TOKEN: otp,
      },
      emailType: "OTPTokenVerification",
    });
  } catch (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return { secret };
}

// Save phone number to database
async function savePhoneQuery(userId: string, phone: string) {
  return await models.user.update({ phone }, { where: { id: userId } });
}
