"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FX_TRADING_OPERATIONS = exports.STAKING_LIVE_STATUSES = void 0;
exports.isMissingTableError = isMissingTableError;
exports.deriveFxTrading = deriveFxTrading;
exports.readParallelStoresDetailed = readParallelStoresDetailed;
exports.readParallelStores = readParallelStores;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const attribution_1 = require("./attribution");
exports.STAKING_LIVE_STATUSES = [
    "ACTIVE",
    "PENDING_WITHDRAWAL",
    "PENDING_DELEGATION",
    "UNSTAKE_REQUESTED",
    "UNBONDING",
    "WITHDRAWABLE",
];
exports.FX_TRADING_OPERATIONS = ["FX_TRADING_DEPOSIT", "FX_TRADING_WITHDRAW", "FX_TRADING_WITHDRAW_REFUND"];
const STAKING_STATUS_LIST = exports.STAKING_LIVE_STATUSES.map((s) => `'${s}'`).join(", ");
function toNum(value) {
    if (value === null || value === undefined || value === "")
        return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function isMissingTableError(error) {
    var _a, _b, _c, _d, _e;
    var _f, _g, _h, _j, _k, _l;
    const code = (_g = (_f = (_a = error === null || error === void 0 ? void 0 : error.parent) === null || _a === void 0 ? void 0 : _a.code) !== null && _f !== void 0 ? _f : (_b = error === null || error === void 0 ? void 0 : error.original) === null || _b === void 0 ? void 0 : _b.code) !== null && _g !== void 0 ? _g : error === null || error === void 0 ? void 0 : error.code;
    if (code === "ER_NO_SUCH_TABLE")
        return true;
    const errno = Number((_j = (_h = (_c = error === null || error === void 0 ? void 0 : error.parent) === null || _c === void 0 ? void 0 : _c.errno) !== null && _h !== void 0 ? _h : (_d = error === null || error === void 0 ? void 0 : error.original) === null || _d === void 0 ? void 0 : _d.errno) !== null && _j !== void 0 ? _j : error === null || error === void 0 ? void 0 : error.errno);
    if (errno === 1146)
        return true;
    return /no such table|doesn't exist/i.test(String((_l = (_k = error === null || error === void 0 ? void 0 : error.message) !== null && _k !== void 0 ? _k : (_e = error === null || error === void 0 ? void 0 : error.parent) === null || _e === void 0 ? void 0 : _e.message) !== null && _l !== void 0 ? _l : ""));
}
function emptyStores() {
    return { copyTrading: 0, investment: 0, aiInvestment: 0, staking: 0, forex: 0, fxTrading: 0, total: 0, notes: [] };
}
async function guardedSelect(store, tables, sql, notes) {
    try {
        return (await db_1.sequelize.query(sql, { type: sequelize_1.QueryTypes.SELECT }));
    }
    catch (error) {
        if (!isMissingTableError(error))
            throw error;
        const note = `${store}: table ${tables.join(" / ")} is absent (addon not installed) — counted as 0`;
        notes.push(note);
        console_1.logger.warn("POOL_BACKING", `Parallel stores: ${note}`);
        return null;
    }
}
async function readCopyTrading(add, notes) {
    var _a;
    const rows = await guardedSelect("copyTrading", ["copy_trading_follower_allocations"], `SELECT symbol, SUM(baseAmount) AS baseAmount, SUM(quoteAmount) AS quoteAmount
       FROM copy_trading_follower_allocations
      WHERE marketType = 'BINARY'
        AND isActive = true
      GROUP BY symbol`, notes);
    if (!rows)
        return;
    for (const r of rows) {
        const symbol = String((_a = r.symbol) !== null && _a !== void 0 ? _a : "").trim();
        const [base, quote] = symbol.split("/");
        if (!base || !quote) {
            notes.push(`copyTrading: symbol "${symbol}" has no base/quote halves — its allocation is not attributed to a currency`);
            continue;
        }
        add(base.trim().toUpperCase(), toNum(r.baseAmount));
        add(quote.trim().toUpperCase(), toNum(r.quoteAmount));
    }
}
async function readInvestment(add, notes) {
    var _a;
    const rows = await guardedSelect("investment", ["investment", "investment_plan"], `SELECT p.currency AS currency, SUM(i.amount) AS amount
       FROM investment i
       JOIN investment_plan p ON p.id = i.planId
      WHERE i.status = 'ACTIVE'
        AND i.deletedAt IS NULL
        AND p.deletedAt IS NULL
        AND p.walletType = 'SPOT'
      GROUP BY p.currency`, notes);
    if (!rows)
        return;
    for (const r of rows)
        add(String((_a = r.currency) !== null && _a !== void 0 ? _a : "").trim().toUpperCase(), toNum(r.amount));
}
async function readAiInvestment(add, notes) {
    var _a;
    const rows = await guardedSelect("aiInvestment", ["ai_investment"], `SELECT SUBSTRING_INDEX(symbol, '/', -1) AS currency, SUM(amount) AS amount
       FROM ai_investment
      WHERE status = 'ACTIVE'
        AND type = 'SPOT'
        AND deletedAt IS NULL
      GROUP BY SUBSTRING_INDEX(symbol, '/', -1)`, notes);
    if (!rows)
        return;
    for (const r of rows)
        add(String((_a = r.currency) !== null && _a !== void 0 ? _a : "").trim().toUpperCase(), toNum(r.amount));
}
async function readStaking(add, notes, noteFor) {
    var _a, _b;
    const rows = await guardedSelect("staking", ["staking_positions", "staking_pools"], `SELECT p.symbol AS currency, SUM(s.amount) AS amount
       FROM staking_positions s
       JOIN staking_pools p ON p.id = s.poolId
      WHERE s.status IN (${STAKING_STATUS_LIST})
        AND s.deletedAt IS NULL
        AND p.deletedAt IS NULL
        AND COALESCE(p.walletType, 'SPOT') = 'SPOT'
        AND COALESCE(s.mode, p.mode) = 'SYNTHETIC'
      GROUP BY p.symbol`, notes);
    if (!rows)
        return;
    for (const r of rows)
        add(String((_a = r.currency) !== null && _a !== void 0 ? _a : "").trim().toUpperCase(), toNum(r.amount));
    const real = await guardedSelect("staking", ["staking_positions", "staking_pools"], `SELECT p.symbol AS currency, COUNT(*) AS positions, SUM(s.amount) AS amount
       FROM staking_positions s
       JOIN staking_pools p ON p.id = s.poolId
      WHERE s.status IN (${STAKING_STATUS_LIST})
        AND s.deletedAt IS NULL
        AND p.deletedAt IS NULL
        AND COALESCE(p.walletType, 'SPOT') = 'SPOT'
        AND COALESCE(s.mode, p.mode) = 'REAL'
      GROUP BY p.symbol`, notes);
    if (!real)
        return;
    for (const r of real) {
        const currency = String((_b = r.currency) !== null && _b !== void 0 ? _b : "").trim().toUpperCase();
        const count = toNum(r.positions);
        if (!count)
            continue;
        noteFor(currency, `staking: ${count} REAL-mode position(s) worth ${toNum(r.amount)} ${currency} sit on SPOT-funded pools — not summed (real staking custody is on-chain, not in the exchange pool)`);
    }
}
async function readForex(add, notes) {
    var _a, _b;
    const accounts = await guardedSelect("forex", ["forex_account"], `SELECT currency, SUM(balance) AS amount
       FROM forex_account
      WHERE type = 'LIVE'
        AND walletType = 'SPOT'
        AND deletedAt IS NULL
        AND currency IS NOT NULL
      GROUP BY currency`, notes);
    if (accounts)
        for (const r of accounts)
            add(String((_a = r.currency) !== null && _a !== void 0 ? _a : "").trim().toUpperCase(), toNum(r.amount));
    const investments = await guardedSelect("forex", ["forex_investment", "forex_plan"], `SELECT p.currency AS currency, SUM(i.amount) AS amount
       FROM forex_investment i
       JOIN forex_plan p ON p.id = i.planId
      WHERE i.status = 'ACTIVE'
        AND i.deletedAt IS NULL
        AND p.deletedAt IS NULL
        AND p.walletType = 'SPOT'
      GROUP BY p.currency`, notes);
    if (investments)
        for (const r of investments)
            add(String((_b = r.currency) !== null && _b !== void 0 ? _b : "").trim().toUpperCase(), toNum(r.amount));
}
function deriveFxTrading(rows) {
    var _a, _b, _c;
    const out = new Map();
    for (const r of rows) {
        const meta = (0, attribution_1.parseMetadata)(r.metadata);
        const op = meta && typeof meta.operationType === "string" && meta.operationType.trim() ? meta.operationType.trim() : String((_a = r.type) !== null && _a !== void 0 ? _a : "").trim();
        if (!exports.FX_TRADING_OPERATIONS.includes(op))
            continue;
        if (meta && typeof meta.walletType === "string" && meta.walletType.trim() && meta.walletType.trim().toUpperCase() !== "SPOT")
            continue;
        const flow = meta && typeof meta.flow === "string" ? meta.flow.trim().toUpperCase() : "";
        let sign;
        if (flow === "OUT")
            sign = +1;
        else if (flow === "IN")
            sign = -1;
        else if (flow === "INTERNAL")
            continue;
        else if (meta && meta.fxAccountId)
            continue;
        else
            sign = op === "FX_TRADING_WITHDRAW" ? -1 : +1;
        const currency = String((_b = r.currency) !== null && _b !== void 0 ? _b : "").trim().toUpperCase();
        if (!currency)
            continue;
        out.set(currency, ((_c = out.get(currency)) !== null && _c !== void 0 ? _c : 0) + sign * toNum(r.amount));
    }
    return out;
}
async function readFxTrading(add, notes, noteFor) {
    const rows = await guardedSelect("fxTrading", ["transaction", "wallet"], `SELECT w.currency AS currency, t.type AS type, t.amount AS amount, t.fee AS fee, t.metadata AS metadata
       FROM transaction t
       JOIN wallet w ON w.id = t.walletId
      WHERE t.type IN ('FX_TRADING_DEPOSIT', 'FX_TRADING_WITHDRAW')
        AND t.status = 'COMPLETED'
        AND t.deletedAt IS NULL
        AND w.type = 'SPOT'
        AND w.deletedAt IS NULL`, notes);
    if (!rows)
        return;
    for (const [currency, net] of deriveFxTrading(rows)) {
        if (!net)
            continue;
        if (net < 0) {
            noteFor(currency, `fxTrading: net SPOT flow is ${net} ${currency} — withdrawals exceed deposits (paid-out profit is a minted liability, not a store); reported as 0`);
            continue;
        }
        add(currency, net);
        noteFor(currency, `fxTrading: derived from the SPOT ledger (net of FX_TRADING_DEPOSIT / FX_TRADING_WITHDRAW rows), not an account balance`);
    }
}
async function readParallelStoresDetailed() {
    const byCurrency = new Map();
    const globalNotes = [];
    const ensure = (currency) => {
        let row = byCurrency.get(currency);
        if (!row) {
            row = emptyStores();
            byCurrency.set(currency, row);
        }
        return row;
    };
    const adder = (key) => (currency, amount) => {
        if (!currency || !amount)
            return;
        ensure(currency)[key] += amount;
    };
    const noteFor = (currency, note) => {
        if (!currency) {
            globalNotes.push(note);
            return;
        }
        ensure(currency).notes.push(note);
    };
    await readCopyTrading(adder("copyTrading"), globalNotes);
    await readInvestment(adder("investment"), globalNotes);
    await readAiInvestment(adder("aiInvestment"), globalNotes);
    await readStaking(adder("staking"), globalNotes, noteFor);
    await readForex(adder("forex"), globalNotes);
    await readFxTrading(adder("fxTrading"), globalNotes, noteFor);
    for (const row of byCurrency.values()) {
        row.total = row.copyTrading + row.investment + row.aiInvestment + row.staking + row.forex + row.fxTrading;
        row.notes = [...globalNotes, ...row.notes];
    }
    return { byCurrency, notes: globalNotes };
}
async function readParallelStores() {
    return (await readParallelStoresDetailed()).byCurrency;
}
