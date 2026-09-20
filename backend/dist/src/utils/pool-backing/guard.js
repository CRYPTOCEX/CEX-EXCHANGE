"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSettlementTxid = isSettlementTxid;
exports.liveSettlementHoldingTxid = liveSettlementHoldingTxid;
exports.isSettlementSpendTxid = isSettlementSpendTxid;
exports.forgetDatabaseFlavour = forgetDatabaseFlavour;
exports.isPlatformControlledAddress = isPlatformControlledAddress;
exports.findCustodyWithdrawalByTxid = findCustodyWithdrawalByTxid;
exports.refuseIfSettlement = refuseIfSettlement;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const exchange_io_1 = require("./exchange-io");
const treasury_1 = require("./treasury");
const NEVER_BROADCAST = new Set(["FAILED", "CANCELLED"]);
const ADDRESS_CHECK_DEADLINE_MS = 2000;
const BROADCAST_WITHDRAWAL_STATUSES = new Set(["COMPLETED", "PROCESSING"]);
function spellingsOf(txid) {
    const raw = String(txid !== null && txid !== void 0 ? txid : "").trim();
    const normalised = (0, exchange_io_1.normaliseTxid)(raw);
    return Array.from(new Set([normalised, raw].filter((s) => !!s)));
}
async function settlementsHolding(txid, attributes) {
    const candidates = spellingsOf(txid);
    if (!candidates.length)
        return [];
    return (await db_1.models.poolBackingSettlement.findAll({
        where: { txid: candidates.length === 1 ? candidates[0] : candidates },
        attributes,
        raw: true,
    }));
}
async function isSettlementTxid(txid) {
    const rows = await settlementsHolding(txid, ["id", "status"]);
    return rows.some((r) => !NEVER_BROADCAST.has(String(r.status)));
}
async function liveSettlementHoldingTxid(txid, exceptSettlementId) {
    const rows = await settlementsHolding(txid, ["id", "status"]);
    const except = exceptSettlementId ? String(exceptSettlementId) : null;
    const holder = rows.find((r) => !NEVER_BROADCAST.has(String(r.status)) && (!except || String(r.id) !== except));
    return holder ? { id: String(holder.id), status: String(holder.status) } : null;
}
async function isSettlementSpendTxid(txid) {
    const rows = await settlementsHolding(txid, ["id", "status", "direction"]);
    return rows.some((r) => !NEVER_BROADCAST.has(String(r.status)) && String(r.direction) === "eco_to_exchange");
}
function escapeLike(value) {
    return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
async function withDeadline(promise, ms, what) {
    let timer;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(`${what} exceeded ${ms} ms`)), ms);
            }),
        ]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
