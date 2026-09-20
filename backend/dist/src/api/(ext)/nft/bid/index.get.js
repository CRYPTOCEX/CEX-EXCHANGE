"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
const display_name_1 = require("@b/utils/display-name");
exports.metadata = {
    summary: "List bids on an auction",
    operationId: "listNftBids",
    tags: ["NFT", "Auction", "Bid"],
    logModule: "NFT",
    logTitle: "List NFT Bids",
    parameters: [
        {
            name: "listingId",
            in: "query",
            description: "Auction listing ID",
            required: false,
            schema: { type: "string", format: "uuid" },
        },
        {
            name: "userId",
            in: "query",
            description: "Filter by bidder",
            required: false,
            schema: { type: "string", format: "uuid" },
        },
        {
            name: "status",
            in: "query",
            description: "Comma-separated status filter. Defaults to ACTIVE — the standing bids.",
            required: false,
            schema: { type: "string" },
        },
        {
            name: "perPage",
            in: "query",
            description: "Items per page",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
        },
        {
            name: "page",
            in: "query",
            description: "Page number",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
        },
    ],
    responses: {
        200: {
            description: "Bids retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: { $ref: "#/components/schemas/NftBid" },
                            },
                            pagination: { $ref: "#/components/schemas/Pagination" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: false,
};
const VALID_STATUSES = [
    "ACTIVE",
    "OUTBID",
    "ACCEPTED",
    "REJECTED",
    "CANCELLED",
    "EXPIRED",
];
exports.default = async (data) => {
    var _a, _b;
    const { query, ctx } = data;
    const { listingId, userId, status } = query !== null && query !== void 0 ? query : {};
    if (!listingId && !userId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "One of listingId or userId is required",
        });
    }
    const requested = String(status !== null && status !== void 0 ? status : "ACTIVE")
        .split(",")
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry) => VALID_STATUSES.includes(entry));
    if (!requested.length) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid status filter" });
    }
    const perPage = Math.min(Math.max(parseInt(String((_a = query === null || query === void 0 ? void 0 : query.perPage) !== null && _a !== void 0 ? _a : "50"), 10) || 50, 1), 100);
    const page = Math.max(parseInt(String((_b = query === null || query === void 0 ? void 0 : query.page) !== null && _b !== void 0 ? _b : "1"), 10) || 1, 1);
    try {
        const where = { status: { [sequelize_1.Op.in]: requested } };
        if (listingId)
            where.listingId = listingId;
        if (userId)
            where.userId = userId;
        const { count, rows } = await db_1.models.nftBid.findAndCountAll({
            where,
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"],
                    required: false,
                },
            ],
            order: [
                ["amount", "DESC"],
                ["createdAt", "DESC"],
            ],
            limit: perPage,
            offset: (page - 1) * perPage,
            distinct: true,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("List NFT Bids completed successfully");
        return (0, display_name_1.redactPublicNames)({
            data: rows.map((row) => row.toJSON()),
            pagination: {
                page,
                perPage,
                total: count,
                totalPages: Math.ceil(count / perPage),
            },
        });
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to list NFT bids", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve NFT bids",
        });
    }
};
