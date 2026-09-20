"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const display_name_1 = require("@b/utils/display-name");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const public_profile_1 = require("./public-profile");
exports.metadata = {
    summary: "Get Top Blog Authors",
    description: "Retrieves top authors based on post counts.",
    operationId: "getTopBlogAuthors",
    tags: ["Blog", "Authors"],
    requiresAuth: false,
    responses: {
        200: {
            description: "Top authors retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                userId: { type: "string" },
                                status: { type: "string" },
                                postCount: { type: "number" },
                                user: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        firstName: { type: "string" },
                                        lastName: { type: "string" },
                                        avatar: { type: "string" },
                                        profile: { type: "object" },
                                        role: {
                                            type: "object",
                                            properties: {
                                                name: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        401: {
            description: "Unauthorized"
        },
        500: {
            description: "Internal server error"
        }
    }
};
exports.default = async () => {
    try {
        const topAuthors = await db_1.models.author.findAll({
            where: { status: "APPROVED" },
            attributes: [
                "id",
                "userId",
                "status",
                [
                    (0, sequelize_1.literal)(`(
            SELECT COUNT(*)
            FROM post
            WHERE post.authorId = author.id
            AND post.status = 'PUBLISHED'
            AND post.deletedAt IS NULL
          )`),
                    "postCount"
                ],
            ],
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "username", "firstName", "lastName", "avatar", "profile", "lastLogin"],
                },
            ],
            order: [[(0, sequelize_1.literal)("postCount"), "DESC"]],
            limit: 5,
        });
        return (0, display_name_1.withPublicPresence)((0, display_name_1.redactPublicNames)(topAuthors.map(author => {
            var _a;
            const plainAuthor = author.get({ plain: true });
            return (0, public_profile_1.withPublicProfile)({
                ...plainAuthor,
                postCount: parseInt(String((_a = plainAuthor.postCount) !== null && _a !== void 0 ? _a : 0)) || 0,
            });
        })));
    }
    catch (error) {
        console_1.logger.error("BLOG", "Error fetching top authors", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch top authors",
        });
    }
};
