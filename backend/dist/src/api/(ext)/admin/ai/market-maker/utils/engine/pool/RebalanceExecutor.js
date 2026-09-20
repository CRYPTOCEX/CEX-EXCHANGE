"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planRebalance = planRebalance;
exports.executeRebalance = executeRebalance;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const blockchain_1 = require("@b/api/(ext)/ecosystem/utils/blockchain");
const queries_1 = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
const matchingEngine_1 = require("@b/api/(ext)/ecosystem/utils/matchingEngine");
const queries_2 = require("../../scylla/queries");
const SETTLE_TIMEOUT_MS = 5000;
const SETTLE_POLL_MS = 250;
const MIN_REBALANCE_BASE = 1e-8;
function planRebalance(params) {
    const { baseBalance, quoteBalance, targetPrice, targetRatio } = params;
    const totalValueInQuote = baseBalance * targetPrice + quoteBalance;
    if (totalValueInQuote <= 0) {
        throw (0, error_1.createError)(400, "Pool has no value to rebalance");
    }
    const targetBaseValueInQuote = totalValueInQuote * targetRatio;
    const newBaseBalance = targetBaseValueInQuote / targetPrice;
    const newQuoteBalance = totalValueInQuote * (1 - targetRatio);
    const baseChange = newBaseBalance - baseBalance;
    const quoteChange = newQuoteBalance - quoteBalance;
    const currentRatio = (baseBalance * targetPrice) / totalValueInQuote;
    return {
        targetRatio,
        currentRatio,
        requiredBaseChange: baseChange,
        requiredQuoteChange: quoteChange,
        previousBaseBalance: baseBalance,
        previousQuoteBalance: quoteBalance,
        totalValue: totalValueInQuote,
        side: baseChange > 0 ? "BUY" : "SELL",
        absBase: Math.abs(baseChange),
        alreadyBalanced: Math.abs(currentRatio - targetRatio) < 1e-9,
    };
}
async function priceAgainstRealBook(symbol, side, needBase) {
    const walk = await (0, queries_1.walkRealBook)(symbol, side === "BUY" ? "ASKS" : "BIDS", needBase);
    let coveredBase = 0;
    let consumedNotional = 0;
    let bestPrice = 0;
    let worstPrice = 0;
    for (const [rawPrice, rawAmount] of walk.levels) {
        const price = Number(rawPrice);
        const amount = Number(rawAmount);
        if (!(price > 0) || !(amount > 0))
            continue;
        if (bestPrice === 0)
            bestPrice = price;
        const take = Math.min(amount, needBase - coveredBase);
        coveredBase += take;
        consumedNotional += take * price;
        worstPrice = price;
        if (coveredBase >= needBase)
            break;
    }
    return {
        coveredBase,
        consumedNotional,
        bestPrice,
        worstPrice,
        exhausted: walk.exhausted,
        capped: walk.capped,
    };
}
async function flattenOwnLiquidity(symbol) {
    const openIds = await (0, queries_2.getOpenBotEcosystemOrderIds)(symbol);
    if (!openIds.length)
        return 0;
    const matchingEngine = await matchingEngine_1.MatchingEngine.getInstance();
    const results = await Promise.allSettled(openIds.map((orderId) => matchingEngine.handleOrderCancellation(orderId, symbol)));
    const cancelled = results.filter((r) => r.status === "fulfilled").length;
    if (cancelled < openIds.length) {
        console_1.logger.warn("AI_MM_POOL", `Rebalance: flattened ${cancelled}/${openIds.length} own orders on ${symbol}; ` +
            `the remainder may still self-match and settle to nothing`);
    }
    return cancelled;
}
async function executeRebalance(params) {
    var _a, _b, _c;
    const { marketMaker, market, pool, plan, maxSlippagePercent } = params;
    if (marketMaker.status === "ACTIVE") {
        throw (0, error_1.createError)(400, "Cannot rebalance active market maker. Please pause it first.");
    }
    const symbol = (market === null || market === void 0 ? void 0 : market.currency) && (market === null || market === void 0 ? void 0 : market.pair) ? `${market.currency}/${market.pair}` : null;
    if (!symbol) {
        throw (0, error_1.createError)(400, "Market maker has no ecosystem market to trade against");
    }
    if (plan.alreadyBalanced || plan.absBase < MIN_REBALANCE_BASE) {
        throw (0, error_1.createError)(400, `Pool is already within rounding distance of ${(plan.targetRatio * 100).toFixed(0)}% base. Nothing to trade.`);
    }
    const baseSymbol = (_a = market.currency) !== null && _a !== void 0 ? _a : "base";
    const quoteSymbol = (_b = market.pair) !== null && _b !== void 0 ? _b : "quote";
    const ownOrdersFlattened = await flattenOwnLiquidity(symbol);
    const book = await priceAgainstRealBook(symbol, plan.side, plan.absBase);
    if (book.coveredBase + 1e-12 < plan.absBase) {
        const reason = book.capped
            ? "the book is too deep to price safely in one pass"
            : "the book does not go that far";
        throw (0, error_1.createError)(409, `Insufficient real liquidity: ${reason}. It offers ${book.coveredBase.toFixed(8)} ${baseSymbol} ` +
            `against the ${plan.absBase.toFixed(8)} ${baseSymbol} needed to reach ` +
            `${(plan.targetRatio * 100).toFixed(0)}% base. Nothing was traded.`);
    }
    const slippagePercent = book.bestPrice > 0 ? Math.abs(book.worstPrice / book.bestPrice - 1) * 100 : 0;
    if (slippagePercent > maxSlippagePercent) {
        throw (0, error_1.createError)(409, `Rebalance refused: covering ${plan.absBase.toFixed(8)} ${baseSymbol} would reach ` +
            `${book.worstPrice} ${quoteSymbol} from a touch of ${book.bestPrice} ${quoteSymbol} — ` +
            `${slippagePercent.toFixed(2)}% slippage against a ${maxSlippagePercent}% limit. Nothing was traded.`);
    }
    const poolBaseBefore = Number(pool.baseCurrencyBalance) || 0;
    const poolQuoteBefore = Number(pool.quoteCurrencyBalance) || 0;
    if (plan.side === "BUY" && book.consumedNotional > poolQuoteBefore) {
        throw (0, error_1.createError)(400, `Pool cannot afford this rebalance: it needs ${book.consumedNotional.toFixed(8)} ${quoteSymbol} ` +
            `at the book's prices and holds ${poolQuoteBefore.toFixed(8)}. Nothing was traded.`);
    }
    if (plan.side === "SELL" && plan.absBase > poolBaseBefore) {
        throw (0, error_1.createError)(400, `Pool cannot afford this rebalance: it needs ${plan.absBase.toFixed(8)} ${baseSymbol} ` +
            `and holds ${poolBaseBefore.toFixed(8)}. Nothing was traded.`);
    }
    let botId = params.botId;
    if (!botId) {
        const bot = (await db_1.models.aiBot.findOne({
            where: { marketMakerId: marketMaker.id },
            order: [["createdAt", "ASC"]],
        }));
        botId = bot === null || bot === void 0 ? void 0 : bot.id;
    }
    if (!botId) {
        throw (0, error_1.createError)(400, "This market maker has no bots, so it has no identity to place the rebalance order under. Create a bot first.");
    }
    const limitPrice = book.worstPrice;
    const aiOrderId = await (0, queries_2.insertBotOrder)({
        marketId: marketMaker.marketId,
        botId,
        side: plan.side,
        type: "LIMIT",
        price: (0, blockchain_1.toBigIntFloat)(limitPrice),
        amount: (0, blockchain_1.toBigIntFloat)(plan.absBase),
        filledAmount: BigInt(0),
        status: "OPEN",
        purpose: "LIQUIDITY",
    });
    const order = await (0, queries_2.placeRealOrder)(symbol, plan.side, (0, blockchain_1.toBigIntFloat)(limitPrice), (0, blockchain_1.toBigIntFloat)(plan.absBase), aiOrderId, marketMaker.id, botId);
    let remainingCancelled = false;
    const deadline = Date.now() + SETTLE_TIMEOUT_MS;
    while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, SETTLE_POLL_MS));
        try {
            const live = await (0, queries_1.findRawOrderByIdOnSymbol)(botId, symbol, order.id);
            if (!live || live.status === "CLOSED" || BigInt(String((_c = live.remaining) !== null && _c !== void 0 ? _c : 0)) === BigInt(0))
                break;
        }
        catch (error) {
            console_1.logger.debug("AI_MM_POOL", "Rebalance: order poll failed", error);
        }
    }
    try {
        const live = await (0, queries_1.getOrderByUserAndId)(botId, order.id);
        if (live && live.status !== "CLOSED" && live.remaining > BigInt(0)) {
            const matchingEngine = await matchingEngine_1.MatchingEngine.getInstance();
            await matchingEngine.handleOrderCancellation(order.id, symbol);
            remainingCancelled = true;
        }
    }
    catch (error) {
        console_1.logger.error("AI_MM_POOL", `Rebalance: failed to sweep the remainder of order ${order.id} on ${symbol}`, error);
    }
    await pool.reload();
    const poolBaseAfter = Number(pool.baseCurrencyBalance) || 0;
    const poolQuoteAfter = Number(pool.quoteCurrencyBalance) || 0;
    const filledBase = Math.abs(poolBaseAfter - poolBaseBefore);
    const quoteDelta = poolQuoteAfter - poolQuoteBefore;
    const avgPrice = filledBase > 0 ? Math.abs(quoteDelta) / filledBase : null;
    await pool.update({ lastRebalanceAt: new Date() });
    await db_1.models.aiMarketMakerHistory.create({
        marketMakerId: marketMaker.id,
        action: "REBALANCE",
        details: {
            field: "poolRebalanceExecuted",
            previousValue: {
                baseBalance: poolBaseBefore,
                quoteBalance: poolQuoteBefore,
                baseRatio: plan.currentRatio,
            },
            newValue: {
                targetRatio: plan.targetRatio,
                side: plan.side,
                requestedBase: plan.absBase,
                filledBase,
                quoteDelta,
                avgPrice,
                limitPrice,
                baseBalance: poolBaseAfter,
                quoteBalance: poolQuoteAfter,
                ecosystemOrderId: order.id,
                remainingCancelled,
            },
            triggeredBy: "ADMIN",
            note: "REBALANCE_EXECUTED (real order against order-backed depth; pool balances moved by the matcher's settlement)",
        },
        priceAtAction: avgPrice !== null && avgPrice !== void 0 ? avgPrice : limitPrice,
        poolValueAtAction: plan.totalValue,
    });
    console_1.logger.info("AI_MM_POOL", `Rebalance executed on ${symbol}: ${plan.side} ${plan.absBase.toFixed(8)} ${baseSymbol} ` +
        `-> filled ${filledBase.toFixed(8)} @ ${avgPrice !== null && avgPrice !== void 0 ? avgPrice : limitPrice} (limit ${limitPrice})`);
    return {
        requestedBase: plan.absBase,
        filledBase,
        quoteDelta,
        avgPrice,
        limitPrice,
        remainingCancelled,
        ecosystemOrderId: order.id,
        ownOrdersFlattened,
    };
}
