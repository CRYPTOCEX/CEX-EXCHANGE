"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/wallet/utils");
const json_parser_1 = require("@b/api/(ext)/p2p/utils/json-parser");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "Delete a P2P offer",
    description: "Deletes a P2P offer. Only the owner can delete their offer.",
    operationId: "deleteP2POffer",
    tags: ["P2P", "Offers"],
    logModule: "P2P_OFFER",
    logTitle: "Delete P2P offer",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "ID of the offer to delete",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requiresAuth: true,
    responses: {
        200: {
            description: "Offer deleted successfully",
        },
        401: query_1.unauthorizedResponse,
        403: {
            description: "Forbidden - You don't have permission to delete this offer",
        },
        404: (0, query_1.notFoundMetadataResponse)("Offer"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding and validating offer");
    const transaction = await db_1.sequelize.transaction();
    try {
        const offer = await db_1.models.p2pOffer.findByPk(id, {
            lock: true,
            transaction,
        });
        if (!offer) {
            await transaction.rollback();
            throw (0, error_1.createError)(404, "Offer not found");
        }
        if (offer.userId !== user.id) {
            await transaction.rollback();
            throw (0, error_1.createError)(403, "You don't have permission to delete this offer");
        }
        const activeTrades = await db_1.models.p2pTrade.count({
            where: {
                offerId: id,
                status: {
                    [sequelize_1.Op.in]: ["PENDING", "ACTIVE", "ESCROW", "PAID", "PAYMENT_SENT", "ESCROW_RELEASED"],
                    [sequelize_1.Op.notIn]: ["COMPLETED", "CANCELLED", "DISPUTED", "EXPIRED"]
                },
            },
            transaction,
        });
        if (activeTrades > 0) {
            await transaction.rollback();
            throw (0, error_1.createError)(400, "Cannot delete offer with active trades. Please wait for all trades to complete, expire, or cancel them first.");
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for funds to unlock");
        if (offer.type === "SELL") {
            const amountConfig = (0, json_parser_1.parseAmountConfig)(offer.amountConfig);
            const lockedAmount = amountConfig.total;
            if (lockedAmount > 0) {
                ctx === null || ctx === void 0 ? void 0 : ctx.step(`Unlocking ${lockedAmount} ${offer.currency} from wallet`);
                const wallet = await (0, utils_1.getWalletSafe)(user.id, offer.walletType, offer.currency, false, ctx);
                if (wallet && ((_a = wallet.inOrder) !== null && _a !== void 0 ? _a : 0) >= lockedAmount) {
                    const idempotencyKey = `p2p_offer_delete_release_${id}`;
                    await wallet_1.walletService.release({
                        idempotencyKey,
                        userId: user.id,
                        walletId: wallet.id,
                        walletType: offer.walletType,
                        currency: offer.currency,
                        amount: lockedAmount,
                        operationType: "P2P_OFFER_DELETE",
                        description: `Release ${lockedAmount} ${offer.currency} - P2P offer deleted`,
                        metadata: {
                            offerId: id,
                            offerType: offer.type,
                        },
                        transaction,
                    });
                    console_1.logger.info("P2P_OFFER", `Unlocked funds: ${lockedAmount} ${offer.currency} for user ${user.id} (${offer.walletType})`);
                }
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting offer");
        await offer.destroy({ transaction });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Deleted ${offer.type} offer for ${offer.currency}`);
        return {
            message: "Offer deleted successfully",
        };
    }
    catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
            }
            catch (rollbackError) {
            }
        }
        console_1.logger.error("P2P_OFFER", "Error deleting P2P offer", error);
        throw error;
    }
};
