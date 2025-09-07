import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Update Status for a Futures Market",
  operationId: "updateFuturesMarketStatus",
  tags: ["Admin", "Futures Markets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Futures Market to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description:
                "New status to apply to the Futures Market (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
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
  const { status } = body;
  return updateStatus("futuresMarket", id, status);
};
