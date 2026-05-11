"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const cron_1 = require("@b/api/(ext)/forex/utils/cron");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Recovers a failed Forex investment",
    description: "Manually retries processing of a failed Forex investment.",
    operationId: "recoverForexInvestment",
    tags: ["Admin", "Forex", "Investment"],
    requiresAuth: true,
    permission: ["edit.forex.investment"],
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
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Resetting investment status to ACTIVE");
        await investment.update({
            status: "ACTIVE",
            metadata: null,
        });
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
