import { models, sequelize } from "@b/db";
import { logError } from "../logger";
import { addDays, addHours, isPast } from "date-fns";
import { sendInvestmentEmail } from "../emails";
import { createNotification } from "../notifications";
import { processRewards } from "../affiliate";
import { broadcastStatus, broadcastProgress, broadcastLog } from "./broadcast";
import { logInfo } from "../logger";

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
        logError(
          `processForexInvestments - investment ${investment.id}`,
          error,
          __filename
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
    logError("processForexInvestments", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(
      cronName,
      `Forex investments processing failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}

export async function getActiveForexInvestments() {
  try {
    return await models.forexInvestment.findAll({
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
  } catch (error) {
    logError("getActiveForexInvestments", error, __filename);
    throw error;
  }
}

export async function processForexInvestment(investment: any, retryCount: number = 0) {
  const cronName = "processForexInvestments";
  const maxRetries = 3;
  
  try {
    if (investment.status === "COMPLETED") {
      broadcastLog(
        cronName,
        `Investment ${investment.id} is already COMPLETED; skipping`,
        "info"
      );
      return null;
    }

    broadcastLog(cronName, `Fetching user for investment ${investment.id}`);
    const user = await fetchUser(investment.userId);
    if (!user) {
      broadcastLog(
        cronName,
        `User not found for investment ${investment.id}`,
        "error"
      );
      return null;
    }

    const roi = calculateRoi(investment);
    broadcastLog(
      cronName,
      `Calculated ROI (${roi}) for investment ${investment.id}`
    );

    const investmentResult = determineInvestmentResult(investment);
    broadcastLog(
      cronName,
      `Determined result (${investmentResult}) for investment ${investment.id}`
    );

    if (shouldProcessInvestment(investment, roi, investmentResult)) {
      broadcastLog(
        cronName,
        `Investment ${investment.id} is eligible for processing (end date passed)`
      );
      const updatedInvestment = await handleInvestmentUpdate(
        investment,
        user,
        roi,
        investmentResult
      );
      if (updatedInvestment) {
        await postProcessInvestment(user, investment, updatedInvestment);
      }
      return updatedInvestment;
    } else {
      broadcastLog(
        cronName,
        `Investment ${investment.id} is not ready for processing (end date not reached)`,
        "info"
      );
      return null;
    }
  } catch (error: any) {
    logError(`processForexInvestment - General`, error, __filename);
    broadcastLog(
      cronName,
      `Error processing investment ${investment.id}: ${error.message}`,
      "error"
    );
    
    // Retry logic
    if (retryCount < maxRetries) {
      broadcastLog(
        cronName,
        `Retrying investment ${investment.id} (attempt ${retryCount + 1}/${maxRetries})`,
        "warning"
      );
      
      // Exponential backoff: wait 2^retryCount seconds
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      
      // Retry with incremented count
      return processForexInvestment(investment, retryCount + 1);
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
        logError(`processForexInvestment - Failed to mark as cancelled`, updateError, __filename);
      }
    }
    
    throw error;
  }
}

async function fetchUser(userId: string) {
  try {
    const user = await models.user.findByPk(userId);
    if (!user) {
      logError(`fetchUser`, new Error(`User not found: ${userId}`), __filename);
    }
    return user;
  } catch (error) {
    logError(`fetchUser`, error, __filename);
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
  investmentResult: "WIN" | "LOSS" | "DRAW"
) {
  const cronName = "processForexInvestments";
  let updatedInvestment;
  // Use a single transaction for all updates
  const t = await sequelize.transaction();
  try {
    broadcastLog(cronName, `Starting update for investment ${investment.id}`);

    const wallet = await fetchWallet(
      user.id,
      investment.plan.currency,
      investment.plan.walletType,
      t
    );
    if (!wallet) {
      broadcastLog(
        cronName,
        `Wallet not found for user ${user.id} (investment ${investment.id})`,
        "error"
      );
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
      await models.wallet.update(
        { balance: newBalance + amount + roi },
        { where: { id: wallet.id }, transaction: t }
      );
      broadcastLog(
        cronName,
        `Wallet updated for WIN case. New balance: ${newBalance + amount + roi}`
      );
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
      await models.forexInvestment.update(
        { status: "COMPLETED", result: investmentResult, profit: roi },
        { where: { id: investment.id }, transaction: t }
      );
      broadcastLog(
        cronName,
        `Forex investment ${investment.id} updated to COMPLETED (WIN)`
      );
      
      // Log the investment completion
      logInfo(
        "forex-investment-completion",
        `Forex investment ${investment.id} completed for user ${user.id} with result: ${investmentResult}, ROI: ${roi}`,
        __filename
      );
    } else if (investmentResult === "LOSS") {
      // In LOSS case, roi represents the loss amount (negative value)
      // Return the remaining amount after deducting the loss
      const remainingAmount = Math.max(0, amount - Math.abs(roi));
      await models.wallet.update(
        { balance: newBalance + remainingAmount },
        { where: { id: wallet.id }, transaction: t }
      );
      broadcastLog(
        cronName,
        `Wallet updated for LOSS case. New balance: ${newBalance + remainingAmount}`
      );
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
      await models.forexInvestment.update(
        { status: "COMPLETED", result: investmentResult, profit: roi },
        { where: { id: investment.id }, transaction: t }
      );
      broadcastLog(
        cronName,
        `Forex investment ${investment.id} updated to COMPLETED (LOSS)`
      );
      
      // Log the investment completion
      logInfo(
        "forex-investment-completion",
        `Forex investment ${investment.id} completed for user ${user.id} with result: ${investmentResult}, Loss: ${-Math.abs(roi)}`,
        __filename
      );
    } else {
      // For DRAW or other cases
      await models.wallet.update(
        { balance: newBalance + amount },
        { where: { id: wallet.id }, transaction: t }
      );
      broadcastLog(
        cronName,
        `Wallet updated for DRAW case. New balance: ${newBalance + amount}`
      );
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
      await models.forexInvestment.update(
        { status: "COMPLETED", result: investmentResult, profit: roi },
        { where: { id: investment.id }, transaction: t }
      );
      broadcastLog(
        cronName,
        `Forex investment ${investment.id} updated to COMPLETED (DRAW)`
      );
      
      // Log the investment completion
      logInfo(
        "forex-investment-completion",
        `Forex investment ${investment.id} completed for user ${user.id} with result: ${investmentResult}, No gain or loss`,
        __filename
      );
    }

    updatedInvestment = await models.forexInvestment.findByPk(investment.id, {
      include: [
        { model: models.forexPlan, as: "plan" },
        { model: models.forexDuration, as: "duration" },
      ],
      transaction: t,
    });
    await t.commit();
    broadcastLog(
      cronName,
      `Transaction committed for investment ${investment.id}`,
      "success"
    );
  } catch (error: any) {
    await t.rollback();
    broadcastLog(
      cronName,
      `Error updating investment ${investment.id}: ${error.message}`,
      "error"
    );
    logError(`handleInvestmentUpdate`, error, __filename);
    return null;
  }
  return updatedInvestment;
}

async function fetchWallet(
  userId: string,
  currency: string,
  walletType: string,
  transaction: any
) {
  try {
    const wallet = await models.wallet.findOne({
      where: { userId, currency, type: walletType },
      transaction,
    });
    if (!wallet) throw new Error("Wallet not found");
    return wallet;
  } catch (error) {
    logError(`fetchWallet`, error, __filename);
    throw error;
  }
}

async function postProcessInvestment(
  user: any,
  investment: any,
  updatedInvestment: any
) {
  const cronName = "processForexInvestments";
  try {
    broadcastLog(
      cronName,
      `Sending investment email for investment ${investment.id}`
    );
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
  } catch (error: any) {
    broadcastLog(
      cronName,
      `Error in postProcessInvestment for ${investment.id}: ${error.message}`,
      "error"
    );
    logError(`postProcessInvestment`, error, __filename);
  }
}
