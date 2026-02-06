"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getPost = getPost;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const sequelize_1 = require("sequelize");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Retrieves a single blog post by ID",
    description: "This endpoint retrieves a single blog post by its ID.",
    operationId: "getPostById",
    tags: ["Blog"],
    requiresAuth: false,
    parameters: [
        {
            index: 0,
            name: "slug",
            in: "path",
            description: "The ID of the blog post to retrieve",
            required: true,
            schema: {
                type: "string",
                description: "Post ID",
            },
        },
    ],
    responses: {
        200: {
            description: "Blog post retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.basePostSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Post"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { slug } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching blog post ${slug}`);
    const post = await getPost(slug);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Blog post retrieved successfully");
    return post;
};
async function getPost(slug) {
    const post = await db_1.models.post.findOne({
        where: { slug },
        include: [
            {
                model: db_1.models.author,
                as: "author",
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "email", "avatar"],
                        include: [
                            {
                                model: db_1.models.role,
                                as: "role",
                                attributes: ["name"],
                            },
                        ],
                    },
                ],
            },
            {
                model: db_1.models.category,
                as: "category",
            },
            {
                model: db_1.models.tag,
                as: "tags",
                through: {
                    attributes: [],
                },
            },
            {
                model: db_1.models.comment,
                as: "comments",
                attributes: ["id", "content", "createdAt"],
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "email", "avatar"],
                    },
                ],
            },
        ],
    });
    if (!post) {
        return null;
    }
    const cacheManager = cache_1.CacheManager.getInstance();
    const settings = await cacheManager.getSettings();
    const showRelatedPostsRaw = settings.has("showRelatedPosts")
        ? settings.get("showRelatedPosts")
        : null;
    const showRelatedPosts = typeof showRelatedPostsRaw === "boolean"
        ? showRelatedPostsRaw
        : Boolean(showRelatedPostsRaw);
    const response = {
        ...post.toJSON(),
    };
    if (showRelatedPosts) {
        const relatedArticles = await db_1.models.post.findAll({
            where: {
                id: {
                    [sequelize_1.Op.ne]: post.id,
                },
                categoryId: post.categoryId,
            },
            limit: 5,
            order: [["createdAt", "DESC"]],
            attributes: ["id", "title", "slug", "image", "createdAt"],
            include: [
                {
                    model: db_1.models.author,
                    as: "author",
                    include: [
                        {
                            model: db_1.models.user,
                            as: "user",
                            attributes: ["firstName", "lastName"],
                        },
                    ],
                },
            ],
        });
        response.relatedPosts = relatedArticles.map((post) => {
            return {
                ...post.toJSON(),
            };
        });
    }
    if (post.views === null) {
        await post.update({ views: 1 });
    }
    else {
        await post.increment("views", { by: 1 });
    }
    return response;
}
