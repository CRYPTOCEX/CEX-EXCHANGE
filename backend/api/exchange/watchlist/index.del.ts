// /server/api/exchange/watchlist/delete.del.ts

import { models } from "@b/db";

import { deleteRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Remove Item from Watchlist",
  operationId: "removeWatchlistItem",
  tags: ["Exchange", "Watchlist"],
  description: "Removes an item from the watchlist for the authenticated user.",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "ID of the watchlist item to remove.",
      schema: { type: "number" },
    },
  ],

  responses: deleteRecordResponses("Watchlist"),
  requiresAuth: true,
};

export default async (data: Handler) => {
  return await deleteWatchlist(Number(data.params.id));
};

export async function deleteWatchlist(id: number): Promise<void> {
  await models.exchangeWatchlist.destroy({
    where: {
      id,
    },
  });
}
