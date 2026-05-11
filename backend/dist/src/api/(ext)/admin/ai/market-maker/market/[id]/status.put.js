"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
const MarketMakerEngine_1 = __importDefault(require("../../utils/engine/MarketMakerEngine"));
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Update AI Market Maker market status",
    operationId: "updateAiMarketMakerMarketStatus",
    tags: ["Admin", "AI Market Maker", "Market"],
    description: "Changes the operational status of an AI Market Maker market (START/PAUSE/STOP/RESUME). Validates state transitions, checks minimum liquidity requirements for START action, synchronizes with the MarketMakerEngine, updates bot statuses accordingly, and logs all status changes to history. Enforces proper lifecycle management.",
    logModule: "ADMIN_MM",
    logTitle: "Update Market Maker Status",
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
                schema: utils_1.statusChangeSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Status updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            status: { type: "string" },
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
    var _a, _b;
    const { params, body, ctx } = data;
    const { action } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch market maker with related data");
    const marketMaker = await db_1.models.aiMarketMaker.findByPk(params.id, {
        include: [
            { model: db_1.models.aiMarketMakerPool, as: "pool" },
            { model: db_1.models.aiBot, as: "bots" },
        ],
    });
    if (!marketMaker) {
        throw (0, error_1.createError)(404, "AI Market Maker not found");
    }
    const pool = marketMaker.pool;
    const currentStatus = marketMaker.status;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate state transition");
    const validTransitions = {
        STOPPED: ["START"],
        INITIALIZING: ["START"],
        ACTIVE: ["PAUSE", "STOP"],
        PAUSED: ["RESUME", "STOP"],
    };
    if (!((_a = validTransitions[currentStatus]) === null || _a === void 0 ? void 0 : _a.includes(action))) {
        throw (0, error_1.createError)(400, `Cannot ${action} from ${currentStatus} status. Valid actions: ${((_b = validTransitions[currentStatus]) === null || _b === void 0 ? void 0 : _b.join(", ")) || "none"}`);
    }
    if (action === "START") {
        if (!pool || Number(pool.totalValueLocked) <= 0) {
            throw (0, error_1.createError)(400, "Cannot start market maker without liquidity. Please deposit funds first.");
        }
        const cacheManager = cache_1.CacheManager.getInstance();
        const minLiquidity = Number(await cacheManager.getSetting("aiMarketMakerMinLiquidity")) || 0;
        const quoteBalance = Number((pool === null || pool === void 0 ? void 0 : pool.quoteCurrencyBalance) || 0);
        if (minLiquidity > 0 && quoteBalance < minLiquidity) {
            const market = await db_1.models.ecosystemMarket.findByPk(marketMaker.marketId);
            const quoteCurrency = (market === null || market === void 0 ? void 0 : market.pair) || "quote currency";
            throw (0, error_1.createError)(400, `Insufficient liquidity. Minimum required: ${minLiquidity} ${quoteCurrency}, ` +
                `Pool has: ${quoteBalance.toFixed(2)} ${quoteCurrency}. ` +
                `Please deposit more funds or adjust the minimum liquidity setting.`);
        }
        const bots = marketMaker.bots;
        if (!bots || bots.length === 0) {
            throw (0, error_1.createError)(400, "Cannot start market maker without bots configured.");
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Execute status change through engine");
    const engine = MarketMakerEngine_1.default;
    const marketManager = engine.getMarketManager();
    let newStatus;
    let success = true;
    switch (action) {
        case "START":
            newStatus = "ACTIVE";
            await marketMaker.update({ status: newStatus });
            await db_1.models.aiBot.update({ status: "ACTIVE" }, { where: { marketMakerId: marketMaker.id } });
            if (marketManager) {
                success = await marketManager.startMarket(params.id);
                if (!success) {
                    await marketMaker.update({ status: currentStatus });
                }
            }
            break;
        case "PAUSE":
            newStatus = "PAUSED";
            await marketMaker.update({ status: newStatus });
            if (marketManager) {
                success = await marketManager.pauseMarket(params.id);
                if (!success) {
                    await marketMaker.update({ status: currentStatus });
                }
            }
            break;
        case "RESUME":
            newStatus = "ACTIVE";
            await marketMaker.update({ status: newStatus });
            await db_1.models.aiBot.update({ status: "ACTIVE" }, { where: { marketMakerId: marketMaker.id } });
            if (marketManager) {
                success = await marketManager.resumeMarket(params.id);
                if (!success) {
                    await marketMaker.update({ status: currentStatus });
                }
            }
            break;
        case "STOP":
            newStatus = "STOPPED";
            if (marketManager) {
                success = await marketManager.stopMarket(params.id);
            }
            else {
                await marketMaker.update({ status: newStatus });
            }
            break;
        default:
            throw (0, error_1.createError)(400, "Invalid action");
    }
    if (!success) {
        throw (0, error_1.createError)(500, `Failed to ${action.toLowerCase()} market maker`);
    }
    const bots = marketMaker.bots;
    if (bots && bots.length > 0) {
        const botStatus = newStatus === "ACTIVE" ? "ACTIVE" : "PAUSED";
        await db_1.models.aiBot.update({ status: botStatus }, { where: { marketMakerId: marketMaker.id } });
    }
    if (!marketManager) {
        await db_1.models.aiMarketMakerHistory.create({
            marketMakerId: marketMaker.id,
            action: action,
            details: {
                reason: `Status changed from ${currentStatus} to ${newStatus}`,
                triggeredBy: "ADMIN",
            },
            priceAtAction: marketMaker.targetPrice,
            poolValueAtAction: (pool === null || pool === void 0 ? void 0 : pool.totalValueLocked) || 0,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Market maker status updated successfully");
    return {
        message: `AI Market Maker ${action.toLowerCase()}ed successfully`,
        status: newStatus,
    };
};
