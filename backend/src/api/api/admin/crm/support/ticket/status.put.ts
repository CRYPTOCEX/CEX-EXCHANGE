import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status and importance of support tickets",
  operationId: "bulkUpdateSupportTicketsStatusImportance",
  tags: ["Admin", "CRM", "Support Ticket"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of support ticket IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              description: "New status to apply to support tickets",
              enum: ["PENDING", "OPEN", "REPLIED", "CLOSED"],
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("SupportTicket"),
  requiresAuth: true,
  permission: "edit.support.ticket",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("supportTicket", ids, status);
};
