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
  const { id } = data.params;
  await models.supportTicket.update(
    {
      status: "CLOSED",
    },
    {
      where: { id },
    }
  );

  const ticket = await models.supportTicket.findOne({
    where: { id },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const payload = {
    id: ticket.id,
  };

  messageBroker.broadcastToSubscribedClients(`/api/user/support/ticket/${id}`, payload, {
    method: "update",
    data: {
      status: "CLOSED",
      updatedAt: new Date(),
    },
  });

  return {
    message: "Ticket closed successfully",
  };
};
