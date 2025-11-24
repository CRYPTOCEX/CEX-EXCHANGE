import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Retrieves a KYC application for the logged-in user",
  description:
    "Fetches a specific Know Your Customer (KYC) application, identified by ID, for the currently authenticated user. This endpoint requires user authentication and returns the KYC application details, including the verification status and other information.",
  operationId: "getUserKycApplication",
  tags: ["KYC"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "The ID of the KYC record to retrieve",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "KYC application retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "number", description: "KYC ID" },
              userId: {
                type: "number",
                description: "User ID associated with the KYC record",
              },
              templateId: {
                type: "number",
                description: "ID of the KYC template used",
              },
              data: {
                type: "object",
                description: "KYC data as a JSON object",
                nullable: true,
              },
              status: {
                type: "string",
                description: "Current status of the KYC verification",
                enum: ["PENDING", "APPROVED", "REJECTED"],
              },
              level: { type: "number", description: "Verification level" },
              notes: {
                type: "string",
                description: "Administrative notes, if any",
                nullable: true,
              },
              createdAt: {
                type: "string",
                format: "date-time",
                description: "Timestamp when the KYC record was created",
              },
              updatedAt: {
                type: "string",
                format: "date-time",
                description: "Timestamp when the KYC record was last updated",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Kyc"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, params, body } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  return getKyc(user.id, id);
};

export async function getKyc(
  userId: string,
  applicationId: string
): Promise<kycApplicationAttributes> {
  const response = await models.kycApplication.findOne({
    where: {
      userId,
      id: applicationId,
    },
    include: [
      {
        model: models.kycLevel,
        as: "level",
        paranoid: false, // kycLevel doesn't have soft deletes
      },
      {
        model: models.kycVerificationResult,
        as: "verificationResult",
      },
    ],
  });

  if (!response) {
    throw createError({ statusCode: 404, message: "KYC record not found" });
  }

  return response.get({ plain: true }) as unknown as kycApplicationAttributes;
}
