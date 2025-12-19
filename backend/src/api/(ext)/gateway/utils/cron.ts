import { models, sequelize } from "@b/db";
import { Transaction, Op, fn, col } from "sequelize";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from "date-fns";
import { broadcastStatus, broadcastLog } from "@b/cron/broadcast";
import { logger } from "@b/utils/console";
import { generatePayoutId } from "@b/utils/gateway";
import { createNotification } from "@b/utils/notifications";

// Maximum concurrency for processing merchants
const MAX_CONCURRENCY = 3;

type PayoutSchedule = "INSTANT" | "DAILY" | "WEEKLY" | "MONTHLY";

/**
 * Gets the payout period based on schedule type
 */
function getPayoutPeriod(schedule: PayoutSchedule): { start: Date; end: Date } {
  const now = new Date();
  const end = now;

  switch (schedule) {
    case "INSTANT":
      // Instant payouts process immediately, period is just now
      return { start: subDays(now, 1), end };
    case "DAILY":
      return { start: startOfDay(subDays(now, 1)), end: startOfDay(now) };
    case "WEEKLY":
      return { start: startOfWeek(subWeeks(now, 1)), end: startOfWeek(now) };
    case "MONTHLY":
      return { start: startOfMonth(subMonths(now, 1)), end: startOfMonth(now) };
    default:
      return { start: startOfDay(subDays(now, 1)), end: startOfDay(now) };
  }
}

/**
 * Checks if payout should be processed based on schedule
 */
function shouldProcessPayout(schedule: PayoutSchedule): boolean {
  const now = new Date();

  switch (schedule) {
    case "INSTANT":
      // Always process instant payouts
      return true;
    case "DAILY":
      // Process daily - always run
      return true;
    case "WEEKLY":
      // Process on Sunday (day 0)
      return now.getDay() === 0;
    case "MONTHLY":
      // Process on first day of month
      return now.getDate() === 1;
    default:
      return true;
  }
}

/**
 * Process payout for a single merchant gateway balance record
 * Uses gatewayMerchantBalance.pending as the source of truth (NOT wallet.inOrder)
 */
