"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Add NFT to favorites",
    operationId: "addNftFavorite",
    tags: ["NFT", "Favorite"],
    logModule: "NFT",
    logTitle: "Add to favorites",
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        tokenId: {
                            type: "string",
                            format: "uuid",
                            description: "NFT token ID to favorite"
                        },
                        collectionId: {
                            type: "string",
                            format: "uuid",
                            description: "NFT collection ID to favorite"
                        }
                    }
                }
            }
        }
    },
    responses: {
        200: { description: "Added to favorites successfully" },
        400: { description: "Invalid request" },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" }
    }
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Authentication required"
        });
    }
    try {
        const { tokenId, collectionId } = body;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding to favorites");
        const existingFavorite = await db_1.models.nftFavorite.findOne({
            where: {
                userId: user.id,
                ...(tokenId && { tokenId }),
                ...(collectionId && { collectionId })
            }
        });
        if (existingFavorite) {
            return { message: "Already favorited" };
        }
        const favorite = await db_1.models.nftFavorite.create({
            userId: user.id,
            tokenId,
            collectionId
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Added to favorites successfully");
        return {
            message: "Added to favorites successfully",
            data: favorite
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to add to favorites: ${error.message}`);
        console_1.logger.error("NFT", "Failed to add NFT to favorites", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to add to favorites"
        });
    }
};
