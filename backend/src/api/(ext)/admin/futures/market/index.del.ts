import { models } from "@b/db";
import { deleteAllMarketData } from "@b/api/(ext)/futures/utils/queries/order";
import {
  commonBulkDeleteParams,
  handleBulkDelete,
} from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Bulk deletes futures markets by IDs",
  operationId: "bulkDeleteFuturesMarkets",
  tags: ["Admin", "Futures", "Market"],
  description:
    "Permanently deletes multiple futures markets and all associated data including orders and positions. This operation cannot be undone.",
  parameters: commonBulkDeleteParams("Futures Markets"),
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of futures market IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Futures markets deleted successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Futures Markets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "delete.futures.market",
  logModule: "ADMIN_FUTURES",
  logTitle: "Bulk delete futures markets",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Fetching markets to delete");
  const markets = await models.futuresMarket.findAll({
    where: { id: ids },
    attributes: ["currency"],
  });

  if (!markets.length) {
    ctx?.fail("Markets not found");
    throw new Error("Markets not found");
  }

  const postDelete = async () => {
    ctx?.step("Cleaning up market data");
    for (const market of markets) {
      await deleteAllMarketData(market.currency);
    }
  };

  try {
    ctx?.step("Performing bulk delete");
    const result = await handleBulkDelete({
      model: "futuresMarket",
      ids: ids,
      query: { ...query, force: true as any },
      postDelete,
    });
    ctx?.success(`Successfully deleted ${ids.length} futures markets`);
    return result;
  } catch (error: any) {
    ctx?.fail(`Failed to delete futures markets: ${error.message}`);
    throw error;
  }
};
