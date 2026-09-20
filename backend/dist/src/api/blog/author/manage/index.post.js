"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const tags_1 = require("@b/api/blog/post/tags");
const sanitize_html_1 = require("@b/utils/sanitize-html");
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
                        tags: tags_1.postTagsSchema,
                        slug: { type: "string", description: "Slug of the post" },
                        image: { type: "string", description: "Image URL for the post" },
                    },
                    required: ["title", "content", "categoryId", "status"],
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
    const { body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { content, tags, categoryId, description, title, status, image } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying author credentials");
    const author = await db_1.models.author.findOne({
        where: { userId: user.id },
    });
    if (!author)
        throw (0, error_1.createError)({ statusCode: 404, message: "Author not found" });
    const slug = (0, utils_1.slugify)(body.slug || title || "");
    if (!slug) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "A post needs a title that can be turned into a URL.",
        });
    }
    const sanitizedTitle = typeof title === "string" ? (0, sanitize_html_1.sanitizeHTML)(title) : title;
    const sanitizedContent = typeof content === "string" ? (0, sanitize_html_1.sanitizeHTML)(content) : content;
    return await db_1.sequelize
        .transaction(async (transaction) => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for duplicate post slug");
        const existingPost = await db_1.models.post.findOne({
            where: { slug },
            paranoid: false,
            transaction,
        });
        if (existingPost) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "A post with the same slug already exists",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving post tags");
        const tagIds = await (0, tags_1.resolvePostTags)(tags, transaction);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating blog post");
        const newPost = await db_1.models.post.create({
            title: sanitizedTitle,
            content: sanitizedContent,
            description,
            status,
            slug,
            authorId: author.id,
            categoryId,
            image,
        }, { transaction });
        if (tagIds.length > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding tags to post");
            await db_1.models.postTag.bulkCreate(tagIds.map((tagId) => ({ postId: newPost.id, tagId })), { transaction });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Blog post created: "${title}" (${newPost.id}) by author ${author.id}`);
        return {
            id: newPost.id,
            message: "Post created successfully",
        };
    })
        .catch((error) => {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to create blog post");
        throw error;
    });
};