async function processMerchantBalancePayout(
  merchant: any,
  balance: any,
  period: { start: Date; end: Date },
  cronName: string
): Promise<boolean> {
  const t = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });

  try {
    // Lock the gateway balance record
    const lockedBalance = await models.gatewayMerchantBalance.findByPk(balance.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!lockedBalance) {
      await t.rollback();
      return false;
    }

    const pendingAmount = parseFloat(lockedBalance.pending?.toString() || "0");

    // Check if pending balance meets threshold
    if (pendingAmount < (merchant.payoutThreshold || 0)) {
      await t.rollback();
      broadcastLog(
        cronName,
        `Merchant ${merchant.name}: pending ${pendingAmount} ${balance.currency} below threshold ${merchant.payoutThreshold || 0}`,
        "info"
      );
      return true; // Not an error, just below threshold
    }

    // Get completed payments for the period to calculate stats
    // Note: payment.currency is the external payment currency (e.g., USD from merchant site)
    // The actual wallet currencies are stored in payment.allocations[]
    const payments = await models.gatewayPayment.findAll({
      where: {
        merchantId: merchant.id,
        status: "COMPLETED",
        testMode: false, // Only live payments
        completedAt: {
          [Op.gte]: period.start,
          [Op.lt]: period.end,
        },
      },
      transaction: t,
    });

    // Calculate stats from allocations matching this balance's currency/type
    let paymentCount = 0;
    let grossAmount = 0;
    let totalFees = 0;

    for (const payment of payments) {
      const allocations = payment.allocations || [];
      // Find allocations that match this balance's currency and type
      const matchingAllocations = allocations.filter(
        (alloc: any) =>
          alloc.currency === balance.currency && alloc.walletType === balance.walletType
      );

      if (matchingAllocations.length > 0) {
        paymentCount++;
        // Sum amounts from matching allocations
        for (const alloc of matchingAllocations) {
          grossAmount += parseFloat(alloc.amount?.toString() || "0");
        }
        // Fee is proportional to the allocation's share of total payment
        const totalPaymentAmount = allocations.reduce(
          (sum: number, a: any) => sum + parseFloat(a.amount?.toString() || "0"),
          0
        );
        const matchingAmount = matchingAllocations.reduce(
          (sum: number, a: any) => sum + parseFloat(a.amount?.toString() || "0"),
          0
        );
        if (totalPaymentAmount > 0) {
          const feeShare = (matchingAmount / totalPaymentAmount) * payment.feeAmount;
          totalFees += feeShare;
        }
      }
    }

    // Get refund count for the period
    const refundStats = await models.gatewayRefund.findAll({
      where: {
        merchantId: merchant.id,
        status: "COMPLETED",
        createdAt: {
          [Op.gte]: period.start,
          [Op.lt]: period.end,
        },
      },
      attributes: [[fn("COUNT", col("id")), "refundCount"]],
      raw: true,
      transaction: t,
    });

    const refunds = refundStats[0] as any;

    // Create payout record
    const payoutId = generatePayoutId();
    const payout = await models.gatewayPayout.create(
      {
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
        refundCount: parseInt(refunds?.refundCount) || 0,
        metadata: {
          schedule: merchant.payoutSchedule,
          createdBy: "SYSTEM_CRON",
          balanceId: balance.id,
        },
      },
      { transaction: t }
    );

    // Note: We do NOT move funds here. Funds stay in gatewayMerchantBalance.pending until admin approves.
    // When admin approves, processGatewayPayout() moves from pending to merchant's wallet.balance.

    await t.commit();

    broadcastLog(
      cronName,
      `Created payout ${payoutId} for merchant ${merchant.name}: ${pendingAmount} ${balance.currency}`,
      "success"
    );

    // Send notification to merchant
    try {
      await createNotification({
        userId: merchant.userId,
        relatedId: payout.id,
        type: "system",
        title: "Payout Created",
        message: `A payout of ${pendingAmount.toFixed(2)} ${balance.currency} has been created and is pending approval.`,
        link: `/gateway/payouts`,
      });
    } catch (notifErr: any) {
      logger.error(
        "GATEWAY_PAYOUT",
        `Failed to send notification for merchant ${merchant.id}`,
        notifErr
      );
    }

    return true;
  } catch (error: any) {
    await t.rollback();
    broadcastLog(
      cronName,
      `Failed to create payout for merchant ${merchant.name}: ${error.message}`,
      "error"
    );
    logger.error(
      "GATEWAY_PAYOUT",
      `Failed to create payout for merchant ${merchant.id}: ${error.message}`,
      error
    );
    return false;
  }
}

/**
 * Processes items concurrently with a given concurrency limit.
 */
