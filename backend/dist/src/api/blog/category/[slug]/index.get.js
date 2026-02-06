"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getCategory = getCategory;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves a single category by ID with optional inclusion of posts",
    description: "This endpoint retrieves a single category by its ID with optional inclusion of posts.",
    operationId: "getCategoryById",
    tags: ["Blog"],
    requiresAuth: false,
    parameters: [
        {
            index: 0,
            name: "slug",
            in: "path",
            description: "The ID of the category to retrieve",
            required: true,
            schema: {
                type: "string",
                description: "Category ID",
            },
        },
        {
            name: "posts",
            in: "query",
            description: "Include posts in the category",
            required: false,
            schema: {
                type: "boolean",
            },
        },
    ],
    responses: {
        200: {
            description: "Category retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...utils_1.baseCategorySchema,
                            posts: utils_1.categoryPostsSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Category"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    return getCategory(data.params.slug, data.query.posts === "true");
};
async function getCategory(slug, includePosts) {
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
                ],
            },
        ]
        : [];
    return await db_1.models.category
        .findOne({
        where: { slug },
        include: includes,
    })
        .then((result) => (result ? result.get({ plain: true }) : null));
}
