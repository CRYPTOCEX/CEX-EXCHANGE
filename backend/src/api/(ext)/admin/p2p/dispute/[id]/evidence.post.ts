import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Add evidence to P2P dispute",
  description: "Uploads and attaches evidence files (images only) to a P2P dispute. Evidence is stored with admin information and timestamps for audit trail.",
  operationId: "addEvidenceToAdminP2PDispute",
  tags: ["Admin", "P2P", "Dispute"],
  requiresAuth: true,
  logModule: "ADMIN_P2P",
  logTitle: "Add evidence to dispute",
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
    401: unauthorizedResponse,
    404: notFoundResponse("Resource"),
    500: serverErrorResponse,
  },
  permission: "edit.p2p.dispute",
};

export default async (data) => {
  const { params, body, user, ctx } = data;
  const { id } = params;
  const { fileUrl, fileName, fileType, title, description } = body;

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

    ctx?.step("Validating file type");
    // Validate file type - only allow images
    const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (fileType && !allowedImageTypes.includes(fileType.toLowerCase())) {
      ctx?.fail("Invalid file type");
      throw createError({
        statusCode: 400,
        message: "Only image files are allowed (JPEG, PNG, GIF, WebP)"
      });
    }

    ctx?.step("Adding evidence");
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

    ctx?.step("Saving dispute");
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

    ctx?.success("Evidence added successfully");
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
    ctx?.fail("Failed to add evidence");
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
