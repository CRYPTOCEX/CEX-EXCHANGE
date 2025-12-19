// /server/api/support/tickets/close.put.ts

import { models } from "@b/db";
import { messageBroker } from "@b/handler/Websocket";

import { updateRecordResponses } from "@b/utils/query";
export const metadata: OperationObject = {
  summary: "Closes a support ticket",
  description: "Closes a support ticket identified by its UUID.",
  operationId: "closeTicket",
  tags: ["Support"],
  requiresAuth: true,
  logModule: "USER",
  logTitle: "Close support ticket",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "The UUID of the ticket to close",
      schema: { type: "string" },
    },
  ],
  responses: updateRecordResponses("Support Ticket"),
};

export default async (data: Handler) => {
  const { params, ctx } = data;
  const { id } = params;

  ctx?.step("Closing support ticket");
  await models.supportTicket.update(
    {
      status: "CLOSED",
    },
    {
      where: { id },
    }
  );

  ctx?.step("Retrieving updated ticket");
  const ticket = await models.supportTicket.findOne({
    where: { id },
  });

  if (!ticket) {
    ctx?.fail("Ticket not found");
    throw new Error("Ticket not found");
  }

  const payload = {
    id: ticket.id,
  };

  ctx?.step("Broadcasting ticket closure via WebSocket");
  messageBroker.broadcastToSubscribedClients(`/api/user/support/ticket/${id}`, payload, {
    method: "update",
    data: {
      status: "CLOSED",
      updatedAt: new Date(),
    },
  });

  ctx?.success("Ticket closed successfully");
  return {
    message: "Ticket closed successfully",
  };
};
