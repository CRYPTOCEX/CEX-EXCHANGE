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
exports.filterAndSortOrders = exports.matchAndCalculateOrders = void 0;
exports.processMatchedOrders = processMatchedOrders;
exports.addTradeToOrder = addTradeToOrder;
exports.validateOrder = validateOrder;
exports.sortOrders = sortOrders;
exports.getUserEcosystemWalletByCurrency = getUserEcosystemWalletByCurrency;
const db_1 = require("@b/db");
const blockchain_1 = require("./blockchain");
const queries_1 = require("./scylla/queries");
const wallet_1 = require("./wallet");
const ws_1 = require("./ws");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const fees_1 = require("@b/utils/fees");
async function recordBotRealTrade(botId, marketId, symbol, side, price, amount, counterpartyUserId) {
    try {
        const bot = await db_1.models.aiBot.findByPk(botId);
        if (!bot) {
            console_1.logger.warn("BOT_PNL", `Bot ${botId} not found, skipping trade recording`);
            return;
        }
        const botData = bot.get({ plain: true });
        const currentPosition = Number(botData.currentPosition || 0);
        const avgEntryPrice = Number(botData.avgEntryPrice || 0);
        let newPosition = currentPosition;
        let newAvgEntryPrice = avgEntryPrice;
        let realizedPnL = 0;
        let isProfitable = false;
        if (side === "BUY") {
            if (currentPosition < 0) {
                const closingAmount = Math.min(amount, Math.abs(currentPosition));
                realizedPnL = (avgEntryPrice - price) * closingAmount;
                isProfitable = realizedPnL > 0;
                const remainingAmount = amount - closingAmount;
                if (remainingAmount > 0) {
                    newPosition = remainingAmount;
                    newAvgEntryPrice = price;
                }
                else {
                    newPosition = currentPosition + amount;
                }
            }
            else {
                const totalCost = currentPosition * avgEntryPrice + amount * price;
                newPosition = currentPosition + amount;
                newAvgEntryPrice = newPosition > 0 ? totalCost / newPosition : 0;
            }
        }
        else {
            if (currentPosition > 0) {
                const closingAmount = Math.min(amount, currentPosition);
                realizedPnL = (price - avgEntryPrice) * closingAmount;
                isProfitable = realizedPnL > 0;
                const remainingAmount = amount - closingAmount;
                if (remainingAmount > 0) {
                    newPosition = -remainingAmount;
                    newAvgEntryPrice = price;
                }
                else {
                    newPosition = currentPosition - amount;
                }
            }
            else {
                const totalCost = Math.abs(currentPosition) * avgEntryPrice + amount * price;
                newPosition = currentPosition - amount;
                newAvgEntryPrice = newPosition !== 0 ? totalCost / Math.abs(newPosition) : 0;
            }
        }
        const updates = {
            currentPosition: newPosition,
            avgEntryPrice: newAvgEntryPrice,
            realTradesExecuted: (botData.realTradesExecuted || 0) + 1,
            totalVolume: (Number(botData.totalVolume) || 0) + amount,
            lastTradeAt: new Date(),
        };
        if (realizedPnL !== 0) {
            updates.totalRealizedPnL = (Number(botData.totalRealizedPnL) || 0) + realizedPnL;
            if (isProfitable) {
                updates.profitableTrades = (botData.profitableTrades || 0) + 1;
            }
        }
        await bot.update(updates);
        console_1.logger.info("BOT_PNL", `Bot ${botId} ${side} ${amount.toFixed(4)} @ ${price.toFixed(6)} | Position: ${currentPosition.toFixed(4)} -> ${newPosition.toFixed(4)} | PnL: ${realizedPnL.toFixed(4)} | Profitable: ${isProfitable}`);
    }
    catch (error) {
        console_1.logger.error("BOT_PNL", `Failed to record trade for bot ${botId}`, error);
    }
}
function isBotOrder(order) {
    return !!order.marketMakerId;
}
async function getPoolForMarketMaker(marketMakerId, options) {
    const pool = await db_1.models.aiMarketMakerPool.findOne({
        where: { marketMakerId },
        ...((options === null || options === void 0 ? void 0 : options.transaction) && { transaction: options.transaction }),
        ...((options === null || options === void 0 ? void 0 : options.transaction) && (options === null || options === void 0 ? void 0 : options.lock) && { lock: options.transaction.LOCK.UPDATE }),
    });
    return pool;
}
async function updatePoolBalance(marketMakerId, baseDelta, quoteDelta, transaction) {
    const pool = await getPoolForMarketMaker(marketMakerId, {
        transaction,
        lock: true,
    });
    if (!pool) {
        throw (0, error_1.createError)({ statusCode: 404, message: `Pool not found for market maker ${marketMakerId}` });
    }
    const poolData = pool;
    const newBaseBalance = Number(poolData.baseCurrencyBalance) + baseDelta;
    const newQuoteBalance = Number(poolData.quoteCurrencyBalance) + quoteDelta;
    if (newBaseBalance < 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Insufficient pool base balance: need ${Math.abs(baseDelta)}, have ${poolData.baseCurrencyBalance}` });
    }
    if (newQuoteBalance < 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Insufficient pool quote balance: need ${Math.abs(quoteDelta)}, have ${poolData.quoteCurrencyBalance}` });
    }
    await pool.update({
        baseCurrencyBalance: newBaseBalance,
        quoteCurrencyBalance: newQuoteBalance,
    }, transaction ? { transaction } : undefined);
}
const SCALING_FACTOR = BigInt(10 ** 18);
const AI_SYSTEM_USER_IDS = [
    "a1000000-0000-4000-a000-000000000001",
    "00000000-0000-0000-0000-000000000001",
    "00000000-0000-0000-0000-000000000000",
];
let aiUserErrorCount = 0;
let lastAiUserErrorTime = 0;
const AI_ERROR_LOG_INTERVAL = 60000;
function isAiSystemUser(userId) {
    if (AI_SYSTEM_USER_IDS.includes(userId))
        return true;
    if (userId.startsWith("00000000-0000-0000") || userId.startsWith("a1000000-0000-4000"))
        return true;
    return false;
}
const matchAndCalculateOrders = async (orders, currentOrderBook) => {
    const matchedOrders = [];
    const bookUpdates = { bids: {}, asks: {} };
    const processedOrders = new Set();
    const buyOrders = (0, exports.filterAndSortOrders)(orders, "BUY", true);
    const sellOrders = (0, exports.filterAndSortOrders)(orders, "SELL", false);
    let buyIndex = 0, sellIndex = 0;
    while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
        const buyOrder = buyOrders[buyIndex];
        const sellOrder = sellOrders[sellIndex];
        if (processedOrders.has(buyOrder.id) || processedOrders.has(sellOrder.id)) {
            if (processedOrders.has(buyOrder.id))
                buyIndex++;
            if (processedOrders.has(sellOrder.id))
                sellIndex++;
            continue;
        }
        let matchFound = false;
        if (buyOrder.type === "LIMIT" && sellOrder.type === "LIMIT") {
            matchFound =
                (buyOrder.side === "BUY" && buyOrder.price >= sellOrder.price) ||
                    (buyOrder.side === "SELL" && sellOrder.price >= buyOrder.price);
        }
        else if (buyOrder.type === "MARKET" || sellOrder.type === "MARKET") {
            matchFound = true;
        }
        if (matchFound) {
            processedOrders.add(buyOrder.id);
            processedOrders.add(sellOrder.id);
            try {
                await processMatchedOrders(buyOrder, sellOrder, currentOrderBook, bookUpdates);
                matchedOrders.push(buyOrder, sellOrder);
            }
            catch (error) {
                const errorStr = String(error);
                const errorContainsSystemId = AI_SYSTEM_USER_IDS.some(id => errorStr.includes(id));
                const orderFromSystemUser = isAiSystemUser(buyOrder.userId) || isAiSystemUser(sellOrder.userId);
                const isWalletNotFoundError = errorStr.includes("Wallet not found for user");
                const isInsufficientFundsError = errorStr.includes("insufficient locked funds");
                const shouldSuppressError = errorContainsSystemId || orderFromSystemUser ||
                    (isWalletNotFoundError && errorStr.includes("00000000"));
                if (shouldSuppressError) {
                    aiUserErrorCount++;
                    const now = Date.now();
                    if (now - lastAiUserErrorTime > AI_ERROR_LOG_INTERVAL) {
                        console_1.logger.warn("MATCHING", `System/AI user wallet errors: ${aiUserErrorCount} in the last minute. Suppressing to reduce log noise.`);
                        lastAiUserErrorTime = now;
                        aiUserErrorCount = 0;
                    }
                }
                else if (!isInsufficientFundsError) {
                    console_1.logger.error("MATCHING", "Failed to process matched orders", error);
                }
                if (isInsufficientFundsError || isWalletNotFoundError) {
                    buyIndex++;
                    sellIndex++;
                }
                else {
                    processedOrders.delete(buyOrder.id);
                    processedOrders.delete(sellOrder.id);
                }
                continue;
            }
            if (buyOrder.type === "LIMIT" && buyOrder.remaining === BigInt(0)) {
                buyIndex++;
            }
            if (sellOrder.type === "LIMIT" && sellOrder.remaining === BigInt(0)) {
                sellIndex++;
            }
            if (buyOrder.type === "MARKET" && buyOrder.remaining > BigInt(0)) {
                processedOrders.delete(buyOrder.id);
            }
            if (sellOrder.type === "MARKET" && sellOrder.remaining > BigInt(0)) {
                processedOrders.delete(sellOrder.id);
            }
        }
        else {
            if (buyOrder.type !== "MARKET" &&
                BigInt(buyOrder.price) < BigInt(sellOrder.price)) {
                buyIndex++;
            }
            if (sellOrder.type !== "MARKET" &&
                BigInt(sellOrder.price) > BigInt(buyOrder.price)) {
                sellIndex++;
            }
        }
    }
    return { matchedOrders, bookUpdates };
};
exports.matchAndCalculateOrders = matchAndCalculateOrders;
async function processMatchedOrders(buyOrder, sellOrder, currentOrderBook, bookUpdates) {
    var _a, _b;
    const amountToFill = buyOrder.remaining < sellOrder.remaining
        ? buyOrder.remaining
        : sellOrder.remaining;
    [buyOrder, sellOrder].forEach((order) => {
        order.filled += amountToFill;
        order.remaining -= amountToFill;
        order.status = order.remaining === BigInt(0) ? "CLOSED" : "OPEN";
    });
    const [baseCurrency, quoteCurrency] = buyOrder.symbol.split("/");
    const buyerIsBot = isBotOrder(buyOrder);
    const sellerIsBot = isBotOrder(sellOrder);
    const finalPrice = buyOrder.type.toUpperCase() === "MARKET"
        ? sellOrder.price
        : sellOrder.type.toUpperCase() === "MARKET"
            ? buyOrder.price
            : buyOrder.createdAt <= sellOrder.createdAt
                ? buyOrder.price
                : sellOrder.price;
    const cost = (amountToFill * finalPrice) / SCALING_FACTOR;
    const buyFillRatio = Number(amountToFill) / Number(buyOrder.amount);
    const sellFillRatio = Number(amountToFill) / Number(sellOrder.amount);
    const sellProportionalFee = (sellOrder.fee * BigInt(Math.floor(sellFillRatio * 1e18))) / SCALING_FACTOR;
    const buyProportionalFee = (buyOrder.fee * BigInt(Math.floor(buyFillRatio * 1e18))) / SCALING_FACTOR;
    const buyProportionalCostWithFee = cost + buyProportionalFee;
    const amountToFillNum = (0, blockchain_1.fromBigInt)((0, blockchain_1.removeTolerance)(amountToFill));
    const costNum = (0, blockchain_1.fromBigInt)((0, blockchain_1.removeTolerance)(cost));
    const sellFeeNum = (0, blockchain_1.fromBigInt)((0, blockchain_1.removeTolerance)(sellProportionalFee));
    const buyFeeNum = (0, blockchain_1.fromBigInt)((0, blockchain_1.removeTolerance)(buyProportionalFee));
    const buyReleaseNum = (0, blockchain_1.fromBigInt)((0, blockchain_1.removeTolerance)(buyProportionalCostWithFee));
    if (buyerIsBot && sellerIsBot) {
    }
    else if (buyerIsBot && !sellerIsBot) {
        const sellerWalletType = sellOrder.walletType || "ECO";
        await db_1.sequelize.transaction(async (t) => {
            var _a;
            const sellerBaseWallet = await getUserEcosystemWalletByCurrency(sellOrder.userId, baseCurrency, sellerWalletType, { transaction: t, lock: true });
            const sellerQuoteWallet = await getUserEcosystemWalletByCurrency(sellOrder.userId, quoteCurrency, sellerWalletType, { transaction: t, lock: true });
            if (!sellerBaseWallet || !sellerQuoteWallet) {
                throw (0, error_1.createError)({ statusCode: 404, message: `Wallets not found for seller ${sellOrder.userId} (type: ${sellerWalletType})` });
            }
            const sellerInOrder = parseFloat(((_a = sellerBaseWallet.inOrder) === null || _a === void 0 ? void 0 : _a.toString()) || "0");
            const PRECISION_TOLERANCE = 0.00000001;
            if (sellerInOrder + PRECISION_TOLERANCE < amountToFillNum) {
                console_1.logger.error("MATCHING", `Seller insufficient locked funds: inOrder=${sellerInOrder}, needed=${amountToFillNum}, walletType=${sellerWalletType}`);
                throw (0, error_1.createError)({ statusCode: 400, message: `Seller has insufficient locked funds` });
            }
            const actualSellerRelease = Math.min(amountToFillNum, sellerInOrder);
            await updatePoolBalance(buyOrder.marketMakerId, amountToFillNum, -costNum, t);
            const sellerBaseKey = `eco_trade_${buyOrder.id}_${sellOrder.id}_seller_base`;
            const sellerQuoteKey = `eco_trade_${buyOrder.id}_${sellOrder.id}_seller_quote`;
            await (0, wallet_1.updateWalletForFill)(sellerBaseWallet, 0, -actualSellerRelease, "seller releases base to bot", sellerBaseKey, t);
            await (0, wallet_1.updateWalletForFill)(sellerQuoteWallet, costNum - sellFeeNum, 0, "seller receives quote from bot", sellerQuoteKey, t);
        });
        if (buyOrder.botId) {
            const tradePrice = (0, blockchain_1.fromBigInt)(finalPrice);
            recordBotRealTrade(buyOrder.botId, undefined, buyOrder.symbol, "BUY", tradePrice, amountToFillNum, sellOrder.userId).catch(err => console_1.logger.error("BOT_PNL", "Error recording bot trade", err));
        }
    }
    else if (!buyerIsBot && sellerIsBot) {
        const buyerWalletType = buyOrder.walletType || "ECO";
        await db_1.sequelize.transaction(async (t) => {
            var _a;
            const buyerBaseWallet = await getUserEcosystemWalletByCurrency(buyOrder.userId, baseCurrency, buyerWalletType, { transaction: t, lock: true });
            const buyerQuoteWallet = await getUserEcosystemWalletByCurrency(buyOrder.userId, quoteCurrency, buyerWalletType, { transaction: t, lock: true });
            if (!buyerBaseWallet || !buyerQuoteWallet) {
                throw (0, error_1.createError)({ statusCode: 404, message: `Wallets not found for buyer ${buyOrder.userId} (type: ${buyerWalletType})` });
            }
            const buyerInOrder = parseFloat(((_a = buyerQuoteWallet.inOrder) === null || _a === void 0 ? void 0 : _a.toString()) || "0");
            const PRECISION_TOLERANCE = 0.00000001;
            console_1.logger.info("MATCHING", `User vs Bot match: orderId=${buyOrder.id}, userId=${buyOrder.userId}, walletType=${buyerWalletType}, ` +
                `amountToFill=${amountToFillNum}, buyFillRatio=${buyFillRatio.toFixed(4)}, ` +
                `buyOrder.cost=${(0, blockchain_1.fromBigInt)(buyOrder.cost)}, buyReleaseNum=${buyReleaseNum}, buyerInOrder=${buyerInOrder}, ` +
                `buyOrder.status=${buyOrder.status}, buyOrder.remaining=${(0, blockchain_1.fromBigInt)(buyOrder.remaining)}`);
            if (buyerInOrder + PRECISION_TOLERANCE < buyReleaseNum) {
                console_1.logger.error("MATCHING", `Buyer insufficient locked funds: inOrder=${buyerInOrder}, needed=${buyReleaseNum}, diff=${buyReleaseNum - buyerInOrder}, orderId=${buyOrder.id}, walletType=${buyerWalletType}`);
                throw (0, error_1.createError)({ statusCode: 400, message: `Buyer has insufficient locked funds` });
            }
            const actualBuyRelease = Math.min(buyReleaseNum, buyerInOrder);
            await updatePoolBalance(sellOrder.marketMakerId, -amountToFillNum, costNum, t);
            const buyerBaseKey = `eco_trade_${buyOrder.id}_${sellOrder.id}_buyer_base`;
            const buyerQuoteKey = `eco_trade_${buyOrder.id}_${sellOrder.id}_buyer_quote`;
            await (0, wallet_1.updateWalletForFill)(buyerBaseWallet, amountToFillNum, 0, "buyer receives base from bot", buyerBaseKey, t);
            await (0, wallet_1.updateWalletForFill)(buyerQuoteWallet, 0, -actualBuyRelease, "buyer releases quote to bot", buyerQuoteKey, t);
        });
        if (sellOrder.botId) {
            const tradePrice = (0, blockchain_1.fromBigInt)(finalPrice);
            recordBotRealTrade(sellOrder.botId, undefined, sellOrder.symbol, "SELL", tradePrice, amountToFillNum, buyOrder.userId).catch(err => console_1.logger.error("BOT_PNL", "Error recording bot trade", err));
        }
    }
    else {
        const buyerWalletType = buyOrder.walletType || "ECO";
        const sellerWalletType = sellOrder.walletType || "ECO";
        const buyerBaseWallet = await getUserEcosystemWalletByCurrency(buyOrder.userId, baseCurrency, buyerWalletType);
        const buyerQuoteWallet = await getUserEcosystemWalletByCurrency(buyOrder.userId, quoteCurrency, buyerWalletType);
        const sellerBaseWallet = await getUserEcosystemWalletByCurrency(sellOrder.userId, baseCurrency, sellerWalletType);
        const sellerQuoteWallet = await getUserEcosystemWalletByCurrency(sellOrder.userId, quoteCurrency, sellerWalletType);
        if (!buyerBaseWallet || !buyerQuoteWallet || !sellerBaseWallet || !sellerQuoteWallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Required wallets not found for buyer (type: ${buyerWalletType}) or seller (type: ${sellerWalletType}).` });
        }
        const PRECISION_TOLERANCE = 0.00000001;
        const sellerInOrder = parseFloat(((_a = sellerBaseWallet.inOrder) === null || _a === void 0 ? void 0 : _a.toString()) || "0");
        if (sellerInOrder + PRECISION_TOLERANCE < amountToFillNum) {
            console_1.logger.error("MATCHING", `Seller insufficient locked funds: inOrder=${sellerInOrder}, needed=${amountToFillNum}, walletType=${sellerWalletType}`);
            throw (0, error_1.createError)({ statusCode: 400, message: `Seller has insufficient locked funds` });
        }
        const actualSellerRelease = Math.min(amountToFillNum, sellerInOrder);
        const buyerInOrder = parseFloat(((_b = buyerQuoteWallet.inOrder) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
        if (buyerInOrder + PRECISION_TOLERANCE < buyReleaseNum) {
            console_1.logger.error("MATCHING", `Buyer insufficient locked funds: inOrder=${buyerInOrder}, needed=${buyReleaseNum}, walletType=${buyerWalletType}`);
            throw (0, error_1.createError)({ statusCode: 400, message: `Buyer has insufficient locked funds` });
        }
        const actualBuyerRelease = Math.min(buyReleaseNum, buyerInOrder);
        const buyBaseKey = `eco_trade_${buyOrder.id}_${sellOrder.id}_buy_base`;
        const buyQuoteKey = `eco_trade_${buyOrder.id}_${sellOrder.id}_buy_quote`;
        const sellBaseKey = `eco_trade_${buyOrder.id}_${sellOrder.id}_sell_base`;
        const sellQuoteKey = `eco_trade_${buyOrder.id}_${sellOrder.id}_sell_quote`;
        await db_1.sequelize.transaction(async (t) => {
            await (0, wallet_1.updateWalletForFill)(buyerBaseWallet, amountToFillNum, 0, "buyer receives base", buyBaseKey, t);
            await (0, wallet_1.updateWalletForFill)(buyerQuoteWallet, 0, -actualBuyerRelease, "buyer releases quote", buyQuoteKey, t);
            await (0, wallet_1.updateWalletForFill)(sellerBaseWallet, 0, -actualSellerRelease, "seller releases base", sellBaseKey, t);
            await (0, wallet_1.updateWalletForFill)(sellerQuoteWallet, costNum - sellFeeNum, 0, "seller receives quote", sellQuoteKey, t);
        });
    }
    const buyerIsSuperAdmin = await (0, fees_1.isSuperAdmin)(buyOrder.userId);
    const sellerIsSuperAdmin = await (0, fees_1.isSuperAdmin)(sellOrder.userId);
    const totalPlatformFee = (buyerIsBot || buyerIsSuperAdmin ? 0 : buyFeeNum) +
        (sellerIsBot || sellerIsSuperAdmin ? 0 : sellFeeNum);
    if (totalPlatformFee > 0) {
        await (0, fees_1.collectPlatformFee)({
            currency: quoteCurrency,
            walletType: "ECO",
            chain: quoteCurrency,
            feeAmount: totalPlatformFee,
            type: "TRADE",
            description: `ECO trading fee: ${buyOrder.symbol} ${amountToFillNum} @ ${(0, blockchain_1.fromBigInt)(finalPrice)} (buyer fee: ${buyFeeNum}, seller fee: ${sellFeeNum})`,
            referenceId: `${buyOrder.id}_${sellOrder.id}`,
            metadata: { symbol: buyOrder.symbol, buyOrderId: buyOrder.id, sellOrderId: sellOrder.id },
        });
    }
    const buyTradeDetail = {
        id: `${buyOrder.id}`,
        amount: (0, blockchain_1.fromBigInt)(amountToFill),
        price: (0, blockchain_1.fromBigInt)(finalPrice),
        cost: (0, blockchain_1.fromBigIntMultiply)(amountToFill, finalPrice),
        side: "BUY",
        timestamp: Date.now(),
    };
    const sellTradeDetail = {
        id: `${sellOrder.id}`,
        amount: (0, blockchain_1.fromBigInt)(amountToFill),
        price: (0, blockchain_1.fromBigInt)(finalPrice),
        cost: (0, blockchain_1.fromBigIntMultiply)(amountToFill, finalPrice),
        side: "SELL",
        timestamp: Date.now(),
    };
    addTradeToOrder(buyOrder, buyTradeDetail);
    addTradeToOrder(sellOrder, sellTradeDetail);
    (0, queries_1.insertTrade)(buyOrder.symbol, buyTradeDetail.price, buyTradeDetail.amount, "BUY", false).catch((err) => console_1.logger.error("MATCHING", "Failed to insert trade to trades table", err));
    (0, ws_1.handleTradesBroadcast)(buyOrder.symbol, [buyTradeDetail, sellTradeDetail]);
    (0, ws_1.handleOrderBroadcast)(buyOrder);
    (0, ws_1.handleOrderBroadcast)(sellOrder);
    updateOrderBook(bookUpdates, buyOrder, currentOrderBook, amountToFill);
    updateOrderBook(bookUpdates, sellOrder, currentOrderBook, amountToFill);
    triggerCopyTradingFill(buyOrder.id, buyOrder.userId, buyOrder.symbol, buyOrder.side, (0, blockchain_1.fromBigInt)(amountToFill), (0, blockchain_1.fromBigInt)(finalPrice), (0, blockchain_1.fromBigInt)((0, blockchain_1.removeTolerance)(buyProportionalFee)), buyOrder.status === "CLOSED" ? "FILLED" : "PARTIALLY_FILLED");
    triggerCopyTradingFill(sellOrder.id, sellOrder.userId, sellOrder.symbol, sellOrder.side, (0, blockchain_1.fromBigInt)(amountToFill), (0, blockchain_1.fromBigInt)(finalPrice), (0, blockchain_1.fromBigInt)((0, blockchain_1.removeTolerance)(sellProportionalFee)), sellOrder.status === "CLOSED" ? "FILLED" : "PARTIALLY_FILLED");
}
function addTradeToOrder(order, trade) {
    let trades = [];
    if (order.trades) {
        try {
            if (typeof order.trades === "string") {
                trades = JSON.parse(order.trades);
                if (!Array.isArray(trades) && typeof trades === "string") {
                    trades = JSON.parse(trades);
                }
            }
            else if (Array.isArray(order.trades)) {
                trades = order.trades;
            }
            else {
                console_1.logger.error("MATCHING", `Invalid trades format, resetting trades: ${JSON.stringify(order.trades)}`, new Error("Invalid trades format"));
                trades = [];
            }
        }
        catch (e) {
            console_1.logger.error("MATCHING", "Error parsing trades", e);
            trades = [];
        }
    }
    const mergedTrades = [...trades, trade].sort((a, b) => a.timestamp - b.timestamp);
    order.trades = JSON.stringify(mergedTrades, blockchain_1.BigIntReplacer);
    return order.trades;
}
const updateOrderBook = (bookUpdates, order, currentOrderBook, amount) => {
    const priceStr = order.price.toString();
    const bookSide = order.side === "BUY" ? "bids" : "asks";
    if (currentOrderBook[bookSide][priceStr] !== undefined) {
        currentOrderBook[bookSide][priceStr] -= amount;
        bookUpdates[bookSide][priceStr] = currentOrderBook[bookSide][priceStr];
    }
    else {
        bookUpdates[bookSide][priceStr] = BigInt(0);
    }
};
const filterAndSortOrders = (orders, side, isBuy) => {
    return orders
        .filter((o) => o.side === side)
        .sort((a, b) => {
        if (isBuy) {
            return (Number(b.price) - Number(a.price) ||
                a.createdAt.getTime() - b.createdAt.getTime());
        }
        else {
            return (Number(a.price) - Number(b.price) ||
                a.createdAt.getTime() - b.createdAt.getTime());
        }
    })
        .filter((order) => !isBuy || BigInt(order.price) >= BigInt(0));
};
exports.filterAndSortOrders = filterAndSortOrders;
function validateOrder(order) {
    if (!order ||
        !order.id ||
        !order.userId ||
        !order.symbol ||
        !order.type ||
        !order.side ||
        typeof order.price !== "bigint" ||
        typeof order.amount !== "bigint" ||
        typeof order.filled !== "bigint" ||
        typeof order.remaining !== "bigint" ||
        typeof order.cost !== "bigint" ||
        typeof order.fee !== "bigint" ||
        !order.feeCurrency ||
        !order.status ||
        !(order.createdAt instanceof Date) ||
        !(order.updatedAt instanceof Date)) {
        console_1.logger.error("MATCHING", "Order validation failed", new Error(`Order validation failed: ${JSON.stringify(order)}`));
        return false;
    }
    return true;
}
function sortOrders(orders, isBuy) {
    return orders.sort((a, b) => {
        const priceComparison = isBuy
            ? Number(b.price - a.price)
            : Number(a.price - b.price);
        if (priceComparison !== 0)
            return priceComparison;
        if (a.createdAt < b.createdAt)
            return -1;
        if (a.createdAt > b.createdAt)
            return 1;
        return 0;
    });
}
async function getUserEcosystemWalletByCurrency(userId, currency, walletType = "ECO", options) {
    try {
        const wallet = await db_1.models.wallet.findOne({
            where: {
                userId,
                currency,
                type: walletType,
            },
            raw: false,
            ...((options === null || options === void 0 ? void 0 : options.transaction) && { transaction: options.transaction }),
            ...((options === null || options === void 0 ? void 0 : options.transaction) && (options === null || options === void 0 ? void 0 : options.lock) && {
                lock: options.transaction.LOCK.UPDATE,
            }),
        });
        if (!wallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Wallet not found for user ${userId} and currency ${currency} (type: ${walletType})` });
        }
        return wallet;
    }
    catch (error) {
        console_1.logger.error("ECOSYSTEM", "Failed to get user ecosystem wallet by currency", error);
        throw error;
    }
}
async function triggerCopyTradingFill(orderId, userId, symbol, side, filledAmount, filledPrice, fee, status) {
    try {
        const { triggerCopyTradingOrderFilled } = await Promise.resolve().then(() => __importStar(require("@b/utils/safe-imports")));
        triggerCopyTradingOrderFilled(orderId, userId, symbol, side, filledAmount, filledPrice, fee, status).catch(() => { });
    }
    catch (importError) {
    }
}
