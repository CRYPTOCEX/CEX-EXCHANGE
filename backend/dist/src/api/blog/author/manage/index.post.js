"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Creates a new blog post",
    description: "This endpoint creates a new blog post.",
    operationId: "createPost",
    tags: ["Content", "Author", "Post"],
    logModule: "BLOG",
    logTitle: "Create blog post",
    requiresAuth: true,
    requestBody: {
        required: true,
        description: "New blog post data",
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
                            description: "Status of the blog post",
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
                        slug: { type: "string", description: "Slug of the post" },
                        image: { type: "string", description: "Image URL for the post" },
                    },
                    required: ["title", "content", "categoryId", "status", "slug"],
                },
            },
        },
    },
    responses: {
        201: {
            description: "Blog post created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Confirmation message of successful post creation",
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized, user must be authenticated" },
        409: {
            description: "Conflict, post with the same slug already exists",
        },
        500: { description: "Internal server error" },
    },
};
exports.default = async (data) => {
    const { params, body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { content, tags, categoryId, description, title, status, slug, image } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying author credentials");
    const author = await db_1.models.author.findOne({
        where: { userId: user.id },
    });
    if (!author)
        throw (0, error_1.createError)({ statusCode: 404, message: "Author not found" });
    return await db_1.sequelize
        .transaction(async (transaction) => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for duplicate post slug");
        const existingPost = await db_1.models.post.findOne({
            where: { slug, authorId: author.id },
            transaction,
        });
        if (existingPost) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "A post with the same slug already exists",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating blog post");
        const newPost = await db_1.models.post.create({
            title,
            content,
            description,
            status,
            slug,
            authorId: author.id,
            categoryId,
            image,
        }, { transaction });
        if (tags) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding tags to post");
            await addTags(newPost, tags, transaction);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Blog post created: "${title}" (${newPost.id}) by author ${author.id}`);
        return {
            message: "Post created successfully",
        };
    })
        .catch((error) => {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to create blog post");
        throw error;
    });
};
async function addTags(newPost, tags, transaction) {
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
        postId: newPost.id,
        tagId: tag.id,
    })), { transaction });
}
