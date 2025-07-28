import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves a list of KYC levels",
  description: "This endpoint retrieves all available KYC levels.",
  operationId: "getKycLevels",
  tags: ["KYC Level"],
  requiresAuth: true,
  responses: {
    200: {
      description: "KYC levels retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
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

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    const kycLevels = await models.kycLevel.findAll();
    const formatted = kycLevels.map((kycLevel) => ({
      id: kycLevel.id,
      name: kycLevel.name,
    }));
    return formatted;
  } catch (error) {
    throw createError(500, "An error occurred while fetching KYC levels");
  }
};
