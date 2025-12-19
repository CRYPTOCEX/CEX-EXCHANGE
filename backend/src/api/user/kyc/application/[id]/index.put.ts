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
  logModule: "KYC",
  logTitle: "Update KYC application",
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
  const { user, body, params, ctx } = data;
  if (!user) {
    throw createError({ statusCode: 401, message: "Authentication required" });
  }

  ctx?.step("Validating request parameters");
  const { id } = params; // Application ID to update
  if (!id) {
    ctx?.fail("Missing application ID in path");
    throw createError({
      statusCode: 400,
      message: "Missing application id in path",
    });
  }

  const { fields } = body;
  if (!fields || typeof fields !== "object") {
    ctx?.fail("Missing or invalid fields in request body");
    throw createError({
      statusCode: 400,
      message: "Missing or invalid required field: fields",
    });
  }

  ctx?.step("Retrieving existing KYC application");
  const existingApplication = await models.kycApplication.findOne({
    where: {
      id,
      userId: user.id,
    },
  });
  if (!existingApplication) {
    ctx?.fail("KYC application not found");
    throw createError({
      statusCode: 404,
      message: "KYC application not found",
    });
  }

  ctx?.step("Validating application update eligibility");
  const updatableStatuses = ["ADDITIONAL_INFO_REQUIRED", "REJECTED"];
  if (!updatableStatuses.includes(existingApplication.status)) {
    const statusMessages = {
      PENDING: "Your application is currently under review and cannot be modified.",
      APPROVED: "Your application has already been approved and cannot be modified.",
    };

    ctx?.fail(`Application status ${existingApplication.status} cannot be updated`);
    throw createError({
      statusCode: 400,
      message: statusMessages[existingApplication.status] ||
               `Applications with status "${existingApplication.status}" cannot be updated.`,
    });
  }

  ctx?.step("Retrieving KYC level configuration");
  const levelId = existingApplication.levelId;
  const levelRecord = await models.kycLevel.findByPk(levelId);
  if (!levelRecord) {
    ctx?.fail("KYC level not found");
    throw createError({ statusCode: 404, message: "KYC level not found" });
  }

  ctx?.step("Parsing KYC level field configuration");
  let levelFields = levelRecord.fields;
  if (typeof levelFields === "string") {
    try {
      levelFields = JSON.parse(levelFields);
    } catch (err) {
      ctx?.fail("Failed to parse KYC level configuration");
      throw createError({
        statusCode: 500,
        message: "Invalid KYC level configuration: unable to parse fields",
      });
    }
  }
  if (!Array.isArray(levelFields)) {
    ctx?.fail("Invalid KYC level configuration format");
    throw createError({
      statusCode: 500,
      message: "Invalid KYC level configuration",
    });
  }

  ctx?.step(`Validating ${levelFields.length} updated fields`);
  for (const fieldDef of levelFields) {
    const submittedValue = fields[fieldDef.id];
    const error = validateKycField(fieldDef, submittedValue);
    if (error) {
      ctx?.fail(`Field validation failed for: ${fieldDef.id}`);
      throw createError({
        statusCode: 400,
        message: `Validation error for field "${fieldDef.id}": ${error}`,
      });
    }
  }

  try {
    ctx?.step("Updating KYC application record");
    await existingApplication.update({
      data: fields,
      updatedAt: new Date(),
      status: "PENDING",
    });

    ctx?.success("KYC application updated and resubmitted for review");
    return {
      message: "KYC application updated successfully.",
      application: existingApplication,
    };
  } catch (error: any) {
    ctx?.fail(`Failed to update application: ${error.message}`);
    throw createError({
      statusCode: 500,
      message: error.message || "Internal Server Error.",
    });
  }
};
