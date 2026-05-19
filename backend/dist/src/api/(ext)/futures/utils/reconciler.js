"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileFuturesPositions = reconcileFuturesPositions;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
let scyllaClient;
let scyllaFuturesKeyspace;
try {
    const clientModule = require("@b/api/(ext)/ecosystem/utils/scylla/client");
    scyllaClient = clientModule.default;
    scyllaFuturesKeyspace = clientModule.scyllaFuturesKeyspace;
}
catch (e) {
}
const FUTURES_CLOSE_PREFIX = "futures_close_";
const FUTURES_LIQUIDATION_PREFIX = "futures_liquidation_";
const DEFAULT_WINDOW_HOURS = Number(process.env.FUTURES_RECONCILER_WINDOW_HOURS || 24);
const isScyllaValidationError = (err) => {
    var _a;
    if (!err)
        return false;
    const code = typeof err.code === "number" ? err.code : undefined;
    if (code !== undefined) {
        if (code >= 0x2000 && code <= 0x2500)
            return true;
    }
    const name = err.name || ((_a = err.constructor) === null || _a === void 0 ? void 0 : _a.name) || "";
    if (/SyntaxError|InvalidQueryException|ResponseError/i.test(name) &&
        code === undefined) {
        return true;
    }
    return false;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const executeScyllaWithRetry = async (run, maxAttempts = 3) => {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await run();
            return;
        }
        catch (err) {
            lastErr = err;
            if (isScyllaValidationError(err))
                throw err;
            if (attempt < maxAttempts) {
                await sleep(100 * Math.pow(2, attempt - 1));
            }
        }
    }
    throw lastErr;
};
function parseFuturesKey(raw) {
    if (!raw || typeof raw !== "string")
        return null;
    const key = raw.replace(/_(release|credit)$/, "");
    if (key.startsWith(FUTURES_CLOSE_PREFIX)) {
        const positionId = key.slice(FUTURES_CLOSE_PREFIX.length);
        if (!positionId)
            return null;
        return { type: "CLOSED", positionId };
    }
    if (key.startsWith(FUTURES_LIQUIDATION_PREFIX)) {
        const positionId = key.slice(FUTURES_LIQUIDATION_PREFIX.length);
        if (!positionId)
            return null;
        return { type: "LIQUIDATED", positionId };
    }
    return null;
}
function readMetadata(raw) {
    if (!raw)
        return null;
    if (typeof raw === "object")
        return raw;
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw);
        }
        catch (_a) {
            return null;
        }
    }
    return null;
}
async function reconcileFuturesPositions(windowHours = DEFAULT_WINDOW_HOURS) {
    var _a, _b, _c;
    const summary = {
        scanned: 0,
        reconciled: 0,
        alreadyClosed: 0,
        missing: 0,
        failed: 0,
        skipped: 0,
    };
    if (!scyllaClient || !scyllaFuturesKeyspace) {
        return summary;
    }
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    let rows;
    try {
        rows = await db_1.models.transaction.findAll({
            where: {
                status: "COMPLETED",
                createdAt: { [sequelize_1.Op.gte]: since },
                [sequelize_1.Op.or]: [
                    {
                        metadata: {
                            [sequelize_1.Op.like]: `%"idempotencyKey":"${FUTURES_CLOSE_PREFIX}%`,
                        },
                    },
                    {
                        metadata: {
                            [sequelize_1.Op.like]: `%"idempotencyKey":"${FUTURES_LIQUIDATION_PREFIX}%`,
                        },
                    },
                ],
            },
            attributes: ["id", "userId", "metadata", "createdAt"],
            order: [["createdAt", "ASC"]],
        });
    }
    catch (err) {
        console_1.logger.error("FUTURES_RECON", `Failed to query transactions for reconciliation: ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err}`, err);
        return summary;
    }
    const byPosition = new Map();
    for (const row of rows) {
        summary.scanned++;
        const meta = readMetadata(row.metadata);
        if (!meta) {
            summary.skipped++;
            continue;
        }
        if (meta.reconciledAt) {
            summary.skipped++;
            continue;
        }
        const parsed = parseFuturesKey(meta.idempotencyKey);
        if (!parsed) {
            summary.skipped++;
            continue;
        }
        const existing = byPosition.get(parsed.positionId);
        if (!existing) {
            byPosition.set(parsed.positionId, {
                parsed,
                txIds: [row.id],
                userId: row.userId,
            });
        }
        else {
            existing.txIds.push(row.id);
            if (parsed.type === "LIQUIDATED" &&
                existing.parsed.type !== "LIQUIDATED") {
                existing.parsed = parsed;
            }
        }
    }
    for (const [positionId, entry] of byPosition) {
        const { parsed, txIds, userId } = entry;
        let currentStatus = null;
        try {
            const result = await scyllaClient.execute(`SELECT status FROM ${scyllaFuturesKeyspace}.position WHERE "userId" = ? AND id = ?`, [userId, positionId], { prepare: true });
            if (result.rows.length === 0) {
                summary.missing++;
                console_1.logger.warn("FUTURES_RECON", `Position not found in Scylla; marking transactions as reconciled. positionId=${positionId} userId=${userId} txIds=${txIds.join(",")}`);
                await markReconciled(txIds, {
                    outcome: "missing",
                    desiredStatus: parsed.type,
                });
                continue;
            }
            currentStatus = result.rows[0].status;
        }
        catch (err) {
            summary.failed++;
            console_1.logger.error("FUTURES_RECON", `Failed to look up Scylla position status. positionId=${positionId} userId=${userId} txIds=${txIds.join(",")} err=${(_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : err}`, err);
            continue;
        }
        const terminalStatuses = new Set([
            "CLOSED",
            "LIQUIDATED",
            "PARTIALLY_LIQUIDATED",
        ]);
        if (currentStatus && terminalStatuses.has(currentStatus)) {
            summary.alreadyClosed++;
            await markReconciled(txIds, {
                outcome: "already_terminal",
                currentStatus,
                desiredStatus: parsed.type,
            });
            continue;
        }
        try {
            await executeScyllaWithRetry(async () => {
                await scyllaClient.execute(`UPDATE ${scyllaFuturesKeyspace}.position SET status = ?, "updatedAt" = ? WHERE "userId" = ? AND id = ?`, [parsed.type, new Date(), userId, positionId], { prepare: true });
            });
            summary.reconciled++;
            console_1.logger.info("FUTURES_RECON", `Replayed Scylla status update. positionId=${positionId} userId=${userId} newStatus=${parsed.type} txIds=${txIds.join(",")}`);
            await markReconciled(txIds, {
                outcome: "replayed",
                desiredStatus: parsed.type,
                previousStatus: currentStatus,
            });
        }
        catch (err) {
            summary.failed++;
            console_1.logger.error("FUTURES_RECON", `Failed to replay Scylla status update. positionId=${positionId} userId=${userId} desired=${parsed.type} txIds=${txIds.join(",")} err=${(_c = err === null || err === void 0 ? void 0 : err.message) !== null && _c !== void 0 ? _c : err}`, err);
        }
    }
    if (summary.scanned > 0) {
        console_1.logger.info("FUTURES_RECON", `reconcileFuturesPositions summary: ${JSON.stringify(summary)}`);
    }
    return summary;
}
async function markReconciled(txIds, info) {
    var _a;
    if (!txIds.length)
        return;
    const now = new Date().toISOString();
    for (const txId of txIds) {
        try {
            const row = await db_1.models.transaction.findByPk(txId, {
                attributes: ["id", "metadata"],
            });
            if (!row)
                continue;
            const current = readMetadata(row.metadata) || {};
            const next = {
                ...current,
                reconciledAt: now,
                reconciledInfo: info,
            };
            await db_1.models.transaction.update({ metadata: JSON.stringify(next) }, { where: { id: txId } });
        }
        catch (err) {
            console_1.logger.warn("FUTURES_RECON", `Failed to mark transaction ${txId} as reconciled: ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err}`);
        }
    }
}
