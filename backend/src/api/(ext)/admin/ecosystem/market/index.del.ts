import { models } from "@b/db";
import { deleteAllMarketData } from "@b/api/(ext)/ecosystem/utils/scylla/queries";
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
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Bulk deletes ecosystem markets",
  description:
    "Deletes multiple ecosystem markets by their IDs. This operation also removes all associated market data from the database for each market. The markets are permanently deleted (force delete).",
  operationId: "bulkDeleteEcosystemMarkets",
  tags: ["Admin", "Ecosystem", "Market"],
  parameters: commonBulkDeleteParams("Ecosystem Markets"),
  logModule: "ADMIN_ECO",
  logTitle: "Bulk delete markets",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description: "Array of ecosystem market IDs to delete (at least 1 required)",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Markets deleted successfully",
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
    404: notFoundResponse("Ecosystem Market"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "delete.ecosystem.market",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  // Validate payload
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw createError(400, "No market IDs provided");
  }

  ctx?.step(`Fetching ${ids.length} market(s) for deletion`);
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
    ctx?.step("Deleting market data for all markets");
    for (const market of markets) {
      await deleteAllMarketData(market.currency);
    }
  };

  ctx?.step("Deleting market records");
  const result = await handleBulkDelete({
    model: "ecosystemMarket",
    ids: ids,
    query: { ...query, force: true as any },
    postDelete,
  });

  ctx?.success(`${ids.length} market(s) deleted successfully`);
  return result;
};
