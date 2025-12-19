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
  logModule: "ADMIN_FIN",
  logTitle: "Update fiat currency",
};

export default async (data: Handler) => {
  const { params, body, ctx } = data;
  const { id } = params;
  const { price } = body;

  ctx?.step("Fetching fiat currency record");
  ctx?.step("Updating fiat currency");
  const result = await updateRecord("currency", id, { price });

  ctx?.success("Fiat currency updated successfully");
  return result;
};
