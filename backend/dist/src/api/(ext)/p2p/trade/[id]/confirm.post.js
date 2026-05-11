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
const redis_1 = require("@b/utils/redis");
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
    var _a;
    const { id } = data.params || {};
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding and validating trade");
    const { validateTradeStatusTransition } = await Promise.resolve().then(() => __importStar(require("../../utils/validation")));
    const { notifyTradeEvent } = await Promise.resolve().then(() => __importStar(require("../../utils/notifications")));
    const { broadcastP2PTradeEvent } = await Promise.resolve().then(() => __importStar(require("./index.ws")));
    let redis = null;
    let lockAcquired = false;
    try {
        redis = redis_1.RedisSingleton.getInstance();
        const lockKey = `p2p:trade:${id}:action_lock`;
        lockAcquired = !!(await redis.set(lockKey, "1", "EX", 30, "NX"));
        if (!lockAcquired) {
            throw (0, error_1.createError)({ statusCode: 409, message: "Another operation is already in progress on this trade." });
        }
    }
    catch (lockError) {
        if (lockError.statusCode === 409)
            throw lockError;
        throw (0, error_1.createError)({ statusCode: 503, message: "Service temporarily unavailable. Please retry." });
    }
    const { sequelize } = await Promise.resolve().then(() => __importStar(require("@b/db")));
    const transaction = await sequelize.transaction({
        isolationLevel: sequelize.constructor.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    });
    try {
        const trade = await db_1.models.p2pTrade.findOne({
            where: { id, buyerId: user.id },
            lock: true,
            transaction,
            include: [{
                    model: db_1.models.p2pOffer,
                    as: "offer",
                    attributes: ["currency", "tradeSettings"],
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
        const now = new Date();
        if (trade.expiresAt && new Date(trade.expiresAt) < now) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Trade has expired"
            });
        }
        if (trade.createdAt) {
            let tradeSettings = (_a = trade.offer) === null || _a === void 0 ? void 0 : _a.tradeSettings;
            if (typeof tradeSettings === "string") {
                try {
                    tradeSettings = JSON.parse(tradeSettings);
                }
                catch (_b) {
                    tradeSettings = null;
                }
            }
            const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
            const cacheManager = CacheManager.getInstance();
            const defaultPaymentWindow = await cacheManager.getSetting("p2pDefaultPaymentWindow") || 30;
            const paymentWindowMinutes = (tradeSettings === null || tradeSettings === void 0 ? void 0 : tradeSettings.autoCancel) || defaultPaymentWindow;
            const tradeCreatedAt = new Date(String(trade.createdAt)).getTime();
            const expiresAtTime = tradeCreatedAt + (paymentWindowMinutes * 60 * 1000);
            if (now.getTime() >= expiresAtTime) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Trade has expired. The payment window has closed.",
                });
            }
        }
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
        }, { transaction });
        await transaction.commit();
        if (redis) {
            try {
                await redis.del(`p2p:trade:${id}:action_lock`);
            }
            catch (_) { }
        }
        console_1.logger.info("P2P_TRADE", `Trade ${trade.id} status updated: ${previousStatus} -> PAYMENT_SENT`);
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
        }).catch((err) => console_1.logger.error("P2P_TRADE", "Failed to send notification", err));
        broadcastP2PTradeEvent(trade.id, {
            type: "STATUS_CHANGE",
            data: {
                status: "PAYMENT_SENT",
                previousStatus,
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
        if (redis && lockAcquired) {
            try {
                await redis.del(`p2p:trade:${id}:action_lock`);
            }
            catch (_) { }
        }
        try {
            await transaction.rollback();
        }
        catch (_) { }
        if (err.statusCode)
            throw err;
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to confirm payment: " + err.message });
    }
};
