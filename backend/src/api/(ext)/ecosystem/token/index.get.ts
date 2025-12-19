import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseTokenSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Retrieves all ecosystem tokens",
  description:
    "Fetches a list of all active tokens available in the ecosystem.",
  operationId: "listEcosystemTokens",
  tags: ["Ecosystem", "Tokens"],
  logModule: "ECOSYSTEM",
  logTitle: "List ecosystem tokens",
  responses: {
    200: {
      description: "Tokens retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseTokenSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Token"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { ctx } = data;

  try {
    ctx?.step("Fetching active ecosystem tokens");
    const tokens = await models.ecosystemToken.findAll({
      where: { status: true },
      attributes: [
        "name",
        "currency",
        "chain",
        "type",
        "status",
        "precision",
        "limits",
        "decimals",
        "icon",
        "contractType",
        "network",
        "fee",
      ],
    });

    ctx?.success(`Retrieved ${tokens?.length || 0} active tokens`);
    return tokens;
  } catch (error) {
    ctx?.fail(`Failed to fetch tokens: ${error.message}`);
    throw createError({
      statusCode: 500,
      message: `Failed to fetch tokens: ${error.message}`,
    });
  }
};
