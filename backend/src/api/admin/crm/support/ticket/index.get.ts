// /server/api/admin/support/tickets/index.get.ts

import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { supportTicketSchema } from "./utils";
import { Op } from "sequelize";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Lists support tickets with pagination and filtering",
  operationId: "listSupportTickets",
  tags: ["Admin", "CRM", "Support Ticket"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Support tickets retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: supportTicketSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Support Tickets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "access.support.ticket",
  demoMask: ["items.user.email", "items.agent.email"],
};

export default async (data: Handler) => {
  const { query, user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  try {
    const result = await getFiltered({
      model: models.supportTicket,
      query,
      sortField: query.sortField || "createdAt",
      where: { userId: { [Op.ne]: user.id } },
      includeModels: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: models.user,
          as: "agent",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
      ],
    });

    // Parse JSON fields that might be returned as strings
    if (result.items && Array.isArray(result.items)) {
      result.items = result.items.map((ticket: any) => {
        // Parse messages if it's a string
        if (typeof ticket.messages === 'string') {
          try {
            ticket.messages = JSON.parse(ticket.messages);
          } catch (e) {
            logger.warn("SUPPORT", "Failed to parse messages JSON");
            ticket.messages = [];
          }
        }

        // Parse tags if it's a string
        if (typeof ticket.tags === 'string') {
          try {
            ticket.tags = JSON.parse(ticket.tags);
          } catch (e) {
            logger.warn("SUPPORT", "Failed to parse tags JSON");
            ticket.tags = [];
          }
        }
        
        // Ensure arrays are not null
        ticket.messages = ticket.messages || [];
        ticket.tags = ticket.tags || [];
        
        return ticket;
      });
    }

    return result;
  } catch (error) {
    logger.error("SUPPORT", "Error fetching support tickets", error);

    if (error.statusCode) {
      throw error; // Re-throw createError errors
    }

    throw createError({
      statusCode: 500,
      message: "Failed to fetch support tickets",
    });
  }
};
