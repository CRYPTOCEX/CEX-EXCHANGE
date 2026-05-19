"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get recent NFT activities",
    operationId: "getRecentNftActivities",
    tags: ["NFT", "Activity"],
    logModule: "NFT",
    logTitle: "Get Recent NFT Activities",
    description: "Get recent NFT activities without pagination - for displaying in feeds",
    parameters: [
        {
            name: "limit",
            in: "query",
            description: "Number of activities to return",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 }
        },
        {
            name: "tokenId",
            in: "query",
            description: "Filter by token ID",
            required: false,
            schema: { type: "string", format: "uuid" }
        },
        {
            name: "collectionId",
            in: "query",
            description: "Filter by collection ID",
            required: false,
            schema: { type: "string", format: "uuid" }
        },
        {
            name: "userId",
            in: "query",
            description: "Filter by user ID (fromUser or toUser)",
            required: false,
            schema: { type: "string", format: "uuid" }
        },
        {
            name: "type",
            in: "query",
            description: "Filter by activity type",
            required: false,
            schema: {
                type: "string",
                enum: ["MINT", "TRANSFER", "SALE", "LISTING", "BID", "OFFER", "CANCEL", "COLLECTION_CREATED", "COLLECTION_DEPLOYED"]
            }
        }
    ],
    responses: {
        200: {
            description: "Recent activities retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/NftActivity" }
                    }
                }
            }
        },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: false
};
exports.default = async (data) => {
    const { query, ctx } = data;
    try {
        const limit = Math.min(parseInt(query.limit) || 20, 50);
        const { tokenId, collectionId, userId, type } = query;
        const where = {};
        if (tokenId) {
            where.tokenId = tokenId;
        }
        if (collectionId) {
            where.collectionId = collectionId;
        }
        if (userId) {
            where[sequelize_1.Op.or] = [
                { fromUserId: userId },
                { toUserId: userId }
            ];
        }
        if (type) {
            where.type = type;
        }
        const activities = await db_1.models.nftActivity.findAll({
            where,
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "token",
                    attributes: ["id", "name", "image", "tokenId"],
                    required: false
                },
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
            limit,
            paranoid: true
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Recent NFT Activities completed successfully");
        return activities.map(activity => activity.toJSON());
    }
    catch (error) {
        console_1.logger.error("NFT_ACTIVITY", "Failed to retrieve recent NFT activities", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve recent NFT activities"
        });
    }
};
