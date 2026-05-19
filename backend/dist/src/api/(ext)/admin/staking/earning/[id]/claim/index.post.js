"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Claim Admin Earning",
    operationId: "claimAdminEarning",
    description: "Marks an admin earning record as claimed. This updates the isClaimed flag to true, indicating that the platform has processed and claimed this earning. Once claimed, the earning cannot be claimed again.",
    tags: ["Admin", "Staking", "Earnings"],
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Claim Admin Earning",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Admin earning record ID",
        },
    ],
    responses: {
        200: (0, errors_1.successMessageResponse)("Admin earning claimed successfully"),
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Admin Earning"),
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.staking.earning",
};
exports.default = async (data) => {
    var _a, _b;
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const earningId = params.id;
    if (!earningId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Earning ID is required" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Find earning to claim");
        const earning = await db_1.models.stakingAdminEarning.findOne({
            where: { id: earningId },
            include: [
                {
                    model: db_1.models.stakingPool,
                    as: "pool",
                },
            ],
        });
        if (!earning) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Earning not found" });
        }
        if (earning.isClaimed) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Earning already claimed");
            return { message: "Earning already claimed" };
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Mark earning as claimed");
        await earning.update({ isClaimed: true });
        try {
            const poolName = (_b = (_a = earning.pool) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "Unknown Pool";
            await (0, notifications_1.createNotification)({
                userId: user.id,
                relatedId: earning.id,
                type: "system",
                title: "Admin Earning Claimed",
                message: `Admin earning of ${earning.amount} ${earning.currency} for ${poolName} has been claimed.`,
                details: "The earning has been marked as claimed.",
                link: `/admin/staking/earnings`,
                actions: [
                    {
                        label: "View Earnings",
                        link: `/admin/staking/earnings`,
                        primary: true,
                    },
                ],
            }, ctx);
        }
        catch (notifErr) {
            console.error("Failed to create notification for claiming admin earning", notifErr);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Earning claimed successfully");
        return { message: "Earning claimed successfully" };
    }
    catch (error) {
        if (error.statusCode === 404) {
            throw error;
        }
        console.error(`Error claiming admin earning ${earningId}:`, error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message,
        });
    }
};
