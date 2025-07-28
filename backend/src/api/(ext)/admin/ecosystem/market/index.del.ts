import { models } from "@b/db";
import { deleteAllMarketData } from "@b/api/(ext)/ecosystem/utils/scylla/queries";
import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Bulk deletes ecosystem markets by IDs",
  operationId: "bulkDeleteEcosystemMarkets",
  tags: ["Admin", "Ecosystem", "Market"],
  parameters: commonBulkDeleteParams("Ecosystem Markets"),
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
              description: "Array of ecosystem market IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Ecosystem Markets"),
  requiresAuth: true,
  permission: "delete.ecosystem.market",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;

  // Validate payload
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw createError(400, "No market IDs provided");
  }

  // Find all markets matching the provided IDs, retrieving their currency fields
  const markets = await models.ecosystemMarket.findAll({
    where: { id: ids },
    attributes: ["currency"],
    paranoid: false,
  });
  console.log("🚀 ~ markets:", markets);

  if (!markets.length) {
    throw createError(404, "No matching markets found for provided IDs");
  }

  // Define a post-delete action to remove all market data for each market using its currency.
  const postDelete = async () => {
    for (const market of markets) {
      await deleteAllMarketData(market.currency);
    }
  };

  return handleBulkDelete({
    model: "ecosystemMarket",
    ids: ids,
    query: { ...query, force: true as any },
    postDelete,
  });
};
