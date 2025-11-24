import { models } from "@b/db";
import { deleteAllMarketData } from "@b/api/(ext)/futures/utils/queries/order";
import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific futures market",
  operationId: "deleteFuturesMarket",
  tags: ["Admin", "Futures", "Market"],
  parameters: deleteRecordParams("Futures Market"),
  responses: deleteRecordResponses("Futures Market"),
  permission: "delete.futures.market",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;

  // Fetch the market currency before deletion
  const market = await models.futuresMarket.findOne({
    where: { id: params.id },
    attributes: ["currency"],
  });

  if (!market) {
    throw new Error("Market not found");
  }

  const currency = market.currency;

  const postDelete = async () => {
    await deleteAllMarketData(currency);
  };

  return handleSingleDelete({
    model: "futuresMarket",
    id: params.id,
    query: { ...query, force: true as any },
    postDelete,
  });
};
