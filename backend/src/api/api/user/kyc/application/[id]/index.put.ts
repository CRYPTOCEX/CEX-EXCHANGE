import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { validateKycField } from "../utils";

export const metadata = {
  summary: "Update a KYC Application",
  description:
    "Updates an existing KYC application for the authenticated user. " +
    "Expects a JSON payload with a 'fields' object containing key/value pairs for each field " +
    "as defined in the KYC level configuration. The application to update is identified by the 'id' " +
    "parameter in the path. The level is derived from the existing application record.",
  operationId: "updateKycApplication",
  tags: ["KYC", "Application"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "The ID of the KYC application to update",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            fields: {
              type: "object",
              description:
                "An object where keys are field IDs and values are the submitted data",
            },
          },
          required: ["fields"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "KYC application updated successfully",
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
    404: notFoundMetadataResponse("KYC Application"),
    500: serverErrorResponse,
  },
};

export default async (data): Promise<any> => {
  const { user, body, params } = data;
  if (!user) {
    throw createError({ statusCode: 401, message: "Authentication required" });
  }

  const { id } = params; // Application ID to update
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Missing application id in path",
    });
  }

  const { fields } = body;
  if (!fields || typeof fields !== "object") {
    throw createError({
      statusCode: 400,
      message: "Missing or invalid required field: fields",
    });
  }

  // Retrieve the existing KYC application record for the authenticated user.
  const existingApplication = await models.kycApplication.findOne({
    where: {
      id,
      userId: user.id,
    },
  });
  if (!existingApplication) {
    throw createError({
      statusCode: 404,
      message: "KYC application not found",
    });
  }

  // Check if the application can be updated based on its current status
  const updatableStatuses = ["ADDITIONAL_INFO_REQUIRED", "REJECTED"];
  if (!updatableStatuses.includes(existingApplication.status)) {
    const statusMessages = {
      PENDING: "Your application is currently under review and cannot be modified.",
      APPROVED: "Your application has already been approved and cannot be modified.",
    };
    
    throw createError({
      statusCode: 400,
      message: statusMessages[existingApplication.status] || 
               `Applications with status "${existingApplication.status}" cannot be updated.`,
    });
  }

  // Get the associated levelId from the application record.
  const levelId = existingApplication.levelId;

  // Retrieve the KYC level configuration using the levelId.
  const levelRecord = await models.kycLevel.findByPk(levelId);
  if (!levelRecord) {
    throw createError({ statusCode: 404, message: "KYC level not found" });
  }

  // Parse the level configuration if it's stored as a string.
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

  // Validate each field from the level configuration against the submitted data.
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
    // Update the application record with the new fields.
    await existingApplication.update({
      data: fields,
      updatedAt: new Date(),
      status: "PENDING",
    });

    return {
      message: "KYC application updated successfully.",
      application: existingApplication,
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || "Internal Server Error.",
    });
  }
};
