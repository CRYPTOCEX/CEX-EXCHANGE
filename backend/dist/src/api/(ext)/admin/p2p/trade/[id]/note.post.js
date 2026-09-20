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
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const uuid_1 = require("uuid");
exports.metadata = {
    summary: "Add Admin Note or Message to Trade",
    description: "Adds a note or message to a trade as an admin. Notes are internal, messages are visible to users.",
    operationId: "adminAddNoteToP2PTrade",
    tags: ["Admin", "Trades", "P2P"],
    requiresAuth: true,
    logModule: "ADMIN_P2P",
    logTitle: "Add note to trade",
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
        description: "Note or message data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        note: { type: "string" },
                        isMessage: { type: "boolean", default: false },
                    },
                    required: ["note"],
                },
            },
        },
    },
    responses: {
        200: { description: "Admin note/message added successfully." },
        401: { description: "Unauthorized." },
        404: { description: "Trade not found." },
        500: { description: "Internal Server Error." },
    },
    permission: "edit.p2p.trade",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    const { id } = params;
    const { note, isMessage = false } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching trade");
        const trade = await db_1.models.p2pTrade.findByPk(id, {
            include: [
                {
                    model: db_1.models.user,
                    as: "buyer",
                    attributes: ["id", "email"],
                },
                {
                    model: db_1.models.user,
                    as: "seller",
                    attributes: ["id", "email"],
                },
            ],
        });
        if (!trade) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Trade not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Trade not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Getting admin information");
        const admin = await db_1.models.user.findByPk(data.user.id, {
            attributes: ["firstName", "lastName"],
        });
        const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() : "Admin";
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing timeline");
        let currentTimeline = trade.timeline || [];
        if (typeof currentTimeline === 'string') {
            try {
                currentTimeline = JSON.parse(currentTimeline);
            }
            catch (e) {
                console_1.logger.error("P2P", "Failed to parse timeline JSON", e);
                currentTimeline = [];
            }
        }
        if (!Array.isArray(currentTimeline)) {
            currentTimeline = [];
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Adding ${isMessage ? "message" : "note"} to timeline`);
        const messageId = (0, uuid_1.v4)();
        const createdAt = new Date().toISOString();
        const timelineEntry = isMessage
            ? {
                id: messageId,
                event: "MESSAGE",
                message: note,
                senderId: data.user.id,
                senderName: adminName,
                isAdminMessage: true,
                createdAt,
            }
            : {
                event: "Admin Note",
                message: note,
                details: `Note added by ${adminName}`,
                adminId: data.user.id,
                timestamp: new Date().toISOString(),
            };
        currentTimeline.push(timelineEntry);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating trade");
        await trade.update({
            timeline: currentTimeline,
        });
        if (isMessage) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notifications and broadcasting via WebSocket");
            const { notifyTradeEvent } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/utils/notifications")));
            const { broadcastP2PTradeEvent } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/trade/[id]/index.ws")));
            broadcastP2PTradeEvent(trade.id, {
                type: "MESSAGE",
                data: {
                    id: messageId,
                    message: note,
                    senderId: data.user.id,
                    senderName: adminName,
                    createdAt,
                    isAdminMessage: true,
                },
            });
            notifyTradeEvent(trade.id, "ADMIN_MESSAGE", {
                buyerId: trade.buyerId,
                sellerId: trade.sellerId,
                amount: trade.amount,
                currency: trade.currency,
                adminName: adminName,
                message: note,
            }).catch((error) => console_1.logger.error("P2P", "Failed to send admin message notification", error));
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(isMessage ? "Admin message sent successfully" : "Admin note added successfully");
        return {
            message: isMessage
                ? "Admin message sent successfully."
                : "Admin note added successfully."
        };
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to add ${isMessage ? "message" : "note"}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
