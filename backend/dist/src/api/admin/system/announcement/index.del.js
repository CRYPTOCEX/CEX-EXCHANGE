"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const Websocket_1 = require("@b/handler/Websocket");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk deletes announcements by IDs",
    operationId: "bulkDeleteAnnouncements",
    tags: ["Admin", "Announcements"],
    parameters: (0, query_1.commonBulkDeleteParams)("Announcements"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of announcement IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, query_1.commonBulkDeleteResponses)("Announcements"),
    requiresAuth: true,
    permission: "delete.announcement",
    logModule: "ADMIN_SYS",
    logTitle: "Bulk delete announcements",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} announcements`);
    const message = (0, query_1.handleBulkDelete)({
        model: "announcement",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting bulk deletion");
    (0, Websocket_1.handleBroadcastMessage)({
        type: "announcements",
        method: "delete",
        id: ids,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} announcements deleted successfully`);
    return message;
};
