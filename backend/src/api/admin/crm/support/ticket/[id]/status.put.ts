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
  logModule: "ADMIN_SUP",
  logTitle: "Update ticket status",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Broadcasting status update to clients");
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

  ctx?.step("Updating ticket status");
  const result = await updateStatus("supportTicket", id, status);

  ctx?.success("Ticket status updated");
  return result;
};
