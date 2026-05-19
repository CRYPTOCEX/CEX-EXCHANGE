"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const Websocket_1 = require("@b/handler/Websocket");
exports.metadata = {
    summary: "Updates a specific Announcement",
    operationId: "updateAnnouncement",
    tags: ["Admin", "Announcements"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the Announcement to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the Announcement",
        content: {
            "application/json": {
                schema: utils_1.announcementUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Announcement"),
    requiresAuth: true,
    permission: "edit.announcement",
    logModule: "ADMIN_SYS",
    logTitle: "Update announcement",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { type, title, message, link, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating announcement data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating announcement ${id}`);
    const msg = await (0, query_1.updateRecord)("announcement", id, {
        type,
        title,
        message,
        link,
        status,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting announcement update");
    (0, Websocket_1.handleBroadcastMessage)({
        type: "announcements",
        model: "announcement",
        method: "update",
        data: {
            type,
            title,
            message,
            link,
            status,
        },
        id,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Announcement updated successfully");
    return msg;
};
