"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getPages = getPages;
const db_1 = require("@b/db");
const redis_1 = require("@b/utils/redis");
const redis = redis_1.RedisSingleton.getInstance();
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all pages",
    description: "Fetches a comprehensive list of all pages available on the platform.",
    operationId: "listAllPages",
    tags: ["Page"],
    requiresAuth: false,
    responses: {
        200: {
            description: "Pages retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.basePageSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Pages"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async () => {
    try {
        const cachedPages = await redis.get("pages");
        if (cachedPages)
            return JSON.parse(cachedPages);
    }
    catch (err) {
        console.error("Redis error:", err);
    }
    const pages = await getPages();
    await redis.set("pages", JSON.stringify(pages), "EX", 43200);
    return pages;
};
async function getPages() {
    return (await db_1.models.page.findAll({
        where: {
            status: true,
        },
    })).map((page) => page.get({ plain: true }));
}
