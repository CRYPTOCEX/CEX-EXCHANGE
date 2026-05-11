"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
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
    var _a;
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
                            as: "creator",
                            attributes: ["id", "firstName", "lastName", "avatar"]
                        },
                        {
                            model: db_1.models.user,
                            as: "owner",
                            attributes: ["id", "firstName", "lastName", "avatar"]
                        }
                    ]
                },
                {
                    model: db_1.models.user,
                    as: "seller",
                    attributes: ["id", "firstName", "lastName", "avatar", "walletAddress"]
                },
                {
                    model: db_1.models.nftBid,
                    as: "bids",
                    include: [
                        {
                            model: db_1.models.user,
                            as: "bidder",
                            attributes: ["id", "firstName", "lastName", "avatar"]
                        }
                    ],
                    order: [["amount", "DESC"]]
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
                            attributes: ["id", "firstName", "lastName", "avatar"],
                            required: false
                        },
                        {
                            model: db_1.models.user,
                            as: "toUser",
                            attributes: ["id", "firstName", "lastName", "avatar"],
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
        const cacheManager = cache_1.CacheManager.getInstance();
        const settings = await cacheManager.getSettings();
        const minBidIncrement = (_a = settings.get('nftMinBidIncrement')) !== null && _a !== void 0 ? _a : 0.01;
        const currentBid = auction.bids && auction.bids.length > 0
            ? parseFloat(String(auction.bids[0].amount))
            : parseFloat(String(auction.price));
        const highestBidder = auction.bids && auction.bids.length > 0
            ? auction.bids[0].user
            : null;
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
        return auctionData;
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
