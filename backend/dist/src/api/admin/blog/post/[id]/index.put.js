"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific Post",
    operationId: "updatePost",
    tags: ["Admin", "Post"],
    parameters: [
        {
            name: "id",
            in: "path",
            description: "ID of the Post to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the Post",
        required: true,
        content: {
            "application/json": {
                schema: utils_1.postUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Post"),
    requiresAuth: true,
    permission: "edit.blog.post",
    logModule: "ADMIN_BLOG",
    logTitle: "Update blog post",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating blog post ID and data");
    const updatedFields = {
        title: body.title,
        content: body.content,
        categoryId: body.categoryId,
        authorId: body.authorId,
        slug: body.slug,
        description: body.description,
        status: body.status,
        image: body.image,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating blog post");
    const result = await (0, query_1.updateRecord)("post", id, updatedFields);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Blog post updated successfully");
    return result;
};
