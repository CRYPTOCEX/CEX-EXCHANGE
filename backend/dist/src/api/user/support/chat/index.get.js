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
    description: "Fetches the open live chat ticket for the authenticated user. Creates one unless `create=false`, which resumes an existing conversation without opening a new one.",
    operationId: "getOrCreateLiveChat",
    tags: ["Support"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Get or create live chat",
    parameters: [
        {
            name: "create",
            in: "query",
            required: false,
            description: "Set to `false` to look for an existing conversation without creating one. Returns null when there is none.",
            schema: { type: "boolean", default: true },
        },
    ],
    responses: (0, query_1.createRecordResponses)("Support Ticket"),
};
exports.default = async (data) => {
    var _a, _b, _c;
    var _d;
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _a === void 0 ? void 0 : _a.call(ctx, "User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const create = String((_d = query === null || query === void 0 ? void 0 : query.create) !== null && _d !== void 0 ? _d : "true").toLowerCase() !== "false";
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Getting live chat session");
    const result = await getOrCreateLiveChat(user.id, ctx, { create });
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, result ? "Live chat session retrieved" : "No open live chat session");
    return result;
};
async function getOrCreateLiveChat(userId, ctx, options = {}) {
    var _a, _b, _c;
    const { create = true } = options;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Checking for existing live chat ticket");
        const ticket = await db_1.models.supportTicket.findOne({
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
        if (ticket)
            return ticket.get({ plain: true });
        if (!create)
            return null;
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Creating new live chat ticket");
        const created = await db_1.models.supportTicket.create({
            userId,
            type: "LIVE",
            subject: "Live Chat",
            messages: [],
            importance: "LOW",
            status: "PENDING",
        });
        return created.get({ plain: true });
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
