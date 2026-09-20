"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific tag",
    operationId: "updateTag",
    tags: ["Admin", "Content", "Category"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the tag to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the tag",
        content: {
            "application/json": {
                schema: utils_1.tagUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Tag"),
    requiresAuth: true,
    permission: "edit.blog.tag",
    logModule: "ADMIN_BLOG",
    logTitle: "Update tag",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { name, slug } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating tag ID and data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating tag");
    const result = await (0, query_1.updateRecord)("tag", id, {
        name,
        slug,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Tag updated successfully");
    return result;
};
