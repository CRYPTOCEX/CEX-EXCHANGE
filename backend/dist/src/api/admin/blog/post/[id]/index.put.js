"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const sanitize_html_1 = require("@b/utils/sanitize-html");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const tags_1 = require("@b/api/blog/post/tags");
const sequelize_1 = require("sequelize");
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
        title: typeof body.title === "string" ? (0, sanitize_html_1.sanitizeHTML)(body.title) : body.title,
        content: typeof body.content === "string" ? (0, sanitize_html_1.sanitizeHTML)(body.content) : body.content,
        categoryId: body.categoryId,
        authorId: body.authorId,
        slug: body.slug,
        description: body.description,
        status: body.status,
        image: body.image,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating blog post");
    const result = await db_1.sequelize.transaction(async (transaction) => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for duplicate post slug");
        const duplicate = await db_1.models.post.findOne({
            where: { slug: updatedFields.slug, id: { [sequelize_1.Op.ne]: id } },
            paranoid: false,
            transaction,
        });
        if (duplicate) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "A post with this slug already exists.",
            });
        }
        const post = await db_1.models.post.findByPk(id, { transaction });
        if (!post) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Post not found" });
        }
        await post.update(updatedFields, { transaction });
        await (0, tags_1.syncPostTags)(id, body.tags, transaction);
        return { message: "Post updated successfully" };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Blog post updated successfully");
    return result;
};
