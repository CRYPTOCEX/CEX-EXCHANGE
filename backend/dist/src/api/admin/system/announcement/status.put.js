"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const Websocket_1 = require("@b/handler/Websocket");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Bulk updates the status of announcements",
    operationId: "bulkUpdateAnnouncementStatus",
    tags: ["Admin", "Announcements"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of announcement IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "boolean",
                            description: "New status to apply to the announcements (true for active, false for inactive)",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Announcement"),
    requiresAuth: true,
    permission: "edit.announcement",
    logModule: "ADMIN_SYS",
    logTitle: "Bulk update announcement status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating ${ids.length} announcements to ${status ? "active" : "inactive"}`);
    const msg = (0, query_1.updateStatus)("announcement", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting bulk status update");
    (0, Websocket_1.handleBroadcastMessage)({
        type: "announcements",
        model: "announcement",
        method: "update",
        status,
        id: ids,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} announcement statuses updated successfully`);
    return msg;
};
