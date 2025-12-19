import { models, sequelize } from "@b/db";
import { logger } from "@b/utils/console";
import { addDays, addHours, isPast } from "date-fns";
import { sendInvestmentEmail } from "@b/utils/emails";
import { createNotification } from "@b/utils/notifications";
import { processRewards } from "@b/utils/affiliate";
import { broadcastStatus, broadcastProgress, broadcastLog } from "@b/cron/broadcast";

interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

// Forex Cron: processForexInvestments runs periodically.
export async function processForexInvestments() {
  const cronName = "processForexInvestments";
  const startTime = Date.now();
  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting Forex investments processing");

    const activeInvestments = await getActiveForexInvestments();
    const total = activeInvestments.length;
    broadcastLog(cronName, `Found ${total} active forex investments`);

    for (let i = 0; i < total; i++) {
      const investment = activeInvestments[i];
      broadcastLog(
        cronName,
        `Processing forex investment id ${investment.id} (current status: ${investment.status})`
      );

      try {
        const updated = await processForexInvestment(investment);
        if (updated) {
          broadcastLog(
            cronName,
            `Successfully processed forex investment id ${investment.id}`,
            "success"
          );
        } else {
          broadcastLog(
            cronName,
            `No update for forex investment id ${investment.id}`,
            "warning"
          );
        }
      } catch (error: any) {
        logger.error(
          "FOREX_INVESTMENT_PROCESS",
          `Error processing investment ${investment.id}: ${error.message}`,
          error
        );
        broadcastLog(
          cronName,
          `Error processing forex investment id ${investment.id}: ${error.message}`,
          "error"
        );
        continue;
      }
      const progress = Math.round(((i + 1) / total) * 100);
      broadcastProgress(cronName, progress);
    }

    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
    });
    broadcastLog(cronName, "Forex investments processing completed", "success");
  } catch (error: any) {
    logger.error("FOREX_INVESTMENT_PROCESS", `Forex investments processing failed: ${error.message}`, error);
    broadcastStatus(cronName, "failed");
    broadcastLog(
      cronName,
      `Forex investments processing failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}

export async function getActiveForexInvestments(ctx?: LogContext) {
  try {
    ctx?.step?.("Fetching active forex investments from database");

    const investments = await models.forexInvestment.findAll({
      where: {
        status: "ACTIVE",
      },
      include: [
        {
          model: models.forexPlan,
          as: "plan",
          attributes: [
            "id",
            "name",
            "title",
            "description",
            "defaultProfit",
            "defaultResult",
            "currency",
            "walletType",
          ],
        },
        {
          model: models.forexDuration,
          as: "duration",
          attributes: ["id", "duration", "timeframe"],
        },
      ],
      order: [
        ["status", "ASC"],
        ["createdAt", "ASC"],
      ],
    });

    ctx?.success?.(`Successfully fetched ${investments.length} active investments`);

    return investments;
  } catch (error) {
    logger.error("FOREX_INVESTMENT_PROCESS", "Failed to get active forex investments", error);
    ctx?.fail?.("Failed to get active forex investments");
    throw error;
  }
}

export async function processForexInvestment(investment: any, retryCount: number = 0, ctx?: LogContext) {
  const cronName = "processForexInvestments";
  const maxRetries = 3;

  try {
    ctx?.step?.(`Processing forex investment ${investment.id}`);

    if (investment.status === "COMPLETED") {
      broadcastLog(
        cronName,
        `Investment ${investment.id} is already COMPLETED; skipping`,
        "info"
      );
      ctx?.step?.("Investment already completed, skipping");
      return null;
    }

    broadcastLog(cronName, `Fetching user for investment ${investment.id}`);
    ctx?.step?.("Fetching user data");
    const user = await fetchUser(investment.userId, ctx);
    if (!user) {
      broadcastLog(
        cronName,
        `User not found for investment ${investment.id}`,
        "error"
      );
      ctx?.fail?.("User not found");
      return null;
    }

    const roi = calculateRoi(investment);
    broadcastLog(
      cronName,
      `Calculated ROI (${roi}) for investment ${investment.id}`
    );
    ctx?.step?.(`Calculated ROI: ${roi}`);

    const investmentResult = determineInvestmentResult(investment);
    broadcastLog(
      cronName,
      `Determined result (${investmentResult}) for investment ${investment.id}`
    );
    ctx?.step?.(`Determined result: ${investmentResult}`);

    if (shouldProcessInvestment(investment, roi, investmentResult)) {
      broadcastLog(
        cronName,
        `Investment ${investment.id} is eligible for processing (end date passed)`
      );
      ctx?.step?.("Investment is eligible for processing");
      const updatedInvestment = await handleInvestmentUpdate(
        investment,
        user,
        roi,
        investmentResult,
        ctx
      );
      if (updatedInvestment) {
        await postProcessInvestment(user, investment, updatedInvestment, ctx);
      }
      ctx?.success?.("Forex investment processed successfully");
      return updatedInvestment;
    } else {
      broadcastLog(
        cronName,
        `Investment ${investment.id} is not ready for processing (end date not reached)`,
        "info"
      );
      ctx?.step?.("Investment not ready for processing (end date not reached)");
      return null;
    }
  } catch (error: any) {
    logger.error("FOREX_INVESTMENT_PROCESS", `Error processing investment ${investment.id}: ${error.message}`, error);
    broadcastLog(
      cronName,
      `Error processing investment ${investment.id}: ${error.message}`,
      "error"
    );
    ctx?.fail?.(error.message);

    // Retry logic
    if (retryCount < maxRetries) {
      broadcastLog(
        cronName,
        `Retrying investment ${investment.id} (attempt ${retryCount + 1}/${maxRetries})`,
        "warning"
      );
      ctx?.step?.(`Retrying (attempt ${retryCount + 1}/${maxRetries})`);

      // Exponential backoff: wait 2^retryCount seconds
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));

      // Retry with incremented count
      return processForexInvestment(investment, retryCount + 1, ctx);
    } else {
      // Max retries reached, mark investment for manual review
      try {
        await models.forexInvestment.update(
          { 
            status: "CANCELLED",
            metadata: JSON.stringify({
              error: error.message,
              failedAt: new Date().toISOString(),
              retries: retryCount
            })
          },
          { where: { id: investment.id } }
        );
        
        broadcastLog(
          cronName,
          `Investment ${investment.id} marked as CANCELLED after ${maxRetries} retries`,
          "error"
        );
        
        // Create notification for admin
        await createNotification({
          userId: investment.userId,
          relatedId: investment.id,
          title: "Forex Investment Processing Failed",
          message: `Investment ${investment.id} failed to process after ${maxRetries} attempts. Manual review required.`,
          type: "system",
          link: `/admin/forex/investment/${investment.id}`,
        });
      } catch (updateError) {
        logger.error("FOREX_INVESTMENT_PROCESS", "Failed to mark investment as cancelled", updateError);
      }
    }

    throw error;
  }
}

async function fetchUser(userId: string, ctx?: LogContext) {
  try {
    ctx?.step?.(`Fetching user ${userId}`);

    const user = await models.user.findByPk(userId);
    if (!user) {
      logger.warn("FOREX_INVESTMENT", `User not found: ${userId}`);
      ctx?.fail?.(`User not found: ${userId}`);
    } else {
      ctx?.success?.("User fetched successfully");
    }
    return user;
  } catch (error) {
    logger.error("FOREX_INVESTMENT_PROCESS", "Failed to fetch user", error);
    ctx?.fail?.("Failed to fetch user");
    throw error;
  }
}

function calculateRoi(investment: any) {
  const roi = investment.profit ?? investment.plan.defaultProfit;
  return roi;
}

function determineInvestmentResult(investment: any): "WIN" | "LOSS" | "DRAW" {
  const result = investment.result || investment.plan.defaultResult;
  return result as "WIN" | "LOSS" | "DRAW";
}

function shouldProcessInvestment(
  investment: any,
  roi: number,
  investmentResult: "WIN" | "LOSS" | "DRAW"
) {
  const endDate = calculateEndDate(investment);
  return isPast(endDate);
}

function calculateEndDate(investment: any) {
  const createdAt = new Date(investment.createdAt);
  let endDate;
  switch (investment.duration.timeframe) {
    case "HOUR":
      endDate = addHours(createdAt, investment.duration.duration);
      break;
    case "DAY":
      endDate = addDays(createdAt, investment.duration.duration);
      break;
    case "WEEK":
      endDate = addDays(createdAt, investment.duration.duration * 7);
      break;
    case "MONTH":
      endDate = addDays(createdAt, investment.duration.duration * 30);
      break;
    default:
      endDate = addHours(createdAt, investment.duration.duration);
      break;
  }
  return endDate;
}

async function handleInvestmentUpdate(
  investment: any,
  user: any,
  roi: number,
  investmentResult: "WIN" | "LOSS" | "DRAW",
  ctx?: LogContext
) {
  const cronName = "processForexInvestments";
  let updatedInvestment;
  // Use a single transaction for all updates
  const t = await sequelize.transaction();
  try {
    broadcastLog(cronName, `Starting update for investment ${investment.id}`);
    ctx?.step?.("Starting investment update transaction");

    const wallet = await fetchWallet(
      user.id,
      investment.plan.currency,
      investment.plan.walletType,
      t,
      ctx
    );
    if (!wallet) {
      broadcastLog(
        cronName,
        `Wallet not found for user ${user.id} (investment ${investment.id})`,
        "error"
      );
      ctx?.fail?.("Wallet not found");
      await t.rollback();
      return null;
    }

    const amount = investment.amount ?? 0;
    const newBalance = wallet.balance;
    broadcastLog(
      cronName,
      `Fetched wallet. Current balance: ${newBalance}, investment amount: ${amount}`
    );

    if (investmentResult === "WIN") {
      ctx?.step?.("Processing WIN case - updating wallet balance");
      await models.wallet.update(
        { balance: newBalance + amount + roi },
        { where: { id: wallet.id }, transaction: t }
      );
      broadcastLog(
        cronName,
        `Wallet updated for WIN case. New balance: ${newBalance + amount + roi}`
      );
      ctx?.step?.("Creating transaction record for WIN case");
      await models.transaction.create(
        {
          userId: wallet.userId,
          walletId: wallet.id,
          amount: roi,
          description: `Investment ROI: Plan "${investment.plan.title}" | Duration: ${investment.duration.duration} ${investment.duration.timeframe}`,
          status: "COMPLETED",
          type: "FOREX_INVESTMENT_ROI",
        },
        { transaction: t }
      );
      broadcastLog(
        cronName,
        `Transaction record created for WIN case for investment ${investment.id}`
      );
      ctx?.step?.("Updating investment status to COMPLETED");
      await models.forexInvestment.update(
        { status: "COMPLETED", result: investmentResult, profit: roi },
        { where: { id: investment.id }, transaction: t }
      );
      broadcastLog(
        cronName,
        `Forex investment ${investment.id} updated to COMPLETED (WIN)`
      );

      // Log the investment completion
      logger.info(
        "FOREX_INVESTMENT_COMPLETION",
        `Forex investment ${investment.id} completed for user ${user.id} with result: ${investmentResult}, ROI: ${roi}`
      );
    } else if (investmentResult === "LOSS") {
      // In LOSS case, roi represents the loss amount (negative value)
      // Return the remaining amount after deducting the loss
      ctx?.step?.("Processing LOSS case - calculating remaining amount");
      const remainingAmount = Math.max(0, amount - Math.abs(roi));
      await models.wallet.update(
        { balance: newBalance + remainingAmount },
        { where: { id: wallet.id }, transaction: t }
      );
      broadcastLog(
        cronName,
        `Wallet updated for LOSS case. New balance: ${newBalance + remainingAmount}`
      );
      ctx?.step?.("Creating transaction record for LOSS case");
      await models.transaction.create(
        {
          userId: wallet.userId,
          walletId: wallet.id,
          amount: -Math.abs(roi),
          description: `Investment ROI: Plan "${investment.plan.title}" | Duration: ${investment.duration.duration} ${investment.duration.timeframe}`,
          status: "COMPLETED",
          type: "FOREX_INVESTMENT_ROI",
        },
        { transaction: t }
      );
      broadcastLog(
        cronName,
        `Transaction record created for LOSS case for investment ${investment.id}`
      );
      ctx?.step?.("Updating investment status to COMPLETED");
      await models.forexInvestment.update(
        { status: "COMPLETED", result: investmentResult, profit: roi },
        { where: { id: investment.id }, transaction: t }
      );
      broadcastLog(
        cronName,
        `Forex investment ${investment.id} updated to COMPLETED (LOSS)`
      );

      // Log the investment completion
      logger.info(
        "FOREX_INVESTMENT_COMPLETION",
        `Forex investment ${investment.id} completed for user ${user.id} with result: ${investmentResult}, Loss: ${-Math.abs(roi)}`
      );
    } else {
      // For DRAW or other cases
      ctx?.step?.("Processing DRAW case - returning original amount");
      await models.wallet.update(
        { balance: newBalance + amount },
        { where: { id: wallet.id }, transaction: t }
      );
      broadcastLog(
        cronName,
        `Wallet updated for DRAW case. New balance: ${newBalance + amount}`
      );
      ctx?.step?.("Creating transaction record for DRAW case");
      await models.transaction.create(
        {
          userId: wallet.userId,
          walletId: wallet.id,
          amount: 0,
          description: `Investment ROI: Plan "${investment.plan.title}" | Duration: ${investment.duration.duration} ${investment.duration.timeframe}`,
          status: "COMPLETED",
          type: "FOREX_INVESTMENT_ROI",
        },
        { transaction: t }
      );
      broadcastLog(
        cronName,
        `Transaction record created for DRAW case for investment ${investment.id}`
      );
      ctx?.step?.("Updating investment status to COMPLETED");
      await models.forexInvestment.update(
        { status: "COMPLETED", result: investmentResult, profit: roi },
        { where: { id: investment.id }, transaction: t }
      );
      broadcastLog(
        cronName,
        `Forex investment ${investment.id} updated to COMPLETED (DRAW)`
      );

      // Log the investment completion
      logger.info(
        "FOREX_INVESTMENT_COMPLETION",
        `Forex investment ${investment.id} completed for user ${user.id} with result: ${investmentResult}, No gain or loss`
      );
    }

    ctx?.step?.("Fetching updated investment");
    updatedInvestment = await models.forexInvestment.findByPk(investment.id, {
      include: [
        { model: models.forexPlan, as: "plan" },
        { model: models.forexDuration, as: "duration" },
      ],
      transaction: t,
    });
    ctx?.step?.("Committing transaction");
    await t.commit();
    broadcastLog(
      cronName,
      `Transaction committed for investment ${investment.id}`,
      "success"
    );
    ctx?.success?.("Investment updated successfully");
  } catch (error: any) {
    await t.rollback();
    broadcastLog(
      cronName,
      `Error updating investment ${investment.id}: ${error.message}`,
      "error"
    );
    logger.error("FOREX_INVESTMENT_UPDATE", "Error updating investment", error);
    ctx?.fail?.(error.message);
    return null;
  }
  return updatedInvestment;
}

async function fetchWallet(
  userId: string,
  currency: string,
  walletType: string,
  transaction: any,
  ctx?: LogContext
) {
  try {
    ctx?.step?.(`Fetching wallet for user ${userId} (${walletType} ${currency})`);

    const wallet = await models.wallet.findOne({
      where: { userId, currency, type: walletType },
      transaction,
    });
    if (!wallet) {
      ctx?.fail?.("Wallet not found");
      throw new Error("Wallet not found");
    }

    ctx?.success?.("Wallet fetched successfully");
    return wallet;
  } catch (error) {
    logger.error("FOREX_INVESTMENT_PROCESS", "Failed to fetch wallet", error);
    ctx?.fail?.("Failed to fetch wallet");
    throw error;
  }
}

async function postProcessInvestment(
  user: any,
  investment: any,
  updatedInvestment: any,
  ctx?: LogContext
) {
  const cronName = "processForexInvestments";
  try {
    broadcastLog(
      cronName,
      `Sending investment email for investment ${investment.id}`
    );
    ctx?.step?.("Sending investment completion email");
    await sendInvestmentEmail(
      user,
      investment.plan,
      investment.duration,
      updatedInvestment,
      "ForexInvestmentCompleted"
    );
    broadcastLog(
      cronName,
      `Investment email sent for investment ${investment.id}`,
      "success"
    );

    broadcastLog(
      cronName,
      `Creating notification for investment ${investment.id}`
    );
    ctx?.step?.("Creating completion notification");
    await createNotification({
      userId: user.id,
      relatedId: updatedInvestment.id,
      title: "Forex Investment Completed",
      message: `Your Forex investment of ${investment.amount} ${investment.plan.currency} has been completed with a status of ${updatedInvestment.result}`,
      type: "system",
      link: `/forex/investments/${updatedInvestment.id}`,
      actions: [
        {
          label: "View Investment",
          link: `/forex/investments/${updatedInvestment.id}`,
          primary: true,
        },
      ],
    });
    broadcastLog(
      cronName,
      `Notification created for investment ${investment.id}`,
      "success"
    );

    broadcastLog(
      cronName,
      `Processing rewards for investment ${investment.id}`
    );
    ctx?.step?.("Processing affiliate rewards");
    await processRewards(
      user.id,
      investment.amount ?? 0,
      "FOREX_INVESTMENT",
      investment.plan.currency
    );
    broadcastLog(
      cronName,
      `Rewards processed for investment ${investment.id}`,
      "success"
    );
    ctx?.success?.("Post-processing completed successfully");
  } catch (error: any) {
    broadcastLog(
      cronName,
      `Error in postProcessInvestment for ${investment.id}: ${error.message}`,
      "error"
    );
    logger.error("FOREX_INVESTMENT_POST_PROCESS", `Error in postProcessInvestment for ${investment.id}: ${error.message}`, error);
    ctx?.fail?.(error.message);
  }
}
