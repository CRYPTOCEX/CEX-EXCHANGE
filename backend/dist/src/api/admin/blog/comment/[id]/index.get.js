"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves detailed information of a specific comment by ID",
    operationId: "getCommentById",
    tags: ["Admin", "Content", "Comment"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the comment to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Comment details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseCommentSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Comment"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.blog.comment",
    requiresAuth: true,
    logModule: "ADMIN_BLOG",
    logTitle: "Get comment by ID",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating comment ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching comment");
    const result = await (0, query_1.getRecord)("comment", params.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Comment retrieved successfully");
    return result;
};
