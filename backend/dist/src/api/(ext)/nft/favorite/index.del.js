"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Remove NFT from favorites",
    operationId: "removeNftFavorite",
    tags: ["NFT", "Favorite"],
    logModule: "NFT",
    logTitle: "Remove from favorites",
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
                            description: "NFT token ID to unfavorite"
                        },
                        collectionId: {
                            type: "string",
                            format: "uuid",
                            description: "NFT collection ID to unfavorite"
                        }
                    }
                }
            }
        }
    },
    responses: {
        200: { description: "Removed from favorites successfully" },
        400: { description: "Invalid request" },
        401: { description: "Unauthorized" },
        404: { description: "Favorite not found" },
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Removing from favorites");
        const deletedCount = await db_1.models.nftFavorite.destroy({
            where: {
                userId: user.id,
                ...(tokenId && { tokenId }),
                ...(collectionId && { collectionId })
            }
        });
        if (deletedCount === 0) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Favorite not found"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Removed from favorites successfully");
        return {
            message: "Removed from favorites successfully"
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to remove from favorites: ${error.message}`);
        console_1.logger.error("NFT", "Failed to remove NFT from favorites", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to remove from favorites"
        });
    }
};
