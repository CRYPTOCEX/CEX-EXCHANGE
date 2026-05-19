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
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Dispute Trade",
    description: "Creates a dispute for a trade by providing a reason and description.",
    operationId: "disputeP2PTrade",
    tags: ["P2P", "Trade"],
    requiresAuth: true,
    middleware: ["p2pDisputeCreateRateLimit"],
    logModule: "P2P_DISPUTE",
    logTitle: "Create dispute",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Trade ID",
            required: true,
            schema: { type: "string", format: "uuid" },
        },
    ],
    requestBody: {
        description: "Dispute details",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reason: {
                            type: "string",
                            enum: [
                                "PAYMENT_NOT_RECEIVED",
                                "PAYMENT_INCORRECT_AMOUNT",
                                "CRYPTO_NOT_RELEASED",
                                "SELLER_UNRESPONSIVE",
                                "BUYER_UNRESPONSIVE",
                                "FRAUDULENT_ACTIVITY",
                                "TERMS_VIOLATION",
                                "OTHER"
                            ]
                        },
                        description: {
                            type: "string",
                            minLength: 20,
                            maxLength: 1000
                        },
                        evidence: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    type: { type: "string", enum: ["screenshot", "document", "text"] },
                                    content: { type: "string" },
                                    description: { type: "string" }
                                }
                            },
                            maxItems: 5
                        }
                    },
                    required: ["reason", "description"],
                },
            },
        },
    },
    responses: {
        200: { description: "Dispute created successfully." },
        400: { description: "Bad Request - Invalid dispute data." },
        401: { description: "Unauthorized." },
        404: { description: "Trade not found." },
        409: { description: "Conflict - Trade already disputed." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    const { id } = data.params || {};
    const { reason, description, evidence } = data.body;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating dispute details");
    const { validateDisputeReason, sanitizeInput, validateTradeStatusTransition } = await Promise.resolve().then(() => __importStar(require("../../utils/validation")));
    const { notifyTradeEvent } = await Promise.resolve().then(() => __importStar(require("../../utils/notifications")));
    const { broadcastP2PTradeEvent } = await Promise.resolve().then(() => __importStar(require("./index.ws")));
    const validatedReason = validateDisputeReason(reason);
    const sanitizedDescription = sanitizeInput(description);
    if (!sanitizedDescription || sanitizedDescription.length < 20) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Dispute description must be at least 20 characters"
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding and locking trade");
    const transaction = await db_1.sequelize.transaction();
    let transactionCommitted = false;
    try {
        const trade = await db_1.models.p2pTrade.findOne({
            where: {
                id,
                [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
            },
            include: [{
                    model: db_1.models.p2pOffer,
                    as: "offer",
                    attributes: ["currency", "type"],
                }],
            lock: true,
            transaction,
        });
        if (!trade) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Trade not found" });
        }
        if (!validateTradeStatusTransition(trade.status, "DISPUTED")) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot dispute trade with status: ${trade.status}`
            });
        }
        if (trade.status === "COMPLETED" && trade.completedAt) {
            const disputeTimeLimit = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - new Date(trade.completedAt).getTime() > disputeTimeLimit) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Dispute time limit exceeded (7 days after completion)"
                });
            }
        }
        const existingDispute = await db_1.models.p2pDispute.findOne({
            where: {
                tradeId: trade.id,
                status: { [sequelize_1.Op.ne]: "RESOLVED" }
            },
            transaction,
        });
        if (existingDispute) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Trade is already under dispute"
            });
        }
        const previousStatus = trade.status;
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Creating dispute record (reason: ${validatedReason})`);
        const againstId = trade.buyerId === user.id ? trade.sellerId : trade.buyerId;
        const dispute = await db_1.models.p2pDispute.create({
            tradeId: id,
            amount: (trade.amount || 0).toString(),
            reportedById: user.id,
            againstId,
            reason: validatedReason,
            details: sanitizedDescription,
            filedOn: new Date(),
            status: "PENDING",
            priority: determinePriority(validatedReason, trade.amount),
            evidence: evidence || []
        }, { transaction });
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
            event: "DISPUTE_OPENED",
            message: `Dispute opened: ${validatedReason}`,
            userId: user.id,
            disputeId: dispute.id,
            createdAt: new Date().toISOString(),
        });
        await trade.update({ status: "DISPUTED", timeline, disputedAt: new Date() }, { transaction });
        await db_1.models.p2pActivityLog.create({
            userId: user.id,
            type: "DISPUTE_CREATED",
            action: "DISPUTE_CREATED",
            relatedEntity: "DISPUTE",
            relatedEntityId: dispute.id,
            details: JSON.stringify({
                tradeId: trade.id,
                reason: validatedReason,
                againstId,
            }),
        }, { transaction });
        await transaction.commit();
        transactionCommitted = true;
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Created dispute for trade ${trade.id.slice(0, 8)}... (${validatedReason})`);
        notifyTradeEvent(trade.id, "TRADE_DISPUTED", {
            buyerId: trade.buyerId,
            sellerId: trade.sellerId,
            amount: trade.amount,
            currency: trade.offer.currency,
            reason: validatedReason,
            disputeId: dispute.id,
        }).catch((err) => console_1.logger.error("P2P", "Failed to send trade disputed notification", err));
        broadcastP2PTradeEvent(trade.id, {
            type: "DISPUTE",
            data: {
                status: "DISPUTED",
                previousStatus: trade.status,
                disputeId: dispute.id,
                reason: validatedReason,
                filedBy: user.id,
            },
        });
        const response = {
            message: "Dispute created successfully.",
            disputeId: dispute.id,
            dispute: {
                id: dispute.id,
                tradeId: dispute.tradeId,
                reason: dispute.reason,
                status: dispute.status,
                priority: dispute.priority,
                createdAt: dispute.filedOn,
            }
        };
        if (previousStatus === "COMPLETED") {
            response.warning = "This trade was already completed and funds have been released. Since no funds are currently held in escrow, this dispute will be handled manually by admins.";
        }
        return response;
    }
    catch (err) {
        if (!transactionCommitted) {
            await transaction.rollback();
        }
        if (err.statusCode) {
            throw err;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to create dispute: " + err.message,
        });
    }
};
function determinePriority(reason, amount) {
    const highPriorityReasons = ["FRAUDULENT_ACTIVITY", "PAYMENT_NOT_RECEIVED"];
    if (highPriorityReasons.includes(reason)) {
        return "HIGH";
    }
    if (amount > 1000) {
        return "HIGH";
    }
    else if (amount > 100) {
        return "MEDIUM";
    }
    return "LOW";
}
