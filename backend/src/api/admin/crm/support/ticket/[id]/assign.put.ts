import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Assigns or unassigns an agent to a support ticket",
  operationId: "assignSupportTicketAgent",
  tags: ["Admin", "CRM", "Support Ticket"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the support ticket",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            agentId: {
              type: "string",
              nullable: true,
              description: "ID of the agent to assign, or null to unassign",
            },
          },
          required: ["agentId"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Agent assigned/unassigned successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  agentId: { type: "string", nullable: true },
                  agentName: { type: "string", nullable: true },
                },
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
  permission: "edit.support.ticket",
  logModule: "ADMIN_SUP",
  logTitle: "Assign agent to ticket",
};

export default async (data: Handler) => {
  const { params, body, ctx } = data;
  const { agentId } = body;

  try {
    ctx?.step("Fetching ticket");
    const ticket = await models.supportTicket.findOne({
      where: { id: params.id },
    });

    if (!ticket) {
      ctx?.fail("Ticket not found");
      throw createError({
        statusCode: 404,
        message: "Support ticket not found",
      });
    }

    // If assigning an agent, verify the agent exists
    let agentName: string | null = null;
    if (agentId) {
      ctx?.step("Verifying agent");
      const agent = await models.user.findOne({
        where: { id: agentId },
        attributes: ["id", "firstName", "lastName"],
      });

      if (!agent) {
        ctx?.fail("Agent not found");
        throw createError({
          statusCode: 404,
          message: "Agent not found",
        });
      }

      agentName = `${agent.firstName} ${agent.lastName}`.trim();
    }

    ctx?.step("Updating ticket assignment");
    await ticket.update({
      agentId: agentId || null,
      agentName: agentName,
      status: agentId ? "OPEN" : "PENDING", // Auto-update status
    });

    ctx?.success(agentId ? "Agent assigned successfully" : "Agent unassigned successfully");
    return {
      message: agentId ? "Agent assigned successfully" : "Agent unassigned successfully",
      data: {
        id: ticket.id,
        agentId: agentId || null,
        agentName: agentName,
      },
    };
  } catch (error) {
    logger.error("SUPPORT", "Error assigning agent to ticket", error);

    if (error.statusCode) {
      throw error; // Re-throw createError errors
    }

    ctx?.fail("Internal server error");
    throw createError({
      statusCode: 500,
      message: "Internal server error",
    });
  }
}; 