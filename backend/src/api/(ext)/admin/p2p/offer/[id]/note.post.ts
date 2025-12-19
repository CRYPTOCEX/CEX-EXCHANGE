import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Add admin note to P2P offer",
  description: "Adds an internal timestamped admin note to a P2P offer. Notes are stored in the adminNotes field and logged in admin activity for audit purposes.",
  operationId: "addAdminNoteToP2POffer",
  tags: ["Admin", "P2P", "Offer"],
  requiresAuth: true,
  logModule: "ADMIN_P2P",
  logTitle: "Add note to offer",
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
    401: unauthorizedResponse,
    404: notFoundResponse("Resource"),
    500: serverErrorResponse,
  },
  permission: "edit.p2p.offer",
};

export default async (data) => {
  const { params, body, ctx } = data;
  const { id } = params;
  const { note } = body;

  try {
    ctx?.step("Fetching offer");
    const offer = await models.p2pOffer.findByPk(id);
    if (!offer) {
      ctx?.fail("Offer not found");
      throw createError({ statusCode: 404, message: "Offer not found" });
    }

    ctx?.step("Getting admin information");
    // Get admin's name for display
    const admin = await models.user.findByPk(data.user.id, {
      attributes: ["firstName", "lastName"],
    });
    const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() : "Admin";

    ctx?.step("Creating timestamped note");
    // Create timestamped note entry
    const timestamp = new Date().toISOString();
    const noteEntry = `[${timestamp}] ${adminName}: ${note}`;

    // Append to existing admin notes or create new
    const currentNotes = offer.adminNotes || "";
    const updatedNotes = currentNotes
      ? `${currentNotes}\n${noteEntry}`
      : noteEntry;

    ctx?.step("Updating offer with note");
    await offer.update({
      adminNotes: updatedNotes,
    });

    ctx?.step("Logging admin activity");
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

    ctx?.success("Admin note added successfully");
    return {
      message: "Admin note added successfully."
    };
  } catch (err) {
    ctx?.fail("Failed to add admin note");
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
