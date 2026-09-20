"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const cron_1 = require("@b/api/(ext)/forex/utils/cron");
const utils_1 = require("../../utils");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Recovers a failed Forex investment",
    description: "Manually retries processing of a failed Forex investment.",
    operationId: "recoverForexInvestment",
    tags: ["Admin", "Forex", "Investment"],
    requiresAuth: true,
    permission: "edit.forex.investment",
    logModule: "ADMIN_FOREX",
    logTitle: "Recover forex investment",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        investmentId: {
                            type: "string",
                            description: "ID of the investment to recover",
                        },
                    },
                    required: ["investmentId"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Investment recovery initiated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            investment: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    status: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Investment"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { investmentId } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating forex investment ${investmentId}`);
        const investment = await db_1.models.forexInvestment.findOne({
            where: {
                id: investmentId,
                status: "CANCELLED"
            },
            include: [
                {
                    model: db_1.models.forexPlan,
                    as: "plan",
                },
                {
                    model: db_1.models.forexDuration,
                    as: "duration",
                },
            ],
        });
        if (!investment) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Investment not found or not in CANCELLED status",
            });
        }
        const meta = (0, utils_1.parseMetadata)(investment.metadata);
        const refunded = Number((_a = meta === null || meta === void 0 ? void 0 : meta.principalRefunded) !== null && _a !== void 0 ? _a : 0);
        if (refunded > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Reclaiming the refund this cancellation already paid out");
            const account = await db_1.models.forexAccount.findOne({
                where: { userId: investment.userId, type: "LIVE" },
            });
            if (!account) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "This investment's principal was refunded to a LIVE forex account that no longer exists, " +
                        "so it cannot be recovered without paying the principal twice.",
                });
            }
            if (Number((_b = account.balance) !== null && _b !== void 0 ? _b : 0) + 1e-9 < refunded) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Cancelling this investment already returned ${refunded} to the user's forex account, ` +
                        `which now holds only ${Number((_c = account.balance) !== null && _c !== void 0 ? _c : 0)}. Recovering it would pay the ` +
                        `principal a second time. Ask the user to restore the balance, or leave the investment cancelled.`,
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Resetting investment status to ACTIVE");
        await db_1.sequelize.transaction(async (t) => {
            if (refunded > 0) {
                const account = await db_1.models.forexAccount.findOne({
                    where: { userId: investment.userId, type: "LIVE" },
                    lock: t.LOCK.UPDATE,
                    transaction: t,
                });
                if (!account) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: "The user's LIVE forex account disappeared mid-recovery",
                    });
                }
                await (0, utils_1.updateForexAccountBalance)(account, refunded, false, t, ctx);
            }
            const [affected] = await db_1.models.forexInvestment.update({ status: "ACTIVE", metadata: null }, {
                where: { id: investment.id, status: "CANCELLED" },
                transaction: t,
            });
            if (affected === 0) {
                throw (0, error_1.createError)({
                    statusCode: 409,
                    message: "This investment is no longer cancelled; nothing was changed.",
                });
            }
        });
        investment.status = "ACTIVE";
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing investment");
            await (0, cron_1.processForexInvestment)(investment, 0, ctx);
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Investment recovery initiated successfully");
            return {
                message: "Investment recovery initiated successfully",
                investment: {
                    id: investment.id,
                    status: investment.status,
                },
            };
        }
        catch (processError) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to process investment");
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to process investment. It will be retried automatically.",
            });
        }
    }
    catch (error) {
        if (error.statusCode) {
            throw error;
        }
        console_1.logger.error("FOREX", "Error recovering forex investment", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error" });
    }
};
