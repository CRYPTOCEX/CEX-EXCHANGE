"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Follow or unfollow a user",
    operationId: "toggleNftFollow",
    tags: ["NFT", "Social", "Follow"],
    logModule: "NFT",
    logTitle: "Follow/Unfollow User",
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        userId: {
                            type: "string",
                            format: "uuid",
                            description: "User ID to follow/unfollow"
                        },
                        action: {
                            type: "string",
                            enum: ["follow", "unfollow"],
                            description: "Action to perform"
                        }
                    },
                    required: ["userId", "action"]
                }
            }
        }
    },
    responses: {
        200: { description: "Action completed successfully" },
        400: { description: "Invalid request" },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" }
    }
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Authentication required"
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Extract and validate follow action");
        const { userId, action } = body;
        if (userId === user.id) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Cannot follow yourself"
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Check if target user exists");
        const targetUser = await db_1.models.user.findByPk(userId);
        if (!targetUser) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "User not found"
            });
        }
        if (action === 'follow') {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Create follow relationship");
            const existingFollow = await db_1.models.nftCreatorFollow.findOne({
                where: {
                    followerId: user.id,
                    followingId: userId
                }
            });
            if (!existingFollow) {
                await db_1.models.nftCreatorFollow.create({
                    followerId: user.id,
                    followingId: userId
                });
            }
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Followed successfully");
            return {
                message: "Followed successfully",
                isFollowing: true
            };
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Remove follow relationship");
            const deleted = await db_1.models.nftCreatorFollow.destroy({
                where: {
                    followerId: user.id,
                    followingId: userId
                }
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Unfollowed successfully");
            return {
                message: "Unfollowed successfully",
                isFollowing: false
            };
        }
    }
    catch (error) {
        console_1.logger.error("NFT_FOLLOW_ACTION", "Failed to process follow action", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to process follow action"
        });
    }
};
