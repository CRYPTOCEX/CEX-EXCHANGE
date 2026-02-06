"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Updates a blog post identified by id",
    description: "This endpoint updates an existing blog post.",
    operationId: "updatePost",
    tags: ["Content", "Author", "Post"],
    logModule: "BLOG",
    logTitle: "Update blog post",
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
                description: "Post id",
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
                            description: "Array of tag objects associated with the post",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                },
                                required: ["id"],
                            },
                        },
                        image: { type: "string", description: "Image URL for the post" },
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
                                description: "Confirmation message of successful post update",
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized, user must be authenticated" },
        404: { description: "Blog post not found" },
        500: { description: "Internal server error" },
    },
};
exports.default = async (data) => {
    const { params, body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { id } = params;
    const { content, tags, categoryId, description, title, status, image } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying author credentials");
    const author = await db_1.models.author.findOne({
        where: { userId: user.id },
    });
    if (!author)
        throw (0, error_1.createError)({ statusCode: 404, message: "Author not found" });
    return await db_1.sequelize
        .transaction(async (transaction) => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding existing post");
        const existingPost = await db_1.models.post.findOne({
            where: { id, authorId: author.id },
            include: [{ model: db_1.models.postTag, as: "postTags" }],
            transaction,
        });
        if (!existingPost)
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Post not found or you don't have permission to edit it.",
            });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating post content");
        existingPost.title = title;
        existingPost.content = content;
        existingPost.description = description;
        existingPost.status = status;
        existingPost.image = image;
        await existingPost.save();
        if (categoryId) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating post category");
            const category = await db_1.models.category.findByPk(categoryId, {
                transaction,
            });
            if (!category)
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "Category not found with the provided ID",
                });
            await existingPost.setCategory(category, { transaction });
        }
        if (tags) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating post tags");
            await updateTags(existingPost, tags, transaction);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Blog post updated: "${title}" (${id}) by author ${author.id}`);
        return {
            message: "Post updated successfully",
        };
    })
        .catch((error) => {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to update blog post");
        throw error;
    });
};
async function updateTags(existingPost, tags, transaction) {
    await db_1.models.postTag.destroy({
        where: { postId: existingPost.id },
        transaction,
    });
    const tagInstances = [];
    for (const tagItem of tags) {
        if (!tagItem.id) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Each tag object must have an id property",
            });
        }
        const tag = await db_1.models.tag.findByPk(tagItem.id, { transaction });
        if (!tag) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Tag with id ${tagItem.id} not found`,
            });
        }
        tagInstances.push(tag);
    }
    await db_1.models.postTag.bulkCreate(tagInstances.map((tag) => ({
        postId: existingPost.id,
        tagId: tag.id,
    })), { transaction });
}
