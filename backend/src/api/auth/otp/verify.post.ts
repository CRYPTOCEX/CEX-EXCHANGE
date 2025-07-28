import { createError } from "@b/utils/error";
import { authenticator } from "otplib";
import { saveOrUpdateOTP } from "./save.post";

export const metadata: OperationObject = {
  summary: "Verifies the OTP",
  operationId: "verifyOTP",
  tags: ["Auth"],
  description: "Verifies the OTP and saves it",
  requiresAuth: true,
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
  const { body, user } = data;
  if (!user) throw createError({ statusCode: 401, message: "unauthorized" });

  const isValid = authenticator.verify({
    token: body.otp,
    secret: body.secret,
  });

  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: "Invalid OTP",
    });
  }

  return await saveOrUpdateOTP(user.id, body.secret, body.type);
};
