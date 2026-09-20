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
const Middleware_1 = require("@b/handler/Middleware");
const ownership_1 = require("../../../../p2p/utils/ownership");
const json_parser_1 = require("../../../../p2p/utils/json-parser");
const utils_1 = require("@b/api/finance/wallet/utils");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Activate P2P offer",
    description: "Activates a paused, disabled, rejected, or cancelled P2P offer. Changes the offer status to ACTIVE and logs the admin action with activity trail. For SELL offers transitioning from PAUSED, re-locks funds if balance is sufficient.",
    operationId: "activateAdminP2POffer",
    tags: ["Admin", "P2P", "Offer"],
    requiresAuth: true,
    middleware: [Middleware_1.p2pAdminOfferRateLimit],
    logModule: "ADMIN_P2P",
    logTitle: "Activate P2P offer",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Offer ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "Offer activated successfully." },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Resource"),
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.p2p.offer",
};
exports.default = async (data) => {
    var _a, _b;
    const { params, user, ctx } = data;
    const { id } = params;
    const { notifyOfferEvent } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/utils/notifications")));
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching offer");
        const offer = await db_1.models.p2pOffer.findByPk(id, {
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email"],
                },
            ],
            lock: true,
            transaction,
        });
        if (!offer) {
            await transaction.rollback();
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Offer not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Offer not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating offer status");
        const allowedStatuses = ["PAUSED", "DISABLED", "REJECTED", "CANCELLED"];
        if (!allowedStatuses.includes(offer.status)) {
            await transaction.rollback();
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Cannot activate offer with status ${offer.status}`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot activate offer with status ${offer.status}. Only PAUSED, DISABLED, or REJECTED offers can be activated.`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Getting admin information");
        const adminUser = await db_1.models.user.findByPk(user.id, {
            attributes: ["id", "firstName", "lastName", "email"],
            transaction,
        });
        const adminName = adminUser
            ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin'
            : 'Admin';
        const previousStatus = offer.status;
        let fundsLocked = false;
        let lockedAmount = 0;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking if funds need to be re-locked");
        if (offer.type === "SELL" && previousStatus === "PAUSED") {
            const amountConfig = (0, json_parser_1.parseAmountConfig)(offer.amountConfig);
            const requiredAmount = amountConfig.total;
            if (requiredAmount > 0) {
                const wallet = await (0, utils_1.getWalletSafe)(offer.userId, offer.walletType, offer.currency, false, ctx);
                if (!wallet || ((_a = wallet.balance) !== null && _a !== void 0 ? _a : 0) < requiredAmount) {
                    await transaction.rollback();
                    ctx === null || ctx === void 0 ? void 0 : ctx.fail("Insufficient balance to re-lock funds for offer");
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: `Insufficient balance to activate offer. Available: ${(_b = wallet === null || wallet === void 0 ? void 0 : wallet.balance) !== null && _b !== void 0 ? _b : 0} ${offer.currency}, Required: ${requiredAmount} ${offer.currency}`,
                    });
                }
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Re-locking funds for SELL offer");
                const idempotencyKey = `p2p_admin_activate_offer_${offer.id}_${Date.now()}`;
                await wallet_1.walletService.hold({
                    idempotencyKey,
                    userId: offer.userId,
                    walletId: wallet.id,
                    walletType: offer.walletType,
                    currency: offer.currency,
                    amount: requiredAmount,
                    operationType: "P2P_OFFER_LOCK",
                    description: `Lock ${requiredAmount} ${offer.currency} - P2P offer activated by admin`,
                    metadata: {
                        offerId: offer.id,
                        adminId: user.id,
                    },
                    transaction,
                });
                fundsLocked = true;
                lockedAmount = requiredAmount;
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Activating offer");
        await offer.update({
            status: "ACTIVE",
            activityLog: [
                ...(offer.activityLog || []),
                {
                    type: "ACTIVATED",
                    adminId: user.id,
                    adminName: adminName,
                    previousStatus,
                    fundsLocked,
                    lockedAmount,
                    createdAt: new Date().toISOString(),
                },
            ],
        }, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging admin activity");
        await (0, ownership_1.logP2PAdminAction)(user.id, "OFFER_ACTIVATED", "OFFER", offer.id, {
            offerUserId: offer.userId,
            offerType: offer.type,
            currency: offer.currency,
            previousStatus,
            activatedBy: adminName,
            fundsLocked,
            lockedAmount,
        });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification");
        notifyOfferEvent(offer.id, "OFFER_ACTIVATED", {
            activatedBy: adminName,
            fundsLocked,
            lockedAmount,
        }).catch((error) => console_1.logger.error("P2P", "Failed to send offer activated notification", error));
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Offer activated successfully");
        return {
            message: "Offer activated successfully.",
            offer: {
                id: offer.id,
                status: "ACTIVE",
                fundsLocked,
                lockedAmount,
            }
        };
    }
    catch (err) {
        await transaction.rollback();
        if (err.statusCode) {
            throw err;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to activate offer");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
