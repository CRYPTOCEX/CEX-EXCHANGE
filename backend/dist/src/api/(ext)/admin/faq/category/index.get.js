"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get FAQ Categories",
    description: "Retrieves a list of distinct FAQ categories. Returns all unique category names from the FAQ database.",
    operationId: "getFaqCategories",
    tags: ["Admin", "FAQ", "Categories"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Categories retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: { type: "string", description: "Category name" },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "view.faq.category",
    logModule: "ADMIN_FAQ",
    logTitle: "Get FAQ categories",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching FAQ categories");
    const categories = await db_1.models.faq.findAll({
        attributes: [[(0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("category")), "category"]],
        raw: true,
    });
    const result = categories.map((c) => c.category);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQ categories retrieved successfully");
    return result;
};
