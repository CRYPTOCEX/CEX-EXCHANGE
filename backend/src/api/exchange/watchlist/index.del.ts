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
  logModule: "EXCHANGE",
  logTitle: "Remove watchlist item",
};

export default async (data: Handler) => {
  const { ctx } = data;

  ctx?.step(`Fetching watchlist item details`);
  const item = await models.exchangeWatchlist.findByPk(Number(data.params.id));

  ctx?.step(`Removing watchlist item`);
  await deleteWatchlist(Number(data.params.id));

  ctx?.success(`Removed watchlist item${item ? `: ${item.symbol}` : ''}`);
};

export async function deleteWatchlist(id: number): Promise<void> {
  await models.exchangeWatchlist.destroy({
    where: {
      id,
    },
  });
}
