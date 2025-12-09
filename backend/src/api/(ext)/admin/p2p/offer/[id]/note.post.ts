import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Add Admin Note to Offer",
  description: "Adds a timestamped note to an offer as an admin. Notes are internal and not visible to users.",
  operationId: "adminAddNoteToP2POffer",
  tags: ["Admin", "Offers", "P2P"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Offer ID",
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
    404: { description: "Offer not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "edit.p2p.offer",
};

export default async (data) => {
  const { params, body } = data;
  const { id } = params;
  const { note } = body;

  try {
    const offer = await models.p2pOffer.findByPk(id);
    if (!offer)
      throw createError({ statusCode: 404, message: "Offer not found" });

    // Get admin's name for display
    const admin = await models.user.findByPk(data.user.id, {
      attributes: ["firstName", "lastName"],
    });
    const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() : "Admin";

    // Create timestamped note entry
    const timestamp = new Date().toISOString();
    const noteEntry = `[${timestamp}] ${adminName}: ${note}`;

    // Append to existing admin notes or create new
    const currentNotes = offer.adminNotes || "";
    const updatedNotes = currentNotes
      ? `${currentNotes}\n${noteEntry}`
      : noteEntry;

    await offer.update({
      adminNotes: updatedNotes,
    });

    // Log admin activity
    await models.p2pAdminActivity.create({
      adminId: data.user.id,
      offerId: offer.id,
      actionType: "NOTE_ADDED",
      actionDetails: {
        note,
        timestamp,
      },
    });

    return {
      message: "Admin note added successfully."
    };
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
