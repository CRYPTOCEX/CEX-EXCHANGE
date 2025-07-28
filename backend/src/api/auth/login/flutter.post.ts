import {
  APP_TWILIO_ACCOUNT_SID,
  APP_TWILIO_AUTH_TOKEN,
} from "@b/utils/constants";
import { createError } from "@b/utils/error";
import { verifyPassword } from "@b/utils/passwords";
import { models } from "@b/db";
import { addMinutes } from "date-fns";
import { authenticator } from "otplib";
import { returnUserWithTokens, sendEmailVerificationToken } from "../utils";
import { emailQueue } from "@b/utils/emails";

export const metadata: OperationObject = {
  summary: "Logs in a user",
  description: "Logs in a user and returns a session token",
  operationId: "loginUser",
  tags: ["Auth"],
  requiresAuth: false,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Email of the user",
            },
            password: {
              type: "string",
              description: "Password of the user",
            },
          },
          required: ["email", "password"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "User logged in successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
              twoFactor: {
                type: "object",
                properties: {
                  enabled: {
                    type: "boolean",
                    description: "2FA enabled status",
                  },
                  type: {
                    type: "string",
                    description: "Type of 2FA",
                  },
                },
              },
              id: {
                type: "string",
                description: "User ID",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid request (e.g., invalid email or password)",
    },
    401: {
      description: "Unauthorized (e.g., incorrect email or password)",
    },
  },
};

export default async (data: Handler) => {
  const { email, password } = data.body;

  const user = await findUserByEmail(email);
  await handleEmailVerification(user);

  await validatePassword(user, password);
  await handleLoginAttempts(user);

  if (await isTwoFactorRequired(user)) {
    return await handleTwoFactorAuthentication(user);
  }

  return await returnUserWithTokens({
    user,
    message: "You have been logged in successfully",
  });
};

// Helper Functions

async function findUserByEmail(email: string) {
  const user = await models.user.findOne({
    where: { email },
    include: {
      model: models.twoFactor,
      as: "twoFactor",
    },
  });

  if (!user || !user.password) {
    throw createError({
      statusCode: 401,
      message: "Incorrect email or password",
    });
  }

  // Validate user status
  if (user.status === "BANNED") {
    throw createError({
      statusCode: 403,
      message: "Your account has been banned. Please contact support.",
    });
  }

  if (user.status === "SUSPENDED") {
    throw createError({
      statusCode: 403,
      message: "Your account is suspended. Please contact support.",
    });
  }

  if (user.status === "INACTIVE") {
    throw createError({
      statusCode: 403,
      message:
        "Your account is inactive. Please verify your email or contact support.",
    });
  }

  return user;
}

async function handleEmailVerification(user: any) {
  if (
    process.env.NEXT_PUBLIC_VERIFY_EMAIL_STATUS === "true" &&
    !user.emailVerified &&
    user.email
  ) {
    await sendEmailVerificationToken(user.id, user.email);
    throw createError({
      statusCode: 400,
      message: "User email not verified. Verification email sent.",
    });
  }
}

async function validatePassword(user: any, password: string) {
  const isPasswordValid = await verifyPassword(user.password, password);
  if (!isPasswordValid) {
    await incrementFailedLoginAttempts(user);
    throw createError({
      statusCode: 401,
      message: "Incorrect email or password",
    });
  }
}

async function incrementFailedLoginAttempts(user: any) {
  await models.user.update(
    {
      failedLoginAttempts: (user.failedLoginAttempts ?? 0) + 1,
      lastFailedLogin: new Date(),
    },
    { where: { email: user.email } }
  );
}

async function handleLoginAttempts(user: any) {
  const blockedUntil = addMinutes(user.lastFailedLogin ?? 0, 5);

  if ((user.failedLoginAttempts ?? 0) >= 5 && blockedUntil > new Date()) {
    throw createError({
      statusCode: 403,
      message: "Too many failed login attempts, account temporarily blocked",
    });
  }

  await resetFailedLoginAttempts(user);
}

async function resetFailedLoginAttempts(user: any) {
  await models.user.update(
    {
      failedLoginAttempts: 0,
      lastFailedLogin: null,
    },
    { where: { email: user.email } }
  );
}

async function isTwoFactorRequired(user: any) {
  return (
    user.twoFactor?.enabled && process.env.NEXT_PUBLIC_2FA_STATUS === "true"
  );
}

async function handleTwoFactorAuthentication(user: any) {
  const type = user.twoFactor?.type;
  authenticator.options = { window: 2 };
  const otp = authenticator.generate(user.twoFactor.secret);

  switch (type) {
    case "SMS":
      await sendSmsOtp(user.phone, otp);
      break;
    case "EMAIL":
      await sendEmailOtp(user.email, user.firstName, otp);
      break;
    case "APP":
      // Handle APP OTP logic if needed
      break;
    default:
      throw createError({
        statusCode: 400,
        message: "Invalid 2FA type",
      });
  }

  return {
    twoFactor: {
      enabled: true,
      type,
    },
    id: user.id,
    message: "2FA required",
  };
}

async function sendSmsOtp(phoneNumber: string, otp: string) {
  if (
    process.env.NEXT_PUBLIC_2FA_SMS_STATUS !== "true" ||
    !process.env.APP_TWILIO_VERIFY_SERVICE_SID
  ) {
    throw createError({ statusCode: 400, message: "SMS 2FA is not enabled" });
  }

  const twilio = (await import("twilio")).default;
  const twilioClient = twilio(APP_TWILIO_ACCOUNT_SID, APP_TWILIO_AUTH_TOKEN);
  await twilioClient.messages.create({
    body: `Your OTP code is: ${otp}`,
    from: process.env.APP_TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });
}

async function sendEmailOtp(email: string, firstName: string, otp: string) {
  if (process.env.NEXT_PUBLIC_2FA_EMAIL_STATUS !== "true") {
    throw createError({ statusCode: 400, message: "Email 2FA is not enabled" });
  }

  await emailQueue.add({
    emailData: {
      TO: email,
      FIRSTNAME: firstName,
      TOKEN: otp,
    },
    emailType: "OTPTokenVerification",
  });
}
