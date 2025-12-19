import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Add admin note to P2P dispute",
  description: "Adds an internal admin note to a P2P dispute activity log. Notes are timestamped and attributed to the admin user for tracking purposes.",
  operationId: "addNoteToAdminP2PDispute",
  tags: ["Admin", "P2P", "Dispute"],
  requiresAuth: true,
  permissions: ["p2p.dispute.note.add"],
  logModule: "ADMIN_P2P",
  logTitle: "Add note to dispute",
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
    401: unauthorizedResponse,
    404: notFoundResponse("Resource"),
    500: serverErrorResponse,
  },
  permission: "edit.p2p.dispute",
};

export default async (data) => {
  const { params, body, user, ctx } = data;
  const { id } = params;
  const { note } = body;

  try {
    ctx?.step("Fetching dispute");
    const dispute = await models.p2pDispute.findByPk(id, {
      include: [
        {
          model: models.p2pTrade,
          as: "trade",
          include: [
            {
              model: models.p2pOffer,
              as: "offer",
              attributes: ["id", "type", "currency", "walletType"],
            },
            {
              model: models.user,
              as: "buyer",
              attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
              model: models.user,
              as: "seller",
              attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
          ],
        },
        {
          model: models.user,
          as: "reportedBy",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: models.user,
          as: "against",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
      ],
    });
    if (!dispute) {
      ctx?.fail("Dispute not found");
      throw createError({ statusCode: 404, message: "Dispute not found" });
    }

    ctx?.step("Adding note to activity log");
    let existingNotes = dispute.activityLog;
    if (!Array.isArray(existingNotes)) {
      existingNotes = [];
    }
    const adminName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email || "Admin";

    existingNotes.push({
      type: "note",
      content: note,
      createdAt: new Date().toISOString(),
      adminId: user.id,
      adminName,
    });

    ctx?.step("Updating dispute");
    // Use update to ensure Sequelize detects the change to JSON field
    await dispute.update({ activityLog: existingNotes });

    // Reload the dispute to get fresh data
    await dispute.reload();

    const plainDispute = dispute.get({ plain: true });

    // Transform admin notes from activityLog
    const activityLog = Array.isArray(plainDispute.activityLog) ? plainDispute.activityLog : [];
    const adminNotes = activityLog
      .filter((entry: any) => entry.type === "note")
      .map((entry: any) => ({
        content: entry.content || entry.note,
        createdAt: entry.createdAt,
        createdBy: entry.adminName || "Admin",
        adminId: entry.adminId,
      }));

    // Transform messages for frontend compatibility
    const messages = Array.isArray(plainDispute.messages) ? plainDispute.messages.map((msg: any) => ({
      id: msg.id || `${msg.createdAt}-${msg.sender}`,
      sender: msg.senderName || msg.sender || "Unknown",
      senderId: msg.sender,
      content: msg.content || msg.message || "",
      timestamp: msg.createdAt || msg.timestamp,
      isAdmin: msg.isAdmin || false,
      avatar: msg.avatar,
      senderInitials: msg.senderName ? msg.senderName.split(" ").map((n: string) => n[0]).join("").toUpperCase() : "?",
    })) : [];

    // Transform evidence for frontend compatibility
    const evidence = Array.isArray(plainDispute.evidence) ? plainDispute.evidence.map((e: any) => ({
      ...e,
      submittedBy: e.submittedBy || "admin",
      timestamp: e.createdAt || e.timestamp,
    })) : [];

    ctx?.success("Note added successfully");
    return {
      ...plainDispute,
      messages,
      adminNotes,
      evidence,
    };
  } catch (err: any) {
    if (err.statusCode) {
      throw err;
    }
    ctx?.fail("Failed to add note");
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
