"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get AI Market Maker phase status",
    operationId: "getAiMarketMakerPhaseStatus",
    tags: ["Admin", "AI Market Maker", "Market"],
    description: "Retrieves the current phase status for an AI Market Maker, including the current phase, timing information, target prices, and momentum data.",
    logModule: "ADMIN_MM",
    logTitle: "Get Market Maker Phase Status",
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
    responses: {
        200: {
            description: "Phase status retrieved successfully",
            content: {
                "application/json": {
                    schema: utils_1.phaseStatusSchema,
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("AI Market Maker Market"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.ai.market-maker.market",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch market maker from database");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.id);
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculate phase progress");
    let progress = 0;
    let remainingHours = 0;
    let elapsedHours = 0;
    if (marketMaker.phaseStartedAt && marketMaker.nextPhaseChangeAt) {
        const now = new Date();
        const startedAt = new Date(marketMaker.phaseStartedAt);
        const endsAt = new Date(marketMaker.nextPhaseChangeAt);
        const totalDuration = endsAt.getTime() - startedAt.getTime();
        const elapsed = now.getTime() - startedAt.getTime();
        progress = Math.min(1, Math.max(0, elapsed / totalDuration));
        elapsedHours = Math.round(elapsed / (60 * 60 * 1000) * 10) / 10;
        remainingHours = Math.max(0, Math.round((endsAt.getTime() - now.getTime()) / (60 * 60 * 1000) * 10) / 10);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Phase status retrieved successfully");
    return {
        currentPhase: marketMaker.currentPhase,
        phaseStartedAt: marketMaker.phaseStartedAt,
        nextPhaseChangeAt: marketMaker.nextPhaseChangeAt,
        phaseTargetPrice: Number(marketMaker.phaseTargetPrice),
        progress,
        elapsedHours,
        remainingHours,
        marketBias: marketMaker.marketBias,
        biasStrength: Number(marketMaker.biasStrength),
        trendMomentum: Number(marketMaker.trendMomentum),
        lastMomentumUpdate: marketMaker.lastMomentumUpdate,
        lastKnownPrice: Number(marketMaker.lastKnownPrice),
        priceMode: marketMaker.priceMode,
        externalSymbol: marketMaker.externalSymbol,
        baseVolatility: Number(marketMaker.baseVolatility),
        volatilityMultiplier: Number(marketMaker.volatilityMultiplier),
    };
};
