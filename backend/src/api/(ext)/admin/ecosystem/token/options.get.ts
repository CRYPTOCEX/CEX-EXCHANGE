import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { notFoundResponse } from "@b/utils/schema/errors";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves ecosystem token options",
  description:
    "Retrieves active ecosystem tokens formatted as selectable options for dropdowns and forms. Returns deduplicated tokens by currency symbol to prevent duplicate entries.",
  operationId: "getEcosystemTokenOptions",
  tags: ["Admin", "Ecosystem", "Token"],
  requiresAuth: true,
  logModule: "ADMIN_ECO",
  logTitle: "Get token options",
  responses: {
    200: {
      description: "Ecosystem token options retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "Token ID",
                },
                name: {
                  type: "string",
                  description: "Formatted token name (CURRENCY - Name (Chain))",
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Ecosystem Token"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, ctx } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    ctx?.step("Fetching active ecosystem tokens");
    const tokens = await models.ecosystemToken.findAll({
      where: { status: true },
    });

    ctx?.step("Deduplicating tokens by currency");
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

    ctx?.success("Token options retrieved successfully");
    return deduplicated;
  } catch (error) {
    ctx?.fail(error.message);
    throw createError(500, "An error occurred while fetching ecosystem tokens");
  }
};
