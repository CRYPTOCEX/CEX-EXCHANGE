"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get NFT auctions",
    operationId: "getNftAuctions",
    tags: ["NFT", "Auction"],
    logModule: "NFT",
    logTitle: "Get NFT Auctions",
    parameters: [
        {
            name: "status",
            in: "query",
            description: "Filter by auction status",
            schema: {
                type: "string",
                enum: ["ACTIVE", "PENDING", "ENDED", "CANCELLED"]
            }
        },
        {
            name: "page",
            in: "query",
            description: "Page number",
            schema: { type: "integer", default: 1 }
        },
        {
            name: "perPage",
            in: "query",
            description: "Items per page",
            schema: { type: "integer", default: 20, maximum: 100 }
        },
        {
            name: "sortBy",
            in: "query",
            description: "Sort field",
            schema: {
                type: "string",
                enum: ["endTime", "currentBid", "startTime", "createdAt"],
                default: "endTime"
            }
        },
        {
            name: "sortOrder",
            in: "query",
            description: "Sort order",
            schema: {
                type: "string",
                enum: ["ASC", "DESC"],
                default: "ASC"
            }
        }
    ],
    responses: {
        200: {
            description: "NFT auctions retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    auctions: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/NftListing" }
                                    },
                                    pagination: { $ref: "#/components/schemas/Pagination" }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        500: { description: "Internal Server Error" }
    }
};
exports.default = async (data) => {
    try {
        const { query, ctx } = data;
        const { status, page = 1, perPage = 20, sortBy = "endTime", sortOrder = "ASC" } = query;
        const whereConditions = {
            type: "AUCTION"
        };
        if (status) {
            whereConditions.status = status;
        }
        const limit = Math.min(parseInt(perPage), 100);
        const offset = (parseInt(page) - 1) * limit;
        const { count, rows: auctions } = await db_1.models.nftListing.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name", "image", "metadataUri"],
                    include: [
                        {
                            model: db_1.models.nftCollection,
                            as: "collection",
                            attributes: ["id", "name", "logoImage", "contractAddress"]
                        },
                        {
                            model: db_1.models.user,
                            as: "creator",
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
                    attributes: ["id", "amount", "createdAt"],
                    include: [
                        {
                            model: db_1.models.user,
                            as: "bidder",
                            attributes: ["id", "firstName", "lastName", "avatar"]
                        }
                    ],
                    order: [["amount", "DESC"]],
                    limit: 5
                }
            ],
            order: [[sortBy, sortOrder]],
            limit,
            offset,
            distinct: true
        });
        const processedAuctions = auctions.map(auction => {
            const now = new Date();
            const endTime = auction.endTime ? new Date(auction.endTime) : now;
            const isActive = auction.status === "ACTIVE" && endTime > now;
            const hasEnded = endTime <= now;
            const timeLeft = hasEnded ? 0 : endTime.getTime() - now.getTime();
            const currentBid = auction.bids && auction.bids.length > 0
                ? Math.max(...auction.bids.map(bid => parseFloat(String(bid.amount))))
                : parseFloat(String(auction.price || 0));
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Get NFT Auctions completed successfully");
            return {
                ...auction.toJSON(),
                isActive,
                hasEnded,
                timeLeft,
                currentBid,
                bidCount: auction.bids ? auction.bids.length : 0,
                highestBidder: auction.bids && auction.bids.length > 0
                    ? auction.bids[0].bidderId
                    : null
            };
        });
        const totalPages = Math.ceil(count / limit);
        return {
            auctions: processedAuctions,
            pagination: {
                page: parseInt(page),
                perPage: limit,
                total: count,
                totalPages,
                hasNext: parseInt(page) < totalPages,
                hasPrev: parseInt(page) > 1
            }
        };
    }
    catch (error) {
        console.error("Get NFT auctions error:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve NFT auctions"
        });
    }
};
