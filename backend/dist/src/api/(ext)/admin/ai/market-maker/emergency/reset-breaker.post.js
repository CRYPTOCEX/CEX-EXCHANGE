"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const errors_1 = require("@b/utils/schema/errors");
const console_1 = require("@b/utils/console");
const MarketMakerEngine_1 = __importDefault(require("../utils/engine/MarketMakerEngine"));
exports.metadata = {
    summary: "Reset the AI Market Maker risk circuit breaker",
    operationId: "resetMarketMakerCircuitBreaker",
    tags: ["Admin", "AI Market Maker", "Emergency"],
    description: "Clears a tripped global risk circuit breaker so trading can resume. The breaker trips when the platform-wide daily loss limit is breached and gates every market at once; until it is cleared, no market trades. It also clears automatically at the daily reset, so this endpoint exists for the case where an operator has resolved the cause and does not want to wait for midnight UTC. Returns the breaker state before and after, and reports whether the engine was running at all.",
    logModule: "ADMIN_MM",
    logTitle: "Reset Risk Circuit Breaker",
    responses: {
        200: {
            description: "Circuit breaker state after the reset attempt",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            engineRunning: {
                                type: "boolean",
                                description: "False when the engine is not initialised; the breaker lives in memory, so there is nothing to reset.",
                            },
                            wasTripped: {
                                type: "boolean",
                                description: "Whether the breaker was tripped before this call",
                            },
                            tripReason: {
                                type: "string",
                                nullable: true,
                                description: "Why it had tripped, when it had",
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "manage.ai.market_maker.emergency",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Read current circuit breaker state");
    const riskManager = MarketMakerEngine_1.default.getRiskManager();
    if (!riskManager) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Engine not running; nothing to reset");
        return {
            message: "AI Market Maker engine is not running, so there is no circuit breaker to reset.",
            engineRunning: false,
            wasTripped: false,
            tripReason: null,
        };
    }
    const stats = await riskManager.getStats();
    const wasTripped = stats.circuitBreakerStatus === "TRIPPED";
    if (!wasTripped) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Circuit breaker was not tripped");
        return {
            message: "Circuit breaker is not tripped; nothing to do.",
            engineRunning: true,
            wasTripped: false,
            tripReason: null,
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Reset circuit breaker");
    riskManager.resetCircuitBreaker();
    console_1.logger.warn("AI_MM", "Risk circuit breaker manually reset by an administrator");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Circuit breaker reset");
    return {
        message: "Circuit breaker reset. Trading resumes on the next tick; the daily loss counter is NOT cleared, so it can trip again if losses continue.",
        engineRunning: true,
        wasTripped: true,
        tripReason: null,
    };
};
