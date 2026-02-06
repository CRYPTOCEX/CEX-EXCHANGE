"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Trade Messages",
    description: "Retrieves messages (stored in timeline) for the specified trade.",
    operationId: "getP2PTradeMessages",
    tags: ["P2P", "Trade"],
    logModule: "P2P",
    logTitle: "Get trade messages",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Trade ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "Trade messages retrieved successfully." },
        401: query_1.unauthorizedResponse,
        404: { description: "Trade not found." },
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { id } = data.params || {};
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching trade messages");
    try {
        const trade = await db_1.models.p2pTrade.findOne({
            where: {
                id,
                [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
            },
            raw: true,
        });
        if (!trade)
            return { error: "Trade not found" };
        let timeline = trade.timeline || [];
        if (typeof timeline === 'string') {
            try {
                timeline = JSON.parse(timeline);
            }
            catch (e) {
                console_1.logger.error("P2P_TRADE", "Failed to parse timeline JSON", e);
                timeline = [];
            }
        }
        const messages = Array.isArray(timeline)
            ? timeline
                .filter((entry) => entry.event === "MESSAGE")
                .map((entry) => ({
                id: entry.id || entry.createdAt,
                message: entry.message,
                senderId: entry.senderId,
                senderName: entry.senderName || "User",
                isAdminMessage: entry.isAdminMessage || false,
                createdAt: entry.createdAt,
            }))
            : [];
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${messages.length} messages for trade ${id.slice(0, 8)}...`);
        return messages;
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to retrieve trade messages");
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error: " + err.message });
    }
};
