import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Creates a new support ticket",
  description:
    "Creates a new support ticket for the currently authenticated user",
  operationId: "createTicket",
  tags: ["Support"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            subject: { type: "string", description: "Subject of the ticket" },
            message: { type: "string", description: "Content of the ticket" },
            importance: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Ticket tags (optional)",
            },
          },
          required: ["subject", "message", "importance"],
        },
      },
    },
  },
  responses: createRecordResponses("Support Ticket"),
};

export default async (data: Handler) => {
  const { body, user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { subject, message, importance, tags } = body;

  const ticket = await models.supportTicket.create({
    userId: user.id,
    subject,
    messages: [
      {
        type: "client",
        text: message,
        time: new Date().toISOString(),
        userId: user.id,
      },
    ],
    importance,
    status: "PENDING",
    type: "TICKET",
    tags: Array.isArray(tags)
      ? tags
      : typeof tags === "string"
        ? tags.split(",").map((t) => t.trim())
        : [],
  });

  return ticket.get({ plain: true });
};
