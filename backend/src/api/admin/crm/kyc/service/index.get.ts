import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";

export const metadata = {
  summary: "Get All Verification Services",
  description:
    "Retrieves all available verification services for KYC processes.",
  operationId: "getVerificationServices",
  tags: ["KYC", "Verification Services"],
  logModule: "ADMIN_CRM",
  logTitle: "Get verification services",
  responses: {
    200: {
      description: "Verification services retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "Unique identifier for the service",
                },
                name: {
                  type: "string",
                  description: "Name of the verification service",
                },
                description: {
                  type: "string",
                  description: "Description of the service",
                },
                type: {
                  type: "string",
                  description: "Type of verification service",
                },
                status: {
                  type: "string",
                  description: "Current status of the service",
                },
                integrationDetails: {
                  type: "object",
                  description: "Integration details for the service",
                },
                createdAt: {
                  type: "string",
                  format: "date-time",
                  description: "When the service was created",
                },
                updatedAt: {
                  type: "string",
                  format: "date-time",
                  description: "When the service was last updated",
                },
              },
            },
          },
        },
      },
    },
    500: { description: "Internal Server Error." },
  },
  permission: "view.kyc.verification",
  requiresAuth: true,
};

export default async (data: Handler): Promise<any> => {
  const { ctx } = data;

  try {
    ctx?.step("Fetching verification services");
    // Real logic: fetch verification services from the database.
    const services = await models.kycVerificationService.findAll({
      order: [["createdAt", "ASC"]],
    });

    ctx?.success("Verification services retrieved successfully");
    return services;
  } catch (error) {
    logger.error("KYC", "Error in getVerificationServices", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch verification services",
    });
  }
};
