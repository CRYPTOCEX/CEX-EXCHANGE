// /server/api/exchange/markets/delete/[id].del.ts

import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes an exchange market",
  operationId: "deleteExchangeMarket",
  tags: ["Admin", "Exchange", "Markets"],
  parameters: deleteRecordParams("exchange market"),
  responses: deleteRecordResponses("Exchange market"),
  requiresAuth: true,
  permission: "delete.exchange.market",
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "exchangeMarket",
    id: params.id,
    query,
  });
};
