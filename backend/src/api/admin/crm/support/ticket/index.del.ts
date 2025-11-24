// /server/api/admin/support-tickets/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes support tickets by IDs",
  operationId: "bulkDeleteSupportTickets",
  tags: ["Admin", "CRM", "Support Ticket"],
  parameters: commonBulkDeleteParams("Support Tickets"),
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of support ticket IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Support Tickets"),
  requiresAuth: true,
  permission: "delete.support.ticket",
};

export default async (data) => {
  const { body, query } = data;
  const { ids } = body.ids;

  await handleBulkDelete({
    model: "supportTicket",
    ids,
    query,
  });

  return {
    message: "Tickets deleted successfully",
  };
};
