import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { handleBroadcastMessage } from "@b/handler/Websocket";
import { updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Send a message in live chat session",
  description: "Sends a message to the live chat session",
  operationId: "sendLiveChatMessage",
  tags: ["Support"],
  requiresAuth: true,
  requestBody: {
    description: "The message to send",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            sessionId: { type: "string" },
            content: { type: "string" },
            sender: { type: "string", enum: ["user", "agent"] },
          },
          required: ["sessionId", "content", "sender"],
        },
      },
    },
  },
  responses: updateRecordResponses("Live Chat Message"),
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { sessionId, content, sender } = body;

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

  if (ticket.status === "CLOSED") {
    throw createError({ statusCode: 403, message: "Cannot send message to closed session" });
  }

  // Create the message
  const newMessage = {
    type: sender === "user" ? "client" : "agent",
    text: content,
    time: new Date().toISOString(),
    userId: user.id,
  };

  // Update ticket messages - get fresh data and handle properly
  // First, reload the ticket to get the latest data
  await ticket.reload();
  
  // Parse existing messages properly
  let currentMessages: any[] = [];
  if (ticket.messages) {
    if (Array.isArray(ticket.messages)) {
      currentMessages = [...ticket.messages];
    } else if (typeof ticket.messages === 'string') {
      try {
        const parsed = JSON.parse(ticket.messages);
        currentMessages = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Live Chat - Failed to parse messages JSON:', e);
        currentMessages = [];
      }
    }
  }
  
  currentMessages.push(newMessage);
  
  // Update database with new messages
  const sequelize = models.supportTicket.sequelize;
  await sequelize.query(
    'UPDATE support_ticket SET messages = :messages, updatedAt = :updatedAt WHERE id = :id',
    {
      replacements: {
        messages: JSON.stringify(currentMessages),
        updatedAt: new Date(),
        id: sessionId
      }
    }
  );

  // Update status to OPEN if it was PENDING - but don't call save() again since we already updated above
  if (ticket.status === "PENDING") {
    await ticket.update({ status: "OPEN" });
  }

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
    console.error("Failed to broadcast message:", error);
  }

  return { success: true, message: "Message sent successfully" };
}; 