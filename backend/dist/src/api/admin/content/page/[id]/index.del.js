"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("@b/api/content/page/utils");
exports.metadata = {
    summary: "Deletes a page",
    operationId: "deletePage",
    tags: ["Admin", "Content", "Page"],
    parameters: (0, query_1.deleteRecordParams)("page"),
    responses: (0, query_1.deleteRecordResponses)("Page"),
    permission: "delete.page",
    requiresAuth: true,
    logModule: "ADMIN_CMS",
    logTitle: "Delete page",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting page with ID: ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "page",
        id: params.id,
        query,
    });
    await (0, utils_1.invalidatePagesCache)();
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Page deleted successfully");
    return result;
};
