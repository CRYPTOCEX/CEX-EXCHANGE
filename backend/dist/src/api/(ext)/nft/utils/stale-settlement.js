"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIRM_GRACE_HOURS = void 0;
exports.confirmGraceMs = confirmGraceMs;
exports.transferWasConfirmed = transferWasConfirmed;
exports.unwindStaleAcceptedOffer = unwindStaleAcceptedOffer;
exports.unwindStaleAcceptedOffers = unwindStaleAcceptedOffers;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const wallet_1 = require("@b/services/wallet");
const console_1 = require("@b/utils/console");
const notifications_1 = require("@b/utils/notifications");
const settlement_1 = require("./settlement");
const cache_1 = require("@b/utils/cache");
exports.DEFAULT_CONFIRM_GRACE_HOURS = 24;
async function confirmGraceMs() {
    var _a;
    const settings = await cache_1.CacheManager.getInstance().getSettings();
    const hours = parseFloat(String((_a = settings.get("nftTransferConfirmGraceHours")) !== null && _a !== void 0 ? _a : ""));
    const effective = Number.isFinite(hours) && hours > 0 ? hours : exports.DEFAULT_CONFIRM_GRACE_HOURS;
    return effective * 60 * 60 * 1000;
}
const NFT_DISPUTE_PERMISSION = "access.nft.dispute";
async function transferWasConfirmed(offerId) {
    const activity = await db_1.models.nftActivity.findOne({
        where: {
            offerId,
            type: "TRANSFER",
            transactionHash: { [sequelize_1.Op.ne]: null },
        },
        attributes: ["id"],
    });
    return !!activity;
}
function safeParse(value) {
    if (!value)
        return null;
    if (typeof value === "object")
        return value;
    try {
        return JSON.parse(value);
    }
    catch (_a) {
        return null;
    }
}
async function unwindStaleAcceptedOffer(offer, options = {}) {
    var _a, _b, _c;
    const offerId = offer.id;
    const amount = Number(offer.amount);
    const terminalStatus = (_a = options.terminalStatus) !== null && _a !== void 0 ? _a : "EXPIRED";
    const reason = (_b = options.reason) !== null && _b !== void 0 ? _b : "on-chain transfer was never confirmed";
    const reasonCode = (_c = options.reasonCode) !== null && _c !== void 0 ? _c : "transfer_never_confirmed";
    const held = await (0, settlement_1.escrowHeldFor)(offerId);
    const settings = await cache_1.CacheManager.getInstance().getSettings();
    const buyerPaid = held !== null && held !== void 0 ? held : amount * (1 + (0, settlement_1.marketplaceFeePercent)(settings) / 100);
    const shortfall = await db_1.sequelize.transaction(async (transaction) => {
        var _a, _b;
        try {
            await wallet_1.walletService.release({
                idempotencyKey: `nft_offer_release_${offerId}`,
                userId: offer.userId,
                walletType: "SPOT",
                currency: offer.currency,
                amount: buyerPaid,
                operationType: "NFT_OFFER",
                description: `Release escrow ${buyerPaid} ${offer.currency} - ${reason}`,
                metadata: { offerId, reason: reasonCode },
                transaction,
            });
        }
        catch (releaseError) {
            if ((releaseError === null || releaseError === void 0 ? void 0 : releaseError.name) === "DuplicateOperationError") {
            }
            else if ((releaseError === null || releaseError === void 0 ? void 0 : releaseError.name) === "InsufficientHeldFundsError") {
                return {
                    userId: offer.userId,
                    needed: buyerPaid,
                    reason: (_a = releaseError === null || releaseError === void 0 ? void 0 : releaseError.message) !== null && _a !== void 0 ? _a : "held funds are short",
                };
            }
            else {
                throw releaseError;
            }
        }
        await db_1.models.nftOffer.update({
            status: terminalStatus,
            ...(terminalStatus === "CANCELLED"
                ? { cancelledAt: new Date() }
                : { expiredAt: new Date() }),
            metadata: JSON.stringify({
                ...((_b = safeParse(offer.metadata)) !== null && _b !== void 0 ? _b : {}),
                unwound: {
                    at: new Date().toISOString(),
                    reason,
                    released: buyerPaid,
                },
            }),
        }, { where: { id: offerId }, transaction });
        const listing = await db_1.models.nftListing.findOne({
            where: { tokenId: offer.tokenId, status: "SOLD" },
            transaction,
        });
        if (listing) {
            await listing.update({ status: "ACTIVE" }, { transaction });
            await db_1.models.nftToken.update({ isListed: true }, { where: { id: offer.tokenId }, transaction });
        }
        return null;
    });
    if (shortfall) {
        return { offerId, reversed: false, amount: buyerPaid, shortfall };
    }
    return { offerId, reversed: true, amount: buyerPaid };
}
async function unwindStaleAcceptedOffers(log) {
    const cutoff = new Date(Date.now() - (await confirmGraceMs()));
    const stale = await db_1.models.nftOffer.findAll({
        where: {
            status: "ACCEPTED",
            acceptedAt: { [sequelize_1.Op.lte]: cutoff },
            flaggedAt: null,
        },
    });
    let reversed = 0;
    let flagged = 0;
    for (const offer of stale) {
        const plain = offer.get({ plain: true });
        try {
            if (await transferWasConfirmed(plain.id))
                continue;
            const outcome = await unwindStaleAcceptedOffer(plain);
            if (outcome.reversed) {
                reversed++;
                log === null || log === void 0 ? void 0 : log(`Unwound unconfirmed sale ${plain.id}: ${outcome.amount} ${plain.currency} released back to the buyer`, "success");
                await notifyUnwound(plain, outcome);
                continue;
            }
            if (outcome.shortfall) {
                flagged++;
                await flagForAdmin(plain, outcome, log);
            }
        }
        catch (error) {
            console_1.logger.error("NFT_UNWIND", `Failed to unwind offer ${plain.id}: ${error === null || error === void 0 ? void 0 : error.message}`, error);
            log === null || log === void 0 ? void 0 : log(`Failed to unwind offer ${plain.id}: ${error === null || error === void 0 ? void 0 : error.message}`, "error");
        }
    }
    return { reversed, flagged };
}
async function flagForAdmin(offer, outcome, log) {
    var _a, _b, _c;
    const message = `NFT sale ${offer.id} was accepted but never transferred, and the buyer's escrow could not be released: ` +
        `${outcome.shortfall.needed.toFixed(4)} ${offer.currency} is still marked as held but is not available ` +
        `(${outcome.shortfall.reason}). The buyer's funds are locked and they have no NFT.`;
    log === null || log === void 0 ? void 0 : log(message, "error");
    console_1.logger.error("NFT_UNWIND", message);
    await db_1.models.nftOffer.update({ flaggedAt: new Date() }, { where: { id: offer.id } });
    try {
        const listing = await db_1.models.nftListing.findOne({
            where: { tokenId: offer.tokenId },
            attributes: ["id"],
            order: [["createdAt", "DESC"]],
        });
        await db_1.models.nftDispute.create({
            tokenId: (_a = offer.tokenId) !== null && _a !== void 0 ? _a : undefined,
            listingId: (_b = listing === null || listing === void 0 ? void 0 : listing.id) !== null && _b !== void 0 ? _b : undefined,
            disputeType: "NOT_RECEIVED",
            status: "PENDING",
            priority: "HIGH",
            reporterId: offer.userId,
            respondentId: (_c = offer.sellerId) !== null && _c !== void 0 ? _c : undefined,
            title: "Unconfirmed NFT sale needs manual resolution",
            description: message,
            metadata: {
                offerId: offer.id,
                needed: outcome.shortfall.needed,
                currency: offer.currency,
                reason: outcome.shortfall.reason,
            },
        });
    }
    catch (disputeError) {
        console_1.logger.error("NFT_UNWIND", `Failed to create dispute for offer ${offer.id}: ${disputeError === null || disputeError === void 0 ? void 0 : disputeError.message}`, disputeError);
    }
    await (0, notifications_1.createAdminNotification)(NFT_DISPUTE_PERMISSION, "Unconfirmed NFT sale needs manual resolution", message, "system", `/admin/nft/dispute`).catch(() => null);
}
async function notifyUnwound(offer, outcome) {
    await (0, notifications_1.createNotification)({
        userId: offer.userId,
        relatedId: offer.id,
        title: "NFT purchase reversed",
        message: `The transfer for your accepted offer was never completed, so the ${outcome.amount} ${offer.currency} held for it has been released back to your wallet.`,
        type: "system",
        link: `/nft/token/${offer.tokenId}`,
    }).catch(() => null);
}
