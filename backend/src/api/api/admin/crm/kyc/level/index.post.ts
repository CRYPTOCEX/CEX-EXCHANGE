import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Create a New KYC Level",
  description: "Creates a new KYC level with the provided details.",
  operationId: "createKycLevel",
  tags: ["KYC", "Levels"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the level" },
            description: { type: "string", description: "Level description" },
            level: { type: "number", description: "Numeric level order" },
            fields: {
              type: "array",
              description: "Array of fields",
              items: { type: "object" },
            },
            features: {
              type: "array",
              description: "Array of features",
              items: { type: "string" },
            },
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
      description: "KYC level created successfully.",
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
    500: { description: "Internal Server Error." },
  },
  permission: "create.kyc.level",
  requiresAuth: true,
};

export default async (data: Handler): Promise<any> => {
  const { body } = data;
  const { name, description, level, fields, features, serviceId, status } =
    body;
  if (!name || level === undefined || !status) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }

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

  const newLevel = await models.kycLevel.create({
    name,
    description,
    level,
    fields: fields || [],
    features: features || [],
    serviceId: validatedServiceId, // Use validated serviceId or null
    status,
  });
  return { message: "KYC level created successfully.", item: newLevel };
};
