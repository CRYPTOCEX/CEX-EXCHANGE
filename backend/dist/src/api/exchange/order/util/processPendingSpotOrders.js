"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.settleSpotOrder = settleSpotOrder;
exports.processPendingSpotOrders = processPendingSpotOrders;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const wallet_1 = require("@b/services/wallet");
const utils_1 = require("@b/api/finance/wallet/utils");
const fees_1 = require("@b/utils/fees");
const utils_2 = require("../utils");
const utils_3 = require("../../utils");
const fill_math_1 = require("./fill-math");
function normaliseStatus(raw) {
    if (!raw)
        return "OPEN";
    const upper = raw.toUpperCase();
    if (upper === "FILLED" || upper === "CLOSED")
        return "CLOSED";
    if (upper === "CANCELED" || upper === "CANCELLED")
        return "CANCELED";
    if (upper === "EXPIRED")
        return "EXPIRED";
    if (upper === "REJECTED")
        return "REJECTED";
    return "OPEN";
}
async function resolveSettlementContext(order) {
    var _a;
    const [currency, pair] = order.symbol.split("/");
    const market = await db_1.models.exchangeMarket.findOne({
        where: { currency, pair },
    });
    if (!market || !market.metadata) {
        console_1.logger.error("SPOT_RECON", `Market data not found for ${order.symbol} (order ${order.id})`);
        return null;
    }
    const metadata = typeof market.metadata === "string"
        ? JSON.parse(market.metadata)
        : market.metadata;
    const feeRate = order.side === "BUY" ? Number(metadata.taker) : Number(metadata.maker);
    const currencyWallet = await (0, utils_1.getWalletSafe)(order.userId, "SPOT", currency);
    const pairWallet = await (0, utils_1.getWalletSafe)(order.userId, "SPOT", pair);
    if (!currencyWallet || !pairWallet) {
        console_1.logger.error("SPOT_RECON", `Wallet missing for user ${order.userId} on ${order.symbol} (order ${order.id})`);
        return null;
    }
    const inputWallet = order.side === "BUY" ? pairWallet : currencyWallet;
    return {
        currency,
        pair,
        currencyWalletId: currencyWallet.id,
        pairWalletId: pairWallet.id,
        inputInOrder: Number((_a = inputWallet.inOrder) !== null && _a !== void 0 ? _a : 0),
        feeRate,
    };
}
async function settleSpotOrder(order, orderData, provider) {
    return db_1.sequelize.transaction(async (transaction) => {
        const locked = await db_1.models.exchangeOrder.findOne({
            where: { id: order.id, userId: order.userId },
            transaction, lock: transaction.LOCK.UPDATE,
        });
        if (!locked) throw new Error("Spot order no longer exists");
        const current = locked.get({ plain: true });
        if (normaliseStatus(current.status) !== "OPEN") return true;
        const meta = (0, utils_2.metadataObject)(current.metadata);
        if (meta.reconcileBlocked || (meta.venue && meta.venue !== provider))
            throw new Error("Spot order provider or reconciliation state does not permit settlement");
        if (orderData.id != null && String(orderData.id) !== String(current.referenceId))
            throw new Error("Spot settlement reference does not match the local order");
        if (orderData.symbol && orderData.symbol !== current.symbol)
            throw new Error("Spot settlement symbol does not match the local order");
        const filled = Number(orderData.filled);
        if (current.type === "MARKET" && current.side === "BUY" && Number(meta.quoteBudget) > 0 && normaliseStatus(orderData.status) === "CLOSED" && Number.isFinite(filled) && filled > 0) {
            current.amount = filled;
            await db_1.models.exchangeOrder.update({ amount: filled }, { where: { id: current.id }, transaction });
        }
        if (orderData.filled == null || !Number.isFinite(filled) || filled < 0 || filled > Number(current.amount))
            throw new Error("Spot settlement requires a valid cumulative fill quantity");
        if (filled < Number(current.filled || 0))
            throw new Error("Spot settlement snapshot is older than the persisted fill quantity");
        const priorSettlement = await db_1.models.transaction.findOne({
            where: { userId: current.userId, idempotencyKey: { [sequelize_1.Op.in]: [
                `exchange_order_${current.id}_execute`, `exchange_order_${current.id}_credit_fill`,
                `exchange_order_${current.id}_partial_fill`, `exchange_order_${current.id}_release`,
                `exchange_order_${current.id}_cancel_refund`, `exchange_order_${current.referenceId}_credit`,
            ] } }, attributes: ["id"], transaction,
        });
        if (priorSettlement) throw new Error("Historical settlement ledger exists for an OPEN order; reconcile before retrying");
        await settleLockedSpotOrder(current, { ...orderData, side: current.side, amount: current.amount }, provider, transaction);
        const final = await db_1.models.exchangeOrder.findOne({ where: { id: current.id, userId: current.userId }, transaction });
        return final && normaliseStatus(final.status) !== "OPEN";
    });
}
async function settleLockedSpotOrder(order, remote, provider, transaction) {
    const status = normaliseStatus(remote.status);
    if (status === "OPEN") {
        await db_1.models.exchangeOrder.update({ filled: Number(remote.filled), remaining: Math.max(Number(order.amount) - Number(remote.filled), 0) }, { where: { id: order.id }, transaction });
        return;
    }
    const ctx = await resolveSettlementContext(order);
    if (!ctx) throw new Error("Cannot resolve spot settlement wallets/market");
    const meta = (0, utils_2.metadataObject)(order.metadata);
    const settledAtCreate = (0, fill_math_1.readFilledAtCreate)(meta);
    const { calculateTerminalSettlement } = require("./settlement-math");
    const values = calculateTerminalSettlement({ order, remote, settledAtCreate, feeRate: meta.feeRateAtCreate == null ? ctx.feeRate : Number(meta.feeRateAtCreate) });
    const model = (0, fill_math_1.resolveSettlementModel)({ metadata: meta, requiredOnInput: values.reserved, inputInOrder: ctx.inputInOrder, venueStatus: status });
    if (model === "NOTHING_RESERVED" && values.newFill > 0) throw new Error("Cannot credit a fill without a reservation");
    const buy = order.side === "BUY";
    const common = { userId: order.userId, walletType: "SPOT", referenceId: order.id, metadata: { orderId: order.id, symbol: order.symbol, source: "SPOT_RECON" }, transaction };
    const input = { ...common, walletId: buy ? ctx.pairWalletId : ctx.currencyWalletId, currency: buy ? ctx.pair : ctx.currency };
    const output = { ...common, walletId: buy ? ctx.currencyWalletId : ctx.pairWalletId, currency: buy ? ctx.currency : ctx.pair };
    if (model === "HOLD" && values.input > 0) {
        await wallet_1.walletService.executeFromHold({ ...input, idempotencyKey: `exchange_order_${order.id}_execute`, amount: values.input, operationType: "EXCHANGE_ORDER_FILL", description: "Execute confirmed spot fill from reservation" });
    }
    if (model !== "NOTHING_RESERVED" && values.output > 0) {
        await wallet_1.walletService.credit({ ...output, idempotencyKey: `exchange_order_${order.id}_credit_fill`, amount: values.output, fee: values.fee, operationType: "EXCHANGE_ORDER_FILL", description: "Credit confirmed spot fill" });
    }
    if (model !== "NOTHING_RESERVED" && values.fee > 0) {
        await (0, fees_1.collectPlatformFee)({ userId: order.userId, currency: output.currency, walletType: "SPOT", feeAmount: values.fee, type: "TRADE", referenceId: order.id, description: "Platform fee for confirmed spot fill", metadata: common.metadata, transaction });
    }
    if (model === "HOLD" && values.release > 0) {
        await wallet_1.walletService.release({ ...input, idempotencyKey: `exchange_order_${order.id}_release`, amount: values.release, operationType: "EXCHANGE_ORDER_CANCEL", reason: "Release unused spot reservation including execution price improvement" });
    } else if (model === "LEGACY_DEBIT" && values.release > 0) {
        await wallet_1.walletService.credit({ ...input, idempotencyKey: `exchange_order_${order.id}_cancel_refund`, amount: values.release, operationType: "EXCHANGE_ORDER_CANCEL", description: "Refund unused legacy spot debit" });
    }
    const venueFee = (0, utils_2.readVenueFee)(remote);
    await db_1.models.exchangeOrder.update({ status, filled: values.filled, remaining: values.remaining, cost: values.cost, fee: values.chargedFee, metadata: { ...meta, ...(venueFee ? { venueFee } : {}), settlementVersion: 2 } }, { where: { id: order.id }, transaction });
}
async function processPendingSpotOrders() {
    var _a;
    var _b, _c, _d, _e, _f;
    const unblockTime = await (0, utils_3.loadBanStatus)();
    if (await (0, utils_3.handleBanStatus)(unblockTime)) {
        console_1.logger.info("SPOT_RECON", "Exchange is banned; skipping spot reconciliation tick");
        return;
    }
    const openOrders = await db_1.models.exchangeOrder.findAll({
        where: {
            status: "OPEN",

        },
        attributes: [
            "id",
            "userId",
            "symbol",
            "side",
            "type",
            "amount",
            "price",
            "filled",
            "remaining",
            "status",
            "referenceId",
            "metadata",
        ],
        raw: true,
    });
    for (const order of openOrders) {
        if (typeof order.metadata !== "string")
            continue;
        try {
            order.metadata = JSON.parse(order.metadata);
        }
        catch (_g) {
            order.metadata = null;
        }
    }
    if (!openOrders.length)
        return;
    const exchange = await exchange_1.default.startExchange();
    if (!exchange) {
        console_1.logger.warn("SPOT_RECON", "Exchange unavailable; skipping tick");
        return;
    }
    const provider = await exchange_1.default.getProvider();
    let skippedForeign = 0;
    for (const order of openOrders) {
        try {
            const meta = (_b = order.metadata) !== null && _b !== void 0 ? _b : {};
            const orderVenue = typeof meta === "string" ? safeParseVenue(meta) : meta === null || meta === void 0 ? void 0 : meta.venue;
            if (orderVenue && provider && orderVenue !== provider) {
                skippedForeign++;
                continue;
            }
            if (meta === null || meta === void 0 ? void 0 : meta.reconcileBlocked) {
                skippedForeign++;
                continue;
            }
            if (!order.referenceId) {
                if (!meta.clientOrderId) continue;
                // Search only; never repeat an uncertain createOrder call.
                const candidates = exchange.has?.fetchOrders
                    ? await exchange.fetchOrders(order.symbol)
                    : exchange.has?.fetchOpenOrders ? await exchange.fetchOpenOrders(order.symbol) : [];
                const matches = candidates.filter(candidate => String(candidate.clientOrderId || "") === String(meta.clientOrderId));
                if (matches.length !== 1 || !matches[0].id) continue;
                const recovered = matches[0];
                if (recovered.symbol && recovered.symbol !== order.symbol) continue;
                if (String(recovered.side || "").toUpperCase() !== order.side) continue;
                const patch = { referenceId: String(recovered.id), metadata: { ...meta, placementState: "RECOVERED" } };
                if (order.type === "MARKET" && order.side === "BUY" && Number(recovered.amount) > 0) patch.amount = Number(recovered.amount);
                await db_1.models.exchangeOrder.update(patch, { where: { id: order.id, referenceId: null, status: "OPEN" } });
                Object.assign(order, patch);
            }
            let orderData;
            try {
                if ((_a = exchange.has) === null || _a === void 0 ? void 0 : _a["fetchOrder"]) {
                    orderData = await exchange.fetchOrder(order.referenceId, order.symbol);
                }
                else {
                    const orders = await exchange.fetchOrders(order.symbol);
                    orderData = orders.find((o) => o.id === order.referenceId);
                }
            }
            catch (fetchErr) {
                if (typeof (fetchErr === null || fetchErr === void 0 ? void 0 : fetchErr.message) === "string" &&
                    fetchErr.message.includes("Order was canceled or expired with no executed qty over 90 days ago and has been archived")) {
                    await settleSpotOrder(order, {
                        status: "canceled",
                        filled: 0,
                        remaining: order.amount,
                        cost: 0,
                        fee: { cost: 0 },
                        price: order.price,
                        amount: order.amount,
                    }, provider);
                    continue;
                }
                throw fetchErr;
            }
            if (!orderData || !orderData.id) {
                console_1.logger.warn("SPOT_RECON", `No remote order data for ${order.id} (ref ${order.referenceId}); skipping`);
                continue;
            }
            const status = normaliseStatus(orderData.status);
            if (status === "CLOSED" ||
                status === "CANCELED" ||
                status === "EXPIRED" ||
                status === "REJECTED" ||
                (Number((_c = orderData.filled) !== null && _c !== void 0 ? _c : 0) > 0 && Number((_d = orderData.filled) !== null && _d !== void 0 ? _d : 0) < Number(order.amount))) {
                await settleSpotOrder(order, orderData, provider);
            }
        }
        catch (err) {
            const message = String((_e = err === null || err === void 0 ? void 0 : err.message) !== null && _e !== void 0 ? _e : err);
            const venueRejectedTheId = message.includes("-1100") ||
                /illegal characters found in parameter\s*'?orderId/i.test(message);
            if (venueRejectedTheId) {
                const meta = (_f = order.metadata) !== null && _f !== void 0 ? _f : {};
                await db_1.models.exchangeOrder.update({
                    metadata: {
                        ...(typeof meta === "object" && meta ? meta : {}),
                        reconcileBlocked: {
                            reason: "venue-rejected-order-id",
                            provider,
                            at: new Date().toISOString(),
                        },
                    },
                }, { where: { id: order.id } });
                console_1.logger.warn("SPOT_RECON", `Spot order ${order.id} (ref ${order.referenceId}) was not issued by ` +
                    `${provider}; it will no longer be retried. Reconcile it against the ` +
                    `venue that placed it, or close it manually.`);
                continue;
            }
            console_1.logger.error("SPOT_RECON", `Failed to reconcile spot order ${order.id} (ref ${order.referenceId}): ${message}`, err);
        }
    }
    if (skippedForeign > 0) {
        console_1.logger.info("SPOT_RECON", `Skipped ${skippedForeign} order(s) not issued by ${provider}`);
    }
}
function safeParseVenue(raw) {
    var _a;
    try {
        return (_a = JSON.parse(raw)) === null || _a === void 0 ? void 0 : _a.venue;
    }
    catch (_b) {
        return undefined;
    }
}
