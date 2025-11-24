// /server/api/admin/exchange/orders/index.delete.ts

import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes an exchange order",
  operationId: "deleteExchangeOrder",
  tags: ["Admin", "Exchange Order"],
  parameters: deleteRecordParams("exchange order"),
  responses: deleteRecordResponses("Exchange Order"),
  requiresAuth: true,
  permission: "delete.exchange.order",
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "exchangeOrder",
    id: params.id,
    query,
  });
};
