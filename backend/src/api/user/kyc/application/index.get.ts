import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Retrieves all KYC applications for the logged-in user",
  description:
    "Fetches all Know Your Customer (KYC) applications for the currently authenticated user. This endpoint requires user authentication and returns an array with the user's KYC application information, including the verification status and other details.",
  operationId: "getUserKycApplications",
  tags: ["KYC"],
  logModule: "USER",
  logTitle: "List KYC applications",
  responses: {
    200: {
      description: "KYC applications retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
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
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Kyc"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, ctx } = data;
  if (!user?.id) {
    ctx?.fail("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  ctx?.step("Retrieving KYC applications");
  const result = await getKyc(user.id);
  ctx?.success(`Retrieved ${result.length} KYC applications`);
  return result;
};

export async function getKyc(
  userId: string
): Promise<kycApplicationAttributes[]> {
  const responses = await models.kycApplication.findAll({
    where: {
      userId,
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

  if (responses.length === 0) {
    throw new Error("KYC records not found");
  }

  return responses.map(
    (response) =>
      response.get({ plain: true }) as unknown as kycApplicationAttributes
  );
}
