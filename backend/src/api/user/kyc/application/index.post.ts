import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { validateKycField } from "./utils";
import { RedisSingleton } from "@b/utils/redis";
import { Op } from "sequelize";

// Endpoint metadata for documentation
export const metadata = {
  summary: "Submit a KYC Application",
  description:
    "Submits a new KYC application for the authenticated user. Expects a JSON payload " +
    "with a valid levelId and a 'fields' object containing key/value pairs for each field as defined " +
    "in the KYC level configuration.",
  operationId: "submitKycApplication",
  tags: ["KYC", "Application"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            levelId: {
              type: "string",
              description: "ID of the KYC level for this application",
            },
            fields: {
              type: "object",
              description:
                "An object where keys are field IDs and values are the submitted data",
            },
          },
          required: ["levelId", "fields"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "KYC application submitted successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              application: { type: "object" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("KYC Level"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler): Promise<any> => {
  const { user, body } = data;
  if (!user) {
    throw createError({ statusCode: 401, message: "Authentication required" });
  }

  // Rate limiting check
  await checkRateLimit(user.id);

  const { levelId, fields } = body;
  if (!levelId || !fields || typeof fields !== "object") {
    throw createError({
      statusCode: 400,
      message: "Missing or invalid required fields: levelId and fields",
    });
  }

  // Check for existing application for this level
  const existingApplication = await models.kycApplication.findOne({
    where: {
      userId: user.id,
      levelId,
      status: {
        [Op.in]: ["PENDING", "APPROVED", "ADDITIONAL_INFO_REQUIRED"],
      },
    },
  });

  if (existingApplication) {
    const statusMessages = {
      PENDING: "You already have a pending application for this KYC level. Please wait for review.",
      APPROVED: "You already have an approved application for this KYC level.",
      ADDITIONAL_INFO_REQUIRED: "You have an existing application requiring additional information. Please update it instead of creating a new one."
    };
    
    throw createError({
      statusCode: 409,
      message: statusMessages[existingApplication.status] || "You already have an application for this KYC level.",
    });
  }

  // Check cooldown period for rejected applications
  await checkRejectionCooldown(user.id, levelId);

  // Retrieve the KYC level configuration
  const levelRecord = await models.kycLevel.findByPk(levelId);
  if (!levelRecord) {
    throw createError({ statusCode: 404, message: "KYC level not found" });
  }

  // Check if level is active
  if (levelRecord.status !== "ACTIVE") {
    throw createError({
      statusCode: 400,
      message: "This KYC level is not currently available for applications",
    });
  }

  // Parse the level configuration if it's stored as a string
  let levelFields = levelRecord.fields;
  if (typeof levelFields === "string") {
    try {
      levelFields = JSON.parse(levelFields);
    } catch (err) {
      throw createError({
        statusCode: 500,
        message: "Invalid KYC level configuration: unable to parse fields",
      });
    }
  }

  if (!Array.isArray(levelFields)) {
    throw createError({
      statusCode: 500,
      message: "Invalid KYC level configuration",
    });
  }

  // Validate each field from the level configuration against submitted data.
  for (const fieldDef of levelFields) {
    const submittedValue = fields[fieldDef.id];
    const error = validateKycField(fieldDef, submittedValue);
    if (error) {
      throw createError({
        statusCode: 400,
        message: `Validation error for field "${fieldDef.id}": ${error}`,
      });
    }
  }

  try {
    // Create a new KYC application record with status "PENDING"
    const newApplication = await models.kycApplication.create({
      userId: user.id,
      levelId,
      data: fields,
      status: "PENDING",
    });

    // Update rate limiting counter
    await updateRateLimit(user.id);

    return {
      message: "KYC application submitted successfully.",
      application: newApplication,
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || "Internal Server Error.",
    });
  }
};

/**
 * Check rate limiting for KYC application submissions
 */
async function checkRateLimit(userId: string) {
  try {
    const redis = RedisSingleton.getInstance();
    const key = `kyc_rate_limit:${userId}`;
    const submissions = await redis.get(key);
    
    const maxSubmissions = 3; // Maximum 3 submissions per hour
    const windowMinutes = 60; // 1 hour window
    
    if (submissions && parseInt(submissions) >= maxSubmissions) {
      throw createError({
        statusCode: 429,
        message: `Too many KYC application attempts. Please wait ${windowMinutes} minutes before trying again.`,
      });
    }
  } catch (error) {
    if (error.statusCode === 429) {
      throw error;
    }
    // If Redis is down, log but don't block the request
    console.error("Rate limiting check failed:", error);
  }
}

/**
 * Update rate limiting counter
 */
async function updateRateLimit(userId: string) {
  try {
    const redis = RedisSingleton.getInstance();
    const key = `kyc_rate_limit:${userId}`;
    const windowMinutes = 60; // 1 hour window
    
    const current = await redis.get(key);
    if (current) {
      await redis.incr(key);
    } else {
      await redis.setex(key, windowMinutes * 60, 1);
    }
  } catch (error) {
    // If Redis is down, log but don't fail the request
    console.error("Rate limiting update failed:", error);
  }
}

/**
 * Check cooldown period for rejected applications
 */
async function checkRejectionCooldown(userId: string, levelId: string) {
  const cooldownHours = 24; // 24 hour cooldown after rejection
  const cutoffTime = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
  
  const recentRejection = await models.kycApplication.findOne({
    where: {
      userId,
      levelId,
      status: "REJECTED",
      updatedAt: {
        [Op.gte]: cutoffTime,
      },
    },
    order: [["updatedAt", "DESC"]],
  });
  
  if (recentRejection) {
    const hoursLeft = Math.ceil((recentRejection.updatedAt.getTime() + cooldownHours * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000));
    throw createError({
      statusCode: 429,
      message: `You must wait ${hoursLeft} more hours before resubmitting after a rejection.`,
    });
  }
}
