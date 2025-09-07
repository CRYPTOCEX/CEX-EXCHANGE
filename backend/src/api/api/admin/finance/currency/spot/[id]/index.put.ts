// /api/admin/exchange/currencies/[id]/update.put.ts
import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { exchangeCurrencyUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates an existing exchange currency",
  operationId: "updateExchangeCurrency",
  tags: ["Admin", "Exchange", "Currencies"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "The ID of the currency to update.",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated data for the exchange currency",
    content: {
      "application/json": {
        schema: exchangeCurrencyUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Exchange Currency"),
  requiresAuth: true,
  permission: "edit.spot.currency",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { name, chains } = body;

  return await updateRecord("exchangeCurrency", id, { name, chains });
};
