import {
  APP_TWILIO_ACCOUNT_SID,
  APP_TWILIO_AUTH_TOKEN,
  appName,
} from "@b/utils/constants";
import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { logger } from "@b/utils/console";
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
  logModule: "2FA",
  logTitle: "Generate 2FA secret",
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
  const { body, user, ctx } = data;

  try {
    ctx?.step("Validating user authentication");
    if (!user) {
      ctx?.fail("User not authenticated");
      throw createError({ statusCode: 401, message: "unauthorized" });
    }

    ctx?.step("Looking up user record");
    const userRecord = await getUserById(user.id);
    const { type, phoneNumber } = body;

    ctx?.step("Validating 2FA type");
    if (!type) {
      ctx?.fail("2FA type is required");
      throw createError({
        statusCode: 400,
        message: "2FA type is required",
      });
    }

    ctx?.step("Generating OTP secret");
    authenticator.options = { window: 2 };
    const secret = authenticator.generateSecret();

    ctx?.step(`Setting up ${type} 2FA`);
    let result;
    switch (type) {
      case "SMS":
        result = await handleSms2FA(userRecord, secret, phoneNumber, ctx);
        break;
      case "APP":
        result = await handleApp2FA(userRecord, secret, ctx);
        break;
      case "EMAIL":
        result = await handleEmail2FA(userRecord, secret, ctx);
        break;
      default:
        ctx?.fail("Invalid 2FA type");
        throw createError({
          statusCode: 400,
          message: "Invalid type or 2FA method not enabled",
        });
    }

    ctx?.success(`${type} 2FA generated successfully`);
    return result;
  } catch (error) {
    ctx?.fail(error.message || "Failed to generate OTP");
    throw error;
  }
};

// Handle SMS 2FA
async function handleSms2FA(user: any, secret: string, phoneNumber?: string, ctx?: any) {
  ctx?.step("Checking SMS 2FA availability");
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

  ctx?.step(`Saving phone number: ${phoneNumber}`);
  try {
    await savePhoneQuery(user.id, phoneNumber);
  } catch (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  ctx?.step("Generating and sending SMS OTP");
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
    logger.error("AUTH", "Error sending SMS OTP", error);
    throw createError({ statusCode: 500, message: error.message });
  }

  return { secret };
}

// Handle APP 2FA
async function handleApp2FA(user: any, secret: string, ctx?: any) {
  ctx?.step("Checking APP 2FA availability");
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

  ctx?.step("Generating QR code for authenticator app");
  const otpAuth = authenticator.keyuri(user.email, appName, secret);
  const qrCode = await QRCode.toDataURL(otpAuth);

  return { secret, qrCode };
}

// Handle Email 2FA
async function handleEmail2FA(user: any, secret: string, ctx?: any) {
  ctx?.step("Checking email 2FA availability");
  if (process.env.NEXT_PUBLIC_2FA_EMAIL_STATUS !== "true") {
    throw createError({
      statusCode: 400,
      message: "Email 2FA is not enabled",
    });
  }

  const email = user.email;
  const otp = authenticator.generate(secret);

  ctx?.step(`Sending OTP to email: ${email}`);
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
