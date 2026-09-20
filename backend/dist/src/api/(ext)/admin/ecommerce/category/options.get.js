"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Gets ecommerce category options for selection",
    description: "Retrieves a list of active ecommerce categories formatted as value-label pairs for use in dropdown menus and selection components. Only returns categories with status set to true.",
    operationId: "getEcommerceCategoryOptions",
    tags: ["Admin", "Ecommerce", "Category"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Category options retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                value: {
                                    type: "string",
                                    description: "Category ID",
                                },
                                label: {
                                    type: "string",
                                    description: "Category name",
                                },
                            },
                            required: ["value", "label"],
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Ecommerce category"),
        500: errors_1.serverErrorResponse,
    },
    logModule: "ADMIN_ECOM",
    logTitle: "Get category options",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching active categories");
        const categories = await db_1.models.ecommerceCategory.findAll({
            where: { status: true },
            attributes: ["id", "name"],
            order: [["name", "ASC"]],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Formatting category options");
        const formatted = categories.map((category) => ({
            value: category.id,
            label: category.name,
        }));
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${formatted.length} category options`);
        return formatted;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to fetch category options");
        throw (0, error_1.createError)(500, "An error occurred while fetching ecommerce categories");
    }
};
