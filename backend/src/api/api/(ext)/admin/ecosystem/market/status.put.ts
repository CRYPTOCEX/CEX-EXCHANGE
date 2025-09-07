import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of ecosystem markets",
  operationId: "bulkUpdateEcosystemMarketStatus",
  tags: ["Admin", "Ecosystem Markets"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of ecosystem market IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the ecosystem markets (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecosystem Market"),
  requiresAuth: true,
  permission: "edit.ecosystem.market",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("ecosystemMarket", ids, status);
};
