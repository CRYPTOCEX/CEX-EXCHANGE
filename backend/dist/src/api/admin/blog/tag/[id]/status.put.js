"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Update Status for a Tag",
    operationId: "updateTagStatus",
    tags: ["Admin", "Content", "Category"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the Tag to update",
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
                            type: "boolean",
                            description: "New status to apply to the Tag (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Tag"),
    requiresAuth: true,
    permission: "edit.blog.tag",
    logModule: "ADMIN_BLOG",
    logTitle: "Update tag status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating tag ID and status");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating tag status to ${status ? 'active' : 'inactive'}`);
    const result = await (0, query_1.updateStatus)("tag", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Tag status updated successfully");
    return result;
};
