"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const nft_auth_1 = require("@b/api/(ext)/nft/utils/nft-auth");
exports.metadata = {
    summary: "Cancel NFT listing",
    operationId: "cancelNftListing",
    tags: ["NFT", "Listing"],
    logModule: "NFT",
    logTitle: "Cancel NFT Listing",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "Listing ID",
            required: true,
            schema: { type: "string", format: "uuid" },
        },
    ],
    responses: {
        200: { description: "Listing cancelled successfully" },
        403: { description: "Access denied - not your listing" },
        404: { description: "Listing not found" },
        409: { description: "Listing cannot be cancelled" },
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
            message: "Listing ID is required",
        });
    }
    try {
        const sanitizedListingId = (0, nft_auth_1.sanitizeAuthInput)(id);
        await (0, nft_auth_1.verifyListingOwnership)(user.id, sanitizedListingId);
        const listing = await db_1.models.nftListing.findOne({
            where: {
                id: sanitizedListingId,
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name", "image", "ownerId"],
                    required: true,
                },
                {
                    model: db_1.models.nftBid,
                    as: "bids",
                    attributes: ["id", "amount", "status"],
                    where: { status: "ACTIVE" },
                    required: false,
                },
            ],
        });
        if (!listing) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Listing not found",
            });
        }
        const activeOffers = await db_1.models.nftOffer.findAll({
            where: {
                tokenId: listing.tokenId,
                status: "ACTIVE",
            },
            attributes: ["id", "amount", "userId"],
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["firstName", "lastName"],
                },
            ],
        });
        const listingToken = listing.token;
        if (!listingToken) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Token not found for listing",
            });
        }
        if (listingToken.ownerId !== user.id) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Access denied: You don't own this NFT",
            });
        }
        if (listing.status === "CANCELLED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Listing is already cancelled",
            });
        }
        if (listing.status === "SOLD") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Cannot cancel a sold listing",
            });
        }
        if (listing.status === "EXPIRED") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Cannot cancel an expired listing",
            });
        }
        if (listing.type === "AUCTION" && listing.bids && listing.bids.length > 0) {
            const activeBids = listing.bids.filter(bid => bid.status === "ACTIVE");
            if (activeBids.length > 0) {
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: "Cannot cancel auction with active bids. Contact support if needed.",
                });
            }
        }
        if (listing.type === "FIXED_PRICE" && activeOffers.length > 0) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `Cannot cancel listing with ${activeOffers.length} active offer(s). Please reject or accept the offers first.`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Cancel listing in database transaction");
        await db_1.sequelize.transaction(async (transaction) => {
            await listing.update({
                status: "CANCELLED",
                cancelledAt: new Date(),
            }, { transaction });
            await db_1.models.nftToken.update({ isListed: false }, {
                where: { id: listing.tokenId },
                transaction
            });
            if (listing.type === "BUNDLE" && listing.bundleTokenIds) {
                const bundleTokenIds = JSON.parse(listing.bundleTokenIds);
                await db_1.models.nftToken.update({ isListed: false }, {
                    where: { id: bundleTokenIds },
                    transaction
                });
            }
            await db_1.models.nftActivity.create({
                tokenId: listing.tokenId,
                listingId: listing.id,
                type: "DELIST",
                fromUserId: user.id,
                toUserId: undefined,
                price: listing.price,
                currency: listing.currency,
                transactionHash: undefined,
                metadata: JSON.stringify({
                    listingType: listing.type,
                    tokenName: listingToken.name,
                    cancelledAt: new Date().toISOString(),
                    reason: "user_cancelled",
                    originalPrice: listing.price,
                }),
            }, { transaction });
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`${listing.type.toLowerCase().replace('_', ' ')} listing cancelled successfully`);
        return {
            message: `${listing.type.toLowerCase().replace('_', ' ')} listing cancelled successfully`,
            data: {
                listingId: listing.id,
                tokenId: listing.tokenId,
                status: "CANCELLED",
                cancelledAt: new Date().toISOString(),
                type: listing.type,
            },
        };
    }
    catch (error) {
        console_1.logger.error("NFT_LISTING_CANCEL", "Failed to cancel NFT listing", error);
        if (error.statusCode) {
            throw error;
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Referenced listing no longer exists",
            });
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Listing cancellation conflict",
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "An unexpected error occurred while cancelling the listing. Please try again.",
        });
    }
};
