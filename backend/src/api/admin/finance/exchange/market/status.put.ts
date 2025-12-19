import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of Ecosystem Markets",
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
              description: "Array of market IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the markets (true for active, false for inactive)",
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
  logModule: "ADMIN_FIN",
  logTitle: "Bulk Update Exchange Market Status",
};

export default async (data) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step("Updating market status");
  const result = await updateStatus("exchangeMarket", ids, status);

  ctx?.success();
  return result;
};
