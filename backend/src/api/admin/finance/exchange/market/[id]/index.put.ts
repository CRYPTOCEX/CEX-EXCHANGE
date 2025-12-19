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
  logModule: "ADMIN_FIN",
  logTitle: "Update Exchange Market",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { currency, pair, metadata, isTrending, isHot } = body;

  ctx?.step("Updating exchange market");
  const result = await updateRecord("exchangeMarket", id, {
    currency,
    pair,
    metadata,
    isTrending,
    isHot,
  });

  ctx?.success();
  return result;
};
