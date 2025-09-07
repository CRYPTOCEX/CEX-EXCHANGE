import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Update a KYC Level",
  description: "Updates an existing KYC level with the provided details.",
  operationId: "updateKycLevel",
  tags: ["KYC", "Levels"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "KYC level ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "KYC level update data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            level: { type: "number" },
            fields: { type: "array", items: { type: "object" } },
            features: { type: "array", items: { type: "string" } },
            serviceId: {
              type: "string",
              description: "Verification service ID",
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "DRAFT", "INACTIVE"],
              description: "Level status",
            },
          },
          required: ["name", "description", "level", "status"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "KYC level updated successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              level: { type: "object" },
            },
          },
        },
      },
    },
    400: { description: "Missing required fields." },
    404: { description: "KYC level not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "edit.kyc.level",
  requiresAuth: true,
};

export default async (data: Handler): Promise<any> => {
  const { params, body } = data;
  const { id } = params;
  if (!id) {
    throw createError({ statusCode: 400, message: "Missing level ID" });
  }
  const levelRecord = await models.kycLevel.findByPk(id);
  if (!levelRecord) {
    throw createError({ statusCode: 404, message: "KYC level not found" });
  }

  const { name, description, level, fields, features, serviceId, status } =
    body;

  // Validate serviceId if provided and not empty
  let validatedServiceId = null;
  if (serviceId && serviceId.trim() !== '') {
    const service = await models.kycVerificationService.findByPk(serviceId);
    if (!service) {
      throw createError({ 
        statusCode: 400, 
        message: `Invalid serviceId: ${serviceId}. Service does not exist.` 
      });
    }
    validatedServiceId = serviceId;
  }

  await levelRecord.update({
    name,
    description,
    level,
    fields,
    features,
    serviceId: validatedServiceId, // Use validated serviceId or null
    status,
    updatedAt: new Date(),
  });

  return { message: "KYC level updated successfully." };
};
