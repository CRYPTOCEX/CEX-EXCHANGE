import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { FuturesMarketUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific futures market",
  operationId: "updateFuturesMarket",
  tags: ["Admin", "Futures", "Markets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the futures market to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the futures market",
    content: {
      "application/json": {
        schema: FuturesMarketUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Futures Market"),
  requiresAuth: true,
  permission: "edit.futures.market",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { metadata } = body;

  return await updateRecord("futuresMarket", id, {
    metadata,
  });
};
