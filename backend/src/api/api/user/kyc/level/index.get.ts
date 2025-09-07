// /server/api/kyc-level/index.get.ts

import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Lists the active KYC levels",
  description:
    "Fetches all currently active KYC (Know Your Customer) levels that are used for KYC processes. This endpoint is accessible without authentication and returns an array of levels that are marked as active in the system.",
  operationId: "getActiveKycLevels",
  tags: ["KYC"],
  responses: {
    200: {
      description: "Active KYC levels retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "number", description: "Level ID" },
                title: { type: "string", description: "Level title" },
                options: {
                  type: "object",
                  description: "Level options as JSON object",
                  nullable: true,
                },
                status: {
                  type: "boolean",
                  description: "Active status of the level",
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Kyc Level"),
    500: serverErrorResponse,
  },
  requiresAuth: false,
};

export default async () => {
  return getActiveKycLevels();
};

export async function getActiveKycLevels(): Promise<kycLevelAttributes[]> {
  const response = await models.kycLevel.findAll({
    where: {
      status: "ACTIVE",
    },
  });

  if (!response || response.length === 0) {
    throw new Error("No active KYC levels found");
  }

  return response.map(
    (level) => level.get({ plain: true }) as unknown as kycLevelAttributes
  );
}
