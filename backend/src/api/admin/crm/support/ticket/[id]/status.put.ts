import { messageBroker } from "@b/handler/Websocket";
import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates the status of a support ticket",
  operationId: "updateSupportTicketStatus",
  tags: ["Admin", "CRM", "Support Ticket"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the support ticket to update",
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
              type: "string",
              description: "New status to apply",
              enum: ["PENDING", "OPEN", "REPLIED", "CLOSED"],
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Support Ticket"),
  requiresAuth: true,
  permission: "edit.support.ticket",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;

  messageBroker.broadcastToSubscribedClients(
    `/api/user/support/ticket/${id}`,
    { id },
    {
      method: "update",
      data: {
        status,
        updatedAt: new Date(),
      },
    }
  );
  return updateStatus("supportTicket", id, status);
};
