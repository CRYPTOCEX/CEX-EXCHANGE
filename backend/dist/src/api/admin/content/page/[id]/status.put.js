"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of a page",
    operationId: "updatePageStatus",
    tags: ["Admin", "Content", "Page"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the page to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            description: "New status to apply",
                            enum: ["PUBLISHED", "DRAFT"],
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Page"),
    requiresAuth: true,
    permission: "edit.page",
    logModule: "ADMIN_CMS",
    logTitle: "Update page status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating page status to ${status}`);
    const result = await (0, query_1.updateStatus)("page", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Page status updated successfully");
    return result;
};
