import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Add Admin Note to Trade",
  description: "Adds a note to a trade as an admin.",
  operationId: "adminAddNoteToP2PTrade",
  tags: ["Admin", "Trades", "P2P"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Trade ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "Note data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            note: { type: "string" },
          },
          required: ["note"],
        },
      },
    },
  },
  responses: {
    200: { description: "Admin note added successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "edit.p2p.trade",
};

export default async (data) => {
  const { params, body } = data;
  const { id } = params;
  const { note } = body;

  try {
    const trade = await models.p2pTrade.findByPk(id);
    if (!trade)
      throw createError({ statusCode: 404, message: "Trade not found" });
    const currentTimeline = trade.timeline || [];
    currentTimeline.push({
      event: "admin_note",
      note,
      adminId: data.user.id,
      createdAt: new Date().toISOString(),
    });
    await trade.update({ timeline: currentTimeline });
    return { message: "Admin note added successfully." };
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
