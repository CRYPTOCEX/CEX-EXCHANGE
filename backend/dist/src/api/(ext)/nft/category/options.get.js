"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Lists every active NFT category, for creator selectors",
    description: "Flat, unpaginated list of active categories for the collection-create " +
        "and mint forms. This is deliberately NOT `GET /api/nft/category`: that " +
        "endpoint is the paginated browse list, so it answers with the first " +
        "page only — ten categories — and a selector fed from it silently loses " +
        "everything after the tenth. Same reasoning as `/api/blog/tag/options`.",
    operationId: "getNftCategoryOptions",
    tags: ["NFT", "Category"],
    requiresAuth: false,
    responses: {
        200: {
            description: "Categories retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                                slug: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching NFT category options");
    const categories = await db_1.models.nftCategory.findAll({
        where: { status: true },
        attributes: ["id", "name", "slug"],
        order: [["name", "ASC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${categories.length} category options retrieved`);
    return categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
    }));
};
