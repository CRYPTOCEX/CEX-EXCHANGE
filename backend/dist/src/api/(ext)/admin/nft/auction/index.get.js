"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "List all NFT auction listings with filtering",
    description: "Retrieves a paginated list of NFT auction listings. Supports filtering by status and searching by token name or price. Includes related token, seller, and bid information. Returns only listings with type 'AUCTION'.",
    operationId: "getAdminNftAuctions",
    tags: ["Admin", "NFT", "Auction"],
    parameters: [
        {
            name: "status",
            in: "query",
            description: "Filter by status",
            required: false,
            schema: { type: "string" },
        },
        {
            name: "search",
            in: "query",
            description: "Search by token name or price",
            required: false,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "NFT auctions retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        tokenId: { type: "string" },
                                        sellerId: { type: "string" },
                                        type: { type: "string" },
                                        price: { type: "number" },
                                        reservePrice: { type: "number" },
                                        buyNowPrice: { type: "number" },
                                        startTime: { type: "string" },
                                        endTime: { type: "string" },
                                        status: { type: "string" },
                                        createdAt: { type: "string" },
                                    },
                                },
                            },
                            pagination: {
                                type: "object",
                                properties: {
                                    page: { type: "number" },
                                    pageSize: { type: "number" },
                                    totalItems: { type: "number" },
                                    totalPages: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Auctions",
    permission: "access.nft",
    demoMask: ["items.seller.email"],
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Process request");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get NFT Auctions retrieved successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.nftListing,
        query,
        sortField: query.sortField || "createdAt",
        where: { type: "AUCTION" },
        includeModels: [
            {
                model: db_1.models.nftToken,
                as: "token",
                attributes: ["id", "name", "image", "tokenId"],
            },
            {
                model: db_1.models.user,
                as: "seller",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.nftBid,
                as: "bids",
                attributes: ["id", "amount", "currency", "createdAt"],
                required: false,
            }
        ],
        numericFields: ["price", "reservePrice", "buyNowPrice"],
    });
};
