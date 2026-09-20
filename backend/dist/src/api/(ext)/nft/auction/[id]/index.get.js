"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const display_name_1 = require("@b/utils/display-name");
exports.metadata = {
    summary: "Get NFT auction details",
    operationId: "getNftAuctionDetails",
    tags: ["NFT", "Auction"],
    logModule: "NFT",
    logTitle: "Get NFT Auction",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Auction/Listing ID",
            schema: { type: "string" }
        }
    ],
    responses: {
        200: {
            description: "Auction details retrieved successfully",
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
        404: { description: "Auction not found" },
        500: { description: "Internal Server Error" }
    }
};
exports.default = async (data) => {
    try {
        const { params, ctx } = data;
        const { id } = params;
        const auction = await db_1.models.nftListing.findOne({
            where: {
                id,
                type: "AUCTION"
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name", "logoImage", "contractAddress", "chain", "royaltyPercentage"]
                        },
                        {
                            model: db_1.models.user,
                            as: "owner",
                            attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"]
                        }
                    ]
                },
                {
                    model: db_1.models.user,
                    as: "seller",
                    attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"]
                },
                {
                    model: db_1.models.nftBid,
                    as: "bids",
                    separate: true,
                    where: { status: "ACTIVE" },
                    required: false,
                    include: [
                        {
                            model: db_1.models.user,
                            as: "user",
                            attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"]
                        }
                    ],
                    order: [["amount", "DESC"], ["createdAt", "ASC"]]
                },
                {
                    model: db_1.models.nftActivity,
                    as: "activities",
                    where: { type: ["BID", "AUCTION_CREATED", "AUCTION_ENDED"] },
                    required: false,
                    include: [
                        {
                            model: db_1.models.user,
                            as: "fromUser",
                            attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"],
                            required: false
                        },
                        {
                            model: db_1.models.user,
                            as: "toUser",
                            attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"],
                            required: false
                        }
                    ],
                    order: [["createdAt", "DESC"]],
                    limit: 20
                }
            ]
        });
        if (!auction) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Auction not found"
            });
        }
        const now = new Date();
        const startTime = auction.startTime ? new Date(auction.startTime) : now;
        const endTime = auction.endTime ? new Date(auction.endTime) : now;
        const hasStarted = now >= startTime;
        const hasEnded = now >= endTime;
        const isActive = auction.status === "ACTIVE" && hasStarted && !hasEnded;
        const timeLeft = hasEnded ? 0 : Math.max(0, endTime.getTime() - now.getTime());
        const timeUntilStart = hasStarted ? 0 : Math.max(0, startTime.getTime() - now.getTime());
        const minBidIncrement = Number(auction.minBidIncrement) || 0.01;
        const currentBid = auction.bids && auction.bids.length > 0
            ? parseFloat(String(auction.bids[0].amount))
            : parseFloat(String(auction.price));
        const highestBidderRow = auction.bids && auction.bids.length > 0
            ? auction.bids[0].user
            : null;
        const highestBidder = (highestBidderRow === null || highestBidderRow === void 0 ? void 0 : highestBidderRow.toJSON)
            ? highestBidderRow.toJSON()
            : highestBidderRow !== null && highestBidderRow !== void 0 ? highestBidderRow : null;
        const bidCount = auction.bids ? auction.bids.length : 0;
        const uniqueBidders = auction.bids
            ? [...new Set(auction.bids.map(bid => bid.userId))].length
            : 0;
        const averageBid = bidCount > 0 && auction.bids
            ? auction.bids.reduce((sum, bid) => sum + parseFloat(String(bid.amount)), 0) / bidCount
            : 0;
        let watchersCount = 0;
        try {
            if (db_1.models.nftWatcher) {
                watchersCount = await db_1.models.nftWatcher.count({
                    where: { listingId: id }
                });
            }
        }
        catch (error) {
            watchersCount = 0;
        }
        const auctionData = {
            ...auction.toJSON(),
            timing: {
                hasStarted,
                hasEnded,
                isActive,
                timeLeft,
                timeUntilStart,
                startTime: auction.startTime,
                endTime: auction.endTime
            },
            bidding: {
                currentBid,
                startingBid: parseFloat(String(auction.price)),
                bidCount,
                uniqueBidders,
                averageBid,
                highestBidder,
                minimumNextBid: currentBid + minBidIncrement
            },
            stats: {
                views: auction.views || 0,
                watchers: watchersCount
            }
        };
        return (0, display_name_1.redactPublicNames)(auctionData);
    }
    catch (error) {
        console_1.logger.error("NFT_AUCTION", "Get auction details error", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve auction details"
        });
    }
};
