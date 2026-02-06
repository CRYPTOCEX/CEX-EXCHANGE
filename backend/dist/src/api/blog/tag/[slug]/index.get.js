"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getTag = getTag;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves a single tag by slug with optional inclusion of posts",
    description: "This endpoint retrieves a single tag by its slug with optional inclusion of posts.",
    operationId: "getTagBySlug",
    tags: ["Blog"],
    requiresAuth: false,
    parameters: [
        {
            index: 0,
            name: "slug",
            in: "path",
            description: "The slug of the tag to retrieve",
            required: true,
            schema: {
                type: "string",
            },
        },
        {
            name: "posts",
            in: "query",
            description: "Include posts tagged with this tag",
            required: false,
            schema: {
                type: "boolean",
            },
        },
    ],
    responses: {
        200: {
            description: "Tag retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...utils_1.baseTagSchema,
                            posts: utils_1.tagPostsSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Tag"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching tag ${params.slug}`);
    const tag = await getTag(params.slug, query.posts === "true");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Tag retrieved successfully");
    return tag;
};
async function getTag(slug, includePosts) {
    const includes = includePosts
        ? [
            {
                model: db_1.models.post,
                as: "posts",
                include: [
                    {
                        model: db_1.models.author,
                        as: "author",
                        include: [
                            {
                                model: db_1.models.user,
                                as: "user",
                                attributes: [
                                    "id",
                                    "firstName",
                                    "lastName",
                                    "email",
                                    "avatar",
                                ],
                            },
                        ],
                    },
                    {
                        model: db_1.models.category,
                        as: "category",
                    },
                ],
            },
        ]
        : [];
    return await db_1.models.tag
        .findOne({
        where: { slug },
        include: includes,
    })
        .then((result) => (result ? result.get({ plain: true }) : null));
}
