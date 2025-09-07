import { createError } from "@b/utils/error";
import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Fetch a specific active KYC level by ID",
  description:
    "Fetches an active KYC (Know Your Customer) level by its ID. This endpoint requires authentication.",
  operationId: "getKycLevelById",
  tags: ["KYC"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "The ID of the KYC level to retrieve",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "KYC level retrieved successfully",
      content: {
        "application/json": {
          schema: {
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
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("KYC Level"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: {
  user?: { id?: unknown };
  params: { id: string };
  body: unknown;
}) => {
  const { user, params } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  return getKycLevelById(id);
};

export async function getKycLevelById(id: string): Promise<kycLevelAttributes> {
  const level = await models.kycLevel.findOne({
    where: { id, status: "ACTIVE" },
  });

  if (!level) {
    throw createError({
      statusCode: 404,
      message: "No active KYC level found",
    });
  }

  return level.get({ plain: true }) as unknown as kycLevelAttributes;
}
