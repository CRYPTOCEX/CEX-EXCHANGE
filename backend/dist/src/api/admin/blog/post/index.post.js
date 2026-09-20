"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const sanitize_html_1 = require("@b/utils/sanitize-html");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const tags_1 = require("@b/api/blog/post/tags");
exports.metadata = {
    summary: "Stores a new Blog Post",
    operationId: "storePost",
    tags: ["Admin", "Content", "Posts"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.postUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.postStoreSchema, "Blog Post"),
    requiresAuth: true,
    permission: "create.blog.post",
    logModule: "ADMIN_BLOG",
    logTitle: "Create blog post",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { title, content, categoryId, authorId, slug, description, status, image, tags, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating blog post data");
    const sanitizedContent = typeof content === "string" ? (0, sanitize_html_1.sanitizeHTML)(content) : content;
    const sanitizedTitle = typeof title === "string" ? (0, sanitize_html_1.sanitizeHTML)(title) : title;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating blog post");
    const result = await db_1.sequelize.transaction(async (transaction) => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for duplicate post slug");
        const duplicate = await db_1.models.post.findOne({
            where: { slug },
            paranoid: false,
            transaction,
        });
        if (duplicate) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "A post with this slug already exists.",
            });
        }
        const tagIds = await (0, tags_1.resolvePostTags)(tags, transaction);
        const post = await db_1.models.post.create({
            title: sanitizedTitle,
            content: sanitizedContent,
            categoryId,
            authorId,
            slug,
            description,
            status,
            image,
        }, { transaction });
        if (tagIds.length > 0) {
            await db_1.models.postTag.bulkCreate(tagIds.map((tagId) => ({ postId: post.id, tagId })), { transaction });
        }
        return { id: post.id, message: "Post created successfully" };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Blog post created successfully");
    return result;
};
