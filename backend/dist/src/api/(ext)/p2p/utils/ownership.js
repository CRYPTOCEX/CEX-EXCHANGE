"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOfferOwner = isOfferOwner;
exports.isTradeParticipant = isTradeParticipant;
exports.isPaymentMethodOwner = isPaymentMethodOwner;
exports.requireOfferOwnership = requireOfferOwnership;
exports.requireTradeParticipation = requireTradeParticipation;
exports.logP2PAdminAction = logP2PAdminAction;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
async function isOfferOwner(userId, offerId, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Checking if user ${userId} owns offer ${offerId}`);
        const offer = await db_1.models.p2pOffer.findByPk(offerId, {
            attributes: ["userId"],
        });
        const isOwner = (offer === null || offer === void 0 ? void 0 : offer.userId) === userId;
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Offer ownership check: ${isOwner}`);
        return isOwner;
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message || "Failed to check offer ownership");
        throw error;
    }
}
async function isTradeParticipant(userId, tradeId, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Checking if user ${userId} is participant in trade ${tradeId}`);
        const trade = await db_1.models.p2pTrade.findByPk(tradeId, {
            attributes: ["buyerId", "sellerId"],
        });
        const isParticipant = (trade === null || trade === void 0 ? void 0 : trade.buyerId) === userId || (trade === null || trade === void 0 ? void 0 : trade.sellerId) === userId;
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Trade participation check: ${isParticipant}`);
        return isParticipant;
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message || "Failed to check trade participation");
        throw error;
    }
}
async function isPaymentMethodOwner(userId, paymentMethodId, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Checking if user ${userId} owns payment method ${paymentMethodId}`);
        const paymentMethod = await db_1.models.p2pPaymentMethod.findByPk(paymentMethodId, {
            attributes: ["userId"],
        });
        const isOwner = (paymentMethod === null || paymentMethod === void 0 ? void 0 : paymentMethod.userId) === userId;
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Payment method ownership check: ${isOwner}`);
        return isOwner;
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message || "Failed to check payment method ownership");
        throw error;
    }
}
async function requireOfferOwnership(userId, offerId, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Verifying offer ownership");
        const isOwner = await isOfferOwner(userId, offerId, ctx);
        if (!isOwner) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "User does not own this offer");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "You don't have permission to modify this offer",
            });
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Offer ownership verified");
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message || "Failed to verify offer ownership");
        throw error;
    }
}
async function requireTradeParticipation(userId, tradeId, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Verifying trade participation");
        const isParticipant = await isTradeParticipant(userId, tradeId, ctx);
        if (!isParticipant) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "User is not part of this trade");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "You are not part of this trade",
            });
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Trade participation verified");
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message || "Failed to verify trade participation");
        throw error;
    }
}
async function logP2PAdminAction(userId, action, entityType, entityId, metadata, ctx, transaction) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Logging admin action: ${action} for ${entityType} ${entityId}`);
        await db_1.models.p2pActivityLog.create({
            userId,
            type: `ADMIN_${action}`,
            action: action,
            relatedEntity: entityType,
            relatedEntityId: entityId,
            details: JSON.stringify({
                ...metadata,
                timestamp: new Date().toISOString(),
                isAdminAction: true,
            }),
        }, transaction ? { transaction } : undefined);
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Admin action logged successfully");
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message || "Failed to log admin action");
        console_1.logger.error("P2P_ADMIN", "Failed to log P2P admin action", error);
    }
}
