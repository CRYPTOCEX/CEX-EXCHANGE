"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordMakerFill = recordMakerFill;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const fill_accounting_1 = require("./fill-accounting");
async function recordMakerFill(fill) {
    var _a, _b, _c;
    try {
        const bot = await db_1.models.aiBot.findByPk(fill.botId);
        if (!bot) {
            console_1.logger.warn("BOT_PNL", `Bot ${fill.botId} not found; skipping fill record for ${fill.symbol}`);
            return;
        }
        const botData = bot.get({ plain: true });
        let marketId = (_a = fill.marketId) !== null && _a !== void 0 ? _a : null;
        if (!marketId && botData.marketMakerId) {
            try {
                const maker = await db_1.models.aiMarketMaker.findByPk(botData.marketMakerId, {
                    attributes: ["marketId"],
                });
                marketId = (_b = maker === null || maker === void 0 ? void 0 : maker.marketId) !== null && _b !== void 0 ? _b : null;
            }
            catch (_d) {
            }
        }
        const outcome = (0, fill_accounting_1.applyFill)({
            position: Number(botData.currentPosition || 0),
            avgEntryPrice: Number(botData.avgEntryPrice || 0),
        }, {
            side: fill.side,
            price: fill.price,
            amount: fill.amount,
            fee: fill.fee,
        });
        const updates = {
            currentPosition: outcome.position,
            avgEntryPrice: outcome.avgEntryPrice,
            realTradesExecuted: (botData.realTradesExecuted || 0) + 1,
            totalVolume: (Number(botData.totalVolume) || 0) + fill.amount,
            lastTradeAt: new Date(),
        };
        if (!botData.firstRealTradeAt)
            updates.firstRealTradeAt = new Date();
        if (outcome.realizedPnL !== 0) {
            updates.totalRealizedPnL =
                (Number(botData.totalRealizedPnL) || 0) + outcome.realizedPnL;
            if (outcome.isProfitable) {
                updates.profitableTrades = (botData.profitableTrades || 0) + 1;
            }
        }
        await bot.update(updates);
        try {
            const { insertBotRealTrade } = await Promise.resolve().then(() => __importStar(require("../scylla/queries")));
            await insertBotRealTrade({
                botId: fill.botId,
                marketId,
                symbol: fill.symbol,
                side: fill.side,
                price: fill.price,
                amount: fill.amount,
                fee: fill.fee,
                isMaker: fill.isMaker,
                counterpartyUserId: (_c = fill.counterpartyUserId) !== null && _c !== void 0 ? _c : null,
                pnl: outcome.realizedPnL,
                tradeTime: new Date(),
            });
        }
        catch (error) {
            console_1.logger.debug("BOT_PNL", `Real-trade ledger write skipped for bot ${fill.botId}`, error);
        }
        console_1.logger.info("BOT_PNL", `Bot ${fill.botId} ${fill.side} ${fill.amount.toFixed(4)} @ ${fill.price.toFixed(6)} | ` +
            `Position: ${Number(botData.currentPosition || 0).toFixed(4)} -> ${outcome.position.toFixed(4)} | ` +
            `PnL: ${outcome.realizedPnL.toFixed(4)} | Profitable: ${outcome.isProfitable}`);
    }
    catch (error) {
        console_1.logger.error("BOT_PNL", `Failed to record fill for bot ${fill.botId}`, error);
    }
}
