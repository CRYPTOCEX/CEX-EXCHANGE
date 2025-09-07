import { models } from "@b/db";
import { messageBroker } from "@b/handler/Websocket";
import { createError } from "@b/utils/error";
import { updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Reply to a support ticket",
  description: "Reply to a support ticket identified by its UUID.",
  operationId: "replyTicket",
  tags: ["Support"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "The UUID of the ticket to reply to",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "The message to send",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["client", "agent"] },
            time: { type: "string", format: "date-time" },
            userId: { type: "string" },
            text: { type: "string" },
            attachment: { type: "string" },
          },
          required: ["type", "time", "userId", "text"],
        },
      },
    },
  },
  responses: updateRecordResponses("Support Ticket"),
};

export default async (data: Handler) => {
  const { params, user, body } = data;
  const { id } = params;

  if (!user?.id) throw createError(401, "Unauthorized");

  // Fetch the ticket and validate existence
  const ticket = await models.supportTicket.findByPk(id, {
    include: [
      {
        model: models.user,
        as: "agent",
        attributes: ["avatar", "firstName", "lastName", "lastLogin"],
      },
      {
        model: models.user,
        as: "user",
        attributes: ["firstName", "lastName", "email"],
      },
    ],
  });
  if (!ticket) throw createError(404, "Ticket not found");

  if (ticket.status === "CLOSED") {
    throw createError(403, "Cannot reply to a closed ticket");
  }

  const { type, time, userId, text, attachment } = body;
  if (!type || !time || !userId || !text) {
    throw createError(400, "Invalid message structure");
  }

  if (type !== "client" && type !== "agent") {
    throw createError(400, "Invalid message type");
  }
  if (userId !== user.id) {
    throw createError(403, "You are not authorized to send this message");
  }

  // Assign agent if reply is from agent and ticket has no agent yet
  let isFirstAgentReply = false;
  if (type === "agent" && !ticket.agentId) {
    ticket.agentId = user.id;
    // Also set agentName from user table
    const agentUser = await models.user.findByPk(user.id);
    ticket.agentName =
      agentUser && (agentUser.firstName || agentUser.lastName)
        ? [agentUser.firstName, agentUser.lastName].filter(Boolean).join(" ")
        : agentUser?.email || "";
    isFirstAgentReply = true;
  }

  // Get current messages and add new one
  let currentMessages: any[] = [];
  if (ticket.messages) {
    if (Array.isArray(ticket.messages)) {
      currentMessages = [...ticket.messages];
    } else if (typeof ticket.messages === 'string') {
      try {
        const parsed = JSON.parse(ticket.messages);
        currentMessages = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to parse messages JSON:', e);
        currentMessages = [];
      }
    }
  }
  
  const newMessage = {
    type,
    time,
    userId,
    text,
    ...(attachment ? { attachment } : {}),
  };
  
  currentMessages.push(newMessage);

  // If this is the first agent reply, set responseTime (in minutes)
  if (type === "agent" && !ticket.responseTime && isFirstAgentReply) {
    const ticketCreated = new Date(ticket.createdAt as any);
    const replyTime = new Date(time);
    ticket.responseTime = Math.round(
      (replyTime.getTime() - ticketCreated.getTime()) / 60000
    );
  }

  // Update ticket with new messages and status using proper Sequelize methods
  await ticket.update({
    messages: currentMessages,
    status: type === "client" ? "REPLIED" : "OPEN",
    ...(isFirstAgentReply && { agentId: ticket.agentId, agentName: ticket.agentName }),
    ...(ticket.responseTime && { responseTime: ticket.responseTime }),
  });

  // WebSocket broadcast
  messageBroker.broadcastToSubscribedClients(
    `/api/user/support/ticket`,
    { id },
    {
      method: "reply",
      data: {
        message: { type, time, userId, text, attachment },
        status: ticket.status,
        updatedAt: new Date(),
      },
    }
  );

  return { message: "Reply sent", data: ticket.get({ plain: true }) };
};
