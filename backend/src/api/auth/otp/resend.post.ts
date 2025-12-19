import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { authenticator } from "otplib";
import { emailQueue } from "@b/utils/emails";
import {
  APP_TWILIO_ACCOUNT_SID,
  APP_TWILIO_AUTH_TOKEN,
} from "@b/utils/constants";
import { getUserWith2FA } from "./utils";

export const metadata: OperationObject = {
  summary: "Resends the OTP for 2FA",
  operationId: "resendOtp",
  tags: ["Auth"],
  description: "Resends the OTP for 2FA",
  requiresAuth: false,
  logModule: "2FA",
  logTitle: "Resend 2FA code",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "ID of the user",
            },
            type: {
              type: "string",
              enum: ["EMAIL", "SMS"],
              description: "Type of 2FA",
            },
          },
          required: ["id", "type"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "OTP resent successfully",
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
  const { body, ctx } = data;
  const { id, type } = body;

  try {
    ctx?.step("Validating resend request");
    if (!id || !type) {
      ctx?.fail("User ID and type are required");
      throw createError({
        statusCode: 400,
        message: "User ID and type are required",
      });
    }

    ctx?.step("Looking up user with 2FA");
    const user = await getUserWith2FA(id);

    ctx?.step("Generating new OTP");
    const otp = generateOtp(user.twoFactor.secret);

    ctx?.step(`Resending OTP via ${type}`);
    if (type === "SMS") {
      await handleSmsResend(user.phone, otp);
    } else if (type === "EMAIL") {
      await handleEmailResend(user.email, user.firstName, otp);
    } else {
      ctx?.fail("Invalid 2FA type");
      throw createError({
        statusCode: 400,
        message: "Invalid 2FA type or 2FA method not enabled",
      });
    }

    ctx?.success(`OTP resent successfully via ${type}`);
    return {
      message: "OTP resent successfully",
    };
  } catch (error) {
    ctx?.fail(error.message || "Failed to resend OTP");
    throw error;
  }
};

// Generate OTP
function generateOtp(secret: string) {
  authenticator.options = { window: 2 };
  return authenticator.generate(secret);
}

// Handle SMS OTP resend
async function handleSmsResend(phoneNumber: string, otp: string) {
  if (
    process.env.NEXT_PUBLIC_2FA_SMS_STATUS !== "true" ||
    !process.env.APP_TWILIO_VERIFY_SERVICE_SID
  ) {
    throw createError({
      statusCode: 400,
      message: "SMS 2FA is not enabled",
    });
  }

  const twilio = (await import("twilio")).default;

  try {
    const twilioClient = twilio(APP_TWILIO_ACCOUNT_SID, APP_TWILIO_AUTH_TOKEN);
    await twilioClient.messages.create({
      body: `Your OTP code is: ${otp}`,
      from: process.env.APP_TWILIO_PHONE_NUMBER, // Your Twilio phone number
      to: phoneNumber,
    });
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Error sending SMS: ${error.message}`,
    });
  }
}

// Handle email OTP resend
async function handleEmailResend(
  email: string,
  firstName: string,
  otp: string
) {
  if (process.env.NEXT_PUBLIC_2FA_EMAIL_STATUS !== "true") {
    throw createError({
      statusCode: 400,
      message: "Email 2FA is not enabled",
    });
  }

  try {
    await emailQueue.add({
      emailData: {
        TO: email,
        FIRSTNAME: firstName,
        TOKEN: otp,
      },
      emailType: "OTPTokenVerification",
    });
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Error sending email: ${error.message}`,
    });
  }
}
