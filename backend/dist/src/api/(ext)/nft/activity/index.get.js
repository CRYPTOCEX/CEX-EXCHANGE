"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Get NFT activities",
    operationId: "getNftActivities",
    tags: ["NFT", "Activity"],
    logModule: "NFT",
    logTitle: "Get NFT Activities",
    parameters: [
        {
            name: "page",
            in: "query",
            description: "Page number",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 }
        },
        {
            name: "perPage",
            in: "query",
            description: "Items per page",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
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
            description: "Filter by user ID",
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
                enum: ["MINT", "TRANSFER", "SALE", "LISTING", "BID", "OFFER", "CANCEL"]
            }
        }
    ],
    responses: {
        200: {
            description: "Activities retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: { $ref: "#/components/schemas/NftActivity" }
                            },
                            pagination: { $ref: "#/components/schemas/Pagination" }
                        }
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
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get NFT Activities completed successfully");
        return (0, query_1.getFiltered)({
            model: db_1.models.nftActivity,
            query,
            sortField: "createdAt",
            includeModels: [
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
            paranoid: true
        });
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to retrieve NFT activities", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve NFT activities"
        });
    }
};
