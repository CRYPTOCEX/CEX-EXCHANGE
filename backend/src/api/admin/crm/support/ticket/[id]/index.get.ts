import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { supportTicketSchema } from "../utils";
import { models } from "@b/db";
import { col, fn, Op } from "sequelize";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Retrieves a specific support ticket by ID, including stats",
  operationId: "getSupportTicketById",
  tags: ["Admin", "CRM", "Support Ticket"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the support ticket to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Support ticket details, with user and agent stats",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...supportTicketSchema,
              userStats: {
                type: "object",
                properties: {
                  totalTickets: { type: "number" },
                  resolvedTickets: { type: "number" },
                },
              },
              agentStats: {
                type: "object",
                properties: {
                  avgRating: { type: "number", nullable: true },
                  resolved: { type: "number" },
                },
                nullable: true,
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Support ticket not found"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.support.ticket",
};

export default async (data: Handler) => {
  const { params } = data;
  
  try {
    // Validate ticket ID format
    if (!params?.id || typeof params.id !== 'string') {
      throw createError({
        statusCode: 400,
        message: "Invalid ticket ID format",
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(params.id)) {
      throw createError({
        statusCode: 400,
        message: "Invalid ticket ID format",
      });
    }

    // Get the ticket with includes
    let ticket;
    try {
      ticket = await models.supportTicket.findOne({
        where: { id: params.id },
        include: [
          {
            model: models.user,
            as: "agent",
            attributes: ["id", "avatar", "firstName", "lastName", "lastLogin"],
          },
          {
            model: models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email", "avatar"],
          },
        ],
      });
    } catch (dbError) {
      console.error(`Database error fetching ticket ${params.id}:`, dbError);
      throw createError({
        statusCode: 500,
        message: "Database connection error",
      });
    }

    if (!ticket) {
      throw createError({
        statusCode: 404,
        message: "Support ticket not found",
      });
    }

    // Extract ticket data safely
    let plainTicket;
    try {
      plainTicket = ticket.get({ plain: true });
    } catch (jsonError) {
      console.error("Error extracting ticket data:", jsonError);
      throw createError({
        statusCode: 500,
        message: "Failed to process ticket data",
      });
    }

    // Ensure JSON fields are properly parsed
    if (typeof plainTicket.messages === 'string') {
      try {
        const parsed = JSON.parse(plainTicket.messages);
        plainTicket.messages = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error(`Failed to parse messages JSON for ticket ${plainTicket.id}:`, e);
        console.error('Problematic messages value:', plainTicket.messages);
        plainTicket.messages = [];
      }
    }
    if (typeof plainTicket.tags === 'string') {
      try {
        const parsed = JSON.parse(plainTicket.tags);
        plainTicket.tags = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error(`Failed to parse tags JSON for ticket ${plainTicket.id}:`, e);
        console.error('Problematic tags value:', plainTicket.tags);
        plainTicket.tags = [];
      }
    }

    // Ensure arrays are not null
    plainTicket.messages = plainTicket.messages || [];
    plainTicket.tags = plainTicket.tags || [];

    // Stats for user
    const userId = plainTicket.userId;
    let userStats = { totalTickets: 0, resolvedTickets: 0 };

    if (userId) {
      try {
        // Total tickets by user
        const [totalTickets, resolvedTickets] = await Promise.all([
          models.supportTicket.count({ where: { userId } }),
          models.supportTicket.count({ where: { userId, status: "CLOSED" } }),
        ]);
        userStats = { totalTickets, resolvedTickets };
      } catch (statsError) {
        console.error("Error fetching user stats:", statsError);
        userStats = { totalTickets: 0, resolvedTickets: 0 };
      }
    }

    // Stats for agent
    let agentStats: { avgRating: number | null; resolved: number } | null = null;
    const agentId = plainTicket.agentId;

    if (agentId) {
      try {
        // Count resolved by this agent, and avg satisfaction (where not null)
        const [resolved, ratingResult] = await Promise.all([
          models.supportTicket.count({ where: { agentId, status: "CLOSED" } }),
          models.supportTicket.findAll({
            where: {
              agentId,
              satisfaction: { [Op.not]: null },
            },
            attributes: [[fn("AVG", col("satisfaction")), "avgRating"]],
            raw: true,
          }),
        ]);

        agentStats = {
          resolved,
          avgRating: ratingResult[0]?.avgRating
            ? parseFloat(ratingResult[0].avgRating)
            : null,
        };
      } catch (agentStatsError) {
        console.error("Error fetching agent stats:", agentStatsError);
        agentStats = { avgRating: null, resolved: 0 };
      }
    }

    return {
      ...plainTicket,
      userStats,
      agentStats,
    };
    
  } catch (error) {
    console.error("Error fetching support ticket:", error);
    
    if (error.statusCode) {
      throw error; // Re-throw createError errors
    }
    
    throw createError({
      statusCode: 500,
      message: "Internal server error",
    });
  }
};
