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
exports.metadata = {
    summary: "Confirm Payment for Trade",
    description: "Updates the trade status to 'PAYMENT_SENT' to confirm that payment has been made.",
    operationId: "confirmP2PTradePayment",
    tags: ["P2P", "Trade"],
    requiresAuth: true,
    logModule: "P2P_TRADE",
    logTitle: "Confirm payment",
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
    responses: {
        200: { description: "Payment confirmed successfully." },
        401: { description: "Unauthorized." },
        404: { description: "Trade not found." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    const { id } = data.params || {};
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding and validating trade");
    const { validateTradeStatusTransition } = await Promise.resolve().then(() => __importStar(require("../../utils/validation")));
    const { notifyTradeEvent } = await Promise.resolve().then(() => __importStar(require("../../utils/notifications")));
    const { broadcastP2PTradeEvent } = await Promise.resolve().then(() => __importStar(require("./index.ws")));
    const trade = await db_1.models.p2pTrade.findOne({
        where: { id, buyerId: user.id },
        include: [{
                model: db_1.models.p2pOffer,
                as: "offer",
                attributes: ["currency"],
            }],
    });
    if (!trade) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Trade not found" });
    }
    if (!validateTradeStatusTransition(trade.status, "PAYMENT_SENT")) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot confirm payment from status: ${trade.status}`
        });
    }
    if (trade.expiresAt && new Date(trade.expiresAt) < new Date()) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Trade has expired"
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating trade status to PAYMENT_SENT");
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
        timeline.push({
            event: "PAYMENT_CONFIRMED",
            message: "Buyer confirmed payment sent",
            userId: user.id,
            createdAt: new Date().toISOString(),
            paymentReference: body === null || body === void 0 ? void 0 : body.paymentReference,
        });
        const previousStatus = trade.status;
        await trade.update({
            status: "PAYMENT_SENT",
            timeline,
            paymentConfirmedAt: new Date(),
        });
        await trade.reload();
        if (trade.status !== "PAYMENT_SENT") {
            console_1.logger.error("P2P_TRADE", `Status update failed! Expected PAYMENT_SENT, got ${trade.status}`);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to update trade status"
            });
        }
        console_1.logger.info("P2P_TRADE", `Trade ${trade.id} status updated: ${previousStatus} -> ${trade.status}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging activity and sending notifications");
        await db_1.models.p2pActivityLog.create({
            userId: user.id,
            type: "PAYMENT_CONFIRMED",
            action: "PAYMENT_CONFIRMED",
            relatedEntity: "TRADE",
            relatedEntityId: trade.id,
            details: JSON.stringify({
                previousStatus,
                newStatus: trade.status,
                paymentReference: body === null || body === void 0 ? void 0 : body.paymentReference,
            }),
        });
        notifyTradeEvent(trade.id, "PAYMENT_CONFIRMED", {
            buyerId: trade.buyerId,
            sellerId: trade.sellerId,
            amount: trade.amount,
            currency: trade.offer.currency,
        }).catch(console.error);
        broadcastP2PTradeEvent(trade.id, {
            type: "STATUS_CHANGE",
            data: {
                status: "PAYMENT_SENT",
                previousStatus: "PENDING",
                paymentConfirmedAt: trade.paymentConfirmedAt,
                timeline,
            },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Payment confirmed for trade ${trade.id.slice(0, 8)}... (${trade.amount} ${trade.offer.currency})`);
        return {
            message: "Payment confirmed successfully.",
            trade: {
                id: trade.id,
                status: trade.status,
                paymentConfirmedAt: trade.paymentConfirmedAt,
            }
        };
    }
    catch (err) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to confirm payment: " + err.message,
        });
    }
};
