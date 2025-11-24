import { models } from "@b/db";
import { createError } from "@b/utils/error";

import { p2pAdminDisputeRateLimit } from "@b/handler/Middleware";
import { logP2PAdminAction } from "../../../../p2p/utils/ownership";

export const metadata = {
  summary: "Update P2P Dispute (Admin)",
  description:
    "Updates dispute details such as status, resolution information, or appends a message.",
  operationId: "updateAdminP2PDispute",
  tags: ["Admin", "Disputes", "P2P"],
  requiresAuth: true,
  middleware: [p2pAdminDisputeRateLimit],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Dispute ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "Dispute update data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["IN_PROGRESS", "RESOLVED"] },
            resolution: {
              type: "object",
              properties: {
                outcome: { type: "string" },
                notes: { type: "string" },
              },
            },
            message: { type: "string" },
          },
        },
      },
    },
  },
  responses: {
    200: { description: "Dispute updated successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Dispute not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "Access P2P Management",
};

export default async (data) => {
  const { params, body, user } = data;
  const { id } = params;
  const { status, resolution, message } = body;

  // Import validation utilities
  const { sanitizeInput } = await import("../../../../p2p/utils/validation");

  try {
    const dispute = await models.p2pDispute.findByPk(id);
    if (!dispute)
      throw createError({ statusCode: 404, message: "Dispute not found" });
    
    // Validate status transition if changing status
    if (status) {
      const validStatuses = ["IN_PROGRESS", "RESOLVED"];
      if (!validStatuses.includes(status)) {
        throw createError({ 
          statusCode: 400, 
          message: "Invalid status. Must be IN_PROGRESS or RESOLVED" 
        });
      }
      dispute.status = status;
    }
    
    if (resolution) {
      // Sanitize resolution notes
      if (resolution.notes) {
        resolution.notes = sanitizeInput(resolution.notes);
      }
      if (resolution.outcome) {
        resolution.outcome = sanitizeInput(resolution.outcome);
      }
      dispute.resolution = resolution;
      dispute.resolvedOn = new Date();
    }
    
    let sanitizedMessage: string | undefined;
    if (message) {
      // Sanitize message content to prevent XSS
      sanitizedMessage = sanitizeInput(message);
      if (!sanitizedMessage || sanitizedMessage.length === 0) {
        throw createError({ 
          statusCode: 400, 
          message: "Message cannot be empty" 
        });
      }
      
      const existingMessages = dispute.messages || [];
      existingMessages.push({
        sender: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        content: sanitizedMessage,
        createdAt: new Date().toISOString(),
        isAdmin: true,
      });
      dispute.messages = existingMessages;
    }
    
    await dispute.save();
    
    // Log admin action with enhanced audit trail
    await logP2PAdminAction(
      user.id,
      "DISPUTE_UPDATE",
      "DISPUTE",
      dispute.id,
      {
        status: status || dispute.status,
        hasResolution: !!resolution,
        hasMessage: !!message,
        resolution: resolution ? sanitizeInput(JSON.stringify(resolution)) : undefined,
        messageContent: message && sanitizedMessage ? sanitizedMessage.substring(0, 100) + "..." : undefined,
        adminName: `${user.firstName} ${user.lastName}`,
        updatedBy: `${user.firstName} ${user.lastName}`,
      }
    );
    
    return {
      message: "Dispute updated successfully",
      dispute: dispute.toJSON()
    };
  } catch (err) {
    if (err.statusCode) {
      throw err;
    }
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