let databaseFlavour = null;
function detectDatabaseFlavour() {
    if (!databaseFlavour) {
        databaseFlavour = (async () => {
            var _a;
            try {
                const probe = db_1.sequelize === null || db_1.sequelize === void 0 ? void 0 : db_1.sequelize.databaseVersion;
                if (typeof probe !== "function")
                    return "unknown";
                const version = String((_a = (await probe.call(db_1.sequelize))) !== null && _a !== void 0 ? _a : "");
                if (!version)
                    return "unknown";
                return /mariadb/i.test(version) ? "mariadb" : "mysql";
            }
            catch (_b) {
                return "unknown";
            }
        })();
    }
    return databaseFlavour;
}
function forgetDatabaseFlavour() {
    databaseFlavour = null;
}
async function platformAddressCheck(lower, chain) {
    var _a, _b;
    const masters = await db_1.models.ecosystemMasterWallet.findAll({
        where: chain ? { chain } : {},
        attributes: ["address"],
        raw: true,
    });
    if (masters.some((m) => { var _a; return String((_a = m === null || m === void 0 ? void 0 : m.address) !== null && _a !== void 0 ? _a : "").trim().toLowerCase() === lower; }))
        return true;
    const custodial = await db_1.models.ecosystemCustodialWallet.findOne({
        where: { address: lower },
        attributes: ["id"],
        raw: true,
    });
    if (custodial)
        return true;
    const treasury = await db_1.models.wallet.findAll({
        where: { userId: treasury_1.POOL_BACKING_TREASURY_USER_ID, type: "ECO" },
        attributes: ["address"],
    });
    for (const w of treasury) {
        const map = (_a = (0, treasury_1.parseAddressMap)(w === null || w === void 0 ? void 0 : w.address)) !== null && _a !== void 0 ? _a : {};
        for (const entry of Object.values(map)) {
            if (entry && typeof entry === "object" && String((_b = entry.address) !== null && _b !== void 0 ? _b : "").toLowerCase() === lower)
                return true;
        }
    }
    const seconds = Math.max(1, Math.round(ADDRESS_CHECK_DEADLINE_MS / 1000));
    const select = `SELECT /*+ MAX_EXECUTION_TIME(${ADDRESS_CHECK_DEADLINE_MS}) */ id
       FROM wallet
      WHERE type = 'ECO'
        AND deletedAt IS NULL
        AND LOWER(address) LIKE :pattern
      LIMIT 1`;
    const flavour = await detectDatabaseFlavour();
    const sql = flavour === "mariadb" ? `SET STATEMENT max_statement_time=${seconds} FOR ${select}` : select;
    const rows = (await db_1.sequelize.query(sql, { replacements: { pattern: `%${escapeLike(lower)}%` }, type: sequelize_1.QueryTypes.SELECT }));
    return rows.length > 0;
}
async function isPlatformControlledAddress(address, chain) {
    const lower = String(address !== null && address !== void 0 ? address : "").trim().toLowerCase();
    if (!lower)
        return false;
    try {
        return await withDeadline(platformAddressCheck(lower, chain), ADDRESS_CHECK_DEADLINE_MS, "platform-address check");
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Could not decide whether ${address} is platform-controlled; letting the deposit through on the txid check alone: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return false;
    }
}
async function findCustodyWithdrawalByTxid(txid) {
    const candidates = spellingsOf(txid);
    if (!candidates.length)
        return null;
    const wanted = candidates.length === 1 ? candidates[0] : candidates;
    const attributes = ["id", "userId", "walletId", "status", "trxId", "txHashPending"];
    const byTrxId = (await db_1.models.transaction.findAll({ where: { type: "WITHDRAW", trxId: wanted }, attributes, raw: true }));
    const byPending = (await db_1.models.transaction.findAll({ where: { type: "WITHDRAW", txHashPending: wanted }, attributes, raw: true }));
    const seen = new Set();
    for (const row of [...byTrxId, ...byPending]) {
        if (!row || seen.has(String(row.id)))
            continue;
        seen.add(String(row.id));
        if (!BROADCAST_WITHDRAWAL_STATUSES.has(String(row.status)))
            continue;
        if (!row.walletId)
            continue;
        const wallet = (await db_1.models.wallet.findOne({ where: { id: row.walletId }, attributes: ["id", "userId", "type"], raw: true }));
        if (!wallet || String(wallet.type) !== "ECO")
            continue;
        return {
            transactionId: String(row.id),
            userId: wallet.userId != null ? String(wallet.userId) : row.userId != null ? String(row.userId) : null,
            walletId: String(row.walletId),
            status: String(row.status),
        };
    }
    return null;
}
async function refuseIfSettlement(p) {
    var _a;
    const txid = String((_a = p.txid) !== null && _a !== void 0 ? _a : "").trim();
    if (txid && (await isSettlementTxid(txid))) {
        return "This transaction hash belongs to a platform settlement movement, not a customer deposit, and cannot be claimed";
    }
    const from = p.addressFrom ? String(p.addressFrom).trim() : "";
    const claimant = p.claimantUserId ? String(p.claimantUserId).trim() : "";
    if (txid && (claimant || from)) {
        const withdrawal = await findCustodyWithdrawalByTxid(txid);
        if (withdrawal) {
            if (claimant && withdrawal.userId === claimant) {
                console_1.logger.info("POOL_BACKING", `Deposit ${txid} is the claimant's own custody withdrawal (${withdrawal.transactionId}); the sender check does not apply`);
                return null;
            }
            if (claimant && withdrawal.userId && withdrawal.userId !== claimant) {
                return "This transaction hash is another customer's custody withdrawal, not your deposit, and cannot be credited to you";
            }
            if (!claimant)
                return null;
        }
    }
    if (from && (await isPlatformControlledAddress(from))) {
        return "This deposit was sent from a platform-controlled custody address (a settlement or an internal movement), not from a customer, and cannot be credited";
    }
    return null;
}
