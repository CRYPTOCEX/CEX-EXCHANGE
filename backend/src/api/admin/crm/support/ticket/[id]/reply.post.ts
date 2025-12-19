import { models } from "@b/db";
import { messageBroker } from "@b/handler/Websocket";
import { createError } from "@b/utils/error";
import { updateRecordResponses } from "@b/utils/query";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Admin reply to a support ticket",
  description: "Admin reply to a support ticket identified by its UUID.",
  operationId: "adminReplyTicket",
  tags: ["Admin", "CRM", "Support Ticket"],
  requiresAuth: true,
  permission: "edit.support.ticket",
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
  logModule: "ADMIN_SUP",
  logTitle: "Reply to ticket",
};

export default async (data: Handler) => {
  const { params, user, body, ctx } = data;
  const { id } = params;

  if (!user?.id) throw createError(401, "Unauthorized");

  ctx?.step("Fetching ticket");
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
        attributes: ["id", "firstName", "lastName", "email"],
      },
    ],
  });

  if (!ticket) {
    ctx?.fail("Ticket not found");
    throw createError(404, "Ticket not found");
  }

  if (ticket.status === "CLOSED") {
    ctx?.fail("Cannot reply to closed ticket");
    throw createError(403, "Cannot reply to a closed ticket");
  }

  const { type, time, userId, text, attachment } = body;
  if (!type || !time || !userId || !text) {
    ctx?.fail("Invalid message structure");
    throw createError(400, "Invalid message structure");
  }

  // Admin messages should always be of type "agent"
  const messageType = "agent";

  ctx?.step("Fetching admin user info");
  const adminUser = await models.user.findByPk(user.id);
  const senderName = adminUser && (adminUser.firstName || adminUser.lastName)
    ? [adminUser.firstName, adminUser.lastName].filter(Boolean).join(" ")
    : adminUser?.email || "Support Agent";

  // Assign agent if ticket has no agent yet
  let isFirstAgentReply = false;
  if (!ticket.agentId) {
    ctx?.step("Auto-assigning agent");
    ticket.agentId = user.id;
    ticket.agentName = senderName;
    isFirstAgentReply = true;
  }

  ctx?.step("Preparing reply message");
  let currentMessages: any[] = [];
  if (ticket.messages) {
    if (Array.isArray(ticket.messages)) {
      currentMessages = [...ticket.messages];
    } else if (typeof ticket.messages === 'string') {
      try {
        const parsed = JSON.parse(ticket.messages);
        currentMessages = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        logger.error("SUPPORT", "Failed to parse messages JSON", e);
        currentMessages = [];
      }
    }
  }

  // Include complete agent profile data
  const agentProfile = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
  };

  const newMessage = {
    type: messageType,
    time,
    userId: user.id, // Use admin's ID
    text,
    senderName,
    agentProfile, // Include full agent profile
    ...(attachment ? { attachment } : {}),
  };

  currentMessages.push(newMessage);

  // If this is the first agent reply, set responseTime (in minutes)
  if (!ticket.responseTime && isFirstAgentReply) {
    const ticketCreated = new Date(ticket.createdAt as any);
    const replyTime = new Date(time);
    ticket.responseTime = Math.round(
      (replyTime.getTime() - ticketCreated.getTime()) / 60000
    );
  }

  ctx?.step("Updating ticket");
  await ticket.update({
    messages: currentMessages,
    status: "REPLIED",
    ...(isFirstAgentReply && { agentId: ticket.agentId, agentName: ticket.agentName }),
    ...(ticket.responseTime && { responseTime: ticket.responseTime }),
  });

  ctx?.step("Broadcasting to clients");
  const ticketUserId = ticket.userId;

  // Broadcast to clients subscribed to this specific ticket (both admin and user)
  // Use same structure as user endpoint for consistency
  messageBroker.broadcastToSubscribedClients(
    `/api/user/support/ticket`,
    { id },  // This matches the subscription payload from SUBSCRIBE action
    {
      method: "reply",
      payload: {  // Changed from 'data' to 'payload' for consistency
        id,
        message: newMessage,
        status: ticket.status,
        updatedAt: new Date(),
      }
    }
  );

  // Note: Removed direct message to user since subscription-based broadcast handles it
  // All subscribed clients (both admin and user) will receive the message

  ctx?.success("Reply sent successfully");
  return {
    message: "Reply sent successfully",
    data: ticket.get({ plain: true })
  };
};