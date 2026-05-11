"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const nft_auth_1 = require("@b/api/(ext)/nft/utils/nft-auth");
exports.metadata = {
    summary: "Cancel NFT offer",
    operationId: "cancelNftOffer",
    tags: ["NFT", "Offer"],
    logModule: "NFT",
    logTitle: "Cancel NFT Offer",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "Offer ID",
            required: true,
            schema: { type: "string", format: "uuid" },
        },
    ],
    responses: {
        200: { description: "Offer cancelled successfully" },
        403: { description: "Access denied - not your offer" },
        404: { description: "Offer not found" },
        409: { description: "Offer cannot be cancelled" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Offer ID is required",
        });
    }
    try {
        const sanitizedOfferId = (0, nft_auth_1.sanitizeAuthInput)(id);
        await (0, nft_auth_1.verifyOfferOwnership)(user.id, sanitizedOfferId);
        const offer = await db_1.models.nftOffer.findOne({
            where: {
                id: sanitizedOfferId,
                userId: user.id,
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name", "image"],
                    required: false,
                },
                {
                    model: db_1.models.nftCollection,
                    as: "collection",
                    attributes: ["id", "name"],
                    required: false,
                },
            ],
        });
        if (!offer) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Offer not found or access denied",
            });
        }
        if (offer.status === "CANCELLED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Offer is already cancelled",
            });
        }
        if (offer.status === "ACCEPTED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Cannot cancel an accepted offer",
            });
        }
        if (offer.status === "EXPIRED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Cannot cancel an expired offer",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Cancel offer in database transaction");
        await db_1.sequelize.transaction(async (transaction) => {
            var _a, _b;
            await offer.update({
                status: "CANCELLED",
                cancelledAt: new Date(),
            }, { transaction });
            await db_1.models.nftActivity.create({
                tokenId: offer.tokenId,
                collectionId: offer.collectionId,
                offerId: offer.id,
                type: "OFFER",
                fromUserId: user.id,
                toUserId: undefined,
                price: offer.amount,
                currency: offer.currency,
                transactionHash: undefined,
                metadata: JSON.stringify({
                    offerType: offer.type,
                    targetName: ((_a = offer.token) === null || _a === void 0 ? void 0 : _a.name) || ((_b = offer.collection) === null || _b === void 0 ? void 0 : _b.name),
                    cancelledAt: new Date().toISOString(),
                    reason: "user_cancelled",
                }),
            }, { transaction });
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Offer cancelled successfully");
        return {
            message: "Offer cancelled successfully",
            data: {
                offerId: offer.id,
                status: "CANCELLED",
                cancelledAt: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        console_1.logger.error("NFT_OFFER_CANCELLATION", "Failed to cancel offer", error);
        if (error.statusCode) {
            throw error;
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Referenced offer no longer exists",
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "An unexpected error occurred while cancelling the offer. Please try again.",
        });
    }
};
