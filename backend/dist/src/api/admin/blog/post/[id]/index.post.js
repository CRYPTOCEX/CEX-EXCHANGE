"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates a blog post identified by id",
    description: "This endpoint updates an existing blog post.",
    operationId: "updatePost",
    tags: ["Admin", "Content"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The id of the blog post to update",
            required: true,
            schema: {
                type: "string",
                description: "Post Slug",
            },
        },
    ],
    requestBody: {
        required: true,
        description: "Updated blog post data",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        title: { type: "string", description: "Title of the post" },
                        content: { type: "string", description: "Content of the post" },
                        description: {
                            type: "string",
                            description: "Description of the post",
                        },
                        categoryId: {
                            type: "string",
                            description: "Category ID for the post",
                        },
                        status: {
                            type: "string",
                            description: "New status of the blog post",
                            enum: ["PUBLISHED", "DRAFT"],
                        },
                        tags: {
                            type: "array",
                            description: "Array of tag names associated with the post",
                            items: {
                                type: "string",
                            },
                        },
                    },
                    required: ["title", "content", "categoryId", "status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Blog post updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Confirmation message of successful author creation",
                            },
                        },
                    },
                },
            },
        },
        401: {
            description: "Unauthorized, user must be authenticated",
        },
        404: {
            description: "Blog post not found",
        },
        500: {
            description: "Internal server error",
        },
    },
    permission: "edit.blog.post",
    logModule: "ADMIN_BLOG",
    logTitle: "Update blog post with tags",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    const { id } = params;
    const { content, tags, category, description, title, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating blog post ID and data");
    return await db_1.sequelize
        .transaction(async (transaction) => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking if post exists");
        const existingPost = await db_1.models.post.findOne({
            where: { id },
            include: [{ model: db_1.models.postTag, as: "postTags" }],
            transaction,
        });
        if (!existingPost)
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Post not found or you don't have permission to edit it."
            });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating post fields");
        existingPost.title = title;
        existingPost.content = content;
        existingPost.description = description;
        existingPost.status = status;
        await existingPost.save();
        if (category) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating post category");
            await existingPost.setCategory(category, { transaction });
        }
        if (tags) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating ${tags.length} tags`);
            await updateTags(existingPost, tags, transaction);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Post updated successfully with tags");
        return {
            message: "Post updated successfully",
        };
    })
        .catch((error) => {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to update post");
        throw error;
    });
};
async function updateTags(existingPost, tags, transaction) {
    await db_1.models.postTag.destroy({
        where: { postId: existingPost.id },
        transaction,
    });
    const tagInstances = [];
    for (const tagName of tags) {
        const tagSlug = (0, utils_1.slugify)(tagName.toLowerCase());
        let tag = await db_1.models.tag.findOne({
            where: { slug: tagSlug },
            transaction,
        });
        if (!tag) {
            tag = await db_1.models.tag.create({
                name: tagName,
                slug: tagSlug,
            }, { transaction });
        }
        tagInstances.push(tag);
    }
    await db_1.models.postTag.bulkCreate(tagInstances.map((tag) => ({
        postId: existingPost.id,
        tagId: tag.id,
    })), { transaction });
}
