"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const nft_auth_1 = require("@b/api/(ext)/nft/utils/nft-auth");
exports.metadata = {
    summary: "Reject NFT offer",
    operationId: "rejectNftOffer",
    tags: ["NFT", "Offer"],
    logModule: "NFT",
    logTitle: "Reject NFT Offer",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "Offer ID",
            required: true,
            schema: { type: "string", format: "uuid" },
        },
    ],
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reason: { type: "string", description: "Optional rejection reason" },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Offer rejected successfully" },
        403: { description: "Access denied - not the NFT owner" },
        404: { description: "Offer not found" },
        409: { description: "Offer cannot be rejected" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a;
    const { user, params, body, ctx } = data;
    const { id } = params;
    const { reason } = body || {};
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
        const offer = await db_1.models.nftOffer.findOne({
            where: {
                id: sanitizedOfferId,
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name", "image", "ownerId"],
                    required: false,
                },
                {
                    model: db_1.models.nftCollection,
                    as: "collection",
                    attributes: ["id", "name", "creatorId"],
                    required: false,
                    include: [
                        {
                            model: db_1.models.nftCreator,
                            as: "creator",
                            attributes: ["id", "userId"],
                        },
                    ],
                },
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName"],
                },
            ],
        });
        if (!offer) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Offer not found",
            });
        }
        let hasPermission = false;
        if (offer.tokenId && offer.token) {
            hasPermission = offer.token.ownerId === user.id;
        }
        else if (offer.collectionId && offer.collection) {
            hasPermission = ((_a = offer.collection.creator) === null || _a === void 0 ? void 0 : _a.userId) === user.id;
        }
        if (!hasPermission) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Access denied: You don't have permission to reject this offer",
            });
        }
        if (offer.status === "REJECTED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Offer is already rejected",
            });
        }
        if (offer.status === "ACCEPTED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Cannot reject an accepted offer",
            });
        }
        if (offer.status === "CANCELLED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Offer is already cancelled",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reject offer in database transaction");
        await db_1.sequelize.transaction(async (transaction) => {
            var _a, _b;
            await offer.update({
                status: "REJECTED",
                rejectedAt: new Date(),
            }, { transaction });
            await db_1.models.nftActivity.create({
                tokenId: offer.tokenId,
                collectionId: offer.collectionId,
                offerId: offer.id,
                type: "OFFER",
                fromUserId: user.id,
                toUserId: offer.userId,
                price: offer.amount,
                currency: offer.currency,
                transactionHash: undefined,
                metadata: JSON.stringify({
                    offerType: offer.type,
                    targetName: ((_a = offer.token) === null || _a === void 0 ? void 0 : _a.name) || ((_b = offer.collection) === null || _b === void 0 ? void 0 : _b.name),
                    rejectedAt: new Date().toISOString(),
                    rejectedBy: "owner",
                    ...(reason && { reason }),
                }),
            }, { transaction });
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Offer rejected successfully");
        return {
            message: "Offer rejected successfully",
            data: {
                offerId: offer.id,
                tokenId: offer.tokenId,
                collectionId: offer.collectionId,
                status: "REJECTED",
                rejectedAt: new Date().toISOString(),
                offerAmount: offer.amount,
                currency: offer.currency,
                offererName: offer.user ? `${offer.user.firstName} ${offer.user.lastName}` : 'Unknown',
            },
        };
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to reject NFT offer", error);
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
            message: "An unexpected error occurred while rejecting the offer. Please try again.",
        });
    }
};
