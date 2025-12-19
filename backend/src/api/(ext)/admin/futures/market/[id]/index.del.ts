import { models } from "@b/db";
import { deleteAllMarketData } from "@b/api/(ext)/futures/utils/queries/order";
import { deleteRecordParams, handleSingleDelete } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Deletes a specific futures market",
  operationId: "deleteFuturesMarket",
  tags: ["Admin", "Futures", "Market"],
  description:
    "Permanently deletes a futures market and all associated data including orders and positions. This operation cannot be undone.",
  parameters: deleteRecordParams("Futures Market"),
  responses: {
    200: {
      description: "Futures market deleted successfully",
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
    401: unauthorizedResponse,
    404: notFoundResponse("Futures Market"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "delete.futures.market",
  logModule: "ADMIN_FUTURES",
  logTitle: "Delete futures market",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  // Fetch the market currency before deletion
  ctx?.step("Fetching market to delete");
  const market = await models.futuresMarket.findOne({
    where: { id: params.id },
    attributes: ["currency"],
  });

  if (!market) {
    ctx?.fail("Market not found");
    throw new Error("Market not found");
  }

  const currency = market.currency;

  const postDelete = async () => {
    ctx?.step("Cleaning up market data");
    await deleteAllMarketData(currency);
  };

  try {
    ctx?.step("Deleting futures market");
    const result = await handleSingleDelete({
      model: "futuresMarket",
      id: params.id,
      query: { ...query, force: true as any },
      postDelete,
    });
    ctx?.success("Futures market deleted successfully");
    return result;
  } catch (error: any) {
    ctx?.fail(`Failed to delete futures market: ${error.message}`);
    throw error;
  }
};
