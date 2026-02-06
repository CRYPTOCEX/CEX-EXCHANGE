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
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const uuid_1 = require("uuid");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Send Trade Message",
    description: "Sends a message within a trade (appended to the timeline).",
    operationId: "sendP2PTradeMessage",
    tags: ["P2P", "Trade"],
    requiresAuth: true,
    middleware: ["p2pMessageRateLimit"],
    logModule: "P2P_MESSAGE",
    logTitle: "Send trade message",
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
        description: "Message payload",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        message: { type: "string" },
                    },
                    required: ["message"],
                },
            },
        },
    },
    responses: {
        200: { description: "Message sent successfully." },
        401: { description: "Unauthorized." },
        404: { description: "Trade not found." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    var _a;
    const { id } = data.params || {};
    const { message } = data.body;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating message content");
    const { validateMessage } = await Promise.resolve().then(() => __importStar(require("../../../utils/validation")));
    const { notifyTradeEvent } = await Promise.resolve().then(() => __importStar(require("../../../utils/notifications")));
    const { broadcastP2PTradeEvent } = await Promise.resolve().then(() => __importStar(require("../index.ws")));
    const sanitizedMessage = validateMessage(message);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding trade and checking permissions");
    const trade = await db_1.models.p2pTrade.findOne({
        where: {
            id,
            [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
        include: [{
                model: db_1.models.p2pOffer,
                as: "offer",
                attributes: ["currency"],
            }],
    });
    if (!trade) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Trade not found" });
    }
    const disallowedStatuses = ["COMPLETED", "CANCELLED", "EXPIRED"];
    if (disallowedStatuses.includes(trade.status)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Cannot send messages on " + trade.status.toLowerCase() + " trades"
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding message to trade timeline");
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
        const messageEntry = {
            id: (0, uuid_1.v4)(),
            event: "MESSAGE",
            message: sanitizedMessage,
            senderId: user.id,
            senderName: user.firstName || "User",
            createdAt: new Date().toISOString(),
        };
        timeline.push(messageEntry);
        await trade.update({
            timeline,
            lastMessageAt: new Date(),
        });
        await db_1.models.p2pActivityLog.create({
            userId: user.id,
            type: "MESSAGE_SENT",
            action: "MESSAGE_SENT",
            relatedEntity: "TRADE",
            relatedEntityId: trade.id,
            details: JSON.stringify({
                messageLength: sanitizedMessage.length,
                recipientId: user.id === trade.buyerId ? trade.sellerId : trade.buyerId,
                timestamp: new Date().toISOString(),
            }),
        });
        notifyTradeEvent(trade.id, "TRADE_MESSAGE", {
            buyerId: trade.buyerId,
            sellerId: trade.sellerId,
            amount: trade.amount,
            currency: (_a = trade.offer) === null || _a === void 0 ? void 0 : _a.currency,
            senderId: user.id,
        }).catch(console.error);
        broadcastP2PTradeEvent(trade.id, {
            type: "MESSAGE",
            data: {
                id: messageEntry.id,
                message: sanitizedMessage,
                senderId: user.id,
                senderName: messageEntry.senderName,
                createdAt: messageEntry.createdAt,
            },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Sent message in trade " + trade.id.slice(0, 8) + "...");
        return {
            message: "Message sent successfully.",
            data: {
                id: messageEntry.id,
                message: sanitizedMessage,
                createdAt: messageEntry.createdAt,
                senderId: user.id,
                senderName: messageEntry.senderName,
            }
        };
    }
    catch (err) {
        if (err.statusCode)
            throw err;
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to send message: " + err.message,
        });
    }
};
