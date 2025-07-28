import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves ecosystem token options",
  description:
    "This endpoint retrieves active ecosystem tokens and formats them as selectable options.",
  operationId: "getEcosystemTokenOptions",
  tags: ["Ecosystem", "Token"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Ecosystem tokens retrieved successfully",
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
    404: notFoundMetadataResponse("EcosystemToken"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    const tokens = await models.ecosystemToken.findAll({
      where: { status: true },
    });

    // Deduplicate by the 'currency' field
    const seenSymbols = new Set<string>();
    const deduplicated: { id: string; name: string }[] = [];

    for (const token of tokens) {
      // e.g. token.currency might be "MO" or "USDT"
      if (!seenSymbols.has(token.currency)) {
        seenSymbols.add(token.currency);
        deduplicated.push({
          id: token.id,
          name: `${token.currency} - ${token.name} (${token.chain})`,
        });
      }
    }

    return deduplicated;
  } catch (error) {
    throw createError(500, "An error occurred while fetching ecosystem tokens");
  }
};
