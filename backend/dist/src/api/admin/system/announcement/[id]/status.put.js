"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const Websocket_1 = require("@b/handler/Websocket");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of an announcement",
    operationId: "updateAnnouncementStatus",
    tags: ["Admin", "Announcements"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the announcement to update",
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
                            description: "New status to apply (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Announcement"),
    requiresAuth: true,
    permission: "edit.announcement",
    logModule: "ADMIN_SYS",
    logTitle: "Update announcement status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating announcement ${id} status to ${status ? "active" : "inactive"}`);
    const message = (0, query_1.updateStatus)("announcement", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting status update");
    (0, Websocket_1.handleBroadcastMessage)({
        type: "announcements",
        model: "announcement",
        method: "update",
        status,
        id,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Announcement status updated successfully");
    return message;
};
