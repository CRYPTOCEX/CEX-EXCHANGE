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
exports.LEDGER_ARCHIVE_DEFAULTS = exports.TERMINAL_TRANSACTION_STATUSES = exports.LEDGER_ARCHIVE_CRON = void 0;
exports.readLedgerArchiveConfig = readLedgerArchiveConfig;
exports.cutoffFor = cutoffFor;
exports.columnsOf = columnsOf;
exports.copyStatement = copyStatement;
exports.referrerStatement = referrerStatement;
exports.orphanAuditStatement = orphanAuditStatement;
exports.discoverTransactionReferrers = discoverTransactionReferrers;
exports.assertSameColumns = assertSameColumns;
exports.runLedgerArchive = runLedgerArchive;
exports.describeReport = describeReport;
exports.ledgerArchive = ledgerArchive;
const sequelize_1 = require("sequelize");
exports.LEDGER_ARCHIVE_CRON = "ledgerArchive";
exports.TERMINAL_TRANSACTION_STATUSES = Object.freeze([
    "COMPLETED",
    "CANCELLED",
    "FAILED",
]);
exports.LEDGER_ARCHIVE_DEFAULTS = Object.freeze({
    afterDays: 400,
    batch: 1000,
    maxPerRun: 100000,
});
const TRUTHY = new Set(["1", "true", "on", "yes"]);
function parseBool(raw) {
    if (raw === undefined)
        return false;
    return TRUTHY.has(raw.trim().toLowerCase());
}
function parseBoundedIntEnv(raw, fallback, min) {
    if (raw === undefined || raw.trim() === "")
        return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min)
        return fallback;
    return Math.floor(n);
}
function readLedgerArchiveConfig(env = process.env) {
    const maxRaw = parseBoundedIntEnv(env.ECO_LEDGER_ARCHIVE_MAX_PER_RUN, exports.LEDGER_ARCHIVE_DEFAULTS.maxPerRun, 0);
    return {
        enabled: parseBool(env.ECO_LEDGER_ARCHIVE_ENABLED),
        afterDays: parseBoundedIntEnv(env.ECO_LEDGER_ARCHIVE_AFTER_DAYS, exports.LEDGER_ARCHIVE_DEFAULTS.afterDays, 1),
        batch: parseBoundedIntEnv(env.ECO_LEDGER_ARCHIVE_BATCH, exports.LEDGER_ARCHIVE_DEFAULTS.batch, 1),
        maxPerRun: maxRaw === 0 ? Number.POSITIVE_INFINITY : maxRaw,
    };
}
function cutoffFor(afterDays, now = new Date()) {
    return new Date(now.getTime() - afterDays * 24 * 60 * 60 * 1000);
}
function tableNameOf(model) {
    const name = model.getTableName();
    return typeof name === "string" ? name : name.tableName;
}
function columnsOf(model) {
    return Object.entries(model.rawAttributes).map(([name, attr]) => { var _a; return (_a = attr.field) !== null && _a !== void 0 ? _a : name; });
}
const quote = (identifier) => `\`${identifier.replace(/`/g, "``")}\``;
function copyStatement(archiveTable, liveTable, columns) {
    const insertList = columns.map(quote).join(", ");
    const selectList = columns.map((c) => `src.${quote(c)}`).join(", ");
    const targetId = `${quote(archiveTable)}.${quote("id")}`;
    return (`INSERT INTO ${quote(archiveTable)} (${insertList}) ` +
        `SELECT ${selectList} FROM ${quote(liveTable)} AS src WHERE src.${quote("id")} IN (:ids) ` +
        `ON DUPLICATE KEY UPDATE ${targetId} = ${targetId}`);
}
function referrerStatement(referrer) {
    return (`SELECT DISTINCT ${quote(referrer.column)} AS id FROM ${quote(referrer.table)} ` +
        `WHERE ${quote(referrer.column)} IN (:ids)`);
}
function orphanAuditStatement(auditTable, liveTxTable, archiveTxTable) {
    return (`SELECT a.${quote("id")} AS id, a.${quote("createdAt")} AS createdAt FROM ${quote(auditTable)} a ` +
        `LEFT JOIN ${quote(liveTxTable)} t ON t.${quote("id")} = a.${quote("transactionId")} ` +
        `LEFT JOIN ${quote(archiveTxTable)} x ON x.${quote("id")} = a.${quote("transactionId")} ` +
        `WHERE a.${quote("transactionId")} IS NOT NULL AND a.${quote("createdAt")} < :cutoff ` +
        `AND t.${quote("id")} IS NULL AND x.${quote("id")} IS NULL ` +
        `ORDER BY a.${quote("createdAt")} ASC, a.${quote("id")} ASC LIMIT :limit`);
}
async function discoverTransactionReferrers(db, liveTable = "transaction") {
    const rows = await db.sequelize.query(`SELECT TABLE_NAME AS \`table\`, COLUMN_NAME AS \`column\` ` +
        `FROM information_schema.KEY_COLUMN_USAGE ` +
        `WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_SCHEMA = DATABASE() ` +
        `AND REFERENCED_TABLE_NAME = :liveTable AND REFERENCED_COLUMN_NAME = 'id' ` +
        `ORDER BY TABLE_NAME, COLUMN_NAME`, { replacements: { liveTable }, type: sequelize_1.QueryTypes.SELECT });
    return rows.map((r) => ({ table: String(r.table), column: String(r.column) }));
}
function assertSameColumns(live, archive) {
    const liveColumns = new Set(columnsOf(live));
    const archiveColumns = columnsOf(archive);
    const missingInArchive = [...liveColumns].filter((c) => !archiveColumns.includes(c));
    const missingInLive = archiveColumns.filter((c) => !liveColumns.has(c));
    if (missingInArchive.length || missingInLive.length) {
        throw new Error(`ledger archive: ${tableNameOf(live)} and ${tableNameOf(archive)} differ in columns ` +
            `(missing in archive: ${missingInArchive.join(", ") || "none"}; ` +
            `missing in live: ${missingInLive.join(", ") || "none"}); nothing archived`);
    }
    return archiveColumns;
}
function keysetWhere(cutoff, cursor) {
    const where = { createdAt: { [sequelize_1.Op.lt]: cutoff } };
    if (cursor) {
        where[sequelize_1.Op.or] = [
            { createdAt: { [sequelize_1.Op.gt]: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { [sequelize_1.Op.gt]: cursor.id } },
        ];
    }
    return where;
}
const ORDER = [
    ["createdAt", "ASC"],
    ["id", "ASC"],
];
function mover(live, archive) {
    return {
        live,
        archive,
        copySql: copyStatement(tableNameOf(archive), tableNameOf(live), assertSameColumns(live, archive)),
    };
}
async function copyAndConfirm(db, m, ids, t) {
    if (ids.length === 0)
        return [];
    await db.sequelize.query(m.copySql, {
        replacements: { ids },
        type: sequelize_1.QueryTypes.INSERT,
        transaction: t,
    });
    const held = await m.archive.findAll({
        attributes: ["id"],
        where: { id: { [sequelize_1.Op.in]: ids } },
        raw: true,
        transaction: t,
    });
    return held.map((r) => String(r.id));
}
async function deleteHeld(m, heldIds, t) {
    if (heldIds.length === 0)
        return 0;
    const removed = await m.live.destroy({
        where: { id: { [sequelize_1.Op.in]: heldIds } },
        force: true,
        transaction: t,
    });
    if (removed !== heldIds.length) {
        throw new Error(`ledger archive: ${tableNameOf(m.live)} batch deleted ${removed} of ${heldIds.length} rows the archive holds; ` +
            `another writer touched the batch, rolled back`);
    }
    return removed;
}
const yieldToLoop = () => new Promise((resolve) => setImmediate(resolve));
async function transactionPass(db, tx, audit, referrers, softDeleted, budget, options) {
    var _a;
    const result = { selected: 0, archived: 0, skipped: 0, batches: 0, exhausted: false, auditMoved: 0 };
    let cursor = null;
    while (result.archived < budget) {
        const limit = Math.min(options.batch, budget - result.archived);
        const candidates = await tx.live.findAll({
            attributes: ["id", "createdAt"],
            where: {
                ...keysetWhere(options.cutoff, cursor),
                deletedAt: softDeleted ? { [sequelize_1.Op.ne]: null } : null,
                status: { [sequelize_1.Op.in]: [...exports.TERMINAL_TRANSACTION_STATUSES] },
            },
            order: ORDER,
            limit,
            paranoid: false,
            raw: true,
        });
        if (candidates.length === 0) {
            result.exhausted = true;
            break;
        }
        result.selected += candidates.length;
        const last = candidates[candidates.length - 1];
        cursor = { createdAt: last.createdAt, id: String(last.id) };
        const ids = candidates.map((r) => String(r.id));
        const referenced = new Set();
        for (const referrer of referrers) {
            const rows = await db.sequelize.query(referrerStatement(referrer), {
                replacements: { ids },
                type: sequelize_1.QueryTypes.SELECT,
            });
            for (const r of rows)
                referenced.add(String(r.id));
        }
        const eligible = ids.filter((id) => !referenced.has(id));
        result.skipped += ids.length - eligible.length;
        if (eligible.length > 0) {
            if (options.dryRun) {
                result.archived += eligible.length;
                const auditRows = await audit.live.findAll({
                    attributes: ["id"],
                    where: { transactionId: { [sequelize_1.Op.in]: eligible } },
                    raw: true,
                });
                result.auditMoved += auditRows.length;
            }
            else {
                const moved = await db.sequelize.transaction(async (t) => {
                    const heldTx = await copyAndConfirm(db, tx, eligible, t);
                    if (heldTx.length === 0)
                        return { tx: 0, audit: 0 };
                    const auditRows = await audit.live.findAll({
                        attributes: ["id"],
                        where: { transactionId: { [sequelize_1.Op.in]: heldTx } },
                        raw: true,
                        transaction: t,
                    });
                    const heldAudit = await copyAndConfirm(db, audit, auditRows.map((r) => String(r.id)), t);
                    const auditRemoved = await deleteHeld(audit, heldAudit, t);
                    const txRemoved = await deleteHeld(tx, heldTx, t);
                    return { tx: txRemoved, audit: auditRemoved };
                });
                result.archived += moved.tx;
                result.auditMoved += moved.audit;
            }
            result.batches += 1;
            (_a = options.onBatch) === null || _a === void 0 ? void 0 : _a.call(options, {
                table: tableNameOf(tx.live),
                archived: result.archived,
                skipped: result.skipped,
                batches: result.batches,
            });
        }
        if (candidates.length < limit) {
            result.exhausted = true;
            break;
        }
        await yieldToLoop();
    }
    return result;
}
async function auditNullPass(db, audit, budget, options) {
    var _a;
    const result = { selected: 0, archived: 0, batches: 0, exhausted: false };
    let cursor = null;
    while (result.archived < budget) {
        const limit = Math.min(options.batch, budget - result.archived);
        const candidates = await audit.live.findAll({
            attributes: ["id", "createdAt"],
            where: { ...keysetWhere(options.cutoff, cursor), transactionId: null },
            order: ORDER,
            limit,
            raw: true,
        });
        if (candidates.length === 0) {
            result.exhausted = true;
            break;
        }
        result.selected += candidates.length;
        const last = candidates[candidates.length - 1];
        cursor = { createdAt: last.createdAt, id: String(last.id) };
        const ids = candidates.map((r) => String(r.id));
        if (options.dryRun) {
            result.archived += ids.length;
        }
        else {
            result.archived += await db.sequelize.transaction(async (t) => deleteHeld(audit, await copyAndConfirm(db, audit, ids, t), t));
        }
        result.batches += 1;
        (_a = options.onBatch) === null || _a === void 0 ? void 0 : _a.call(options, { table: tableNameOf(audit.live), archived: result.archived, skipped: 0, batches: result.batches });
        if (candidates.length < limit) {
            result.exhausted = true;
            break;
        }
        await yieldToLoop();
    }
    return result;
}
async function auditOrphanPass(db, audit, txLiveTable, txArchiveTable, budget, options) {
    var _a;
    const result = { selected: 0, archived: 0, batches: 0, exhausted: false };
    if (!(budget > 0))
        return result;
    const limit = Math.min(options.batch, budget);
    const candidates = await db.sequelize.query(orphanAuditStatement(tableNameOf(audit.live), txLiveTable, txArchiveTable), { replacements: { cutoff: options.cutoff, limit }, type: sequelize_1.QueryTypes.SELECT });
    result.selected = candidates.length;
    result.exhausted = candidates.length < limit;
    if (candidates.length === 0)
        return result;
    const ids = candidates.map((r) => String(r.id));
    if (options.dryRun) {
        result.archived = ids.length;
    }
    else {
        result.archived = await db.sequelize.transaction(async (t) => deleteHeld(audit, await copyAndConfirm(db, audit, ids, t), t));
    }
    result.batches = 1;
    (_a = options.onBatch) === null || _a === void 0 ? void 0 : _a.call(options, { table: tableNameOf(audit.live), archived: result.archived, skipped: 0, batches: 1 });
    return result;
}
async function runLedgerArchive(db, options) {
    var _a;
    const started = Date.now();
    if (!(options.cutoff instanceof Date) || Number.isNaN(options.cutoff.getTime())) {
        throw new Error("ledger archive: cutoff must be a valid Date");
    }
    if (!Number.isInteger(options.batch) || options.batch < 1) {
        throw new Error(`ledger archive: batch must be a positive integer, got ${options.batch}`);
    }
    if (!(options.maxPerRun > 0)) {
        throw new Error(`ledger archive: maxPerRun must be positive or Infinity, got ${options.maxPerRun}`);
    }
    const tx = mover(db.models.transaction, db.models.transactionArchive);
    const audit = mover(db.models.walletAuditLog, db.models.walletAuditLogArchive);
    const referrers = typeof options.referrers === "function"
        ? await options.referrers()
        : (_a = options.referrers) !== null && _a !== void 0 ? _a : (await discoverTransactionReferrers(db, tableNameOf(tx.live)));
    const live = await transactionPass(db, tx, audit, referrers, false, options.maxPerRun, options);
    const soft = await transactionPass(db, tx, audit, referrers, true, options.maxPerRun - live.archived, options);
    const transaction = {
        liveTable: tableNameOf(tx.live),
        archiveTable: tableNameOf(tx.archive),
        selected: live.selected + soft.selected,
        archived: live.archived + soft.archived,
        skipped: live.skipped + soft.skipped,
        batches: live.batches + soft.batches,
        exhausted: live.exhausted && soft.exhausted,
    };
    const nulls = await auditNullPass(db, audit, options.maxPerRun, options);
    const orphans = await auditOrphanPass(db, audit, tableNameOf(tx.live), tableNameOf(tx.archive), options.maxPerRun - nulls.archived, options);
    const walletAuditLog = {
        liveTable: tableNameOf(audit.live),
        archiveTable: tableNameOf(audit.archive),
        selected: nulls.selected + orphans.selected,
        archived: live.auditMoved + soft.auditMoved + nulls.archived + orphans.archived,
        skipped: 0,
        batches: nulls.batches + orphans.batches,
        exhausted: nulls.exhausted && orphans.exhausted,
        withTransaction: live.auditMoved + soft.auditMoved,
        withoutTransaction: nulls.archived,
        orphaned: orphans.archived,
    };
    return {
        cutoff: options.cutoff,
        dryRun: options.dryRun === true,
        batch: options.batch,
        maxPerRun: options.maxPerRun,
        referrers,
        transaction,
        walletAuditLog,
        durationMs: Date.now() - started,
    };
}
function describeReport(report) {
    const t = report.transaction;
    const a = report.walletAuditLog;
    return (`${report.dryRun ? "DRY RUN " : ""}cutoff ${report.cutoff.toISOString()}; ` +
        `${t.liveTable}: ${t.archived} archived, ${t.skipped} skipped of ${t.selected} selected in ${t.batches} batch(es)` +
        `${t.exhausted ? "" : " (stopped by maxPerRun)"}; ` +
        `${a.liveTable}: ${a.archived} archived (${a.withTransaction} with their transaction, ${a.withoutTransaction} without one, ` +
        `${a.orphaned} orphaned)${a.exhausted ? "" : " (orphan or null pass not exhausted)"}; ` +
        `referrers ${report.referrers.map((r) => `${r.table}.${r.column}`).join(", ") || "none"}; ${report.durationMs} ms`);
}
async function ledgerArchive() {
    const cronName = exports.LEDGER_ARCHIVE_CRON;
    const startTime = Date.now();
    const { logger } = await Promise.resolve().then(() => __importStar(require("@b/utils/console")));
    const { broadcastLog, broadcastStatus } = await Promise.resolve().then(() => __importStar(require("./broadcast")));
    try {
        broadcastStatus(cronName, "running");
        const config = readLedgerArchiveConfig();
        if (!config.enabled) {
            broadcastLog(cronName, "ECO_LEDGER_ARCHIVE_ENABLED is off; nothing archived");
            broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
            return;
        }
        const cutoff = cutoffFor(config.afterDays);
        broadcastLog(cronName, `Archiving ledger rows older than ${config.afterDays} days (before ${cutoff.toISOString()}), ` +
            `batch ${config.batch}, at most ${Number.isFinite(config.maxPerRun) ? config.maxPerRun : "unbounded"} rows per table`);
        const { models, sequelize } = await Promise.resolve().then(() => __importStar(require("@b/db")));
        const report = await runLedgerArchive({ models: models, sequelize: sequelize }, {
            cutoff,
            batch: config.batch,
            maxPerRun: config.maxPerRun,
            onBatch: (p) => broadcastLog(cronName, `${p.table}: ${p.archived} archived, ${p.skipped} skipped after ${p.batches} batch(es)`),
        });
        const summary = describeReport(report);
        logger.info("CRON", `Ledger archive: ${summary}`);
        broadcastLog(cronName, `Ledger archive complete: ${summary}`, "success");
        broadcastStatus(cronName, "completed", { duration: Date.now() - startTime });
    }
    catch (error) {
        logger.error("CRON", "Ledger archive failed", error);
        broadcastStatus(cronName, "failed");
        broadcastLog(cronName, `Ledger archive failed: ${error.message}`, "error");
        throw error;
    }
}
