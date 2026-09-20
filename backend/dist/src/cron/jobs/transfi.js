"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileTransfiDeposits = reconcileTransfiDeposits;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const utils_1 = require("@b/api/finance/utils");
const cache_1 = require("@b/utils/cache");
const utils_2 = require("@b/api/finance/deposit/fiat/transfi/utils");
const DEFAULT_EXPIRY_HOURS = 24;
const MIN_AGE_MS = 60 * 1000;
const MAX_PER_RUN = Number(process.env.APP_TRANSFI_RECONCILE_BATCH || 100);
function parseMeta(row) {
    try {
        return JSON.parse(row.metadata || "{}");
    }
    catch (_a) {
        return {};
    }
}
async function findCandidates(limit) {
    const rows = await db_1.models.transaction.findAll({
        where: {
            type: "DEPOSIT",
            status: "PENDING",
            referenceId: { [sequelize_1.Op.like]: "TFI-%" },
            createdAt: { [sequelize_1.Op.lt]: new Date(Date.now() - MIN_AGE_MS) },
        },
        order: [["createdAt", "ASC"]],
        limit,
    });
    const out = [];
    for (const row of rows) {
        const meta = parseMeta(row);
        if (meta.gateway !== "transfi")
            continue;
        if (!meta.transfiOrderId)
            continue;
        out.push({
            row,
            meta,
            orderId: meta.transfiOrderId,
            currency: meta.currency,
        });
    }
    return out;
}
async function expiryHours() {
    var _a;
    try {
        const cache = cache_1.CacheManager.getInstance();
        const settings = await cache.getSettings();
        const raw = (_a = settings === null || settings === void 0 ? void 0 : settings.get) === null || _a === void 0 ? void 0 : _a.call(settings, "depositExpiration");
        if (raw === undefined || raw === null || raw === "" || raw === "false") {
            return DEFAULT_EXPIRY_HOURS;
        }
        const n = parseFloat(String(raw));
        return Number.isFinite(n) && n > 0 ? n : DEFAULT_EXPIRY_HOURS;
    }
    catch (_b) {
        return DEFAULT_EXPIRY_HOURS;
    }
}
async function reconcileTransfiDeposits() {
    var _a;
    const config = (0, utils_2.getTransfiConfig)();
    if (!config.username || !config.password || !config.mid)
        return;
    const gateway = await db_1.models.depositGateway.findOne({ where: { alias: "transfi" } });
    if (!gateway)
        return;
    const candidates = await findCandidates(MAX_PER_RUN);
    if (!candidates.length)
        return;
    const expireAfterMs = (await expiryHours()) * 60 * 60 * 1000;
    let credited = 0;
    let failed = 0;
    let expired = 0;
    let held = 0;
    for (const { row, meta, orderId, currency } of candidates) {
        let confirmed;
        try {
            confirmed = await (0, utils_2.getOrder)(orderId);
        }
        catch (error) {
            const notFound = error instanceof utils_2.TransfiError &&
                (error.code === "TRANSFER_NOT_FOUND" ||
                    error.details.some((d) => (d === null || d === void 0 ? void 0 : d.code) === "TRANSFER_NOT_FOUND"));
            const age = Date.now() - new Date(row.createdAt).getTime();
            if (notFound && age > expireAfterMs) {
                await row.update({
                    status: "EXPIRED",
                    metadata: JSON.stringify({
                        ...meta,
                        expiredReason: "order not found at provider",
                        reconciledAt: new Date().toISOString(),
                    }),
                });
                expired++;
            }
            else if (!notFound) {
                console_1.logger.warn("TRANSFI", `reconcile: could not read ${orderId}: ${error === null || error === void 0 ? void 0 : error.message}`);
            }
            continue;
        }
        if (confirmed.onHold) {
            if (meta.transfiStatus !== confirmed.status) {
                await row.update({
                    metadata: JSON.stringify({
                        ...meta,
                        transfiStatus: confirmed.status,
                        complianceHold: true,
                        failureCode: confirmed.failureCode,
                        failureMessage: confirmed.failureMessage,
                        reconciledAt: new Date().toISOString(),
                    }),
                });
            }
            held++;
            continue;
        }
        if (confirmed.mapped === "COMPLETED") {
            if (!currency) {
                console_1.logger.error("TRANSFI", `reconcile: ${orderId} settled but has no currency in metadata`);
                continue;
            }
            const settled = (_a = confirmed.destinationAmount) !== null && _a !== void 0 ? _a : Number(row.amount);
            try {
                await (0, utils_1.processFiatDeposit)({
                    userId: row.userId,
                    currency,
                    amount: settled,
                    fee: Number(row.fee) || 0,
                    referenceId: `TFO-${orderId}`,
                    method: "TRANSFI",
                    description: `TransFi deposit of ${settled} ${currency}`,
                    metadata: {
                        transfiOrderId: orderId,
                        transfiStatus: confirmed.status,
                        source: "reconciler",
                    },
                    idempotencyKey: `transfi_deposit_${orderId}`,
                });
            }
            catch (error) {
                if (!(error instanceof wallet_1.DuplicateOperationError)) {
                    console_1.logger.error("TRANSFI", `reconcile: credit failed for ${orderId}: ${error === null || error === void 0 ? void 0 : error.message}`);
                    continue;
                }
            }
            await row.update({
                status: "COMPLETED",
                amount: settled,
                metadata: JSON.stringify({
                    ...meta,
                    transfiStatus: confirmed.status,
                    settledAmount: settled,
                    reconciledAt: new Date().toISOString(),
                }),
            });
            credited++;
            continue;
        }
        if (confirmed.mapped === "FAILED") {
            await row.update({
                status: "FAILED",
                metadata: JSON.stringify({
                    ...meta,
                    transfiStatus: confirmed.status,
                    failureCode: confirmed.failureCode,
                    failureMessage: confirmed.failureMessage,
                    reconciledAt: new Date().toISOString(),
                }),
            });
            failed++;
            continue;
        }
        const age = Date.now() - new Date(row.createdAt).getTime();
        if (age > expireAfterMs && confirmed.status === "initiated") {
            await row.update({
                status: "EXPIRED",
                metadata: JSON.stringify({
                    ...meta,
                    transfiStatus: confirmed.status,
                    expiredReason: "checkout abandoned",
                    reconciledAt: new Date().toISOString(),
                }),
            });
            expired++;
            continue;
        }
        if (meta.transfiStatus !== confirmed.status) {
            await row.update({
                metadata: JSON.stringify({
                    ...meta,
                    transfiStatus: confirmed.status,
                    reconciledAt: new Date().toISOString(),
                }),
            });
        }
    }
    if (credited || failed || expired || held) {
        console_1.logger.info("TRANSFI", `reconciled ${candidates.length} deposit(s): ${credited} credited, ${failed} failed, ${expired} expired, ${held} on compliance hold`);
    }
}
