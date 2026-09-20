"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get follow status between users",
    operationId: "getNftFollowStatus",
    tags: ["NFT", "Social", "Follow"],
    requiresAuth: true,
    parameters: [
        {
            name: "userId",
            in: "query",
            description: "User ID to check follow status for",
            required: true,
            schema: { type: "string", format: "uuid" }
        }
    ],
    responses: {
        200: {
            description: "Follow status retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            isFollowing: { type: "boolean" },
                            isFollowedBy: { type: "boolean" },
                            followersCount: { type: "integer" },
                            followingCount: { type: "integer" }
                        }
                    }
                }
            }
        },
        400: { description: "Invalid request" },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" }
    }
};
exports.default = async (data) => {
    const { query, user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Authentication required"
        });
    }
    try {
        const { userId } = query;
        if (userId === user.id) {
            const followersCount = await db_1.models.nftCreatorFollow.count({
                where: { followingId: user.id }
            });
            const followingCount = await db_1.models.nftCreatorFollow.count({
                where: { followerId: user.id }
            });
            return {
                isFollowing: false,
                isFollowedBy: false,
                followersCount,
                followingCount
            };
        }
        const isFollowing = await db_1.models.nftCreatorFollow.findOne({
            where: {
                followerId: user.id,
                followingId: userId
            }
        });
        const isFollowedBy = await db_1.models.nftCreatorFollow.findOne({
            where: {
                followerId: userId,
                followingId: user.id
            }
        });
        const followersCount = await db_1.models.nftCreatorFollow.count({
            where: { followingId: userId }
        });
        const followingCount = await db_1.models.nftCreatorFollow.count({
            where: { followerId: userId }
        });
        return {
            isFollowing: !!isFollowing,
            isFollowedBy: !!isFollowedBy,
            followersCount,
            followingCount
        };
    }
    catch (error) {
        console_1.logger.error("NFT_FOLLOW_STATUS", "Failed to get follow status", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to get follow status"
        });
    }
};
