// /server/api/profile/toggleOtp.post.ts

import { createError } from "@b/utils/error";
import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Toggles the OTP feature for the user account",
  operationId: "toggleOTP",
  description: "Toggles the OTP feature for the user account",
  tags: ["Profile"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description: "Status of the OTP feature",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "OTP feature toggled successfully",
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
                      "Message indicating the status of the OTP feature",
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

  const { status } = data.body;

  await toggleOTPQuery(data.user.id, status);

  return { message: `OTP feature has been ${status ? "enabled" : "disabled"}` };
};

export async function toggleOTPQuery(
  userId: string,
  status: boolean
): Promise<twoFactorAttributes> {
  await models.twoFactor.update(
    {
      enabled: status,
    },
    {
      where: { userId: userId },
    }
  );

  const twoFactor = await models.twoFactor.findOne({
    where: { userId: userId },
  });

  if (!twoFactor) {
    throw new Error("TwoFactor record not found");
  }

  return twoFactor.get({ plain: true }) as unknown as twoFactorAttributes;
}
