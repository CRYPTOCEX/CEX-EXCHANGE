import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createRecordResponses } from "@b/utils/query";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Retrieves or creates a live chat ticket",
  description:
    "Fetches the existing live chat ticket for the authenticated user, or creates a new one if none exists.",
  operationId: "getOrCreateLiveChat",
  tags: ["Support"],
  requiresAuth: true,
  responses: createRecordResponses("Support Ticket"),
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  return getOrCreateLiveChat(user.id);
};

export async function getOrCreateLiveChat(userId: string) {
  // Check for existing LIVE ticket
  let ticket = await models.supportTicket.findOne({
    where: {
      userId,
      type: "LIVE", // Ticket type is LIVE
      status: { [Op.ne]: "CLOSED" }, // Exclude closed tickets
    },
    include: [
      {
        model: models.user,
        as: "agent",
        attributes: ["avatar", "firstName", "lastName", "lastLogin"],
      },
    ],
  });

  // If no LIVE ticket exists, create one
  if (!ticket) {
    ticket = await models.supportTicket.create({
      userId,
      type: "LIVE",
      subject: "Live Chat",
      messages: [],
      importance: "LOW",
      status: "PENDING",
    });
  }

  return ticket.get({ plain: true });
}
