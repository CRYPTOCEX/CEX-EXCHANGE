import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { encrypt } from "./utils";

export const metadata: OperationObject = {
  summary: "Saves the OTP",
  operationId: "saveOTP",
  tags: ["Auth"],
  description: "Saves the OTP secret and type for the user",
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
              description: "Generated OTP secret",
            },
            type: {
              type: "string",
              enum: ["EMAIL", "SMS", "APP"],
              description: "Type of 2FA",
            },
          },
          required: ["secret", "type"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "OTP saved successfully",
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
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  validateRequestBody(body);

  const otpDetails = await saveOrUpdateOTP(user.id, body.secret, body.type);

  return {
    message: "OTP saved successfully",
    otpDetails,
  };
};

// Validate the request body
function validateRequestBody(body: { secret: string; type: string }) {
  const { secret, type } = body;
  if (!secret || !type) {
    throw createError({
      statusCode: 400,
      message: "Missing required parameters: 'secret' and 'type'",
    });
  }

  const validTypes = ["EMAIL", "SMS", "APP"];
  if (!validTypes.includes(type)) {
    throw createError({
      statusCode: 400,
      message: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
    });
  }
}

// Save or update OTP in the database
export async function saveOrUpdateOTP(
  userId: string,
  secret: string,
  type: "EMAIL" | "SMS" | "APP"
) {
  const existingTwoFactor = await models.twoFactor.findOne({
    where: { userId },
  });

  const encryptedSecret = encrypt(secret);
  if (existingTwoFactor) {
    // Update existing record
    return await updateTwoFactor(existingTwoFactor.id, encryptedSecret, type);
  } else {
    // Create new record
    return await createTwoFactor(userId, encryptedSecret, type);
  }
}

// Update existing 2FA record
async function updateTwoFactor(
  recordId: string,
  secret: string,
  type: "EMAIL" | "SMS" | "APP"
) {
  try {
    const [_, [updatedRecord]] = await models.twoFactor.update(
      { secret, type, enabled: true },
      { where: { id: recordId }, returning: true }
    );
    return updatedRecord;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Error updating 2FA record: ${error.message}`,
    });
  }
}

// Create new 2FA record
async function createTwoFactor(
  userId: string,
  secret: string,
  type: "EMAIL" | "SMS" | "APP"
) {
  try {
    return await models.twoFactor.create({
      userId,
      secret,
      type,
      enabled: true,
    });
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Error creating 2FA record: ${error.message}`,
    });
  }
}
