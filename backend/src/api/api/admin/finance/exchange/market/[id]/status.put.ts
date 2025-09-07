import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata = {
  summary: "Updates the status of an Ecosystem Market",
  operationId: "updateEcosystemMarketStatus",
  tags: ["Admin", "Ecosystem Markets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the market to update",
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
                "New status to apply (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecosystem Market"),
  requiresAuth: true,
  permission: "edit.ecosystem.market",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  return updateStatus("exchangeMarket", id, status);
};
