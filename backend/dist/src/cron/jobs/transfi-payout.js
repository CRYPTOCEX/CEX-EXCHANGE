"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileTransfiPayouts = reconcileTransfiPayouts;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const utils_1 = require("@b/api/finance/utils");
const utils_2 = require("@b/api/finance/deposit/fiat/transfi/utils");
const utils_3 = require("@b/api/finance/withdraw/fiat/transfi/utils");
const dispatch_1 = require("@b/api/finance/withdraw/fiat/transfi/dispatch");
const ORPHAN_SAFETY_AGE_MS = Number(process.env.APP_TRANSFI_ORPHAN_AGE_MS || 30 * 60 * 1000);
const MAX_PER_RUN = Number(process.env.APP_TRANSFI_PAYOUT_BATCH || 100);
function parseMeta(row) {
    try {
        return JSON.parse(row.metadata || "{}");
    }
    catch (_a) {
        return {};
    }
}
async function confirmNoPayoutExists(transactionId) {
    var _a;
    try {
        const res = await (0, utils_2.transfiRequest)("/v3/orders", {
            query: { orderType: "payout", limit: 100 },
        });
        const list = ((_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a.transfers) || (res === null || res === void 0 ? void 0 : res.data) || [];
        if (!Array.isArray(list))
            return null;
        const hit = list.find((o) => (o === null || o === void 0 ? void 0 : o.partnerId) === transactionId || (o === null || o === void 0 ? void 0 : o.customerOrderId) === transactionId);
        return !hit;
    }
    catch (error) {
        console_1.logger.warn("TRANSFI", `payout existence scan failed for ${transactionId}: ${error === null || error === void 0 ? void 0 : error.message}`);
        return null;
    }
}
async function flagForReview(row, reason) {
    const meta = parseMeta(row);
    const attempts = Number(meta.reviewAttempts || 0) + 1;
    const shouldLog = attempts <= 3 || attempts % 12 === 0;
    await row.update({
        metadata: JSON.stringify({
            ...meta,
            needsReview: true,
            reviewReason: reason,
            reviewAttempts: attempts,
            lastReviewedAt: new Date().toISOString(),
        }),
    });
    if (shouldLog) {
        console_1.logger.error("TRANSFI", `PAYOUT NEEDS REVIEW (attempt ${attempts}): withdrawal ${row.id} — ${reason}`);
    }
}
async function reconcileTransfiPayouts() {
    const config = (0, utils_2.getTransfiConfig)();
    if (!config.username || !config.password || !config.mid)
        return;
    const gateway = await db_1.models.withdrawGateway.findOne({ where: { alias: "transfi" } });
    if (!gateway)
        return;
    let settled = 0;
    let failed = 0;
    let held = 0;
    let escalated = 0;
    const dispatched = await db_1.models.transaction.findAll({
        where: {
            type: "WITHDRAW",
            status: "PROCESSING",
            referenceId: { [sequelize_1.Op.like]: "OR-%" },
        },
        order: [["createdAt", "ASC"]],
        limit: MAX_PER_RUN,
    });
    for (const row of dispatched) {
        const meta = parseMeta(row);
        if (meta.gateway !== "transfi")
            continue;
        const orderId = String(row.referenceId || "");
        if (!orderId)
            continue;
        let confirmed;
        try {
            confirmed = await (0, utils_3.getPayoutOrder)(orderId);
        }
        catch (error) {
            const notFound = error instanceof utils_2.TransfiError &&
                (error.code === "TRANSFER_NOT_FOUND" ||
                    error.details.some((d) => (d === null || d === void 0 ? void 0 : d.code) === "TRANSFER_NOT_FOUND"));
            if (notFound) {
                await flagForReview(row, `provider does not recognise payout ${orderId}`);
                escalated++;
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
            await row.update({
                status: "COMPLETED",
                metadata: JSON.stringify({
                    ...meta,
                    transfiStatus: confirmed.status,
                    settledAmount: confirmed.destinationAmount,
                    reconciledAt: new Date().toISOString(),
                }),
            });
            try {
                await (0, utils_1.collectWithdrawalFeeOnSettlement)(row);
            }
            catch (error) {
                console_1.logger.error("TRANSFI", `fee booking failed for ${orderId}: ${error === null || error === void 0 ? void 0 : error.message}`);
            }
            settled++;
            continue;
        }
        if (confirmed.mapped === "FAILED") {
            const reason = confirmed.failureMessage || confirmed.failureCode || `Payout ${confirmed.status}`;
            await row.update({
                referenceId: null,
                metadata: JSON.stringify({
                    ...meta,
                    transfiOrderId: orderId,
                    transfiStatus: confirmed.status,
                    failureCode: confirmed.failureCode,
                    failureMessage: confirmed.failureMessage,
                    reconciledAt: new Date().toISOString(),
                }),
            });
            await (0, dispatch_1.refundWithdrawal)(row.id, reason);
            failed++;
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
    const orphans = await db_1.models.transaction.findAll({
        where: {
            type: "WITHDRAW",
            status: "PROCESSING",
            referenceId: null,
            createdAt: { [sequelize_1.Op.lt]: new Date(Date.now() - ORPHAN_SAFETY_AGE_MS) },
        },
        order: [["createdAt", "ASC"]],
        limit: MAX_PER_RUN,
    });
    for (const row of orphans) {
        const meta = parseMeta(row);
        if (meta.gateway !== "transfi" && meta.dispatchProvider !== "transfi")
            continue;
        const noPayout = await confirmNoPayoutExists(row.id);
        if (noPayout === true) {
            const ok = await (0, dispatch_1.refundWithdrawal)(row.id, "Dispatch was interrupted and no payout exists at the provider");
            if (ok) {
                failed++;
                console_1.logger.info("TRANSFI", `orphaned payout ${row.id} refunded after a negative scan`);
            }
            continue;
        }
        await flagForReview(row, noPayout === false
            ? "a payout carrying this withdrawal's id exists upstream but the local row was never updated"
            : "could not determine whether a payout exists");
        escalated++;
    }
    if (settled || failed || held || escalated) {
        console_1.logger.info("TRANSFI", `payout reconcile: ${settled} settled, ${failed} failed/refunded, ${held} on hold, ${escalated} escalated for review`);
    }
}
