import { models } from "@b/db";
import { deleteAllMarketData } from "@b/api/(ext)/futures/utils/queries/order";
import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes futures markets by IDs",
  operationId: "bulkDeleteFuturesMarkets",
  tags: ["Admin", "Futures", "Market"],
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
  responses: commonBulkDeleteResponses("Futures Markets"),
  requiresAuth: true,
  permission: "delete.futures.market",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;

  const markets = await models.futuresMarket.findAll({
    where: { id: ids },
    attributes: ["currency"],
  });

  if (!markets.length) {
    throw new Error("Markets not found");
  }

  const postDelete = async () => {
    for (const market of markets) {
      await deleteAllMarketData(market.currency);
    }
  };

  return handleBulkDelete({
    model: "futuresMarket",
    ids: ids,
    query: { ...query, force: true as any },
    postDelete,
  });
};
