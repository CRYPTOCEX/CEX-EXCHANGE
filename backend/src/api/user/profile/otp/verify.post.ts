// /server/api/profile/verifyOTP.post.ts

import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { authenticator } from "otplib";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { saveOTPQuery } from "./index.post";

export const metadata: OperationObject = {
  summary:
    "Verifies an OTP with the provided secret and type, and saves it if valid",
  operationId: "verifyOTP",
  description:
    "Verifies an OTP with the provided secret and type, and saves it if valid",
  tags: ["Profile"],
  requiresAuth: true,
  logModule: "USER",
  logTitle: "Verify OTP",
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
              description: "OTP secret",
            },
            type: {
              type: "string",
              description: "Type of OTP",
              enum: ["EMAIL", "SMS", "APP"],
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
                  message: {
                    type: "string",
                    description:
                      "Message indicating the status of the OTP verification",
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

  const { otp, secret, type } = body;

  ctx?.step("Verifying OTP");
  const isValid = authenticator.verify({ token: otp, secret });

  if (!isValid) {
    ctx?.fail("Invalid OTP provided");
    throw createError({ statusCode: 401, message: "Invalid OTP" });
  }

  ctx?.step("Saving OTP configuration");
  await saveOTPQuery(user.id, secret, type);

  ctx?.success("OTP verified and saved successfully");
  return { message: "OTP verified and saved successfully" };
};
