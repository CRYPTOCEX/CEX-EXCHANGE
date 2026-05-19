"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const trend_1 = require("../../utils/engine/trend");
exports.metadata = {
    summary: "Force AI Market Maker phase transition",
    operationId: "forceAiMarketMakerPhaseTransition",
    tags: ["Admin", "AI Market Maker", "Market"],
    description: "Forces an immediate phase transition for an AI Market Maker. This is an admin override that bypasses normal phase transition logic. Use with caution as it affects market behavior.",
    logModule: "ADMIN_MM",
    logTitle: "Force Market Maker Phase Transition",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the AI Market Maker",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.forcePhaseSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Phase transition completed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            previousPhase: { type: "string" },
                            newPhase: { type: "string" },
                            phaseTargetPrice: { type: "number" },
                            durationHours: { type: "number" },
                            nextPhaseChangeAt: { type: "string", format: "date-time" },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("AI Market Maker Market"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.ai.market-maker.market",
};
exports.default = async (data) => {
    const { params, body, ctx, user } = data;
    const { targetPhase } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch market maker from database");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.id, {
        include: [{ model: db_1.models.aiMarketMakerPool, as: "pool" }],
    });
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate phase transition");
    const validPhases = [
        "ACCUMULATION",
        "MARKUP",
        "DISTRIBUTION",
        "MARKDOWN",
    ];
    if (!validPhases.includes(targetPhase)) {
        throw (0, error_1.createError)(400, `Invalid target phase. Must be one of: ${validPhases.join(", ")}`);
    }
    const previousPhase = marketMaker.currentPhase;
    const currentPrice = Number(marketMaker.lastKnownPrice) || Number(marketMaker.targetPrice);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Execute forced phase transition");
    const trendManager = new trend_1.TrendManager();
    const result = await trendManager.forcePhaseTransition(marketMaker.id, currentPrice, previousPhase, targetPhase, user === null || user === void 0 ? void 0 : user.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Phase transition completed successfully");
    return {
        message: `Phase transition from ${previousPhase} to ${targetPhase} completed successfully`,
        previousPhase,
        newPhase: result.newPhase,
        phaseTargetPrice: result.phaseTargetPrice,
        durationHours: result.durationHours,
        phaseStartedAt: result.phaseStartedAt,
        nextPhaseChangeAt: result.nextPhaseChangeAt,
        warning: "This was a forced admin override. Normal phase transition rules were bypassed.",
    };
};
