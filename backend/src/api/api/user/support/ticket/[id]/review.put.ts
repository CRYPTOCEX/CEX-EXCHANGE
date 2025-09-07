import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Set satisfaction rating for a ticket",
  description: "Allows the ticket owner to submit a satisfaction rating (1-5)",
  operationId: "reviewTicket",
  tags: ["Support"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "The UUID of the ticket to review",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "The satisfaction rating",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            satisfaction: { type: "number" },
          },
          required: ["satisfaction"],
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

  const ticket = await models.supportTicket.findOne({
    where: { id, userId: user.id },
  });
  if (!ticket) throw createError(404, "Ticket not found");
  if (ticket.satisfaction) throw createError(400, "Satisfaction already set");

  const { satisfaction } = body;
  if (
    typeof satisfaction !== "number" ||
    satisfaction < 1 ||
    satisfaction > 5
  ) {
    throw createError(400, "Satisfaction must be between 1 and 5");
  }

  ticket.satisfaction = satisfaction;
  await ticket.save();

  return {
    message: "Satisfaction submitted",
    data: ticket.get({ plain: true }),
  };
};
