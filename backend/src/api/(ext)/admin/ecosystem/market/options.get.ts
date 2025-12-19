import {
  notFoundMetadataResponse,
} from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves ecosystem market options",
  description:
    "Fetches a list of active ecosystem markets formatted as options for UI selection components. Each option contains the market ID and a formatted name showing the trading pair (e.g., 'BTC / USDT').",
  operationId: "getEcosystemMarketOptions",
  tags: ["Admin", "Ecosystem", "Market"],
  requiresAuth: true,
  logModule: "ADMIN_ECO",
  logTitle: "Get market options",
  responses: {
    200: {
      description: "Ecosystem market options retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  description: "Market ID",
                },
                name: {
                  type: "string",
                  description: "Formatted market name (currency / pair)",
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecosystem Market"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, ctx } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    ctx?.step("Fetching active ecosystem markets");
    const ecosystemMarkets = await models.ecosystemMarket.findAll({
      where: { status: true },
    });

    ctx?.step("Formatting market options");
    const formatted = ecosystemMarkets.map((market) => ({
      id: market.id,
      name: `${market.currency} / ${market.pair}`,
    }));

    ctx?.success("Market options retrieved successfully");
    return formatted;
  } catch (error) {
    ctx?.fail(error.message);
    throw createError(500, "An error occurred while fetching ecosystem markets");
  }
};
