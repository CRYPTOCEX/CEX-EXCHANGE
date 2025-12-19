import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { handleBroadcastMessage } from "@b/handler/Websocket";
import { updateRecordResponses } from "@b/utils/query";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "End a live chat session",
  description: "Ends the live chat session and closes the ticket",
  operationId: "endLiveChat",
  tags: ["Support"],
  requiresAuth: true,
  logModule: "USER",
  logTitle: "End live chat",
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
  const { user, body, ctx } = data;
  if (!user?.id) {
    ctx?.fail("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { sessionId } = body;

  ctx?.step("Finding live chat session");
  // Find the live chat session
  const ticket = await models.supportTicket.findOne({
    where: {
      id: sessionId,
      userId: user.id,
      type: "LIVE",
    },
  });

  if (!ticket) {
    ctx?.fail("Live chat session not found");
    throw createError({ statusCode: 404, message: "Live chat session not found" });
  }

  ctx?.step("Closing chat session");
  // Close the session
  ticket.status = "CLOSED";
  await ticket.save();

  ctx?.step("Broadcasting session end via WebSocket");
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
    logger.error("SUPPORT", "Failed to broadcast session end", error);
  }

  ctx?.success("Chat session ended successfully");
  return { success: true, message: "Chat session ended successfully" };
}; 