"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyTransfer = classifyTransfer;
exports.isBackingRelevantPair = isBackingRelevantPair;
exports.withCurrencyAnchor = withCurrencyAnchor;
exports.sumOpenExchangeObligations = sumOpenExchangeObligations;
exports.assertWithinCap = assertWithinCap;
exports.recordTransferObligations = recordTransferObligations;
exports.recordAdminObligation = recordAdminObligation;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const settings_1 = require("./settings");
const EPSILON = 1e-12;
function classifyTransfer(input) {
    const { fromType, toType, fromCurrency, toCurrency } = input;
    const received = Number(input.received) || 0;
    const sentNet = Number(input.sentNetOfFee) || 0;
    if (!(received > EPSILON) && !(sentNet > EPSILON))
        return [];
    const sameCurrency = fromCurrency === toCurrency;
    if (fromType === "ECO" && toType === "SPOT") {
        if (sameCurrency) {
            return [{ currency: toCurrency, side: "both", amount: received, source: "transfer", nettable: true, basis: "received" }];
        }
        return [
            { currency: fromCurrency, side: "ecosystem", amount: sentNet, source: "conversion", nettable: true, basis: "sent_net_of_fee" },
            { currency: toCurrency, side: "exchange", amount: received, source: "conversion", nettable: false, basis: "received" },
        ];
    }
    if (fromType === "SPOT" && toType === "ECO") {
        if (sameCurrency) {
            return [{ currency: toCurrency, side: "both", amount: -received, source: "transfer", nettable: true, basis: "received" }];
        }
        return [
            { currency: fromCurrency, side: "exchange", amount: -sentNet, source: "conversion", nettable: true, basis: "sent_net_of_fee" },
            { currency: toCurrency, side: "ecosystem", amount: -received, source: "conversion", nettable: false, basis: "received" },
        ];
    }
    if (fromType === "FIAT" && toType === "SPOT") {
        return [{ currency: toCurrency, side: "exchange", amount: received, source: "fiat_transfer", nettable: false, basis: "received" }];
    }
    if (fromType === "SPOT" && toType === "FIAT") {
        return [{ currency: fromCurrency, side: "exchange", amount: -sentNet, source: "fiat_transfer", nettable: false, basis: "sent_net_of_fee" }];
    }
    if (fromType === "FIAT" && toType === "ECO") {
        return [{ currency: toCurrency, side: "ecosystem", amount: -received, source: "fiat_transfer", nettable: false, basis: "received" }];
    }
    if (fromType === "ECO" && toType === "FIAT") {
        return [{ currency: fromCurrency, side: "ecosystem", amount: sentNet, source: "fiat_transfer", nettable: false, basis: "sent_net_of_fee" }];
    }
    return [];
}
function isBackingRelevantPair(fromType, toType) {
    const pairs = new Set(["ECO>SPOT", "SPOT>ECO", "FIAT>SPOT", "SPOT>FIAT", "FIAT>ECO", "ECO>FIAT"]);
    return pairs.has(`${fromType}>${toType}`);
}
async function withCurrencyAnchor(currency, t) {
    const locked = await db_1.models.poolBackingCurrency.findOne({
        where: { currency },
        transaction: t,
        lock: t.LOCK.UPDATE,
    });
    if (locked)
        return locked;
    try {
        await db_1.models.poolBackingCurrency.create({ currency, residualStreak: 0 }, { transaction: t });
    }
    catch (error) {
        if (!(error instanceof sequelize_1.UniqueConstraintError || (error === null || error === void 0 ? void 0 : error.name) === "SequelizeUniqueConstraintError"))
            throw error;
    }
    return db_1.models.poolBackingCurrency.findOne({
        where: { currency },
        transaction: t,
        lock: t.LOCK.UPDATE,
    });
}
const CAP_SOURCES = ["transfer", "conversion", "fiat_transfer", "admin"];
async function sumOpenExchangeObligations(currency, t) {
    const rows = await db_1.models.poolBackingObligation.findAll({
        where: { currency, status: ["OPEN", "CLAIMED"], side: ["both", "exchange"], source: CAP_SOURCES },
        attributes: ["amount", "nettable"],
        raw: true,
        transaction: t,
    });
    let sum = 0;
    for (const r of rows)
        sum += Number(r.amount) || 0;
    return sum;
}
async function assertWithinCap(params) {
    var _a, _b;
    const { currency, addAmount, t } = params;
    if (!(addAmount > EPSILON))
        return;
    const settings = (_a = params.settings) !== null && _a !== void 0 ? _a : (await (0, settings_1.getPoolBackingSettings)());
    if (settings.mode !== "manual" && settings.mode !== "auto")
        return;
    const anchor = (_b = params.anchor) !== null && _b !== void 0 ? _b : (await withCurrencyAnchor(currency, t));
    const capUsd = (anchor === null || anchor === void 0 ? void 0 : anchor.capUsd) != null && Number(anchor.capUsd) >= 0 ? Number(anchor.capUsd) : settings.capUsd;
    if (capUsd == null)
        return;
    let rate;
    try {
        const { getUsdRates } = require("@b/api/finance/currency/utils");
        const rates = await getUsdRates([currency]);
        rate = rates.get(currency);
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `USD rate for ${currency} unavailable; cap not enforced on this transfer: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return;
    }
    if (!rate || !(rate > 0)) {
        console_1.logger.warn("POOL_BACKING", `No USD rate for ${currency}; cap not enforced on this transfer`);
        return;
    }
    const open = await sumOpenExchangeObligations(currency, t);
    const afterUsd = (Math.max(open, 0) + addAmount) * rate;
    if (afterUsd > capUsd) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `Spot is at its backing limit for ${currency}: the pool is waiting on ` +
                `${Math.max(open, 0).toFixed(8)} ${currency} of transfers that have not been settled to the exchange yet. ` +
                capRefusalHint(params.source),
        });
    }
}
function capRefusalHint(source) {
    if (source === "fiat_transfer") {
        return "Your fiat balance has nothing to deposit to Spot: use the fiat deposit flow instead (Finance > Deposit > Fiat), or try again once the operator has settled.";
    }
    return "Deposit to Spot directly, or try again once the operator has settled.";
}
async function recordTransferObligations(p) {
    var _a, _b, _c;
    const drafts = classifyTransfer(p);
    if (!drafts.length)
        return [];
    const created = [];
    for (const d of drafts) {
        const legs = {
            outgoingTransactionId: p.outgoingTransactionId,
            incomingTransactionId: p.incomingTransactionId,
            fromType: p.fromType,
            toType: p.toType,
            fromCurrency: p.fromCurrency,
            toCurrency: p.toCurrency,
            userId: p.userId,
            basis: d.basis,
            chains: (_a = p.chains) !== null && _a !== void 0 ? _a : [],
        };
        const pieces = splitByChain(d, p.chains);
        for (const piece of pieces) {
            try {
                const row = await db_1.models.poolBackingObligation.create({
                    currency: piece.currency,
                    side: piece.side,
                    chain: (_b = piece.chain) !== null && _b !== void 0 ? _b : null,
                    amount: piece.amount,
                    source: piece.source,
                    status: "OPEN",
                    nettable: piece.nettable,
                    sourceRef: pieces.length > 1 ? `${p.incomingTransactionId}:${(_c = piece.chain) !== null && _c !== void 0 ? _c : "unattributed"}` : p.incomingTransactionId,
                    legs,
                    evidence: null,
                    createdBy: null,
                }, { transaction: p.t });
                created.push(row);
            }
            catch (error) {
                if (error instanceof sequelize_1.UniqueConstraintError || (error === null || error === void 0 ? void 0 : error.name) === "SequelizeUniqueConstraintError") {
                    console_1.logger.warn("POOL_BACKING", `Obligation for transfer leg ${p.incomingTransactionId} (${piece.side}) already recorded; skipping`);
                    continue;
                }
                throw error;
            }
        }
    }
    return created;
}
function splitByChain(d, chains) {
    if (d.side === "exchange" || !chains || !chains.length)
        return [d];
    const sign = d.amount < 0 ? -1 : 1;
    const total = Math.abs(d.amount);
    const out = [];
    let attributed = 0;
    for (const leg of chains) {
        const share = Math.min(Math.abs(Number(leg.amount) || 0), total - attributed);
        if (!(share > EPSILON))
            continue;
        out.push({ ...d, chain: leg.chain, amount: sign * share });
        attributed += share;
    }
    const rest = total - attributed;
    if (rest > EPSILON)
        out.push({ ...d, chain: null, amount: sign * rest });
    return out.length ? out : [d];
}
async function recordAdminObligation(p) {
    var _a, _b, _c;
    if (p.walletType !== "SPOT" && p.walletType !== "ECO")
        return null;
    const amount = Number(p.amount) || 0;
    if (!(Math.abs(amount) > EPSILON))
        return null;
    const side = p.walletType === "SPOT" ? "exchange" : "ecosystem";
    const signed = p.walletType === "SPOT" ? amount : -amount;
    try {
        return await db_1.models.poolBackingObligation.create({
            currency: p.currency,
            side,
            chain: null,
            amount: signed,
            source: "admin",
            status: p.backed ? "SETTLED" : "OPEN",
            nettable: false,
            sourceRef: p.adjustmentTransactionId,
            legs: { walletType: p.walletType, reason: (_a = p.reason) !== null && _a !== void 0 ? _a : null },
            evidence: (_b = p.evidence) !== null && _b !== void 0 ? _b : null,
            createdBy: (_c = p.adminUserId) !== null && _c !== void 0 ? _c : null,
            settledAt: p.backed ? new Date() : null,
        }, p.t ? { transaction: p.t } : undefined);
    }
    catch (error) {
        if (error instanceof sequelize_1.UniqueConstraintError || (error === null || error === void 0 ? void 0 : error.name) === "SequelizeUniqueConstraintError") {
            console_1.logger.warn("POOL_BACKING", `Admin obligation for ${p.adjustmentTransactionId} already recorded; skipping`);
            return null;
        }
        throw error;
    }
}
