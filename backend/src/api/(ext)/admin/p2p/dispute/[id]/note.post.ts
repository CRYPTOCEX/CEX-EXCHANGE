import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Add Note to a P2P Dispute",
  description: "Adds a note to an existing dispute.",
  operationId: "addNoteToAdminP2PDispute",
  tags: ["Admin", "Disputes", "P2P"],
  requiresAuth: true,
  permissions: ["p2p.dispute.note.add"],
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
    200: { description: "Note added successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Dispute not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "edit.p2p.dispute",
};

export default async (data) => {
  const { params, body } = data;
  const { id } = params;
  const { note } = body;

  try {
    const dispute = await models.p2pDispute.findByPk(id);
    if (!dispute)
      throw createError({ statusCode: 404, message: "Dispute not found" });
    const existingNotes = dispute.activityLog || [];
    existingNotes.push({
      type: "note",
      content: note,
      createdAt: new Date().toISOString(),
      adminId: data.user.id,
    });
    dispute.activityLog = existingNotes;
    await dispute.save();
    return dispute.toJSON();
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
