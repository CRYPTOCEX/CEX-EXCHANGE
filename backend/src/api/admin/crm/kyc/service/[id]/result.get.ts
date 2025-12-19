import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Verification Results",
  description:
    "Retrieves all verification results for a specific KYC application.",
  operationId: "getVerificationResults",
  tags: ["KYC", "Verification Services", "Applications"],
  logModule: "ADMIN_CRM",
  logTitle: "Get verification results",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "KYC application ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Verification results retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "Verification result ID",
                },
                applicationId: {
                  type: "string",
                  description: "KYC application ID",
                },
                serviceId: {
                  type: "string",
                  description: "Verification service ID",
                },
                status: {
                  type: "string",
                  description:
                    "Verification status (PENDING, APPROVED, REJECTED)",
                },
                result: {
                  type: "object",
                  description: "Detailed verification result",
                },
                createdAt: {
                  type: "string",
                  format: "date-time",
                  description: "When the verification was initiated",
                },
                updatedAt: {
                  type: "string",
                  format: "date-time",
                  description: "When the verification was last updated",
                },
              },
            },
          },
        },
      },
    },
    404: { description: "No verification results found for this application." },
    500: { description: "Internal Server Error." },
  },
  permission: "view.kyc.verification",
  requiresAuth: true,
};

export default async (data: Handler): Promise<any> => {
  const { params, ctx } = data;
  const { id } = params;

  ctx?.step(`Fetching verification results for application ${id}`);
  // Fetch all verification results for the given KYC application ID.
  const results = await models.kycVerificationResult.findAll({
    where: { applicationId: id },
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: models.kycVerificationService,
        as: "service",
        attributes: ["id", "name", "type"],
      },
    ],
  });

  if (!results || results.length === 0) {
    throw createError({
      statusCode: 404,
      message: "No verification results found for this application",
    });
  }

  const parsedResults = results.map((result: any) => {
    const obj = result.toJSON ? result.toJSON() : result;
    return {
      ...obj,
      checks: obj.checks ? JSON.parse(obj.checks) : obj.checks,
      documentVerifications: obj.documentVerifications
        ? JSON.parse(obj.documentVerifications)
        : obj.documentVerifications,
    };
  });

  ctx?.success("Verification results retrieved successfully");
  return parsedResults;
};
