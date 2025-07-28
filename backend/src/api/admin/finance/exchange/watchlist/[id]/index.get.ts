import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseExchangeWatchlistSchema } from "../utils";

export const metadata = {
  summary:
    "Retrieves detailed information of a specific exchange watchlist entry by ID",
  operationId: "getExchangeWatchlistById",
  tags: ["Admin", "Exchange Watchlists"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the exchange watchlist entry to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Exchange watchlist entry details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseExchangeWatchlistSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Exchange Watchlist"),
    500: serverErrorResponse,
  },
  permission: "view.exchange.watchlist",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("exchangeWatchlist", params.id);
};
