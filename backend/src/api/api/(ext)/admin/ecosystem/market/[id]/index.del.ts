import { models } from "@b/db";
import { deleteAllMarketData } from "@b/api/(ext)/ecosystem/utils/scylla/queries";
import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific ecosystem market",
  operationId: "deleteEcosystemMarket",
  tags: ["Admin", "Ecosystem", "Market"],
  parameters: deleteRecordParams("Ecosystem Market"),
  responses: deleteRecordResponses("Ecosystem Market"),
  permission: "delete.ecosystem.market",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;

  // Fetch the market currency before deletion
  const market = await models.ecosystemMarket.findOne({
    where: { id: params.id },
    attributes: ["currency"],
    paranoid: false,
  });

  if (!market) {
    throw new Error("Market not found");
  }

  const currency = market.currency;

  const postDelete = async () => {
    await deleteAllMarketData(currency);
  };

  return handleSingleDelete({
    model: "ecosystemMarket",
    id: params.id,
    query: { ...query, force: true as any },
    postDelete,
  });
};
