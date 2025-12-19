import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createRecordResponses } from "@b/utils/query";
import { Op } from "sequelize";

interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

export const metadata: OperationObject = {
  summary: "Retrieves or creates a live chat ticket",
  description:
    "Fetches the existing live chat ticket for the authenticated user, or creates a new one if none exists.",
  operationId: "getOrCreateLiveChat",
  tags: ["Support"],
  requiresAuth: true,
  logModule: "USER",
  logTitle: "Get or create live chat",
  responses: createRecordResponses("Support Ticket"),
};

export default async (data: Handler) => {
  const { user, ctx } = data;
  if (!user?.id) {
    ctx?.fail?.("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step?.("Getting or creating live chat session");
  const result = await getOrCreateLiveChat(user.id, ctx);
  ctx?.success?.("Live chat session retrieved");
  return result;
};

export async function getOrCreateLiveChat(userId: string, ctx?: LogContext) {
  try {
    ctx?.step?.("Checking for existing live chat ticket");
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
      ctx?.step?.("Creating new live chat ticket");
      ticket = await models.supportTicket.create({
        userId,
        type: "LIVE",
        subject: "Live Chat",
        messages: [],
        importance: "LOW",
        status: "PENDING",
      });
      ctx?.success?.("New live chat ticket created");
    } else {
      ctx?.success?.("Existing live chat ticket found");
    }

    return ticket.get({ plain: true });
  } catch (error) {
    ctx?.fail?.(error.message);
    throw error;
  }
}
