import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { MarketUpdateSchema } from "@b/api/admin/finance/exchange/market/utils";

export const metadata = {
  summary: "Updates a specific exchange market",
  operationId: "updateExchangeMarket",
  tags: ["Admin", "Exchange", "Markets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the market to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the market",
    content: {
      "application/json": {
        schema: MarketUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Market"),
  requiresAuth: true,
  permission: "edit.exchange.market",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { currency, pair, metadata, isTrending, isHot } = body;

  return await updateRecord("exchangeMarket", id, {
    currency,
    pair,
    metadata,
    isTrending,
    isHot,
  });
};
