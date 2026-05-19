"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Copy Trading Leader Details (Admin)",
    description: "Retrieves detailed information about a leader.",
    operationId: "adminGetCopyTradingLeader",
    tags: ["Admin", "Copy Trading"],
    requiresAuth: true,
    logModule: "ADMIN_COPY",
    logTitle: "Get Copy Trading Leader",
    permission: "access.copy_trading",
    demoMask: ["user.email", "followers.user.email"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "Leader details retrieved successfully" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Leader not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Copy Trading Leader");
    const leader = await db_1.models.copyTradingLeader.findByPk(id, {
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar", "createdAt"],
            },
        ],
        paranoid: false,
    });
    if (!leader) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Leader not found" });
    }
    const followers = await db_1.models.copyTradingFollower.findAll({
        where: { leaderId: id },
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
            },
        ],
        order: [["createdAt", "DESC"]],
    });
    const trades = await db_1.models.copyTradingTrade.findAll({
        where: { leaderId: id, followerId: null },
        order: [["createdAt", "DESC"]],
        limit: 50,
    });
    const auditLog = await db_1.models.copyTradingAuditLog.findAll({
        where: { entityType: "LEADER", entityId: id },
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName"],
            },
        ],
        order: [["createdAt", "DESC"]],
        limit: 50,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Copy Trading Leader retrieved successfully");
    return {
        ...leader.toJSON(),
        followers: followers.map((f) => f.toJSON()),
        trades: trades.map((t) => t.toJSON()),
        auditLog: auditLog.map((a) => a.toJSON()),
    };
};
