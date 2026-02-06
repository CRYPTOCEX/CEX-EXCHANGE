"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get Unified Blog Dashboard Data",
    description: "Retrieves aggregated data for the blog admin dashboard including post counts (published/draft), recent posts, author counts (approved/pending) with recent pending applications, total categories, total tags, and overall blog stats, plus top categories and tags.",
    operationId: "getBlogDashboardData",
    tags: ["Blog", "Admin", "Dashboard"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Dashboard data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            posts: {
                                type: "object",
                                properties: {
                                    publishedCount: { type: "number" },
                                    draftCount: { type: "number" },
                                    recentPosts: {
                                        type: "array",
                                        items: { type: "object" },
                                    },
                                },
                            },
                            authors: {
                                type: "object",
                                properties: {
                                    approvedCount: { type: "number" },
                                    pendingCount: { type: "number" },
                                    recentPendingAuthors: {
                                        type: "array",
                                        items: { type: "object" },
                                    },
                                },
                            },
                            categories: {
                                type: "object",
                                properties: {
                                    count: { type: "number" },
                                    list: {
                                        type: "array",
                                        items: { type: "object" },
                                    },
                                },
                            },
                            tags: {
                                type: "object",
                                properties: {
                                    count: { type: "number" },
                                    list: {
                                        type: "array",
                                        items: { type: "object" },
                                    },
                                },
                            },
                            stats: {
                                type: "object",
                                properties: {
                                    totalPosts: { type: "number" },
                                    totalComments: { type: "number" },
                                    totalAuthors: { type: "number" },
                                    totalReaders: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
    permission: "access.blog",
    logModule: "ADMIN_BLOG",
    logTitle: "Get blog dashboard stats",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching post statistics");
        const publishedCount = await db_1.models.post.count({
            where: { status: "PUBLISHED" },
        });
        const draftCount = await db_1.models.post.count({ where: { status: "DRAFT" } });
        const recentPosts = await db_1.models.post.findAll({
            order: [["createdAt", "DESC"]],
            limit: 5,
            include: [
                {
                    model: db_1.models.author,
                    as: "author",
                    include: [
                        {
                            model: db_1.models.user,
                            as: "user",
                            attributes: ["id", "firstName", "lastName", "email", "avatar"],
                        },
                    ],
                },
                {
                    model: db_1.models.category,
                    as: "category",
                    attributes: ["id", "name", "slug"],
                },
            ],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching author statistics");
        const approvedCount = await db_1.models.author.count({
            where: { status: "APPROVED" },
        });
        const pendingCount = await db_1.models.author.count({
            where: { status: "PENDING" },
        });
        const recentPendingAuthors = await db_1.models.author.findAll({
            where: { status: "PENDING" },
            order: [["createdAt", "DESC"]],
            limit: 3,
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
            ],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching category statistics");
        const totalCategories = await db_1.models.category.count();
        const topCategories = await db_1.models.category.findAll({
            subQuery: false,
            attributes: [
                "id",
                "name",
                "slug",
                "description",
                [sequelize_1.Sequelize.fn("COUNT", sequelize_1.Sequelize.col("posts.id")), "postCount"],
            ],
            include: [
                {
                    model: db_1.models.post,
                    as: "posts",
                    attributes: [],
                    required: false,
                },
            ],
            group: ["category.id"],
            order: [[sequelize_1.Sequelize.fn("COUNT", sequelize_1.Sequelize.col("posts.id")), "DESC"]],
            limit: 5,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching tag statistics");
        const totalTags = await db_1.models.tag.count();
        const topTags = await db_1.models.tag.findAll({
            subQuery: false,
            attributes: [
                "id",
                "name",
                "slug",
                [sequelize_1.Sequelize.fn("COUNT", sequelize_1.Sequelize.col("posts.id")), "postCount"],
            ],
            include: [
                {
                    model: db_1.models.post,
                    as: "posts",
                    attributes: [],
                    through: { attributes: [] },
                    required: false,
                },
            ],
            group: ["tag.id"],
            order: [[sequelize_1.Sequelize.fn("COUNT", sequelize_1.Sequelize.col("posts.id")), "DESC"]],
            limit: 10,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating overall statistics");
        const totalComments = await db_1.models.comment.count();
        const totalReaders = 0;
        const stats = {
            totalPosts: publishedCount,
            totalComments,
            totalAuthors: approvedCount,
            totalReaders,
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Dashboard statistics retrieved successfully");
        return {
            posts: {
                publishedCount,
                draftCount,
                recentPosts: recentPosts.map((post) => post.toJSON()),
            },
            authors: {
                approvedCount,
                pendingCount,
                recentPendingAuthors: recentPendingAuthors.map((author) => author.toJSON()),
            },
            categories: {
                count: totalCategories,
                list: topCategories.map((c) => c.toJSON()),
            },
            tags: {
                count: totalTags,
                list: topTags.map((t) => t.toJSON()),
            },
            stats,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to fetch dashboard data");
        console_1.logger.error("BLOG", "Error fetching dashboard data", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch dashboard data",
        });
    }
};
