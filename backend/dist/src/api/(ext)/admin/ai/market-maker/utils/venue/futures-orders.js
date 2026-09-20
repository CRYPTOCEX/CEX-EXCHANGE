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
exports.futuresEngineAvailable = futuresEngineAvailable;
exports.readInventory = readInventory;
exports.readMark = readMark;
exports.readMarketLimits = readMarketLimits;
exports.placePoolQuote = placePoolQuote;
exports.cancelPoolOrder = cancelPoolOrder;
exports.cancelAllPoolOrders = cancelAllPoolOrders;
exports.listPoolOpenOrders = listPoolOpenOrders;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const pool_account_1 = require("./pool-account");
const cancel_refund_1 = require("./cancel-refund");
const fee_reversal_1 = require("@b/api/(ext)/futures/utils/fee-reversal");
const futures_quote_1 = require("./futures-quote");
function futuresModule(path) {
    try {
        return require(path);
    }
    catch (_a) {
        return null;
    }
}
function futuresEngineAvailable() {
    return (futuresModule("@b/api/(ext)/futures/utils/queries/order") !== null &&
        futuresModule("@b/api/(ext)/ecosystem/utils/blockchain") !== null);
}
async function readInventory(symbol) {
    var _a, _b;
    const flat = {
        view: {
            longAmount: 0,
            shortAmount: 0,
            restingBuyExits: 0,
            restingSellExits: 0,
        },
        longPositionId: null,
        shortPositionId: null,
        longLeverage: null,
        shortLeverage: null,
        pendingOpenNotional: 0,
    };
    const positions = futuresModule("@b/api/(ext)/futures/utils/queries/positions");
    const orders = futuresModule("@b/api/(ext)/futures/utils/queries/order");
    const chain = futuresModule("@b/api/(ext)/ecosystem/utils/blockchain");
    if (!positions || !orders || !chain)
        return flat;
    const num = (value) => {
        try {
            const parsed = Number(chain.fromBigInt(BigInt(value !== null && value !== void 0 ? value : 0)));
            return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
        }
        catch (_a) {
            return 0;
        }
    };
    const [long, short, resting] = await Promise.all([
        positions.getPosition(pool_account_1.AI_POOL_USER_ID, symbol, (0, futures_quote_1.opensSide)("BUY")).catch(() => null),
        positions.getPosition(pool_account_1.AI_POOL_USER_ID, symbol, (0, futures_quote_1.opensSide)("SELL")).catch(() => null),
        orders.getRestingSummary(pool_account_1.AI_POOL_USER_ID, symbol),
    ]);
    return {
        view: {
            longAmount: long ? num(long.amount) : 0,
            shortAmount: short ? num(short.amount) : 0,
            restingBuyExits: num(resting.buyExits),
            restingSellExits: num(resting.sellExits),
        },
        longPositionId: (_a = long === null || long === void 0 ? void 0 : long.id) !== null && _a !== void 0 ? _a : null,
        shortPositionId: (_b = short === null || short === void 0 ? void 0 : short.id) !== null && _b !== void 0 ? _b : null,
        longLeverage: long && Number(long.leverage) > 0 ? Number(long.leverage) : null,
        shortLeverage: short && Number(short.leverage) > 0 ? Number(short.leverage) : null,
        pendingOpenNotional: Number(resting.openingNotional) || 0,
    };
}
async function readMark(symbol) {
    const mark = futuresModule("@b/api/(ext)/futures/utils/mark-price");
    if (!(mark === null || mark === void 0 ? void 0 : mark.fairMarkPrice))
        return 0;
    try {
        const price = Number(await mark.fairMarkPrice(symbol));
        return Number.isFinite(price) && price > 0 ? price : 0;
    }
    catch (_a) {
        return 0;
    }
}
function readMarketLimits(metadata) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const meta = metadata || {};
    return {
        precision: Number((_a = meta === null || meta === void 0 ? void 0 : meta.precision) === null || _a === void 0 ? void 0 : _a.price) || 8,
        minAmount: Number(((_c = (_b = meta === null || meta === void 0 ? void 0 : meta.limits) === null || _b === void 0 ? void 0 : _b.amount) === null || _c === void 0 ? void 0 : _c.min) || 0),
        maxAmount: Number(((_e = (_d = meta === null || meta === void 0 ? void 0 : meta.limits) === null || _d === void 0 ? void 0 : _d.amount) === null || _e === void 0 ? void 0 : _e.max) || 0),
        minCost: Number(((_g = (_f = meta === null || meta === void 0 ? void 0 : meta.limits) === null || _f === void 0 ? void 0 : _f.cost) === null || _g === void 0 ? void 0 : _g.min) || 0),
        maxCost: Number(((_j = (_h = meta === null || meta === void 0 ? void 0 : meta.limits) === null || _h === void 0 ? void 0 : _h.cost) === null || _j === void 0 ? void 0 : _j.max) || 0),
        makerFee: (meta === null || meta === void 0 ? void 0 : meta.maker) == null ? 0 : Number(meta.maker),
        takerFee: (meta === null || meta === void 0 ? void 0 : meta.taker) == null ? 0 : Number(meta.taker),
    };
}
async function placePoolQuote(params) {
    if (!futuresEngineAvailable())
        return [];
    const [, pair] = String(params.symbol || "").split("/");
    if (!pair)
        return [];
    const limits = readMarketLimits(params.metadata);
    let inventory;
    try {
        inventory = await readInventory(params.symbol);
    }
    catch (error) {
        console_1.logger.warn("AI_MM", `Could not read inventory on ${params.symbol}; skipping this quote: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return [];
    }
    let legs = (0, futures_quote_1.planQuote)({
        side: params.side,
        price: params.price,
        amount: params.amount,
        leverage: params.leverage,
        inventory: inventory.view,
        minAmount: limits.minAmount,
    });
    if (legs.length === 0)
        return [];
    const mark = (await readMark(params.symbol)) || params.price;
    const opening = legs.filter((leg) => !leg.reduceOnly);
    const addedNotional = opening.reduce((sum, leg) => sum + leg.notional, 0);
    if (addedNotional > 0 &&
        !(0, futures_quote_1.withinExposureBudget)({
            allocation: params.allocation,
            inventory: inventory.view,
            markPrice: mark,
            addedNotional,
            pendingNotional: inventory.pendingOpenNotional,
        })) {
        console_1.logger.debug("AI_MM", `Exposure budget reached on ${params.symbol}; quoting exits only`);
        legs = (0, futures_quote_1.exitsOnly)(legs);
    }
    const placed = [];
    for (const leg of legs) {
        try {
            const legLeverage = effectiveLeverage(leg, params.leverage, inventory);
            if (legLeverage !== params.leverage) {
                console_1.logger.debug("AI_MM", `${params.symbol} ${leg.side} posts at ${legLeverage}x, not the configured ` +
                    `${params.leverage}x — the position it merges into holds that leverage`);
            }
            const order = await placePoolLeg(params.symbol, pair, leg, legLeverage, limits, inventory, params.botId);
            if (order)
                placed.push(order);
        }
        catch (error) {
            console_1.logger.warn("AI_MM", `Pool ${leg.side}${leg.reduceOnly ? " (exit)" : ""} on ${params.symbol} was not placed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
    }
    return placed;
}
function effectiveLeverage(leg, configured, inventory) {
    const side = leg.reduceOnly ? (0, futures_quote_1.reducesSide)(leg.side) : (0, futures_quote_1.opensSide)(leg.side);
    const held = side === "BUY" ? inventory.longLeverage : inventory.shortLeverage;
    return held && held > 0 ? held : configured;
}
async function placePoolLeg(symbol, pair, leg, leverage, limits, inventory, botId) {
    var _a;
    const orders = futuresModule("@b/api/(ext)/futures/utils/queries/order");
    const chain = futuresModule("@b/api/(ext)/ecosystem/utils/blockchain");
    if (!orders || !chain)
        return null;
    let positionId;
    if (leg.reduceOnly) {
        const reduces = (0, futures_quote_1.reducesSide)(leg.side);
        positionId = (_a = (reduces === "BUY"
            ? inventory.longPositionId
            : inventory.shortPositionId)) !== null && _a !== void 0 ? _a : undefined;
        if (!positionId) {
            console_1.logger.debug("AI_MM", `Exit leg on ${symbol} has no open ${reduces} position to name; skipping`);
            return null;
        }
    }
    const realBook = futuresModule("@b/api/(ext)/futures/utils/queries/real-book");
    const provenance = futuresModule("@b/api/(ext)/futures/utils/book-provenance");
    let isTaker = false;
    if ((realBook === null || realBook === void 0 ? void 0 : realBook.getRealTopOfBook) && (provenance === null || provenance === void 0 ? void 0 : provenance.crossesBook)) {
        try {
            const book = await realBook.getRealTopOfBook(symbol);
            isTaker = provenance.crossesBook(leg.side, leg.price, book);
        }
        catch (_b) {
            isTaker = false;
        }
    }
    const feeRate = isTaker ? limits.takerFee : limits.makerFee;
    const notional = leg.notional;
    const fee = parseFloat(((notional * feeRate) / 100).toFixed(limits.precision));
    const cost = leg.reduceOnly
        ? 0
        : parseFloat(leg.margin.toFixed(limits.precision));
    if (!leg.reduceOnly && !(cost > 0)) {
        return null;
    }
    const wallet = await (0, pool_account_1.getPoolFuturesWallet)(pair, { createIfMissing: true });
    if (!wallet)
        return null;
    const required = cost + fee;
    if (Number(wallet.balance) < required) {
        throw new Error(`pool ${pair} balance ${Number(wallet.balance)} is below the ${required} this leg needs`);
    }
    const newOrder = await orders.createOrder({
        userId: pool_account_1.AI_POOL_USER_ID,
        symbol,
        amount: chain.toBigIntFloat(leg.amount),
        price: chain.toBigIntFloat(leg.price),
        cost: chain.toBigIntFloat(cost),
        type: "LIMIT",
        side: leg.side,
        fee: chain.toBigIntFloat(fee),
        feeCurrency: pair,
        leverage,
        isTaker,
        reduceOnly: leg.reduceOnly,
        liquidation: leg.reduceOnly ? false : undefined,
        botId,
        positionId,
    });
    if (required > 0) {
        await db_1.sequelize.transaction(async () => {
            await wallet_1.walletService.debit({
                idempotencyKey: `futures_order_${newOrder.id}`,
                userId: pool_account_1.AI_POOL_USER_ID,
                walletId: wallet.id,
                walletType: "FUTURES",
                currency: pair,
                amount: required,
                operationType: "FUTURES_ORDER",
                description: `AI market maker ${leg.side} ${symbol}${leg.reduceOnly ? " (exit)" : ""}`,
                referenceId: newOrder.id,
                metadata: {
                    orderId: newOrder.id,
                    symbol,
                    side: leg.side,
                    leverage,
                    amount: leg.amount,
                    price: leg.price,
                    reduceOnly: leg.reduceOnly,
                    aiMarketMaker: true,
                },
            });
        });
    }
    if (fee > 0) {
        try {
            const { collectPlatformFee } = await Promise.resolve().then(() => __importStar(require("@b/utils/fees")));
            await collectPlatformFee({
                userId: pool_account_1.AI_POOL_USER_ID,
                currency: pair,
                walletType: "SPOT",
                feeAmount: fee,
                type: "TRADE",
                description: `AI market maker futures fee for ${symbol}`,
                referenceId: newOrder.id,
                metadata: {
                    orderId: newOrder.id,
                    symbol,
                    side: leg.side,
                    amount: leg.amount,
                    price: leg.price,
                    isTaker,
                    feeRate,
                    leverage,
                    notional,
                    margin: cost,
                    reduceOnly: leg.reduceOnly,
                    aiMarketMaker: true,
                },
            });
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Failed to collect the maker's futures fee on ${symbol}`, error);
        }
        try {
            const { withholdFeeShare } = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/futures/utils/insurance-fund")));
            await withholdFeeShare({
                currency: pair,
                feeAmount: fee,
                referenceId: newOrder.id,
                symbol,
                userId: pool_account_1.AI_POOL_USER_ID,
            });
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Failed to withhold the insurance share on ${symbol}`, error);
        }
    }
    return {
        id: newOrder.id,
        createdAt: newOrder.createdAt ? new Date(newOrder.createdAt) : new Date(),
        side: leg.side,
        price: leg.price,
        amount: leg.amount,
        reduceOnly: leg.reduceOnly,
        margin: cost,
        fee,
    };
}
async function cancelPoolOrder(orderId, createdAt) {
    const orders = futuresModule("@b/api/(ext)/futures/utils/queries/order");
    const chain = futuresModule("@b/api/(ext)/ecosystem/utils/blockchain");
    const reduceOnly = futuresModule("@b/api/(ext)/futures/utils/reduce-only");
    if (!orders || !chain || !reduceOnly)
        return false;
    const stamp = createdAt instanceof Date ? createdAt.toISOString() : String(createdAt);
    const order = await orders.getOrderByUuid(pool_account_1.AI_POOL_USER_ID, orderId, stamp);
    if (!order || order.status !== "OPEN")
        return false;
    if (reduceOnly.restsInBook(order)) {
        await orders.cancelOrderByUuid(pool_account_1.AI_POOL_USER_ID, orderId, stamp, order.symbol, BigInt(order.price), order.side, BigInt(order.remaining));
    }
    else {
        await orders.closeUnrestedOrder(order);
    }
    const [, pair] = String(order.symbol || "").split("/");
    const total = Number(chain.fromBigInt(order.amount));
    const remaining = Number(chain.fromBigInt(order.remaining));
    const { refund, feeRefund, originalFee } = (0, cancel_refund_1.cancelRefund)({
        amount: total,
        remaining,
        cost: Number(chain.fromBigInt(order.cost)),
        fee: Number(chain.fromBigInt(order.fee)),
    });
    let refundLanded = false;
    const creditKey = `futures_order_${orderId}_cancel`;
    if (refund > 0 && pair) {
        const wallet = await (0, pool_account_1.getPoolFuturesWallet)(pair);
        if (wallet) {
            try {
                await db_1.sequelize.transaction(async (t) => {
                    await wallet_1.walletService.credit({
                        idempotencyKey: creditKey,
                        userId: pool_account_1.AI_POOL_USER_ID,
                        walletId: wallet.id,
                        walletType: "FUTURES",
                        currency: pair,
                        amount: refund,
                        operationType: "FUTURES_ORDER",
                        description: `AI market maker cancel refund for ${order.symbol}`,
                        referenceId: orderId,
                        transaction: t,
                        metadata: {
                            orderId,
                            symbol: order.symbol,
                            side: order.side,
                            remaining,
                            totalAmount: total,
                            aiMarketMaker: true,
                        },
                    });
                    if (feeRefund > 0) {
                        await (0, fee_reversal_1.recordOwedFeeReversal)({
                            referenceId: orderId,
                            symbol: order.symbol,
                            currency: pair,
                            refundedFee: feeRefund,
                            originalFee,
                            creditKey,
                        }, t);
                    }
                });
                refundLanded = true;
            }
            catch (error) {
                console_1.logger.error("AI_MM", `Cancel refund of ${refund} ${pair} for order ${orderId} did not land`, error);
            }
        }
    }
    if (refundLanded && feeRefund > 0 && pair) {
        await (0, fee_reversal_1.settleFeeReversalNow)(orderId);
    }
    const engine = futuresModule("@b/api/(ext)/futures/utils/matchingEngine");
    if (engine === null || engine === void 0 ? void 0 : engine.FuturesMatchingEngine) {
        try {
            const instance = await engine.FuturesMatchingEngine.getInstance();
            await instance.handleOrderCancellation(orderId, order.symbol);
        }
        catch (_a) {
        }
    }
    return true;
}
async function cancelAllPoolOrders(symbol) {
    const open = await listPoolOpenOrders(symbol);
    const failed = [];
    let cancelled = 0;
    for (const order of open) {
        try {
            const ok = await cancelPoolOrder(order.id, order.createdAt);
            if (ok)
                cancelled++;
            else
                failed.push({ orderId: order.id, error: "order was not found open" });
        }
        catch (error) {
            failed.push({ orderId: order.id, error: String((error === null || error === void 0 ? void 0 : error.message) || error) });
        }
    }
    return { found: open.length, cancelled, failed };
}
async function listPoolOpenOrders(symbol) {
    const orders = futuresModule("@b/api/(ext)/futures/utils/queries/order");
    if (!(orders === null || orders === void 0 ? void 0 : orders.getOpenOrdersByUserId))
        return [];
    try {
        const all = await orders.getOpenOrdersByUserId(pool_account_1.AI_POOL_USER_ID);
        return (all || []).filter((order) => order.symbol === symbol);
    }
    catch (error) {
        console_1.logger.warn("AI_MM", `Could not list pool orders on ${symbol}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return [];
    }
}
