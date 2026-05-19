"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processGatewayPayouts = processGatewayPayouts;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const broadcast_1 = require("@b/cron/broadcast");
const console_1 = require("@b/utils/console");
const gateway_1 = require("@b/utils/gateway");
const notifications_1 = require("@b/utils/notifications");
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
function shouldProcessPayout(schedule) {
    const now = new Date();
    switch (schedule) {
        case "INSTANT":
            return true;
        case "DAILY":
            return true;
        case "WEEKLY":
            return now.getDay() === 0;
        case "MONTHLY":
            return now.getDate() === 1;
        default:
            return true;
    }
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
        if (pendingAmount < (merchant.payoutThreshold || 0)) {
            await t.rollback();
            (0, broadcast_1.broadcastLog)(cronName, `Merchant ${merchant.name}: pending ${pendingAmount} ${balance.currency} below threshold ${merchant.payoutThreshold || 0}`, "info");
            return true;
        }
        const payments = await db_1.models.gatewayPayment.findAll({
            where: {
                merchantId: merchant.id,
                status: "COMPLETED",
                testMode: false,
                completedAt: {
                    [sequelize_1.Op.gte]: period.start,
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
                    [sequelize_1.Op.gte]: period.start,
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
            amount: pendingAmount,
            currency: balance.currency,
            walletType: balance.walletType,
            status: "PENDING",
            periodStart: period.start,
            periodEnd: period.end,
            grossAmount: grossAmount,
            feeAmount: totalFees,
            netAmount: pendingAmount,
            paymentCount: paymentCount,
            refundCount: parseInt(refunds === null || refunds === void 0 ? void 0 : refunds.refundCount) || 0,
            metadata: {
                schedule: merchant.payoutSchedule,
                createdBy: "SYSTEM_CRON",
                balanceId: balance.id,
            },
        }, { transaction: t });
        await t.commit();
        (0, broadcast_1.broadcastLog)(cronName, `Created payout ${payoutId} for merchant ${merchant.name}: ${pendingAmount} ${balance.currency}`, "success");
        try {
            await (0, notifications_1.createNotification)({
                userId: merchant.userId,
                relatedId: payout.id,
                type: "system",
                title: "Payout Created",
                message: `A payout of ${pendingAmount.toFixed(2)} ${balance.currency} has been created and is pending approval.`,
                link: `/gateway/payouts`,
            });
        }
        catch (notifErr) {
            console_1.logger.error("GATEWAY_PAYOUT", `Failed to send notification for merchant ${merchant.id}`, notifErr);
        }
        return true;
    }
    catch (error) {
        await t.rollback();
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
                key: ["gatewayEnabled", "gatewayPayoutSchedule", "gatewayMinPayoutAmount"],
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
        if (!settingsMap.get("gatewayEnabled")) {
            (0, broadcast_1.broadcastLog)(cronName, "Gateway is disabled, skipping payout processing", "info");
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
            if (!shouldProcessPayout(schedule)) {
                skippedCount++;
                (0, broadcast_1.broadcastLog)(cronName, `Skipping merchant ${merchant.name}: Not scheduled for ${schedule} payout today`, "info");
                continue;
            }
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
                const existingPayout = await db_1.models.gatewayPayout.findOne({
                    where: {
                        merchantId: merchant.id,
                        currency: balance.currency,
                        walletType: balance.walletType,
                        periodStart: period.start,
                        periodEnd: period.end,
                        status: {
                            [sequelize_1.Op.in]: ["PENDING", "COMPLETED"],
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
