"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Aggregate NFT dispute statistics for admin dashboard",
    operationId: "adminGetNftDisputeStats",
    tags: ["Admin", "NFT", "Dispute"],
    description: "Returns aggregate counts used by the admin dispute dashboard: total, open (PENDING/INVESTIGATING/AWAITING_RESPONSE/ESCALATED), resolved (RESOLVED), urgent (priority HIGH or CRITICAL and not RESOLVED/REJECTED).",
    logModule: "ADMIN_NFT",
    logTitle: "NFT Dispute Stats",
    responses: {
        200: {
            description: "Dispute statistics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            total: { type: "number" },
                            open: { type: "number" },
                            resolved: { type: "number" },
                            urgent: { type: "number" },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
    permission: "access.nft.dispute",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Counting dispute stats");
    const [total, open, resolved, urgent] = await Promise.all([
        db_1.models.nftDispute.count(),
        db_1.models.nftDispute.count({
            where: {
                status: {
                    [sequelize_1.Op.in]: [
                        "PENDING",
                        "INVESTIGATING",
                        "AWAITING_RESPONSE",
                        "ESCALATED",
                    ],
                },
            },
        }),
        db_1.models.nftDispute.count({ where: { status: "RESOLVED" } }),
        db_1.models.nftDispute.count({
            where: {
                priority: { [sequelize_1.Op.in]: ["HIGH", "CRITICAL"] },
                status: { [sequelize_1.Op.notIn]: ["RESOLVED", "REJECTED"] },
            },
        }),
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Dispute stats retrieved");
    return { total, open, resolved, urgent };
};
