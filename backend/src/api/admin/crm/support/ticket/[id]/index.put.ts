// /api/admin/support-tickets/[id]/update.put.ts
import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { supportTicketUpdateSchema } from "../utils";
import { messageBroker } from "@b/handler/Websocket";

export const metadata: OperationObject = {
  summary: "Updates an existing support ticket",
  operationId: "updateSupportTicket",
  tags: ["Admin", "CRM", "Support Ticket"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the support ticket to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated data for the support ticket",
    content: {
      "application/json": {
        schema: supportTicketUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Support Ticket"),
  requiresAuth: true,
  permission: "edit.support.ticket",
  logModule: "ADMIN_SUP",
  logTitle: "Update ticket",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { subject, importance, status, type } = body;

  ctx?.step("Broadcasting update to clients");
  const payload = {
    id,
  };
  messageBroker.broadcastToSubscribedClients(
    `/api/user/support/ticket/${id}`,
    payload,
    {
      method: "update",
      data: {
        status,
        updatedAt: new Date(),
      },
    }
  );

  ctx?.step("Updating ticket");
  const result = await updateRecord("supportTicket", id, {
    subject,
    importance,
    status,
    type,
  });

  ctx?.success("Ticket updated successfully");
  return result;
};
