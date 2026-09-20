"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getPage = getPage;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
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
    const idOrSlug = data.params.id;
    return getPage(idOrSlug);
};
async function getPage(idOrSlug) {
    let response = await db_1.models.page.findOne({
        where: { id: idOrSlug, status: "PUBLISHED" },
    });
    if (!response) {
        response = await db_1.models.page.findOne({
            where: { slug: idOrSlug, status: "PUBLISHED" },
        });
    }
    if (!response) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Page not found",
        });
    }
    return response.get({ plain: true });
}
