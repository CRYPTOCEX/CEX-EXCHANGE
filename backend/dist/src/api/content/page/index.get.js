"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
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
        const cachedPages = await redis.get(utils_1.PAGES_CACHE_KEY);
        if (cachedPages)
            return JSON.parse(cachedPages);
    }
    catch (err) {
        console.error("Redis error:", err);
    }
    const pages = await (0, utils_1.getPages)();
    try {
        await redis.set(utils_1.PAGES_CACHE_KEY, JSON.stringify(pages), "EX", 43200);
    }
    catch (err) {
        console.error("Redis error:", err);
    }
    return pages;
};
