"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("./utils");
const query_1 = require("@b/utils/query");
const utils_2 = require("./utils");
const Websocket_1 = require("@b/handler/Websocket");
exports.metadata = {
    summary: "Stores a new Announcement",
    operationId: "storeAnnouncement",
    tags: ["Admin", "Announcements"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.announcementUpdateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_2.announcementSchema, "Announcement"),
    requiresAuth: true,
    permission: "create.announcement",
    logModule: "ADMIN_SYS",
    logTitle: "Create announcement",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { type, title, message, link, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating announcement data");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating announcement");
    const announcement = await (0, query_1.storeRecord)({
        model: "announcement",
        data: {
            type,
            title,
            message,
            link,
            status,
        },
        returnResponse: true,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting announcement creation");
    (0, Websocket_1.handleBroadcastMessage)({
        type: "announcements",
        method: "create",
        data: announcement.record,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Announcement created successfully");
    return announcement.message;
};
