"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get FAQ Categories",
    description: "Retrieves distinct FAQ categories.",
    operationId: "getFAQCategories",
    tags: ["FAQ", "User"],
    logModule: "FAQ",
    logTitle: "Get FAQ Categories",
    responses: {
        200: {
            description: "Categories retrieved successfully",
            content: {
                "application/json": {
                    schema: { type: "array", items: { type: "string" } },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching distinct FAQ categories");
        const categories = await db_1.models.faq.findAll({
            where: { status: true },
            attributes: [[(0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("category")), "category"]],
            raw: true,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Mapping categories to result array");
        const result = categories.map((item) => item.category);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${result.length} categories`);
        return result;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to fetch FAQ categories");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch FAQ categories",
        });
    }
};
