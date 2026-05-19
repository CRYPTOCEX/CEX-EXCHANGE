"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processStakingPositions = processStakingPositions;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const emails_1 = require("@b/utils/emails");
const notifications_1 = require("@b/utils/notifications");
const affiliate_1 = require("@b/utils/affiliate");
const broadcast_1 = require("@b/cron/broadcast");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
const notification_1 = require("@b/services/notification");
const DISTRIBUTION_TOLERANCE_MS = 30 * 60 * 1000;
const MAX_CONCURRENCY = 5;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;
function calculateReward(amount, apr, method, daysStaked, compoundFrequency = 365) {
    if (method === "SIMPLE") {
        return amount * (apr / 100) * (daysStaked / 365);
    }
    else if (method === "COMPOUND") {
        const rate = apr / 100;
        const timeInYears = daysStaked / 365;
        return (amount *
            (Math.pow(1 + rate / compoundFrequency, compoundFrequency * timeInYears) -
                1));
    }
    return 0;
}
async function processSinglePosition(pos, aprCalculationMethod, compoundFrequency, cronName) {
    var _a, _b;
    let retryCount = 0;
    while (retryCount < MAX_RETRY_ATTEMPTS) {
        try {
            const t = await db_1.sequelize.transaction({
                isolationLevel: sequelize_1.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
            });
            try {
                const positionWithLock = await db_1.models.stakingPosition.findByPk(pos.id, {
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                    include: [
                        { model: db_1.models.stakingPool, as: "pool" },
                        { model: db_1.models.user, as: "user" },
                    ],
                });
                if (!positionWithLock || positionWithLock.status !== "ACTIVE") {
                    await t.rollback();
                    (0, broadcast_1.broadcastLog)(cronName, `Position ${pos.id} is no longer active or has already been processed. Current status: ${(positionWithLock === null || positionWithLock === void 0 ? void 0 : positionWithLock.status) || "Not found"}`, "info");
                    return true;
                }
                const pool = positionWithLock.pool;
                const positionUser = positionWithLock.user;
                if (!pool || !positionUser) {
                    await t.rollback();
                    (0, broadcast_1.broadcastLog)(cronName, `Position ${pos.id} is missing pool or user data`, "error");
                    return false;
                }
                const daysStaked = (0, date_fns_1.differenceInDays)(new Date(positionWithLock.endDate), new Date(positionWithLock.startDate));
                const reward = calculateReward(positionWithLock.amount, pool.apr, aprCalculationMethod, daysStaked, compoundFrequency);
                (0, broadcast_1.broadcastLog)(cronName, `Position ${positionWithLock.id} (User ${positionUser.id}): Staked for ${daysStaked} days; calculated reward = ${reward.toFixed(2)} ${pool.symbol}`, "info");
                let newAmount = positionWithLock.amount;
                let userReward = reward;
                let adminFee = 0;
                if (pool.adminFeePercentage > 0) {
                    adminFee = reward * (pool.adminFeePercentage / 100);
                    userReward = reward - adminFee;
                    await db_1.models.stakingAdminEarning.create({
                        poolId: pool.id,
                        amount: adminFee,
                        isClaimed: false,
                        type: "PLATFORM_FEE",
                        currency: pool.symbol,
                    }, { transaction: t });
                    (0, broadcast_1.broadcastLog)(cronName, `Created admin earning record for pool ${pool.id}: ${adminFee.toFixed(2)} ${pool.symbol} (${pool.adminFeePercentage}% fee)`, "info");
                }
                if (pool.autoCompound) {
                    newAmount = positionWithLock.amount + userReward;
                    (0, broadcast_1.broadcastLog)(cronName, `Position ${positionWithLock.id} (User ${positionUser.id}): Auto-compounding enabled. Updating staked amount from ${positionWithLock.amount} to ${newAmount.toFixed(2)}`, "info");
                    await positionWithLock.update({ amount: newAmount, status: "COMPLETED", completedAt: new Date() }, { transaction: t });
                }
                else {
                    await positionWithLock.update({ status: "COMPLETED", completedAt: new Date() }, { transaction: t });
                    await db_1.models.stakingEarningRecord.create({
                        positionId: positionWithLock.id,
                        amount: userReward,
                        type: "REGULAR",
                        description: `Earnings for staking position in pool ${pool.name}`,
                        isClaimed: false,
                        claimedAt: null,
                    }, { transaction: t });
                }
                await db_1.models.stakingAdminActivity.create({
                    userId: "SYSTEM",
                    action: "distribute",
                    type: "earnings",
                    relatedId: positionWithLock.id,
                }, { transaction: t });
                await t.commit();
                (0, broadcast_1.broadcastLog)(cronName, `Position ${positionWithLock.id} (User ${positionUser.id}) processed successfully; total reward = ${reward.toFixed(2)}, user reward = ${userReward.toFixed(2)}, admin fee = ${adminFee.toFixed(2)} ${pool.symbol}`, "success");
                try {
                    await (0, emails_1.sendStakingRewardEmail)(positionUser, positionWithLock, pool, userReward);
                    (0, broadcast_1.broadcastLog)(cronName, `Reward email sent for position ${positionWithLock.id} (User ${positionUser.id})`, "success");
                }
                catch (emailErr) {
                    console_1.logger.error("STAKING", `Failed to send email for position ${positionWithLock.id} (User ${positionUser.id})`, emailErr);
                    (0, broadcast_1.broadcastLog)(cronName, `Error sending reward email for position ${positionWithLock.id} (User ${positionUser.id}): ${emailErr.message}`, "error");
                }
                try {
                    const notificationMessage = pool.autoCompound
                        ? `Your staking position in pool ${pool.name} has auto-compounded. Your new staked amount is ${newAmount.toFixed(2)} ${pool.symbol}.`
                        : `Your staking position in pool ${pool.name} has completed. You earned ${userReward.toFixed(2)} ${pool.symbol}.`;
                    await (0, notifications_1.createNotification)({
                        userId: positionUser.id,
                        relatedId: positionWithLock.id,
                        type: "system",
                        title: pool.autoCompound
                            ? "Staking Auto-Compounded"
                            : "Staking Completed",
                        message: notificationMessage,
                        link: `/staking/positions/${positionWithLock.id}`,
                        actions: [
                            {
                                label: "View Position",
                                link: `/staking/positions/${positionWithLock.id}`,
                                primary: true,
                            },
                        ],
                    });
                    (0, broadcast_1.broadcastLog)(cronName, `Notification created for position ${positionWithLock.id} (User ${positionUser.id})`, "success");
                }
                catch (notifErr) {
                    console_1.logger.error("STAKING", `Failed to create notification for position ${positionWithLock.id} (User ${positionUser.id})`, notifErr);
                    (0, broadcast_1.broadcastLog)(cronName, `Error creating notification for position ${positionWithLock.id} (User ${positionUser.id}): ${notifErr.message}`, "error");
                }
                try {
                    await (0, affiliate_1.processRewards)(positionUser.id, positionWithLock.amount, "STAKING_LOYALTY", pool.symbol, `STAKING_LOYALTY:staking:${positionWithLock.id}`);
                    (0, broadcast_1.broadcastLog)(cronName, `Additional rewards processed for position ${positionWithLock.id} (User ${positionUser.id})`, "success");
                }
                catch (rewardErr) {
                    console_1.logger.error("STAKING", `Failed to process additional rewards for position ${positionWithLock.id} (User ${positionUser.id})`, rewardErr);
                    (0, broadcast_1.broadcastLog)(cronName, `Error processing additional rewards for position ${positionWithLock.id} (User ${positionUser.id}): ${rewardErr.message}`, "error");
                }
                return true;
            }
            catch (txnError) {
                await t.rollback();
                (0, broadcast_1.broadcastLog)(cronName, `Transaction failed for position ${pos.id} (User ${(_a = pos.user) === null || _a === void 0 ? void 0 : _a.id}): ${txnError.message}`, "error");
                console_1.logger.error("STAKING", `Transaction failed for position ${pos.id} (User ${(_b = pos.user) === null || _b === void 0 ? void 0 : _b.id})`, txnError);
                retryCount++;
                if (retryCount < MAX_RETRY_ATTEMPTS) {
                    (0, broadcast_1.broadcastLog)(cronName, `Retrying position ${pos.id} (Attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`, "warning");
                    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
                }
            }
        }
        catch (error) {
            console_1.logger.error("STAKING", `Failed to process position ${pos.id}`, error);
            retryCount++;
            if (retryCount < MAX_RETRY_ATTEMPTS) {
                (0, broadcast_1.broadcastLog)(cronName, `Retrying position ${pos.id} (Attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`, "warning");
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
            }
        }
    }
    (0, broadcast_1.broadcastLog)(cronName, `Failed to process position ${pos.id} after ${MAX_RETRY_ATTEMPTS} attempts`, "error");
    return false;
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
async function getSettingsWithFallback() {
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        return await cacheManager.getSettings();
    }
    catch (cacheError) {
        console_1.logger.warn("STAKING", "Cache retrieval failed, falling back to database settings");
        const dbSettings = await db_1.models.settings.findAll();
        const settingsMap = new Map();
        dbSettings.forEach((setting) => {
            settingsMap.set(setting.key, setting.value);
        });
        return settingsMap;
    }
}
async function processStakingPositions() {
    const cronName = "processStakingPositions";
    const startTime = Date.now();
    let processedCount = 0;
    let failedCount = 0;
    const skippedCount = 0;
    try {
        (0, broadcast_1.broadcastStatus)(cronName, "running");
        (0, broadcast_1.broadcastLog)(cronName, "Starting processing of staking positions");
        const settings = await getSettingsWithFallback();
        const autoDistribute = settings.has("stakingAutomaticEarningsDistribution")
            ? settings.get("stakingAutomaticEarningsDistribution")
            : false;
        if (!autoDistribute) {
            (0, broadcast_1.broadcastLog)(cronName, "Automatic earnings distribution is disabled; skipping staking positions processing.", "info");
            (0, broadcast_1.broadcastStatus)(cronName, "completed", { skipped: true });
            return;
        }
        const aprCalculationMethod = settings.has("stakingDefaultAprCalculationMethod")
            ? settings.get("stakingDefaultAprCalculationMethod")
            : "SIMPLE";
        const compoundFrequency = settings.has("stakingCompoundFrequency")
            ? Number.parseInt(settings.get("stakingCompoundFrequency"), 10)
            : 365;
        const distributionTime = settings.has("stakingEarningsDistributionTime")
            ? settings.get("stakingEarningsDistributionTime")
            : "00:00";
        const isManualRun = process.env.MANUAL_RUN === "true";
        const now = new Date();
        if (!isManualRun) {
            const [distHour, distMinute] = distributionTime.split(":").map(Number);
            const scheduledDistributionTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), distHour, distMinute);
            if (Math.abs(now.getTime() - scheduledDistributionTime.getTime()) >
                DISTRIBUTION_TOLERANCE_MS) {
                (0, broadcast_1.broadcastLog)(cronName, `Current time (${now.toTimeString().slice(0, 5)}) is not within the tolerance window of the distribution time (${distributionTime}). Checking for missed executions...`, "info");
                const missedPositions = await db_1.models.stakingPosition.count({
                    where: {
                        status: "ACTIVE",
                        endDate: {
                            [sequelize_1.Op.lt]: (0, date_fns_1.addDays)(now, -1),
                        },
                    },
                });
                if (missedPositions === 0) {
                    (0, broadcast_1.broadcastLog)(cronName, "No missed positions found. Skipping processing.", "info");
                    (0, broadcast_1.broadcastStatus)(cronName, "completed", { skipped: true });
                    return;
                }
                (0, broadcast_1.broadcastLog)(cronName, `Found ${missedPositions} positions that were missed in previous executions. Proceeding with processing.`, "warning");
            }
        }
        const positions = await db_1.models.stakingPosition.findAll({
            where: {
                status: "ACTIVE",
                endDate: { [sequelize_1.Op.lt]: now },
            },
            include: [
                {
                    model: db_1.models.stakingPool,
                    as: "pool",
                    attributes: [
                        "id",
                        "name",
                        "symbol",
                        "apr",
                        "lockPeriod",
                        "earningFrequency",
                        "autoCompound",
                        "adminFeePercentage",
                    ],
                },
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "email", "firstName", "lastName"],
                },
            ],
            order: [["endDate", "ASC"]],
            lock: sequelize_1.Transaction.LOCK.UPDATE,
            skipLocked: true,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Found ${positions.length} staking positions to process`);
        if (positions.length === 0) {
            (0, broadcast_1.broadcastStatus)(cronName, "completed", {
                duration: Date.now() - startTime,
                processed: 0,
            });
            return;
        }
        const results = await processWithConcurrency(positions, MAX_CONCURRENCY, async (pos) => {
            var _a, _b;
            try {
                const success = await processSinglePosition(pos, aprCalculationMethod, compoundFrequency, cronName);
                if (success) {
                    processedCount++;
                    return { success: true, positionId: pos.id };
                }
                else {
                    failedCount++;
                    return {
                        success: false,
                        positionId: pos.id,
                        error: "Failed after retries",
                    };
                }
            }
            catch (posError) {
                failedCount++;
                (0, broadcast_1.broadcastLog)(cronName, `Error processing position ${pos.id} (User ${(_a = pos.user) === null || _a === void 0 ? void 0 : _a.id}): ${posError.message}`, "error");
                console_1.logger.error("STAKING", `Error processing position ${pos.id} (User ${(_b = pos.user) === null || _b === void 0 ? void 0 : _b.id})`, posError);
                return {
                    success: false,
                    positionId: pos.id,
                    error: posError.message,
                };
            }
        });
        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;
        (0, broadcast_1.broadcastLog)(cronName, `Processing summary: ${successCount} positions processed successfully, ${failureCount} positions failed`, successCount > 0 ? "success" : "warning");
        if (failureCount > 0) {
            const failedPositionIds = results
                .filter((r) => !r.success)
                .map((r) => r.positionId);
            console_1.logger.error("STAKING", `Failed to process ${failureCount} positions: ${failedPositionIds.join(", ")}`);
            try {
                const adminUsers = await db_1.models.user.findAll({
                    include: [{
                            model: db_1.models.role,
                            as: 'role',
                            where: { name: 'Super Admin' }
                        }],
                    limit: 1
                });
                if (adminUsers.length > 0) {
                    await notification_1.notificationService.send({
                        userId: adminUsers[0].id,
                        type: "SYSTEM",
                        channels: ["IN_APP"],
                        idempotencyKey: `staking_failed_${cronName}_${new Date().toISOString().split("T")[0]}`,
                        data: {
                            title: "Staking Reward Processing Failed",
                            message: `${failedPositionIds.length} staking rewards failed to process. Please review immediately.`,
                            details: JSON.stringify({
                                failedPositionIds,
                                executionTime: new Date().toISOString(),
                                cronName,
                            }),
                        },
                        priority: "HIGH"
                    });
                }
                (0, broadcast_1.broadcastLog)(cronName, "Created admin task for failed positions", "info");
            }
            catch (taskError) {
                console_1.logger.error("STAKING", "Failed to create admin task for failed positions", taskError);
            }
        }
        (0, broadcast_1.broadcastStatus)(cronName, "completed", {
            duration: Date.now() - startTime,
            processed: successCount,
            failed: failureCount,
        });
        (0, broadcast_1.broadcastLog)(cronName, "Processing of staking positions completed", "success");
    }
    catch (error) {
        console_1.logger.error("STAKING", "Processing of staking positions failed", error);
        (0, broadcast_1.broadcastStatus)(cronName, "failed", {
            duration: Date.now() - startTime,
            processed: processedCount,
            failed: failedCount,
            skipped: skippedCount,
            error: error.message,
        });
        (0, broadcast_1.broadcastLog)(cronName, `Processing of staking positions failed: ${error.message}`, "error");
        throw error;
    }
}
