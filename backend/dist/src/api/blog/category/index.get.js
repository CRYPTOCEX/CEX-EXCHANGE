"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists categories with post count",
    description: "This endpoint retrieves all categories that have at least one published post along with the count of their associated posts.",
    operationId: "getCategories",
    tags: ["Blog"],
    requiresAuth: false,
    logModule: "BLOG",
    logTitle: "Get Categories",
    responses: {
        200: {
            description: "Categories retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                ...utils_1.baseCategorySchema,
                                postCount: { type: "number" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Category"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching categories with post counts");
    const categories = await db_1.models.category.findAll({
        attributes: {
            include: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("posts.id")), "postCount"],
            ],
        },
        include: [
            {
                model: db_1.models.post,
                as: "posts",
                attributes: [],
                where: { status: "PUBLISHED" },
                required: true,
            },
        ],
        group: ["category.id"],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${categories.length} categories`);
    return categories.map((category) => category.get({ plain: true }));
};
