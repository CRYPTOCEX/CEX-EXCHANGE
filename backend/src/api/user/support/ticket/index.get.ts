// /server/api/support/tickets/index.get.ts

import { models } from "@b/db";
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
  const { user, query } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

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
          console.warn('Failed to parse messages JSON:', e);
          ticket.messages = [];
        }
      }
      
      // Parse tags if it's a string
      if (typeof ticket.tags === 'string') {
        try {
          ticket.tags = JSON.parse(ticket.tags);
        } catch (e) {
          console.warn('Failed to parse tags JSON:', e);
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
};
