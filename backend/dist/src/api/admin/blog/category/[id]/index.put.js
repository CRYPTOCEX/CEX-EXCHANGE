"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific category",
    operationId: "updateCategory",
    tags: ["Admin", "Content", "Category"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the category to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the category",
        content: {
            "application/json": {
                schema: utils_1.categoryUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Category"),
    requiresAuth: true,
    permission: "edit.blog.category",
    logModule: "ADMIN_BLOG",
    logTitle: "Update category",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { name, slug, image, description } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating category ID and data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating category");
    const result = await (0, query_1.updateRecord)("category", id, {
        name,
        slug,
        image,
        description,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Category updated successfully");
    return result;
};
