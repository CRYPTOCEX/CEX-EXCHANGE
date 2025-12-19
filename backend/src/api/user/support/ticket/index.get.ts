// /server/api/support/tickets/index.get.ts

import { models } from "@b/db";
import { logger } from "@b/utils/console";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { baseSupportTicketSchema } from "./utils";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Lists all tickets for the logged-in user",
  operationId: "listTickets",
  tags: ["Support"],
  description:
    "Fetches all support tickets associated with the currently authenticated user.",
  logModule: "USER",
  logTitle: "List support tickets",
  parameters: crudParameters,
  responses: {
    200: {
      description: "Posts retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: baseSupportTicketSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Support Ticket"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, query, ctx } = data;
  if (!user?.id) {
    ctx?.fail("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Retrieving support tickets");
  const result = await getFiltered({
    model: models.supportTicket,
    query,
    sortField: query.sortField || "createdAt",
    where: { userId: user.id },
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

  ctx?.success(`Retrieved ${result.items?.length || 0} support tickets`);
  return result;
};
