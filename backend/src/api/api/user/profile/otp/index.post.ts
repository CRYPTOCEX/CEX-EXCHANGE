import { createError } from "@b/utils/error";
import { models } from "@b/db";
import crypto from "crypto";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary:
    "Saves the OTP configuration for the user and generates recovery codes",
  operationId: "saveOTP",
  description:
    "Saves the OTP configuration for the user and generates 12 recovery codes for recovery",
  tags: ["Profile"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
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
          required: ["secret", "type"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "OTP configuration and recovery codes saved successfully",
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
                  message: { type: "string", description: "Success message" },
                  recoveryCodes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of generated recovery codes",
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
  if (!data.user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { secret, type } = data.body;
  const result = await saveOTPQuery(data.user.id, secret, type);
  return {
    message: "OTP configuration saved successfully",
    recoveryCodes: result.recoveryCodes,
  };
};

export async function saveOTPQuery(
  userId: string,
  secret: string,
  type: twoFactorAttributes["type"]
): Promise<twoFactorAttributes> {
  if (!secret || !type)
    throw createError({
      statusCode: 400,
      message: "Missing required parameters",
    });

  // Generate exactly 12 unique recovery codes in the format XXXX-XXXX-XXXX.
  const generateRecoveryCodes = (): string[] => {
    const codes = new Set<string>();
    while (codes.size < 12) {
      const raw = crypto.randomBytes(6).toString("hex").toUpperCase();
      const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
      codes.add(formatted);
    }
    return Array.from(codes);
  };

  const recoveryCodes = generateRecoveryCodes();
  let otpDetails: twoFactorAttributes;

  try {
    const existingTwoFactor = await models.twoFactor.findOne({
      where: { userId },
    });

    if (existingTwoFactor) {
      // Update existing record with new secret, type, enabled flag, and recovery codes.
      const [_, [updatedRecord]] = await models.twoFactor.update(
        {
          secret,
          type,
          enabled: true,
          recoveryCodes: JSON.stringify(recoveryCodes),
        },
        { where: { id: existingTwoFactor.id }, returning: true }
      );
      otpDetails = updatedRecord.get({ plain: true }) as twoFactorAttributes;
    } else {
      // Create a new twoFactor record along with recovery codes.
      const createdRecord = await models.twoFactor.create({
        userId,
        secret,
        type,
        enabled: true,
        recoveryCodes: JSON.stringify(recoveryCodes),
      });
      otpDetails = createdRecord.get({ plain: true }) as twoFactorAttributes;
    }
  } catch (e: any) {
    console.error(e);
    throw createError({
      statusCode: 500,
      message: "Server error",
    });
  }

  // Return the OTP details along with recovery codes as an array.
  return { ...otpDetails, recoveryCodes: recoveryCodes as any };
}
