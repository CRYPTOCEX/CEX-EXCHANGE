"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const wallet_1 = require("@b/services/wallet");
const cache_1 = require("@b/utils/cache");
const settlement_1 = require("@b/api/(ext)/nft/utils/settlement");
const stale_settlement_1 = require("@b/api/(ext)/nft/utils/stale-settlement");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Toggle NFT offer status",
    operationId: "adminToggleNftOfferStatus",
    tags: ["Admin", "NFT", "Offer"],
    description: "Admin-only disable/enable switch for a user-created NFT offer. Accepts a boolean and maps it to the nftOffer enum: true -> ACTIVE, false -> CANCELLED.",
    logModule: "ADMIN_NFT",
    logTitle: "Toggle NFT Offer Status",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Offer ID",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "true to activate, false to cancel/disable",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Offer"),
    requiresAuth: true,
    permission: "edit.nft",
};
exports.default = async (data) => {
    var _a, _b;
    var _c;
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    if (typeof status !== "boolean") {
        throw (0, error_1.createError)({ statusCode: 400, message: "status must be a boolean" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching offer ${id}`);
    const offer = await db_1.models.nftOffer.findByPk(id);
    if (!offer) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Offer not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Offer not found" });
    }
    const nextStatus = status ? "ACTIVE" : "CANCELLED";
    const updateData = { status: nextStatus };
    if (!status) {
        updateData.cancelledAt = new Date();
    }
    if (!status && offer.status === "ACCEPTED") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Unwinding accepted sale before cancelling");
        if (await (0, stale_settlement_1.transferWasConfirmed)(offer.id)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Sale already settled");
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "This offer has already settled on chain and cannot be cancelled. Use the dispute queue to reverse it.",
            });
        }
        const outcome = await (0, stale_settlement_1.unwindStaleAcceptedOffer)(offer.get({ plain: true }), {
            terminalStatus: "CANCELLED",
            reason: "cancelled by an administrator",
            reasonCode: "admin_cancelled",
        });
        if (!outcome.reversed) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Escrow could not be released");
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `The buyer's escrow could not be released (${(_c = (_a = outcome.shortfall) === null || _a === void 0 ? void 0 : _a.reason) !== null && _c !== void 0 ? _c : "held funds are short"}). ` +
                    "The offer has been left ACCEPTED so the stale-sale sweep can still escalate it.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Offer cancelled and buyer escrow released");
        return { message: "Offer status updated successfully" };
    }
    const shouldReleaseEscrow = !status && offer.status === "ACTIVE";
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Setting offer status to ${nextStatus}`);
    if (shouldReleaseEscrow) {
        const cacheManager = cache_1.CacheManager.getInstance();
        const settings = await cacheManager.getSettings();
        const offerAmount = parseFloat(((_b = offer.amount) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
        const held = await (0, settlement_1.escrowHeldFor)(offer.id);
        const escrowAmount = held !== null && held !== void 0 ? held : offerAmount * (1 + (0, settlement_1.marketplaceFeePercent)(settings) / 100);
        await db_1.sequelize.transaction(async (transaction) => {
            await offer.update(updateData, { transaction });
            try {
                await wallet_1.walletService.release({
                    idempotencyKey: `nft_offer_release_${offer.id}`,
                    userId: offer.userId,
                    walletType: "SPOT",
                    currency: offer.currency,
                    amount: escrowAmount,
                    operationType: "NFT_OFFER",
                    description: `Release escrow ${escrowAmount} ${offer.currency} - NFT offer cancelled by admin`,
                    metadata: {
                        offerId: offer.id,
                        reason: "admin_cancelled",
                    },
                    transaction,
                });
            }
            catch (releaseError) {
                if ((releaseError === null || releaseError === void 0 ? void 0 : releaseError.name) === "DuplicateOperationError") {
                }
                else if ((releaseError === null || releaseError === void 0 ? void 0 : releaseError.name) === "InsufficientHeldFundsError") {
                    console_1.logger.warn("NFT_OFFER", `No escrow to release for admin-cancelled offer ${offer.id} (likely legacy); continuing`);
                }
                else {
                    throw releaseError;
                }
            }
        });
    }
    else {
        await offer.update(updateData);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Offer status updated successfully");
    return { message: "Offer status updated successfully" };
};
