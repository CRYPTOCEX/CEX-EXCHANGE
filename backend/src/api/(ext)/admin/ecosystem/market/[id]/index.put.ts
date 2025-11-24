import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { MarketUpdateSchema } from "@b/api/admin/finance/exchange/market/utils";

export const metadata: OperationObject = {
  summary: "Updates a specific market",
  operationId: "updateEcosystemMarket",
  tags: ["Admin", "Ecosystem", "Markets"],
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
  permission: "edit.ecosystem.market",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { metadata } = body;

  return await updateRecord("ecosystemMarket", id, {
    metadata,
  });
};
