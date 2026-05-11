// /server/api/exchange/watchlist/index.get.ts

import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseWatchlistItemSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "List Watchlist Items",
  operationId: "listWatchlistItems",
  tags: ["Exchange", "Watchlist"],
  description:
    "Retrieves a list of watchlist items for the authenticated user.",
  responses: {
    200: {
      description: "A list of watchlist items",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseWatchlistItemSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Watchlist"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  return (
    await models.exchangeWatchlist.findAll({
      where: {
        userId: user.id,
      },
    })
  ).map((watchlist) => watchlist.get({ plain: true }));
};
