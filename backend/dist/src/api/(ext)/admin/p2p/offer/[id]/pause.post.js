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
    summary: "Pause P2P offer",
    description: "Temporarily pauses an ACTIVE P2P offer. Sets the offer status to PAUSED and notifies the offer owner. For SELL offers, locked funds are released back to the user's available balance.",
    operationId: "pauseAdminP2POffer",
    tags: ["Admin", "P2P", "Offer"],
    requiresAuth: true,
    middleware: [Middleware_1.p2pAdminOfferRateLimit],
    logModule: "ADMIN_P2P",
    logTitle: "Pause P2P offer",
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
        200: { description: "Offer paused successfully." },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Resource"),
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.p2p.offer",
};
exports.default = async (data) => {
    var _a;
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
        if (offer.status !== "ACTIVE") {
            await transaction.rollback();
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Cannot pause offer with status ${offer.status}`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot pause offer with status ${offer.status}. Only ACTIVE offers can be paused.`,
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
        let fundsReleased = false;
        let releasedAmount = 0;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for locked funds to release");
        if (offer.type === "SELL") {
            const amountConfig = (0, json_parser_1.parseAmountConfig)(offer.amountConfig);
            const lockedAmount = amountConfig.total;
            if (lockedAmount > 0) {
                const wallet = await (0, utils_1.getWalletSafe)(offer.userId, offer.walletType, offer.currency, false, ctx);
                if (wallet && ((_a = wallet.inOrder) !== null && _a !== void 0 ? _a : 0) >= lockedAmount) {
                    ctx === null || ctx === void 0 ? void 0 : ctx.step("Releasing locked funds");
                    const idempotencyKey = `p2p_admin_pause_offer_${offer.id}_${Date.now()}`;
                    await wallet_1.walletService.release({
                        idempotencyKey,
                        userId: offer.userId,
                        walletId: wallet.id,
                        walletType: offer.walletType,
                        currency: offer.currency,
                        amount: lockedAmount,
                        operationType: "P2P_OFFER_PAUSE",
                        description: `Release ${lockedAmount} ${offer.currency} - P2P offer paused by admin`,
                        metadata: {
                            offerId: offer.id,
                            adminId: user.id,
                        },
                        transaction,
                    });
                    fundsReleased = true;
                    releasedAmount = lockedAmount;
                }
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Pausing offer");
        await offer.update({
            status: "PAUSED",
            activityLog: [
                ...(offer.activityLog || []),
                {
                    type: "PAUSED",
                    adminId: user.id,
                    adminName: adminName,
                    previousStatus,
                    fundsReleased,
                    releasedAmount,
                    createdAt: new Date().toISOString(),
                },
            ],
        }, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging admin activity");
        await (0, ownership_1.logP2PAdminAction)(user.id, "OFFER_PAUSED", "OFFER", offer.id, {
            offerUserId: offer.userId,
            offerType: offer.type,
            currency: offer.currency,
            previousStatus,
            pausedBy: adminName,
            fundsReleased,
            releasedAmount,
        });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification");
        notifyOfferEvent(offer.id, "OFFER_PAUSED", {
            pausedBy: adminName,
            fundsReleased,
            releasedAmount,
        }).catch((error) => console_1.logger.error("P2P", "Failed to send offer paused notification", error));
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Offer paused successfully");
        return {
            message: "Offer paused successfully.",
            offer: {
                id: offer.id,
                status: "PAUSED",
                fundsReleased,
                releasedAmount,
            }
        };
    }
    catch (err) {
        await transaction.rollback();
        if (err.statusCode) {
            throw err;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to pause offer");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
