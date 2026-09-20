"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
const stale_settlement_1 = require("@b/api/(ext)/nft/utils/stale-settlement");
const display_name_1 = require("@b/utils/display-name");
exports.metadata = {
    summary: "List NFT offers",
    operationId: "listNftOffers",
    tags: ["NFT", "Offer"],
    logModule: "NFT",
    logTitle: "List NFT Offers",
    parameters: [
        {
            name: "tokenId",
            in: "query",
            description: "Filter by token ID",
            required: false,
            schema: { type: "string", format: "uuid" },
        },
        {
            name: "collectionId",
            in: "query",
            description: "Filter by collection ID",
            required: false,
            schema: { type: "string", format: "uuid" },
        },
        {
            name: "userId",
            in: "query",
            description: "Filter by the user who made the offer",
            required: false,
            schema: { type: "string", format: "uuid" },
        },
        {
            name: "status",
            in: "query",
            description: "Comma-separated status filter. Defaults to ACTIVE,ACCEPTED — the two states a viewer can still act on.",
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
            description: "Offers retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: { $ref: "#/components/schemas/NftOffer" },
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
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
    "CANCELLED",
];
exports.default = async (data) => {
    var _a, _b;
    const { query, ctx } = data;
    const { tokenId, collectionId, userId, status } = query !== null && query !== void 0 ? query : {};
    if (!tokenId && !collectionId && !userId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "One of tokenId, collectionId or userId is required",
        });
    }
    const requested = String(status !== null && status !== void 0 ? status : "ACTIVE,ACCEPTED")
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
        if (tokenId)
            where.tokenId = tokenId;
        if (collectionId)
            where.collectionId = collectionId;
        if (userId)
            where.userId = userId;
        const { count, rows } = await db_1.models.nftOffer.findAndCountAll({
            where,
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"],
                    required: false,
                },
                {
                    model: db_1.models.user,
                    as: "seller",
                    attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"],
                    required: false,
                },
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name", "image", "ownerId"],
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
        ctx === null || ctx === void 0 ? void 0 : ctx.success("List NFT Offers completed successfully");
        return (0, display_name_1.redactPublicNames)({
            data: rows.map((row) => row.toJSON()),
            confirmGraceHours: (await (0, stale_settlement_1.confirmGraceMs)()) / (60 * 60 * 1000),
            pagination: {
                page,
                perPage,
                total: count,
                totalPages: Math.ceil(count / perPage),
            },
        });
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to list NFT offers", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve NFT offers",
        });
    }
};
