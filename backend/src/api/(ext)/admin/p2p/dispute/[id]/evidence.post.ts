import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Add Evidence to a P2P Dispute",
  description: "Adds evidence to an existing dispute by admin.",
  operationId: "addEvidenceToAdminP2PDispute",
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
    description: "Evidence data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            fileUrl: { type: "string" },
            fileName: { type: "string" },
            fileType: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
          },
          required: ["fileUrl", "fileName"],
        },
      },
    },
  },
  responses: {
    200: { description: "Evidence added successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Dispute not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "edit.p2p.dispute",
};

export default async (data) => {
  const { params, body, user } = data;
  const { id } = params;
  const { fileUrl, fileName, fileType, title, description } = body;

  try {
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

    if (!dispute)
      throw createError({ statusCode: 404, message: "Dispute not found" });

    // Validate file type - only allow images
    const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (fileType && !allowedImageTypes.includes(fileType.toLowerCase())) {
      throw createError({
        statusCode: 400,
        message: "Only image files are allowed (JPEG, PNG, GIF, WebP)"
      });
    }

    // Parse evidence if it's a string
    let existingEvidence = dispute.evidence;
    if (typeof existingEvidence === "string") {
      try {
        existingEvidence = JSON.parse(existingEvidence);
      } catch {
        existingEvidence = [];
      }
    }
    if (!Array.isArray(existingEvidence)) {
      existingEvidence = [];
    }

    const adminName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email || "Admin";

    existingEvidence.push({
      fileUrl,
      fileName,
      fileType,
      title: title || fileName,
      description: description || "",
      submittedBy: "admin",
      adminId: user.id,
      adminName,
      createdAt: new Date().toISOString(),
    });

    dispute.evidence = existingEvidence;
    await dispute.save();

    const plainDispute = dispute.get({ plain: true });

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

    // Transform evidence for frontend compatibility
    const evidence = Array.isArray(plainDispute.evidence) ? plainDispute.evidence.map((e: any) => ({
      ...e,
      submittedBy: e.submittedBy || "admin",
      timestamp: e.createdAt || e.timestamp,
    })) : [];

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
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
