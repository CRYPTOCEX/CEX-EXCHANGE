"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "List all pages",
    operationId: "listPages",
    tags: ["Admin", "Content", "Page"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Pages retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.basePageSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Pages"),
        500: query_1.serverErrorResponse,
    },
    permission: "view.page",
    requiresAuth: true,
    logModule: "ADMIN_CMS",
    logTitle: "List pages",
};
exports.default = async (data) => {
    var _a;
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching pages with filters");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.page,
        query,
        sortField: query.sortField || "createdAt",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} page(s)`);
    return result;
};
