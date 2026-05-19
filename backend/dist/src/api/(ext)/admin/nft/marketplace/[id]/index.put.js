"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Update marketplace listing (Admin)",
    operationId: "updateMarketplaceListing",
    tags: ["Admin", "NFT", "Marketplace"],
    logModule: "ADMIN_NFT",
    logTitle: "Update marketplace listing",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Listing ID",
            schema: { type: "string" }
        }
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "CANCELLED", "EXPIRED"],
                            description: "Update listing status"
                        },
                        moderationNote: {
                            type: "string",
                            description: "Admin moderation note"
                        },
                        flagged: {
                            type: "boolean",
                            description: "Flag listing for review"
                        },
                        flagReason: {
                            type: "string",
                            description: "Reason for flagging"
                        }
                    }
                }
            }
        }
    },
    responses: {
        200: {
            description: "Listing updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: { $ref: "#/components/schemas/NftListing" }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Listing not found" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "edit.nft.marketplace"
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    const { id } = params;
    const { status, moderationNote, flagged, flagReason } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching marketplace listing");
        const listing = await db_1.models.nftListing.findOne({
            where: { id },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name"]
                        }
                    ]
                },
                {
                    model: db_1.models.user,
                    as: "seller",
                    attributes: ["id", "firstName", "lastName", "email"]
                }
            ]
        });
        if (!listing) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Listing not found");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Listing not found"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Starting database transaction");
        const dbTransaction = await db_1.sequelize.transaction();
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Preparing update data");
            const updateData = {};
            if (status !== undefined) {
                updateData.status = status;
                if (status === "CANCELLED" && listing.status === "ACTIVE") {
                    ctx === null || ctx === void 0 ? void 0 : ctx.step("Handling listing cancellation");
                    updateData.cancelledAt = new Date();
                    updateData.cancelledBy = user.id;
                    await db_1.models.nftToken.update({
                        isListed: false
                    }, {
                        where: { id: listing.tokenId },
                        transaction: dbTransaction
                    });
                }
            }
            if (moderationNote !== undefined) {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding moderation note");
                updateData.moderationNote = moderationNote;
                updateData.moderatedBy = user.id;
                updateData.moderatedAt = new Date();
            }
            if (flagged !== undefined) {
                ctx === null || ctx === void 0 ? void 0 : ctx.step(flagged ? "Flagging listing" : "Unflagging listing");
                updateData.flagged = flagged;
                if (flagged) {
                    updateData.flaggedAt = new Date();
                    updateData.flaggedBy = user.id;
                    updateData.flagReason = flagReason || "Flagged by admin";
                }
                else {
                    updateData.flaggedAt = null;
                    updateData.flaggedBy = null;
                    updateData.flagReason = null;
                }
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating listing");
            await db_1.models.nftListing.update(updateData, {
                where: { id },
                transaction: dbTransaction
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating admin activity record");
            await db_1.models.nftActivity.create({
                tokenId: listing.tokenId,
                listingId: listing.id,
                type: "TRANSFER",
                fromUserId: user.id,
                toUserId: listing.sellerId,
                metadata: JSON.stringify({
                    action: "LISTING_UPDATED",
                    adminAction: true,
                    adminUser: `${user.firstName} ${user.lastName}`,
                    changes: updateData,
                    previousStatus: listing.status,
                    moderationNote: moderationNote,
                    flagged: flagged,
                    flagReason: flagReason
                })
            }, { transaction: dbTransaction });
            if (status === "CANCELLED" && listing.type === "AUCTION") {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing auction bid refunds");
                const activeBids = await db_1.models.nftBid.findAll({
                    where: {
                        listingId: listing.id,
                        status: "ACTIVE"
                    },
                    transaction: dbTransaction
                });
                if (activeBids.length > 0) {
                    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Refunding ${activeBids.length} active bids`);
                    await db_1.models.nftBid.update({
                        status: "CANCELLED",
                        cancelledAt: new Date()
                    }, {
                        where: {
                            listingId: listing.id,
                            status: "ACTIVE"
                        },
                        transaction: dbTransaction
                    });
                    for (const bid of activeBids) {
                        await db_1.models.nftActivity.create({
                            tokenId: listing.tokenId,
                            listingId: listing.id,
                            bidId: bid.id,
                            type: "BID",
                            fromUserId: undefined,
                            toUserId: bid.bidderId,
                            price: bid.amount,
                            currency: bid.currency,
                            metadata: JSON.stringify({
                                action: "BID_REFUND",
                                reason: "AUCTION_CANCELLED_BY_ADMIN",
                                adminUser: `${user.firstName} ${user.lastName}`,
                                originalBidAmount: bid.amount
                            })
                        }, { transaction: dbTransaction });
                    }
                }
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Committing transaction");
            await dbTransaction.commit();
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading updated listing");
            const updatedListing = await db_1.models.nftListing.findByPk(id, {
                include: [
                    {
                        model: db_1.models.nftToken,
                        as: "token",
                        include: [
                            {
                                model: db_1.models.nftCollection,
                                as: "collection",
                                attributes: ["id", "name", "logoImage"]
                            }
                        ]
                    },
                    {
                        model: db_1.models.user,
                        as: "seller",
                        attributes: ["id", "firstName", "lastName", "avatar"]
                    }
                ]
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Listing updated successfully");
            return {
                message: "Listing updated successfully",
                data: updatedListing
            };
        }
        catch (error) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Rolling back transaction");
            await dbTransaction.rollback();
            throw error;
        }
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to update marketplace listing", error);
        if (error.statusCode) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to update marketplace listing");
            throw error;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to update marketplace listing");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to update marketplace listing"
        });
    }
};
