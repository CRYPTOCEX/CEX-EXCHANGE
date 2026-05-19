"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getPage = getPage;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const redis_1 = require("@b/utils/redis");
const redis = redis_1.RedisSingleton.getInstance();
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves a single page by ID",
    description: "Fetches detailed information about a specific page based on its unique identifier.",
    operationId: "getPage",
    tags: ["Page"],
    requiresAuth: false,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "The ID of the page to retrieve",
            schema: { type: "number" },
        },
    ],
    responses: {
        200: {
            description: "Page retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.basePageSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Page"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    try {
        const cachedPages = await redis.get("pages");
        if (cachedPages) {
            const pages = JSON.parse(cachedPages);
            const page = pages.find((p) => p.id === data.params.id);
            if (page)
                return page;
        }
    }
    catch (err) {
        console.error("Redis error:", err);
    }
    return getPage(data.params.id);
};
async function getPage(id) {
    const response = await db_1.models.page.findOne({
        where: { id },
    });
    if (!response) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Page not found",
        });
    }
    return response.get({ plain: true });
}
