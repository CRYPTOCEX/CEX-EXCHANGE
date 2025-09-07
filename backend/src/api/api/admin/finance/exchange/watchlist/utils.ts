import { baseStringSchema } from "@b/utils/schema";

export const baseExchangeWatchlistSchema = {
  id: baseStringSchema("ID of the exchange watchlist entry"),
  userId: baseStringSchema("User ID associated with the watchlist"),
  symbol: baseStringSchema("Symbol of the watchlist item"),
};
