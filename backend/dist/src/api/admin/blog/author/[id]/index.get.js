"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves detailed information of a specific author by ID",
    operationId: "getAuthorById",
    tags: ["Admin", "Content", "Author"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the author to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Author details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseAuthorSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Author"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.blog.author",
    requiresAuth: true,
    logModule: "ADMIN_BLOG",
    logTitle: "Get author by ID",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating author ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching author");
    const result = await (0, query_1.getRecord)("author", params.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Author retrieved successfully");
    return result;
};
