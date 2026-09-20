"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const wallet_1 = require("@b/services/wallet");
const console_1 = require("@b/utils/console");
const VALID_RESOLUTION_TYPES = [
    "REFUND",
    "PARTIAL_REFUND",
    "CANCEL_SALE",
    "REMOVE_LISTING",
    "BAN_USER",
    "WARNING",
    "NO_ACTION",
];
const MODEL_RESOLUTION_TYPES = new Set([
    "REFUND",
    "CANCEL_SALE",
    "REMOVE_LISTING",
    "BAN_USER",
    "WARNING",
    "NO_ACTION",
]);
exports.metadata = {
    summary: "Resolve an NFT dispute",
    operationId: "adminResolveNftDispute",
    tags: ["Admin", "NFT", "Dispute"],
    description: "Mark a dispute as RESOLVED with a resolution type, narrative text, and optional refund amount. Stamps resolvedAt/resolvedById.",
    logModule: "ADMIN_NFT",
    logTitle: "Resolve NFT Dispute",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Dispute ID",
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
                        resolution: { type: "string" },
                        resolutionType: {
                            type: "string",
                            enum: [...VALID_RESOLUTION_TYPES],
                        },
                        refundAmount: { type: "number" },
                    },
                    required: ["resolutionType"],
                },
            },
        },
    },
    responses: {
        200: { description: "Dispute resolved successfully" },
        400: { description: "Invalid resolution" },
        404: { description: "Dispute not found" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
    permission: "edit.nft.dispute",
};
exports.default = async (data) => {
    const { body, params, user, ctx } = data;
    const { id } = params;
    const { resolution, resolutionType, refundAmount } = body;
    if (!resolutionType || !VALID_RESOLUTION_TYPES.includes(resolutionType)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid resolution type" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching dispute ${id}`);
    const dispute = await db_1.models.nftDispute.findByPk(id);
    if (!dispute) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Dispute not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Dispute not found" });
    }
    const storedResolutionType = MODEL_RESOLUTION_TYPES.has(resolutionType)
        ? resolutionType
        : "REFUND";
    const now = new Date();
    const updateData = {
        status: "RESOLVED",
        resolution: resolution || null,
        resolutionType: storedResolutionType,
        resolvedAt: now,
    };
    if (user === null || user === void 0 ? void 0 : user.id)
        updateData.resolvedById = user.id;
    if (typeof refundAmount === "number" && refundAmount >= 0) {
        updateData.refundAmount = refundAmount;
    }
    if (resolutionType !== storedResolutionType) {
        updateData.metadata = {
            ...(dispute.metadata || {}),
            resolutionTypeRaw: resolutionType,
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving dispute");
    const isRefund = resolutionType === "REFUND" || resolutionType === "PARTIAL_REFUND";
    await db_1.sequelize.transaction(async (t) => {
        await dispute.update(updateData, { transaction: t });
        if (isRefund) {
            let buyerId;
            let saleCurrency;
            let originalAmount;
            if (dispute.listingId) {
                const sale = await db_1.models.nftSale.findOne({
                    where: { listingId: dispute.listingId },
                    order: [["createdAt", "DESC"]],
                    transaction: t,
                });
                if (sale) {
                    buyerId = sale.buyerId;
                    saleCurrency = sale.currency;
                    originalAmount = Number(sale.price);
                }
                else {
                    const listing = await db_1.models.nftListing.findByPk(dispute.listingId, {
                        transaction: t,
                    });
                    if (listing) {
                        saleCurrency = listing.currency;
                        originalAmount = listing.price ? Number(listing.price) : undefined;
                    }
                }
            }
            if (!buyerId) {
                buyerId = dispute.reporterId;
            }
            const refundAmt = resolutionType === "REFUND"
                ? (typeof refundAmount === "number" && refundAmount > 0
                    ? refundAmount
                    : originalAmount)
                : refundAmount;
            if (!buyerId) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Cannot issue refund: buyer could not be determined for this dispute",
                });
            }
            if (!refundAmt || refundAmt <= 0) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Cannot issue refund: refund amount is missing or invalid",
                });
            }
            if (!saleCurrency) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Cannot issue refund: refund currency could not be determined",
                });
            }
            const refundWalletType = "SPOT";
            const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(buyerId, refundWalletType, saleCurrency, t);
            const refundWallet = walletResult === null || walletResult === void 0 ? void 0 : walletResult.wallet;
            if (!refundWallet) {
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: `Failed to get or create ${refundWalletType} wallet for ${saleCurrency} refund`,
                });
            }
            await wallet_1.walletService.credit({
                idempotencyKey: `dispute_refund_${dispute.id}`,
                userId: buyerId,
                walletId: refundWallet.id,
                walletType: refundWalletType,
                currency: saleCurrency,
                amount: refundAmt,
                operationType: "REFUND",
                description: `NFT dispute ${resolutionType} refund`,
                referenceId: dispute.id,
                metadata: {
                    disputeId: dispute.id,
                    listingId: dispute.listingId,
                    tokenId: dispute.tokenId,
                    resolutionType,
                },
                transaction: t,
            });
        }
    });
    if (user === null || user === void 0 ? void 0 : user.id) {
        try {
            await db_1.models.nftDisputeMessage.create({
                disputeId: id,
                userId: user.id,
                message: `Dispute resolved: ${resolutionType}${resolution ? ` - ${resolution}` : ""}`,
                isInternal: false,
                isSystemMessage: true,
            });
        }
        catch (err) {
            console_1.logger.warn("ADMIN_NFT", "Failed to post system dispute message", err);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Dispute resolved successfully");
    return {
        message: "Dispute resolved successfully",
        data: dispute,
    };
};
