import { models } from "@b/db";
import { Op } from "sequelize";
import { createError } from "@b/utils/error";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { logger } from "@b/utils/console";

const isProduction = process.env.NODE_ENV === "production";

export const metadata = {
  summary: "Upload Image in Trade Chat",
  description: "Uploads an image as a message attachment in the trade chat.",
  operationId: "uploadP2PTradeImage",
  tags: ["P2P", "Trade"],
  requiresAuth: true,
  middleware: ["p2pMessageRateLimit"],
  logModule: "P2P_MESSAGE",
  logTitle: "Upload trade message image",
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
    description: "File upload payload (base64 encoded)",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            file: {
              type: "string",
              description: "Base64 encoded file data with mime type prefix",
            },
            filename: {
              type: "string",
              description: "Original filename",
            },
          },
          required: ["file"],
        },
      },
    },
  },
  responses: {
    200: { description: "File uploaded successfully." },
    400: { description: "Bad request - Invalid file." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    500: { description: "Internal Server Error." },
  },
};

const generateFileUrl = (relativePath: string) => {
  return `/uploads/${relativePath}`;
};

async function ensureDirExists(dir: string) {
  try {
    await fs.access(dir);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      await fs.mkdir(dir, { recursive: true });
    } else {
      throw error;
    }
  }
}

export default async (data: { params?: any; body: any; user?: any; ctx?: any }) => {
  const { id } = data.params || {};
  const { file: base64File, filename: originalFilename } = data.body;
  const { user, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Validating file upload");
  if (!base64File) {
    throw createError({ statusCode: 400, message: "No file provided" });
  }

  // Extract mime type and base64 data
  const matches = base64File.match(/^data:(.*);base64,(.*)$/);
  if (!matches) {
    throw createError({ statusCode: 400, message: "Invalid file format. Expected base64 encoded file." });
  }

  const mimeType = matches[1];
  const base64Data = matches[2];

  // Validate file type - only images allowed
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(mimeType)) {
    throw createError({
      statusCode: 400,
      message: "Invalid file type. Only images allowed: JPEG, PNG, GIF, WebP",
    });
  }

  const buffer = Buffer.from(base64Data, "base64");

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (buffer.length > maxSize) {
    throw createError({
      statusCode: 400,
      message: "File too large. Maximum size: 5MB",
    });
  }

  const trade = await models.p2pTrade.findOne({
    where: {
      id,
      [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
    },
    include: [
      {
        model: models.p2pOffer,
        as: "offer",
        attributes: ["currency"],
      },
    ],
  });

  if (!trade) {
    throw createError({ statusCode: 404, message: "Trade not found" });
  }

  // Check if trade is in a state where messages are allowed
  const disallowedStatuses = ["COMPLETED", "CANCELLED", "EXPIRED"];
  if (disallowedStatuses.includes(trade.status)) {
    throw createError({
      statusCode: 400,
      message: `Cannot send files on ${trade.status.toLowerCase()} trades`,
    });
  }

  try {
    ctx?.step("Processing and saving image");
    // Create upload directory - save to frontend/public/uploads for static file serving
    const baseDir = isProduction
      ? path.resolve(process.cwd(), "frontend", "public")
      : path.resolve(process.cwd(), "..", "frontend", "public");
    const uploadDir = path.join(baseDir, "uploads", "p2p", "trade", id);
    await ensureDirExists(uploadDir);

    // Generate unique filename
    let filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    let processedData: Buffer = buffer;

    // Process image files (except GIF - preserve animation)
    if (!mimeType.includes("gif")) {
      processedData = await sharp(buffer)
        .resize({ width: 1200, height: 1200, fit: "inside" })
        .webp({ quality: 80 })
        .toBuffer();
      filename += ".webp";
    } else {
      filename += ".gif";
    }

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, processedData);

    const fileUrl = generateFileUrl(`p2p/trade/${id}/${filename}`);

    ctx?.step("Adding image message to trade timeline");

    // Parse timeline if it's a string
    let timeline = trade.timeline || [];
    if (typeof timeline === "string") {
      try {
        timeline = JSON.parse(timeline);
      } catch (e) {
        logger.error("P2P_TRADE", "Failed to parse timeline JSON", e);
        timeline = [];
      }
    }

    // Ensure timeline is an array
    if (!Array.isArray(timeline)) {
      timeline = [];
    }

    // Message content is always an image
    const messageContent = `![Image](${fileUrl})`;

    const messageEntry = {
      id: uuidv4(),
      event: "MESSAGE",
      message: messageContent,
      senderId: user.id,
      senderName: user.firstName || "User",
      createdAt: new Date().toISOString(),
      attachment: {
        url: fileUrl,
        type: mimeType,
        name: originalFilename || filename,
        size: buffer.length,
      },
    };

    timeline.push(messageEntry);

    // Update trade with new message
    await trade.update({
      timeline,
      lastMessageAt: new Date(),
    });

    // Log activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: "FILE_SENT",
      action: "FILE_SENT",
      relatedEntity: "TRADE",
      relatedEntityId: trade.id,
      details: JSON.stringify({
        fileType: mimeType,
        fileSize: buffer.length,
        recipientId: user.id === trade.buyerId ? trade.sellerId : trade.buyerId,
        timestamp: new Date().toISOString(),
      }),
    });

    // Send notification
    const { notifyTradeEvent } = await import("../../../utils/notifications");
    notifyTradeEvent(trade.id, "TRADE_MESSAGE", {
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
      amount: trade.amount,
      currency: trade.offer?.currency || trade.currency,
      senderId: user.id,
      hasAttachment: true,
    }).catch(console.error);

    // Broadcast WebSocket event for real-time message updates
    const { broadcastP2PTradeEvent } = await import("../index.ws");
    broadcastP2PTradeEvent(trade.id, {
      type: "MESSAGE",
      data: {
        id: messageEntry.id,
        message: messageContent,
        senderId: user.id,
        senderName: messageEntry.senderName,
        createdAt: messageEntry.createdAt,
        attachment: messageEntry.attachment,
      },
    });

    ctx?.success(`Uploaded ${mimeType} to trade ${trade.id.slice(0, 8)}...`);

    return {
      message: "File uploaded successfully.",
      data: {
        id: messageEntry.id,
        message: messageContent,
        createdAt: messageEntry.createdAt,
        senderId: user.id,
        senderName: messageEntry.senderName,
        attachment: messageEntry.attachment,
      },
    };
  } catch (err: any) {
    if (err.statusCode) {
      throw err;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to upload file: " + err.message,
    });
  }
};
