// /server/api/exchange/watchlist/store.post.ts

import { models } from "@b/db";
import { createError } from "@b/utils/error";

import { createRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Add Item to Watchlist",
  operationId: "addWatchlistItem",
  tags: ["Exchange", "Watchlist"],
  description: "Adds a new item to the watchlist for the authenticated user.",
  requestBody: {
    description: "Data for the watchlist item to add.",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Symbol of the watchlist item",
            },
          },
          required: ["symbol"],
        },
      },
    },
    required: true,
  },
  responses: createRecordResponses("Watchlist"),
  requiresAuth: true,
  logModule: "EXCHANGE",
  logTitle: "Toggle watchlist item",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { symbol } = body;

  ctx?.step("Validating watchlist parameters");
  if (!symbol) {
    throw new Error("Missing required parameters: symbol.");
  }

  ctx?.step(`Checking if ${symbol} is already in watchlist`);
  const existingWatchlist = await models.exchangeWatchlist.findOne({
    where: {
      userId: user.id,
      symbol,
    },
  });

  if (existingWatchlist) {
    // If a watchlist with the same userId, type, and symbol already exists, remove it
    ctx?.step(`Removing ${symbol} from watchlist`);
    await models.exchangeWatchlist.destroy({
      where: {
        id: existingWatchlist.id,
      },
    });
    ctx?.success(`Removed ${symbol} from watchlist`);
    return { message: "Item removed from watchlist successfully" };
  }

  ctx?.step(`Adding ${symbol} to watchlist`);
  await models.exchangeWatchlist.create({
    userId: user.id,
    symbol,
  });

  ctx?.success(`Added ${symbol} to watchlist`);
  return { message: "Item added to watchlist successfully" };
};
