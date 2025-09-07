// /api/admin/exchange/orders/[id]/update.put.ts
import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { exchangeOrderUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates an existing exchange order",
  operationId: "updateExchangeOrder",
  tags: ["Admin", "Exchange Orders"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "The ID of the exchange order to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated data for the exchange order",
    content: {
      "application/json": {
        schema: exchangeOrderUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Exchange Order"),
  requiresAuth: true,
  permission: "edit.exchange.order",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { referenceId, status, side, price, amount, fee, feeCurrency } = body;

  return await updateRecord("exchangeOrder", id, {
    referenceId,
    status,
    side,
    price,
    amount,
    fee,
    feeCurrency,
  });
};
