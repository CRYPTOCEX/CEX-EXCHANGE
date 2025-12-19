import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

const APP_TWILIO_ACCOUNT_SID = process.env.APP_TWILIO_ACCOUNT_SID;
const APP_TWILIO_AUTH_TOKEN = process.env.APP_TWILIO_AUTH_TOKEN;
const APP_TWILIO_PHONE_NUMBER = process.env.APP_TWILIO_PHONE_NUMBER;
const NEXT_PUBLIC_SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME;

export const metadata: OperationObject = {
  summary:
    "Generates an OTP secret and sends OTP via SMS or generates a QR code for OTP APP",
  description:
    "Generates an OTP secret and sends OTP via SMS or generates a QR code for OTP APP",
  operationId: "generateOTPSecret",
  tags: ["Profile"],
  requiresAuth: true,
  logModule: "USER",
  logTitle: "Generate OTP secret",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              description: "Type of OTP to generate",
              enum: ["EMAIL", "SMS", "APP"],
            },
            phoneNumber: {
              type: "string",
              description: "Phone number to send the OTP to",
            },
            email: {
              type: "string",
              description: "Email to generate the QR code for OTP APP",
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
              status: {
                type: "boolean",
                description: "Indicates if the request was successful",
              },
              statusCode: {
                type: "number",
                description: "HTTP status code",
                example: 200,
              },
              data: {
                type: "object",
                properties: {
                  secret: {
                    type: "string",
                    description: "OTP secret",
                  },
                  qrCode: {
                    type: "string",
                    description: "QR code for OTP APP",
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("User"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  if (!user?.id) {
    ctx?.fail("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { type, phoneNumber, email } = body;
  ctx?.step("Generating OTP secret");
  const secret = authenticator.generateSecret();

  try {
    if (type === "SMS") {
      ctx?.step("Validating SMS 2FA configuration");
      // Check if SMS 2FA is enabled
      if (process.env.NEXT_PUBLIC_2FA_SMS_STATUS !== "true") {
        ctx?.fail("SMS 2FA not enabled");
        throw createError({
          statusCode: 400,
          message: "SMS 2FA is not enabled on this server",
        });
      }

      if (!APP_TWILIO_ACCOUNT_SID || !APP_TWILIO_AUTH_TOKEN || !APP_TWILIO_PHONE_NUMBER) {
        ctx?.fail("SMS service not configured");
        throw createError({
          statusCode: 500,
          message: "SMS service is not properly configured",
        });
      }

      if (!phoneNumber) {
        ctx?.fail("Phone number missing");
        throw createError({
          statusCode: 400,
          message: "Phone number is required for SMS type",
        });
      }
      ctx?.step("Saving phone number");
      await savePhoneQuery(user.id, phoneNumber);

      ctx?.step("Sending OTP via SMS");
      const otp = authenticator.generate(secret);
      const twilio = (await import("twilio")).default(
        APP_TWILIO_ACCOUNT_SID,
        APP_TWILIO_AUTH_TOKEN
      );
      await twilio.messages.create({
        body: `Your OTP is: ${otp}`,
        from: APP_TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      ctx?.success("OTP sent via SMS successfully");
      return { secret };
    } else if (type === "APP") {
      ctx?.step("Validating APP 2FA configuration");
      // Check if APP 2FA is enabled
      if (process.env.NEXT_PUBLIC_2FA_APP_STATUS !== "true") {
        ctx?.fail("APP 2FA not enabled");
        throw createError({
          statusCode: 400,
          message: "Authenticator app 2FA is not enabled on this server",
        });
      }

      ctx?.step("Generating QR code");
      const otpAuth = authenticator.keyuri(
        email || user.email || "",
        NEXT_PUBLIC_SITE_NAME || "",
        secret
      );
      const qrCode = await QRCode.toDataURL(otpAuth);

      ctx?.success("QR code generated successfully");
      return { secret, qrCode };
    } else if (type === "EMAIL") {
      ctx?.step("Validating EMAIL 2FA configuration");
      // Check if EMAIL 2FA is enabled
      if (process.env.NEXT_PUBLIC_2FA_EMAIL_STATUS !== "true") {
        ctx?.fail("EMAIL 2FA not enabled");
        throw createError({
          statusCode: 400,
          message: "Email 2FA is not enabled on this server",
        });
      }

      ctx?.step("Generating QR code");
      // For EMAIL type, generate QR code AND send OTP via email
      const otpAuth = authenticator.keyuri(
        email || user.email || "",
        NEXT_PUBLIC_SITE_NAME || "",
        secret
      );
      const qrCode = await QRCode.toDataURL(otpAuth);

      ctx?.step("Sending OTP via email");
      // Also send OTP via email
      const otp = authenticator.generate(secret);
      const { emailQueue } = await import("@b/utils/emails");

      await emailQueue.add({
        emailData: {
          TO: user.email,
          FIRSTNAME: user.firstName,
          TOKEN: otp,
        },
        emailType: "OTPTokenVerification",
      });

      ctx?.success("OTP sent via email successfully");
      return { secret, qrCode };
    } else {
      ctx?.fail("Invalid OTP type");
      throw createError({
        statusCode: 400,
        message: "Invalid type. Must be EMAIL, SMS, or APP",
      });
    }
  } catch (error) {
    if (error.statusCode) throw error;
    ctx?.fail(`Error generating OTP: ${error.message}`);
    throw createError({ statusCode: 500, message: error.message });
  }
};

export async function savePhoneQuery(
  userId: string,
  phone: string
): Promise<userAttributes> {
  await models.user.update(
    {
      phone: phone,
    },
    {
      where: { id: userId },
    }
  );

  const response = await models.user.findOne({
    where: { id: userId },
  });

  if (!response) {
    throw new Error("User not found");
  }

  return response.get({ plain: true }) as unknown as userAttributes;
}
