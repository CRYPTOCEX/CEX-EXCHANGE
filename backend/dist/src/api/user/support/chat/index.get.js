"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getOrCreateLiveChat = getOrCreateLiveChat;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Retrieves or creates a live chat ticket",
    description: "Fetches the existing live chat ticket for the authenticated user, or creates a new one if none exists.",
    operationId: "getOrCreateLiveChat",
    tags: ["Support"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Get or create live chat",
    responses: (0, query_1.createRecordResponses)("Support Ticket"),
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _a === void 0 ? void 0 : _a.call(ctx, "User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Getting or creating live chat session");
    const result = await getOrCreateLiveChat(user.id, ctx);
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Live chat session retrieved");
    return result;
};
async function getOrCreateLiveChat(userId, ctx) {
    var _a, _b, _c, _d, _e;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Checking for existing live chat ticket");
        let ticket = await db_1.models.supportTicket.findOne({
            where: {
                userId,
                type: "LIVE",
                status: { [sequelize_1.Op.ne]: "CLOSED" },
            },
            include: [
                {
                    model: db_1.models.user,
                    as: "agent",
                    attributes: ["avatar", "firstName", "lastName", "lastLogin"],
                },
            ],
        });
        if (!ticket) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Creating new live chat ticket");
            ticket = await db_1.models.supportTicket.create({
                userId,
                type: "LIVE",
                subject: "Live Chat",
                messages: [],
                importance: "LOW",
                status: "PENDING",
            });
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "New live chat ticket created");
        }
        else {
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, "Existing live chat ticket found");
        }
        return ticket.get({ plain: true });
    }
    catch (error) {
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, error.message);
        throw error;
    }
}
