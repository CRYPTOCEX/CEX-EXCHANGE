"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Retrieves detailed information of a specific tag by ID",
    operationId: "getTagById",
    tags: ["Admin", "Content", "Category"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the tag to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Tag details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseTagSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Tag"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.blog.tag",
    requiresAuth: true,
    logModule: "ADMIN_BLOG",
    logTitle: "Get tag by ID",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating tag ID");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching tag");
    const result = await (0, query_1.getRecord)("tag", params.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Tag retrieved successfully");
    return result;
};
