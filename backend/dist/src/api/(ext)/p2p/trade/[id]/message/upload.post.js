"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const sharp_1 = __importDefault(require("sharp"));
const console_1 = require("@b/utils/console");
const isProduction = process.env.NODE_ENV === "production";
exports.metadata = {
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
const generateFileUrl = (relativePath) => {
    return `/uploads/${relativePath}`;
};
async function ensureDirExists(dir) {
    try {
        await promises_1.default.access(dir);
    }
    catch (error) {
        if (error.code === "ENOENT") {
            await promises_1.default.mkdir(dir, { recursive: true });
        }
        else {
            throw error;
        }
    }
}
exports.default = async (data) => {
    var _a;
    const { id } = data.params || {};
    const { file: base64File, filename: originalFilename } = data.body;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating file upload");
    if (!base64File) {
        throw (0, error_1.createError)({ statusCode: 400, message: "No file provided" });
    }
    const matches = base64File.match(/^data:(.*);base64,(.*)$/);
    if (!matches) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid file format. Expected base64 encoded file." });
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(mimeType)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid file type. Only images allowed: JPEG, PNG, GIF, WebP",
        });
    }
    const buffer = Buffer.from(base64Data, "base64");
    const maxSize = 5 * 1024 * 1024;
    if (buffer.length > maxSize) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "File too large. Maximum size: 5MB",
        });
    }
    const trade = await db_1.models.p2pTrade.findOne({
        where: {
            id,
            [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
        include: [
            {
                model: db_1.models.p2pOffer,
                as: "offer",
                attributes: ["currency"],
            },
        ],
    });
    if (!trade) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Trade not found" });
    }
    const disallowedStatuses = ["COMPLETED", "CANCELLED", "EXPIRED"];
    if (disallowedStatuses.includes(trade.status)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot send files on ${trade.status.toLowerCase()} trades`,
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing and saving image");
        const baseDir = isProduction
            ? path_1.default.resolve(process.cwd(), "frontend", "public")
            : path_1.default.resolve(process.cwd(), "..", "frontend", "public");
        const uploadDir = path_1.default.join(baseDir, "uploads", "p2p", "trade", id);
        await ensureDirExists(uploadDir);
        let filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        let processedData = buffer;
        if (!mimeType.includes("gif")) {
            processedData = await (0, sharp_1.default)(buffer)
                .resize({ width: 1200, height: 1200, fit: "inside" })
                .webp({ quality: 80 })
                .toBuffer();
            filename += ".webp";
        }
        else {
            filename += ".gif";
        }
        const filePath = path_1.default.join(uploadDir, filename);
        await promises_1.default.writeFile(filePath, processedData);
        const fileUrl = generateFileUrl(`p2p/trade/${id}/${filename}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding image message to trade timeline");
        let timeline = trade.timeline || [];
        if (typeof timeline === "string") {
            try {
                timeline = JSON.parse(timeline);
            }
            catch (e) {
                console_1.logger.error("P2P_TRADE", "Failed to parse timeline JSON", e);
                timeline = [];
            }
        }
        if (!Array.isArray(timeline)) {
            timeline = [];
        }
        const messageContent = `![Image](${fileUrl})`;
        const messageEntry = {
            id: (0, uuid_1.v4)(),
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
        await trade.update({ timeline, lastMessageAt: new Date() });
        await db_1.models.p2pActivityLog.create({
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
        const { notifyTradeEvent } = await Promise.resolve().then(() => __importStar(require("../../../utils/notifications")));
        notifyTradeEvent(trade.id, "TRADE_MESSAGE", {
            buyerId: trade.buyerId,
            sellerId: trade.sellerId,
            amount: trade.amount,
            currency: ((_a = trade.offer) === null || _a === void 0 ? void 0 : _a.currency) || trade.currency,
            senderId: user.id,
            hasAttachment: true,
        }).catch(console.error);
        const { broadcastP2PTradeEvent } = await Promise.resolve().then(() => __importStar(require("../index.ws")));
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
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Uploaded ${mimeType} to trade ${trade.id.slice(0, 8)}...`);
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
    }
    catch (err) {
        if (err.statusCode) {
            throw err;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to upload file: " + err.message,
        });
    }
};
