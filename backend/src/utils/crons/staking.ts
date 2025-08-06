import { models, sequelize } from "@b/db";
import { Transaction, Op } from "sequelize";
import { differenceInDays, addDays } from "date-fns";
import { sendStakingRewardEmail } from "../emails";
import { createNotification } from "../notifications";
import { processRewards } from "../affiliate";
import { broadcastStatus, broadcastLog } from "./broadcast";
import { CacheManager } from "@b/utils/cache";
import { logError } from "../logger";

// Tolerance in milliseconds for distribution time check (e.g., 30 minutes)
const DISTRIBUTION_TOLERANCE_MS = 30 * 60 * 1000;
// Maximum concurrency for processing staking positions
const MAX_CONCURRENCY = 5;
// Maximum retry attempts for failed positions
const MAX_RETRY_ATTEMPTS = 3;
// Delay between retries in milliseconds
const RETRY_DELAY_MS = 5000;

/**
 * Calculates the staking reward using either simple or compound interest.
 * @param amount - The staked amount.
 * @param apr - The annual percentage rate.
 * @param method - The calculation method ("SIMPLE" or "COMPOUND").
 * @param daysStaked - The number of days the funds were staked.
 * @param compoundFrequency - How often compounding occurs (default: 365 for daily)
 * @returns The calculated reward.
 */
function calculateReward(
  amount: number,
  apr: number,
  method: string,
  daysStaked: number,
  compoundFrequency = 365
): number {
  if (method === "SIMPLE") {
    return amount * (apr / 100) * (daysStaked / 365);
  } else if (method === "COMPOUND") {
    // For compound interest, we use the formula: P * ((1 + r/n)^(n*t) - 1)
    // where P is principal, r is rate, n is compound frequency, t is time in years
    const rate = apr / 100;
    const timeInYears = daysStaked / 365;
    return (
      amount *
      (Math.pow(1 + rate / compoundFrequency, compoundFrequency * timeInYears) -
        1)
    );
  }
  return 0;
}

/**
 * Processes a single staking position with retry logic.
 * @param pos - The staking position.
 * @param aprCalculationMethod - Calculation method from settings.
 * @param compoundFrequency - How often compounding occurs.
 * @param cronName - Name of the cron job for logging.
 */
