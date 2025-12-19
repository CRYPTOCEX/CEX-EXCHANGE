import { createError } from "@b/utils/error";
import { authenticator } from "otplib";
import { saveOrUpdateOTP } from "./save.post";

export const metadata: OperationObject = {
  summary: "Verifies the OTP",
  operationId: "verifyOTP",
  tags: ["Auth"],
  description: "Verifies the OTP and saves it",
  requiresAuth: true,
  logModule: "2FA",
  logTitle: "Verify 2FA setup",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            otp: {
              type: "string",
              description: "OTP to verify",
            },
            secret: {
              type: "string",
              description: "Generated OTP secret",
            },
            type: {
              type: "string",
              enum: ["EMAIL", "SMS", "APP"],
              description: "Type of 2FA",
            },
          },
          required: ["otp", "secret", "type"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "OTP verified and saved successfully",
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

    ctx?.step("Validating OTP input");
    if (!body.otp || !body.secret || !body.type) {
      ctx?.fail("Missing required fields");
      throw createError({
        statusCode: 400,
        message: "OTP, secret, and type are required",
      });
    }

    ctx?.step("Verifying OTP");
    const isValid = authenticator.verify({
      token: body.otp,
      secret: body.secret,
    });

    if (!isValid) {
      ctx?.fail("Invalid OTP");
      throw createError({
        statusCode: 401,
        message: "Invalid OTP",
      });
    }

    ctx?.step("Saving 2FA settings");
    const result = await saveOrUpdateOTP(user.id, body.secret, body.type);

    ctx?.success(`2FA setup completed for ${body.type}`);
    return result;
  } catch (error) {
    ctx?.fail(error.message || "OTP verification failed");
    throw error;
  }
};
