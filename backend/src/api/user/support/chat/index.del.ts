import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { handleBroadcastMessage } from "@b/handler/Websocket";
import { updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "End a live chat session",
  description: "Ends the live chat session and closes the ticket",
  operationId: "endLiveChat",
  tags: ["Support"],
  requiresAuth: true,
  requestBody: {
    description: "Session to end",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            sessionId: { type: "string" },
          },
          required: ["sessionId"],
        },
      },
    },
  },
  responses: updateRecordResponses("Live Chat Session"),
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { sessionId } = body;

  // Find the live chat session
  const ticket = await models.supportTicket.findOne({
    where: {
      id: sessionId,
      userId: user.id,
      type: "LIVE",
    },
  });

  if (!ticket) {
    throw createError({ statusCode: 404, message: "Live chat session not found" });
  }

  // Close the session
  ticket.status = "CLOSED";
  await ticket.save();

  // Broadcast the update via WebSocket
  try {
    await handleBroadcastMessage({
      type: "support-ticket",
      method: "update",
      id: sessionId,
      data: ticket.get({ plain: true }),
      route: "/api/user/support/ticket",
    });
  } catch (error) {
    console.error("Failed to broadcast session end:", error);
  }

  return { success: true, message: "Chat session ended successfully" };
}; 