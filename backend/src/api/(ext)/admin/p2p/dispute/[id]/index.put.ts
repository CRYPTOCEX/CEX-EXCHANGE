import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Update P2P Dispute (Admin)",
  description:
    "Updates dispute details such as status, resolution information, or appends a message.",
  operationId: "updateAdminP2PDispute",
  tags: ["Admin", "Disputes", "P2P"],
  requiresAuth: true,
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
  permission: "edit.p2p.dispute",
};

export default async (data) => {
  const { params, body } = data;
  const { id } = params;
  const { status, resolution, message } = body;

  try {
    const dispute = await models.p2pDispute.findByPk(id);
    if (!dispute)
      throw createError({ statusCode: 404, message: "Dispute not found" });
    if (status) {
      dispute.status = status;
    }
    if (resolution) {
      dispute.resolution = resolution;
      dispute.resolvedOn = new Date();
    }
    if (message) {
      const existingMessages = dispute.messages || [];
      existingMessages.push({
        sender: data.user.id,
        content: message,
        createdAt: new Date().toISOString(),
      });
      dispute.messages = existingMessages;
    }
    await dispute.save();
    return dispute.toJSON();
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
