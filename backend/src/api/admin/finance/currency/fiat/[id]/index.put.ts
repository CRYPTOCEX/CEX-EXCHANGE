// /server/api/admin/currencies/fiat/[id]/update.put.ts

import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { fiatCurrencyUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates a specific currency by symbol",
  operationId: "updateCurrencyBySymbol",
  tags: ["Admin", "Currencies"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the user to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: fiatCurrencyUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Fiat Currency"),
  requiresAuth: true,
  permission: "edit.fiat.currency",
};

export default async (data: Handler) => {
  const { params, body } = data;
  const { id } = params;
  const { price } = body;

  return await updateRecord("currency", id, { price });
};