async function processSinglePosition(
  pos: any,
  aprCalculationMethod: string,
  compoundFrequency: number,
  cronName: string
): Promise<boolean> {
  let retryCount = 0;

  while (retryCount < MAX_RETRY_ATTEMPTS) {
    try {
      // Start a transaction with SERIALIZABLE isolation for financial operations
      const t = await sequelize.transaction({
        isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
      });

      try {
        // Get the position with a lock to prevent concurrent modifications
        const positionWithLock = await models.stakingPosition.findByPk(pos.id, {
          transaction: t,
          lock: t.LOCK.UPDATE,
          include: [
            { model: models.stakingPool, as: "pool" },
            { model: models.user, as: "user" },
          ],
        });

        // Idempotency check - ensure position hasn't been processed already
        if (!positionWithLock || positionWithLock.status !== "ACTIVE") {
          await t.rollback();
          broadcastLog(
            cronName,
            `Position ${pos.id} is no longer active or has already been processed. Current status: ${positionWithLock?.status || "Not found"}`,
            "info"
          );
          return true; // Consider this a success since no action needed
        }

        const daysStaked = differenceInDays(
          new Date(positionWithLock.endDate),
          new Date(positionWithLock.startDate)
        );
        const reward = calculateReward(
          positionWithLock.amount,
          positionWithLock.pool.apr,
          aprCalculationMethod,
          daysStaked,
          compoundFrequency
        );

        broadcastLog(
          cronName,
          `Position ${positionWithLock.id} (User ${positionWithLock.user.id}): Staked for ${daysStaked} days; calculated reward = ${reward.toFixed(2)} ${positionWithLock.pool.symbol}`,
          "info"
        );

        let newAmount = positionWithLock.amount;
        let userReward = reward;
        let adminFee = 0;

        // Calculate admin fee based on pool settings
        if (positionWithLock.pool.adminFeePercentage > 0) {
          adminFee = reward * (positionWithLock.pool.adminFeePercentage / 100);
          userReward = reward - adminFee;

          // Create admin earning record
          await models.stakingAdminEarning.create(
            {
              poolId: positionWithLock.pool.id,
              amount: adminFee,
              isClaimed: false,
              type: "PLATFORM_FEE",
              currency: positionWithLock.pool.symbol,
            },
            { transaction: t }
          );

          broadcastLog(
            cronName,
            `Created admin earning record for pool ${positionWithLock.pool.id}: ${adminFee.toFixed(2)} ${positionWithLock.pool.symbol} (${positionWithLock.pool.adminFeePercentage}% fee)`,
            "info"
          );
        }

        // Process based on auto-compound setting
        if (positionWithLock.pool.autoCompound) {
          newAmount = positionWithLock.amount + userReward;
          broadcastLog(
            cronName,
            `Position ${positionWithLock.id} (User ${positionWithLock.user.id}): Auto-compounding enabled. Updating staked amount from ${positionWithLock.amount} to ${newAmount.toFixed(2)}`,
            "info"
          );
          await positionWithLock.update(
            { amount: newAmount, status: "COMPLETED", completedAt: new Date() },
            { transaction: t }
          );
        } else {
          await positionWithLock.update(
            { status: "COMPLETED", completedAt: new Date() },
            { transaction: t }
          );

          // Create earning record for user
          await models.stakingEarningRecord.create(
            {
              positionId: positionWithLock.id,
              amount: userReward,
              type: "REGULAR",
              description: `Earnings for staking position in pool ${positionWithLock.pool.name}`,
              isClaimed: false,
              claimedAt: null,
            },
            { transaction: t }
          );
        }

        // Create audit trail
        await models.stakingAdminActivity.create(
          {
            userId: "SYSTEM", // Use a system user ID or create a specific one for automated processes
            action: "distribute",
            type: "earnings",
            relatedId: positionWithLock.id,
          },
          { transaction: t }
        );

        await t.commit();

        broadcastLog(
          cronName,
          `Position ${positionWithLock.id} (User ${positionWithLock.user.id}) processed successfully; total reward = ${reward.toFixed(2)}, user reward = ${userReward.toFixed(2)}, admin fee = ${adminFee.toFixed(2)} ${positionWithLock.pool.symbol}`,
          "success"
        );

        // Send email notification
        try {
          await sendStakingRewardEmail(
            positionWithLock.user,
            positionWithLock,
            positionWithLock.pool,
            userReward
          );
          broadcastLog(
            cronName,
            `Reward email sent for position ${positionWithLock.id} (User ${positionWithLock.user.id})`,
            "success"
          );
        } catch (emailErr: any) {
          logError(
            `processStakingPositions - email for position ${positionWithLock.id} (User ${positionWithLock.user.id})`,
            emailErr,
            __filename
          );
          broadcastLog(
            cronName,
            `Error sending reward email for position ${positionWithLock.id} (User ${positionWithLock.user.id}): ${emailErr.message}`,
            "error"
          );
          // Continue processing even if email fails
        }

        // Create an in-app notification
        try {
          const notificationMessage = positionWithLock.pool.autoCompound
            ? `Your staking position in pool ${positionWithLock.pool.name} has auto-compounded. Your new staked amount is ${newAmount.toFixed(2)} ${positionWithLock.pool.symbol}.`
            : `Your staking position in pool ${positionWithLock.pool.name} has completed. You earned ${userReward.toFixed(2)} ${positionWithLock.pool.symbol}.`;

          await createNotification({
            userId: positionWithLock.user.id,
            relatedId: positionWithLock.id,
            type: "system",
            title: positionWithLock.pool.autoCompound
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
          broadcastLog(
            cronName,
            `Notification created for position ${positionWithLock.id} (User ${positionWithLock.user.id})`,
            "success"
          );
        } catch (notifErr: any) {
          logError(
            `processStakingPositions - notification for position ${positionWithLock.id} (User ${positionWithLock.user.id})`,
            notifErr,
            __filename
          );
          broadcastLog(
            cronName,
            `Error creating notification for position ${positionWithLock.id} (User ${positionWithLock.user.id}): ${notifErr.message}`,
            "error"
          );
          // Continue processing even if notification fails
        }

        // Process additional rewards (e.g., affiliate rewards)
        try {
          await processRewards(
            positionWithLock.user.id,
            positionWithLock.amount,
            "STAKING_LOYALTY",
            positionWithLock.pool.symbol
          );
          broadcastLog(
            cronName,
            `Additional rewards processed for position ${positionWithLock.id} (User ${positionWithLock.user.id})`,
            "success"
          );
        } catch (rewardErr: any) {
          logError(
            `processStakingPositions - rewards for position ${positionWithLock.id} (User ${positionWithLock.user.id})`,
            rewardErr,
            __filename
          );
          broadcastLog(
            cronName,
            `Error processing additional rewards for position ${positionWithLock.id} (User ${positionWithLock.user.id}): ${rewardErr.message}`,
            "error"
          );
          // Continue processing even if additional rewards fail
        }

        return true; // Success
      } catch (txnError: any) {
        await t.rollback();
        broadcastLog(
          cronName,
          `Transaction failed for position ${pos.id} (User ${pos.user?.id}): ${txnError.message}`,
          "error"
        );
        logError(
          `processStakingPositions - transaction for position ${pos.id} (User ${pos.user?.id})`,
          txnError,
          __filename
        );

        // Increment retry counter and wait before retrying
        retryCount++;
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          broadcastLog(
            cronName,
            `Retrying position ${pos.id} (Attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`,
            "warning"
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    } catch (error: any) {
      logError(`processSinglePosition - position ${pos.id}`, error, __filename);

      // Increment retry counter and wait before retrying
      retryCount++;
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        broadcastLog(
          cronName,
          `Retrying position ${pos.id} (Attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`,
          "warning"
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  // If we get here, all retries failed
  broadcastLog(
    cronName,
    `Failed to process position ${pos.id} after ${MAX_RETRY_ATTEMPTS} attempts`,
    "error"
  );
  return false;
}

/**
 * Processes items concurrently with a given concurrency limit.
 * @param items - The array of items to process.
 * @param concurrencyLimit - Maximum number of concurrent tasks.
 * @param asyncFn - The async function to process each item.
 * @returns Array of results from processing each item.
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
        // Error already logged within asyncFn
        results[currentIndex] = error;
      }
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Gets settings with fallback to database if cache fails.
 */
async function getSettingsWithFallback() {
  try {
    const cacheManager = CacheManager.getInstance();
    return await cacheManager.getSettings();
  } catch (cacheError) {
    console.log(
      "Cache retrieval failed, falling back to database settings",
      cacheError
    );

    // Fallback to database settings
    // This assumes you have a settings table in your database
    const dbSettings = await models.settings.findAll();
    const settingsMap = new Map();

    dbSettings.forEach((setting: any) => {
      settingsMap.set(setting.key, setting.value);
    });

    return settingsMap;
  }
}

/**
 * Processes staking positions that have matured (endDate reached) and distributes rewards.
 * Includes handling for missed executions and improved error recovery.
 */
export async function processStakingPositions() {
  const cronName = "processStakingPositions";
  const startTime = Date.now();
  let processedCount = 0;
  let failedCount = 0;
  const skippedCount = 0;

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting processing of staking positions");

    // Retrieve platform settings with fallback
    const settings = await getSettingsWithFallback();

    // Check if automatic distribution is enabled
    const autoDistribute = settings.has("stakingAutomaticEarningsDistribution")
      ? settings.get("stakingAutomaticEarningsDistribution")
      : false;

    if (!autoDistribute) {
      broadcastLog(
        cronName,
        "Automatic earnings distribution is disabled; skipping staking positions processing.",
        "info"
      );
      broadcastStatus(cronName, "completed", { skipped: true });
      return;
    }

    // Get calculation method and compound frequency
    const aprCalculationMethod = settings.has(
      "stakingDefaultAprCalculationMethod"
    )
      ? settings.get("stakingDefaultAprCalculationMethod")
      : "SIMPLE";

    const compoundFrequency = settings.has("stakingCompoundFrequency")
      ? Number.parseInt(settings.get("stakingCompoundFrequency"), 10)
      : 365; // Default to daily compounding

    // Get distribution time setting
    const distributionTime = settings.has("stakingEarningsDistributionTime")
      ? settings.get("stakingEarningsDistributionTime")
      : "00:00";

    // Check if we should process based on distribution time
    // Only check time if this is a scheduled run (not a manual/forced run)
    const isManualRun = process.env.MANUAL_RUN === "true";
    const now = new Date();

    if (!isManualRun) {
      const [distHour, distMinute] = distributionTime.split(":").map(Number);
      const scheduledDistributionTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        distHour,
        distMinute
      );

      // Check if current time is within tolerance window
      if (
        Math.abs(now.getTime() - scheduledDistributionTime.getTime()) >
        DISTRIBUTION_TOLERANCE_MS
      ) {
        broadcastLog(
          cronName,
          `Current time (${now.toTimeString().slice(0, 5)}) is not within the tolerance window of the distribution time (${distributionTime}). Checking for missed executions...`,
          "info"
        );

        // Check if we have positions that should have been processed in previous days
        // This handles cases where the cron job failed to run on previous days
        const missedPositions = await models.stakingPosition.count({
          where: {
            status: "ACTIVE",
            endDate: {
              [Op.lt]: addDays(now, -1), // Positions that ended more than 1 day ago
            },
          },
        });

        if (missedPositions === 0) {
          broadcastLog(
            cronName,
            "No missed positions found. Skipping processing.",
            "info"
          );
          broadcastStatus(cronName, "completed", { skipped: true });
          return;
        }

        broadcastLog(
          cronName,
          `Found ${missedPositions} positions that were missed in previous executions. Proceeding with processing.`,
          "warning"
        );
      }
    }

    // Query all active staking positions that have matured
    // Using raw query with FOR UPDATE SKIP LOCKED for better concurrency
    const positions = await models.stakingPosition.findAll({
      where: {
        status: "ACTIVE",
        endDate: { [Op.lt]: now },
      },
      include: [
        {
          model: models.stakingPool,
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
          model: models.user,
          as: "user",
          attributes: ["id", "email", "firstName", "lastName"],
        },
      ],
      order: [["endDate", "ASC"]], // Process oldest ending positions first
      lock: Transaction.LOCK.UPDATE,
      skipLocked: true, // Skip positions already being processed
    });

    broadcastLog(
      cronName,
      `Found ${positions.length} staking positions to process`
    );

    if (positions.length === 0) {
      broadcastStatus(cronName, "completed", {
        duration: Date.now() - startTime,
        processed: 0,
      });
      return;
    }

    // Process each position concurrently with controlled parallelism
    const results = await processWithConcurrency(
      positions,
      MAX_CONCURRENCY,
      async (pos: any) => {
        try {
          const success = await processSinglePosition(
            pos,
            aprCalculationMethod,
            compoundFrequency,
            cronName
          );
          if (success) {
            processedCount++;
            return { success: true, positionId: pos.id };
          } else {
            failedCount++;
            return {
              success: false,
              positionId: pos.id,
              error: "Failed after retries",
            };
          }
        } catch (posError: any) {
          failedCount++;
          broadcastLog(
            cronName,
            `Error processing position ${pos.id} (User ${pos.user?.id}): ${posError.message}`,
            "error"
          );
          logError(
            `processStakingPositions - position ${pos.id} (User ${pos.user?.id})`,
            posError,
            __filename
          );
          return {
            success: false,
            positionId: pos.id,
            error: posError.message,
          };
        }
      }
    );

    // Log summary of results
    const successCount = results.filter((r: any) => r.success).length;
    const failureCount = results.filter((r: any) => !r.success).length;

    broadcastLog(
      cronName,
      `Processing summary: ${successCount} positions processed successfully, ${failureCount} positions failed`,
      successCount > 0 ? "success" : "warning"
    );

    // If there were failures, create a record for manual review
    if (failureCount > 0) {
      const failedPositionIds = results
        .filter((r: any) => !r.success)
        .map((r: any) => r.positionId);

      console.log(
        `Failed to process ${failureCount} positions: ${failedPositionIds.join(", ")}`,
        null,
        __filename
      );

      // Optionally create a task for admin review
      try {
        await models.adminTask.create({
          type: "STAKING_REWARD_FAILURE",
          status: "PENDING",
          data: {
            failedPositionIds,
            executionTime: new Date().toISOString(),
            cronName,
          },
          priority: "HIGH",
          dueDate: addDays(new Date(), 1),
        });
        broadcastLog(
          cronName,
          "Created admin task for failed positions",
          "info"
        );
      } catch (taskError: any) {
        logError(
          "Failed to create admin task for failed positions",
          taskError,
          __filename
        );
      }
    }

    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
      processed: successCount,
      failed: failureCount,
    });

    broadcastLog(
      cronName,
      "Processing of staking positions completed",
      "success"
    );
  } catch (error: any) {
    logError("processStakingPositions", error, __filename);
    broadcastStatus(cronName, "failed", {
      duration: Date.now() - startTime,
      processed: processedCount,
      failed: failedCount,
      skipped: skippedCount,
      error: error.message,
    });
    broadcastLog(
      cronName,
      `Processing of staking positions failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}
