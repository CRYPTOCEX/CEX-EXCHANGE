import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Get P2P dispute by ID",
  description: "Retrieves detailed information about a specific P2P dispute including trade details, involved parties, messages, evidence, and admin notes.",
  operationId: "getAdminP2PDisputeById",
  tags: ["Admin", "P2P", "Dispute"],
  requiresAuth: true,
  logModule: "ADMIN_P2P",
  logTitle: "Get P2P Dispute",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Dispute ID",
      required: true,
      schema: { type: "string", format: "uuid" },
    },
  ],
  responses: {
    200: {
      description: "Dispute retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              tradeId: { type: "string", format: "uuid" },
              amount: { type: "string" },
              reportedById: { type: "string", format: "uuid" },
              againstId: { type: "string", format: "uuid" },
              reason: { type: "string" },
              details: { type: "string", nullable: true },
              filedOn: { type: "string", format: "date-time" },
              status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "RESOLVED"] },
              priority: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
              resolution: { type: "object", nullable: true },
              resolvedOn: { type: "string", format: "date-time", nullable: true },
              messages: { type: "array", description: "Transformed dispute messages" },
              adminNotes: { type: "array", description: "Admin notes extracted from activity log" },
              evidence: { type: "array", description: "Submitted evidence files" },
              trade: {
                type: "object",
                description: "Associated trade with offer and user details",
              },
              reportedBy: { type: "object", description: "User who reported dispute" },
              against: { type: "object", description: "User against whom dispute was filed" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Dispute"),
    500: serverErrorResponse,
  },
  permission: "view.p2p.dispute",
  demoMask: ["reportedBy.email", "against.email", "trade.buyer.email", "trade.seller.email"],
};

export default async (data) => {
  const { params, ctx } = data;
  const { id } = params;

  try {
    ctx?.step("Fetching data");
    const dispute = await models.p2pDispute.findByPk(id, {
      include: [
        {
          model: models.p2pTrade,
          as: "trade",
          include: [
            {
              model: models.p2pOffer,
              as: "offer",
              attributes: ["id", "type", "currency", "walletType", "priceConfig", "amountConfig"],
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
      throw createError({ statusCode: 404, message: "Dispute not found" });
    }

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

    ctx?.success("Operation completed successfully");
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
