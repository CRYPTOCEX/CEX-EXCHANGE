"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const Websocket_1 = require("@b/handler/Websocket");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes an announcement",
    operationId: "deleteAnnouncement",
    tags: ["Admin", "Announcements"],
    parameters: (0, query_1.deleteRecordParams)("announcement"),
    responses: (0, query_1.deleteRecordResponses)("Announcement"),
    permission: "delete.announcement",
    requiresAuth: true,
    logModule: "ADMIN_SYS",
    logTitle: "Delete announcement",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting announcement ${id}`);
    const message = (0, query_1.handleSingleDelete)({
        model: "announcement",
        id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting announcement deletion");
    (0, Websocket_1.handleBroadcastMessage)({
        type: "announcements",
        method: "delete",
        id,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Announcement deleted successfully");
    return message;
};