async function processWithConcurrency<T, R>(
  items: T[],
  concurrencyLimit: number,
  asyncFn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  const workers = new Array(concurrencyLimit).fill(0).map(async () => {
    while (index < items.length) {
      const currentIndex = index++;
      try {
        results[currentIndex] = await asyncFn(items[currentIndex]);
      } catch (error: any) {
        results[currentIndex] = error;
      }
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Main cron function to process gateway payouts
 * Uses gatewayMerchantBalance.pending as the source of truth for funds awaiting payout
 */
export async function processGatewayPayouts() {
  const cronName = "processGatewayPayouts";
  const startTime = Date.now();
  let processedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting gateway payout processing");

    // Get gateway settings
    const settings = await models.settings.findAll({
      where: {
        key: ["gatewayEnabled", "gatewayPayoutSchedule", "gatewayMinPayoutAmount"],
      },
    });

    const settingsMap = new Map<string, any>();
    for (const setting of settings) {
      let value = setting.value;
      try {
        value = JSON.parse(setting.value);
      } catch {
        // Keep as string
      }
      if (value === "true") value = true;
      if (value === "false") value = false;
      settingsMap.set(setting.key, value);
    }

    // Check if gateway is enabled
    if (!settingsMap.get("gatewayEnabled")) {
      broadcastLog(cronName, "Gateway is disabled, skipping payout processing", "info");
      broadcastStatus(cronName, "completed", { skipped: true });
      return;
    }

    // Get global payout schedule (used as default)
    const globalSchedule = (settingsMap.get("gatewayPayoutSchedule") || "DAILY") as PayoutSchedule;

    // Get all active merchants
    const merchants = await models.gatewayMerchant.findAll({
      where: {
        status: "ACTIVE",
      },
    });

    if (merchants.length === 0) {
      broadcastLog(cronName, "No active merchants found", "info");
      broadcastStatus(cronName, "completed", {
        duration: Date.now() - startTime,
        processed: 0,
      });
      return;
    }

    // Process each merchant
    const tasks: Array<{
      merchant: any;
      balance: any;
      period: { start: Date; end: Date };
    }> = [];

    for (const merchant of merchants) {
      // Use merchant's payout schedule or fall back to global
      const schedule = (merchant.payoutSchedule || globalSchedule) as PayoutSchedule;

      // Check if we should process based on schedule
      if (!shouldProcessPayout(schedule)) {
        skippedCount++;
        broadcastLog(
          cronName,
          `Skipping merchant ${merchant.name}: Not scheduled for ${schedule} payout today`,
          "info"
        );
        continue;
      }

      const period = getPayoutPeriod(schedule);

      // Find merchant's gateway balances with pending > 0
      // This is the source of truth for gateway funds (NOT wallet.inOrder)
      const merchantBalances = await models.gatewayMerchantBalance.findAll({
        where: {
          merchantId: merchant.id,
          pending: {
            [Op.gt]: 0,
          },
        },
      });

      if (merchantBalances.length === 0) {
        broadcastLog(
          cronName,
          `Merchant ${merchant.name}: No balances with pending payouts`,
          "info"
        );
        continue;
      }

      // Check if payout already exists for this period for each balance
      for (const balance of merchantBalances) {
        const existingPayout = await models.gatewayPayout.findOne({
          where: {
            merchantId: merchant.id,
            currency: balance.currency,
            walletType: balance.walletType,
            periodStart: period.start,
            periodEnd: period.end,
            status: {
              [Op.in]: ["PENDING", "COMPLETED"],
            },
          },
        });

        if (existingPayout) {
          skippedCount++;
          broadcastLog(
            cronName,
            `Skipping ${merchant.name} ${balance.currency}: Payout already exists for this period`,
            "info"
          );
          continue;
        }

        tasks.push({ merchant, balance, period });
      }
    }

    broadcastLog(cronName, `Processing ${tasks.length} payout tasks`);

    if (tasks.length === 0) {
      broadcastStatus(cronName, "completed", {
        duration: Date.now() - startTime,
        processed: 0,
        skipped: skippedCount,
      });
      return;
    }

    // Process payouts with concurrency limit
    await processWithConcurrency(
      tasks,
      MAX_CONCURRENCY,
      async (task) => {
        const success = await processMerchantBalancePayout(
          task.merchant,
          task.balance,
          task.period,
          cronName
        );
        if (success) {
          processedCount++;
        } else {
          failedCount++;
        }
        return success;
      }
    );

    broadcastLog(
      cronName,
      `Payout processing complete: ${processedCount} created, ${failedCount} failed, ${skippedCount} skipped`,
      processedCount > 0 ? "success" : "info"
    );

    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
      processed: processedCount,
      failed: failedCount,
      skipped: skippedCount,
    });
  } catch (error: any) {
    logger.error("GATEWAY_PAYOUT", `Gateway payout processing failed: ${error.message}`, error);
    broadcastStatus(cronName, "failed", {
      duration: Date.now() - startTime,
      processed: processedCount,
      failed: failedCount,
      skipped: skippedCount,
      error: error.message,
    });
    broadcastLog(
      cronName,
      `Gateway payout processing failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}
