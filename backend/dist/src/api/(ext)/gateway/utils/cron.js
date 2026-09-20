"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processGatewayPayouts = processGatewayPayouts;
exports.processGatewayWebhookRetries = processGatewayWebhookRetries;
exports.processGatewayPaymentExpiry = processGatewayPaymentExpiry;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const broadcast_1 = require("@b/cron/broadcast");
const console_1 = require("@b/utils/console");
const gateway_1 = require("@b/utils/gateway");
const notifications_1 = require("@b/utils/notifications");
const cache_1 = require("@b/utils/cache");
const transaction_1 = require("@b/utils/transaction");
const MAX_CONCURRENCY = 3;
function getPayoutPeriod(schedule) {
    const now = new Date();
    const end = now;
    switch (schedule) {
        case "INSTANT":
            return { start: (0, date_fns_1.subDays)(now, 1), end };
        case "DAILY":
            return { start: (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(now, 1)), end: (0, date_fns_1.startOfDay)(now) };
        case "WEEKLY":
            return { start: (0, date_fns_1.startOfWeek)((0, date_fns_1.subWeeks)(now, 1)), end: (0, date_fns_1.startOfWeek)(now) };
        case "MONTHLY":
            return { start: (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(now, 1)), end: (0, date_fns_1.startOfMonth)(now) };
        default:
            return { start: (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(now, 1)), end: (0, date_fns_1.startOfDay)(now) };
    }
}
async function isScheduledPayoutDue(schedule, merchantId, balance) {
    const now = new Date();
    let currentPeriodStart;
    switch (schedule) {
        case "WEEKLY":
            currentPeriodStart = (0, date_fns_1.startOfWeek)(now);
            break;
        case "MONTHLY":
            currentPeriodStart = (0, date_fns_1.startOfMonth)(now);
            break;
        default:
            return true;
    }
    const existing = await db_1.models.gatewayPayout.findOne({
        where: {
            merchantId,
            currency: balance.currency,
            walletType: balance.walletType,
            periodEnd: { [sequelize_1.Op.gte]: currentPeriodStart },
            status: { [sequelize_1.Op.in]: ["PENDING", "PROCESSING", "COMPLETED"] },
        },
    });
    return !existing;
}
async function processMerchantBalancePayout(merchant, balance, period, cronName) {
    var _a, _b;
    const t = await db_1.sequelize.transaction({
        isolationLevel: sequelize_1.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    });
    try {
        const lockedBalance = await db_1.models.gatewayMerchantBalance.findByPk(balance.id, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!lockedBalance) {
            await t.rollback();
            return false;
        }
        const pendingAmount = parseFloat(((_a = lockedBalance.pending) === null || _a === void 0 ? void 0 : _a.toString()) || "0");
        const existingForPeriod = await db_1.models.gatewayPayout.findOne({
            where: {
                merchantId: merchant.id,
                currency: balance.currency,
                walletType: balance.walletType,
                periodStart: period.start,
                periodEnd: period.end,
                status: {
                    [sequelize_1.Op.in]: ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED", "FAILED"],
                },
            },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (existingForPeriod) {
            await t.rollback();
            (0, broadcast_1.broadcastLog)(cronName, `Merchant ${merchant.name} ${balance.currency}: payout already exists for this period ` +
                `(${existingForPeriod.status})`, "info");
            return true;
        }
        if (merchant.payoutSchedule === "INSTANT") {
            const recentlyRejected = await db_1.models.gatewayPayout.findOne({
                where: {
                    merchantId: merchant.id,
                    currency: balance.currency,
                    walletType: balance.walletType,
                    status: { [sequelize_1.Op.in]: ["CANCELLED", "FAILED"] },
                    createdAt: { [sequelize_1.Op.gte]: (0, date_fns_1.subDays)(new Date(), 1) },
                },
                order: [["createdAt", "DESC"]],
                transaction: t,
            });
            if (recentlyRejected) {
                await t.rollback();
                (0, broadcast_1.broadcastLog)(cronName, `Merchant ${merchant.name} ${balance.currency}: an INSTANT payout was rejected in the ` +
                    `last 24h; not recreating it`, "info");
                return true;
            }
        }
        const claimingPayouts = await db_1.models.gatewayPayout.findAll({
            where: {
                merchantId: merchant.id,
                currency: balance.currency,
                walletType: balance.walletType,
                status: { [sequelize_1.Op.in]: ["PENDING", "PROCESSING"] },
            },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        const alreadyClaimed = claimingPayouts.reduce((sum, p) => { var _a; return sum + parseFloat(((_a = p.amount) === null || _a === void 0 ? void 0 : _a.toString()) || "0"); }, 0);
        const payoutAmount = Math.round((pendingAmount - alreadyClaimed) * 1e8) / 1e8;
        if (payoutAmount <= 0) {
            await t.rollback();
            (0, broadcast_1.broadcastLog)(cronName, `Merchant ${merchant.name}: pending ${pendingAmount} ${balance.currency} already fully claimed by ${claimingPayouts.length} open payout(s)`, "info");
            return true;
        }
        if (payoutAmount < (merchant.payoutThreshold || 0)) {
            await t.rollback();
            (0, broadcast_1.broadcastLog)(cronName, `Merchant ${merchant.name}: payable ${payoutAmount} ${balance.currency} below threshold ${merchant.payoutThreshold || 0}`, "info");
            return true;
        }
        const previousPayout = await db_1.models.gatewayPayout.findOne({
            where: {
                merchantId: merchant.id,
                currency: balance.currency,
                walletType: balance.walletType,
                status: { [sequelize_1.Op.in]: ["PENDING", "PROCESSING", "COMPLETED"] },
            },
            order: [["periodEnd", "DESC"]],
            transaction: t,
        });
        const previousPeriodEnd = (previousPayout === null || previousPayout === void 0 ? void 0 : previousPayout.periodEnd)
            ? new Date(previousPayout.periodEnd)
            : null;
        const statsStart = previousPeriodEnd && previousPeriodEnd > period.start
            ? previousPeriodEnd
            : period.start;
        const payments = await db_1.models.gatewayPayment.findAll({
            where: {
                merchantId: merchant.id,
                status: "COMPLETED",
                testMode: false,
                completedAt: {
                    [sequelize_1.Op.gte]: statsStart,
                    [sequelize_1.Op.lt]: period.end,
                },
            },
            transaction: t,
        });
        let paymentCount = 0;
        let grossAmount = 0;
        let totalFees = 0;
        for (const payment of payments) {
            const allocations = payment.allocations || [];
            const matchingAllocations = allocations.filter((alloc) => alloc.currency === balance.currency && alloc.walletType === balance.walletType);
            if (matchingAllocations.length > 0) {
                paymentCount++;
                for (const alloc of matchingAllocations) {
                    grossAmount += parseFloat(((_b = alloc.amount) === null || _b === void 0 ? void 0 : _b.toString()) || "0");
                }
                const totalPaymentAmount = allocations.reduce((sum, a) => { var _a; return sum + parseFloat(((_a = a.amount) === null || _a === void 0 ? void 0 : _a.toString()) || "0"); }, 0);
                const matchingAmount = matchingAllocations.reduce((sum, a) => { var _a; return sum + parseFloat(((_a = a.amount) === null || _a === void 0 ? void 0 : _a.toString()) || "0"); }, 0);
                if (totalPaymentAmount > 0) {
                    const feeShare = (matchingAmount / totalPaymentAmount) * payment.feeAmount;
                    totalFees += feeShare;
                }
            }
        }
        const refundStats = await db_1.models.gatewayRefund.findAll({
            where: {
                merchantId: merchant.id,
                status: "COMPLETED",
                createdAt: {
                    [sequelize_1.Op.gte]: statsStart,
                    [sequelize_1.Op.lt]: period.end,
                },
            },
            attributes: [[(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "refundCount"]],
            raw: true,
            transaction: t,
        });
        const refunds = refundStats[0];
        const payoutId = (0, gateway_1.generatePayoutId)();
        const payout = await db_1.models.gatewayPayout.create({
            merchantId: merchant.id,
            payoutId,
            amount: payoutAmount,
            currency: balance.currency,
            walletType: balance.walletType,
            status: "PENDING",
            periodStart: period.start,
            periodEnd: period.end,
            grossAmount: grossAmount,
            feeAmount: totalFees,
            netAmount: payoutAmount,
            paymentCount: paymentCount,
            refundCount: parseInt(refunds === null || refunds === void 0 ? void 0 : refunds.refundCount) || 0,
            metadata: {
                schedule: merchant.payoutSchedule,
                createdBy: "SYSTEM_CRON",
                balanceId: balance.id,
                pendingAtCreation: pendingAmount,
                claimedByOpenPayouts: alreadyClaimed,
            },
        }, { transaction: t });
        await t.commit();
        (0, broadcast_1.broadcastLog)(cronName, `Created payout ${payoutId} for merchant ${merchant.name}: ${payoutAmount} ${balance.currency}`, "success");
        try {
            await (0, notifications_1.createNotification)({
                userId: merchant.userId,
                relatedId: payout.id,
                type: "system",
                title: "Payout Created",
                message: `A payout of ${payoutAmount.toFixed(2)} ${balance.currency} has been created and is pending approval.`,
                link: `/gateway/payouts`,
            });
        }
        catch (notifErr) {
            console_1.logger.error("GATEWAY_PAYOUT", `Failed to send notification for merchant ${merchant.id}`, notifErr);
        }
        return true;
    }
    catch (error) {
        await (0, transaction_1.rollbackIfActive)(t);
        (0, broadcast_1.broadcastLog)(cronName, `Failed to create payout for merchant ${merchant.name}: ${error.message}`, "error");
        console_1.logger.error("GATEWAY_PAYOUT", `Failed to create payout for merchant ${merchant.id}: ${error.message}`, error);
        return false;
    }
}
async function processWithConcurrency(items, concurrencyLimit, asyncFn) {
    const results = new Array(items.length);
    let index = 0;
    const workers = new Array(concurrencyLimit).fill(0).map(async () => {
        while (index < items.length) {
            const currentIndex = index++;
            try {
                results[currentIndex] = await asyncFn(items[currentIndex]);
            }
            catch (error) {
                results[currentIndex] = error;
            }
        }
    });
    await Promise.all(workers);
    return results;
}
async function processGatewayPayouts() {
    const cronName = "processGatewayPayouts";
    const startTime = Date.now();
    let processedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting gateway payout processing");
        const settings = await db_1.models.settings.findAll({
            where: {
                key: ["gatewayPayoutSchedule", "gatewayMinPayoutAmount"],
            },
        });
        const settingsMap = new Map();
        for (const setting of settings) {
            let value = setting.value;
            try {
                value = JSON.parse(setting.value || "null");
            }
            catch (_a) {
            }
            if (value === "true")
                value = true;
            if (value === "false")
                value = false;
            settingsMap.set(setting.key, value);
        }
        const cacheManager = cache_1.CacheManager.getInstance();
        const gatewayEnabled = await cacheManager.getSettingBool("gatewayEnabled", true);
        if (!gatewayEnabled) {
            (0, broadcast_1.broadcastLog)(cronName, "Gateway is disabled, skipping payout processing", "warning");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { skipped: true });
            return;
        }
        const globalSchedule = (settingsMap.get("gatewayPayoutSchedule") || "DAILY");
        const merchants = await db_1.models.gatewayMerchant.findAll({
            where: {
                status: "ACTIVE",
            },
        });
        if (merchants.length === 0) {
            (0, broadcast_1.broadcastLog)(cronName, "No active merchants found", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", {
                duration: Date.now() - startTime,
                processed: 0,
            });
            return;
        }
        const tasks = [];
        for (const merchant of merchants) {
            const schedule = (merchant.payoutSchedule || globalSchedule);
            const period = getPayoutPeriod(schedule);
            const merchantBalances = await db_1.models.gatewayMerchantBalance.findAll({
                where: {
                    merchantId: merchant.id,
                    pending: {
                        [sequelize_1.Op.gt]: 0,
                    },
                },
            });
            if (merchantBalances.length === 0) {
                (0, broadcast_1.broadcastLog)(cronName, `Merchant ${merchant.name}: No balances with pending payouts`, "info");
                continue;
            }
            for (const balance of merchantBalances) {
                if (!(await isScheduledPayoutDue(schedule, merchant.id, balance))) {
                    skippedCount++;
                    (0, broadcast_1.broadcastLog)(cronName, `Skipping ${merchant.name} ${balance.currency}: ${schedule} payout already created for the current period`, "info");
                    continue;
                }
                const existingPayout = await db_1.models.gatewayPayout.findOne({
                    where: {
                        merchantId: merchant.id,
                        currency: balance.currency,
                        walletType: balance.walletType,
                        periodStart: period.start,
                        periodEnd: period.end,
                        status: {
                            [sequelize_1.Op.in]: ["PENDING", "PROCESSING", "COMPLETED"],
                        },
                    },
                });
                if (existingPayout) {
                    skippedCount++;
                    (0, broadcast_1.broadcastLog)(cronName, `Skipping ${merchant.name} ${balance.currency}: Payout already exists for this period`, "info");
                    continue;
                }
                tasks.push({ merchant, balance, period });
            }
        }
        (0, broadcast_1.broadcastLog)(cronName, `Processing ${tasks.length} payout tasks`);
        if (tasks.length === 0) {
            (0, broadcast_1.broadcastStatus)(cronName, "completed", {
                duration: Date.now() - startTime,
                processed: 0,
                skipped: skippedCount,
            });
            return;
        }
        await processWithConcurrency(tasks, MAX_CONCURRENCY, async (task) => {
            const success = await processMerchantBalancePayout(task.merchant, task.balance, task.period, cronName);
            if (success) {
                processedCount++;
            }
            else {
                failedCount++;
            }
            return success;
        });
        (0, broadcast_1.broadcastLog)(cronName, `Payout processing complete: ${processedCount} created, ${failedCount} failed, ${skippedCount} skipped`, processedCount > 0 ? "success" : "info");
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
            processed: processedCount,
            failed: failedCount,
            skipped: skippedCount,
        });
    }
    catch (error) {
        console_1.logger.error("GATEWAY_PAYOUT", `Gateway payout processing failed: ${error.message}`, error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", {
            duration: Date.now() - startTime,
            processed: processedCount,
            failed: failedCount,
            skipped: skippedCount,
            error: error.message,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Gateway payout processing failed: ${error.message}`, "error");
        throw error;
    }
}
const WEBHOOK_RETRY_BATCH = 100;
const WEBHOOK_PENDING_GRACE_MS = 2 * 60 * 1000;
async function processGatewayWebhookRetries() {
    const cronName = "processGatewayWebhookRetries";
    const startTime = Date.now();
    let sent = 0;
    let failed = 0;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        const now = new Date();
        const due = await db_1.models.gatewayWebhook.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { status: "RETRYING", nextRetryAt: { [sequelize_1.Op.lte]: now } },
                    {
                        status: "PENDING",
                        createdAt: {
                            [sequelize_1.Op.lte]: new Date(now.getTime() - WEBHOOK_PENDING_GRACE_MS),
                        },
                    },
                ],
            },
            include: [{ model: db_1.models.gatewayMerchant, as: "merchant" }],
            order: [["createdAt", "ASC"]],
            limit: WEBHOOK_RETRY_BATCH,
        });
        if (due.length === 0) {
            (0, broadcast_1.broadcastStatus)(cronName, "completed", {
                duration: Date.now() - startTime,
                processed: 0,
            });
            return;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Retrying ${due.length} webhook(s)`);
        await processWithConcurrency(due, MAX_CONCURRENCY, async (webhook) => {
            await (0, gateway_1.attemptWebhookDelivery)(webhook);
            if (webhook.status === "SENT")
                sent++;
            else
                failed++;
        });
        (0, broadcast_1.broadcastLog)(cronName, `Webhook retries complete: ${sent} delivered, ${failed} still failing`, sent > 0 ? "success" : "info");
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
            processed: sent,
            failed,
        });
    }
    catch (error) {
        console_1.logger.error("GATEWAY_WEBHOOK", `Webhook retry run failed: ${error.message}`, error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", {
            duration: Date.now() - startTime,
            processed: sent,
            failed,
            error: error.message,
        });
        throw error;
    }
}
const PAYMENT_EXPIRY_BATCH = 500;
const PAYMENT_EXPIRY_BUDGET_MS = 60 * 1000;
async function processGatewayPaymentExpiry() {
    const cronName = "processGatewayPaymentExpiry";
    const startTime = Date.now();
    let expired = 0;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        const lapsed = await db_1.models.gatewayPayment.findAll({
            where: {
                status: "PENDING",
                expiresAt: { [sequelize_1.Op.lt]: new Date() },
            },
            include: [{ model: db_1.models.gatewayMerchant, as: "merchant" }],
            order: [["expiresAt", "ASC"]],
            limit: PAYMENT_EXPIRY_BATCH,
        });
        if (lapsed.length === 0) {
            (0, broadcast_1.broadcastStatus)(cronName, "completed", {
                duration: Date.now() - startTime,
                processed: 0,
            });
            return;
        }
        (0, broadcast_1.broadcastLog)(cronName, `Expiring ${lapsed.length} lapsed payment session(s)`);
        const deadline = Date.now() + PAYMENT_EXPIRY_BUDGET_MS;
        let deferred = 0;
        await processWithConcurrency(lapsed, MAX_CONCURRENCY, async (payment) => {
            var _a;
            if (Date.now() >= deadline) {
                deferred++;
                return;
            }
            try {
                const [updated] = await db_1.models.gatewayPayment.update({ status: "EXPIRED" }, { where: { id: payment.id, status: "PENDING" } });
                if (!updated)
                    return;
                expired++;
                if (payment.webhookUrl && ((_a = payment.merchant) === null || _a === void 0 ? void 0 : _a.webhookSecret)) {
                    await (0, gateway_1.sendWebhook)(payment.merchantId, payment.id, null, "payment.expired", payment.webhookUrl, {
                        id: `evt_${payment.paymentIntentId}`,
                        type: "payment.expired",
                        createdAt: new Date().toISOString(),
                        data: {
                            id: payment.paymentIntentId,
                            merchantOrderId: payment.merchantOrderId,
                            amount: payment.amount,
                            currency: payment.currency,
                            status: "EXPIRED",
                            expiresAt: payment.expiresAt,
                        },
                    }, payment.merchant.webhookSecret);
                }
            }
            catch (error) {
                console_1.logger.error("GATEWAY_PAYMENT", `Failed to expire payment ${payment.paymentIntentId}: ${error.message}`, error);
            }
        });
        if (deferred > 0) {
            (0, broadcast_1.broadcastLog)(cronName, `Time budget reached; ${deferred} lapsed payment(s) deferred to the next run`, "warning");
        }
        (0, broadcast_1.broadcastLog)(cronName, `Expired ${expired} payment session(s)`, "success");
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
            processed: expired,
            deferred,
        });
    }
    catch (error) {
        console_1.logger.error("GATEWAY_PAYMENT", `Payment expiry run failed: ${error.message}`, error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", {
            duration: Date.now() - startTime,
            processed: expired,
            error: error.message,
        });
        throw error;
    }
}
