import { models, sequelize } from "@b/db";
import { logError } from "../logger";
import { addDays, addHours, isPast } from "date-fns";
import { getTransactionByRefId } from "@b/api/finance/transaction/[id]/index.get";
import { getWalletById } from "@b/api/finance/wallet/utils";
import { sendAiInvestmentEmail } from "../emails";
import { createNotification } from "../notifications";
import { processRewards } from "../affiliate";
import { broadcastStatus, broadcastProgress, broadcastLog } from "./broadcast";

// 1. Main cron entry point: runs on a schedule
export async function processAiInvestments() {
  const cronName = "processAiInvestments";
  const startTime = Date.now();
  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting AI investments processing");

    const activeInvestments = await getActiveInvestments();
    const total = activeInvestments.length;
    broadcastLog(cronName, `Found ${total} active AI investments`);

    // Process each active AI investment
    for (let i = 0; i < total; i++) {
      const investment = activeInvestments[i];
      broadcastLog(
        cronName,
        `Processing AI investment id ${investment.id} (current status: ${investment.status})`
      );

      try {
        // Attempt to process this investment
        const updated = await processAiInvestment(investment);
        if (updated) {
          broadcastLog(
            cronName,
            `Successfully processed AI investment id ${investment.id}`,
            "success"
          );
        } else {
          broadcastLog(
            cronName,
            `No update for AI investment id ${investment.id}`,
            "warning"
          );
        }
      } catch (error: any) {
        // If an error happens in processing this one, log/broadcast but continue with others
        logError(
          `processAiInvestments - investment ${investment.id}`,
          error,
          __filename
        );
        broadcastLog(
          cronName,
          `Error processing AI investment id ${investment.id}: ${error.message}`,
          "error"
        );
        continue;
      }

      // Broadcast incremental progress
      const progress = Math.round(((i + 1) / total) * 100);
      broadcastProgress(cronName, progress);
    }

    // All done
    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
    });
    broadcastLog(cronName, "AI investments processing completed", "success");
  } catch (error: any) {
    logError("processAiInvestments", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(
      cronName,
      `AI investments processing failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}

// 2. Fetch all active AI investments from the DB
export async function getActiveInvestments() {
  try {
    return await models.aiInvestment.findAll({
      where: { status: "ACTIVE" },
      include: [
        {
          model: models.aiInvestmentPlan,
          as: "plan",
          attributes: [
            "id",
            "name",
            "title",
            "description",
            "defaultProfit",
            "defaultResult",
          ],
        },
        {
          model: models.aiInvestmentDuration,
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
    logError("getActiveInvestments", error, __filename);
    throw error;
  }
}

// 3. Process a single AI investment
export async function processAiInvestment(investment: any) {
  const cronName = "processAiInvestments";
  try {
    // If it's already completed, skip
    if (investment.status === "COMPLETED") {
      broadcastLog(
        cronName,
        `Investment ${investment.id} is already COMPLETED; skipping`,
        "info"
      );
      return null;
    }

    // Fetch user
    broadcastLog(cronName, `Fetching user for AI investment ${investment.id}`);
    const user = await models.user.findByPk(investment.userId);
    if (!user) {
      broadcastLog(
        cronName,
        `User not found for AI investment ${investment.id}`,
        "error"
      );
      return null;
    }

    // Calculate ROI and result
    const roi = investment.profit ?? investment.plan.defaultProfit;
    broadcastLog(
      cronName,
      `Calculated ROI (${roi}) for AI investment ${investment.id}`
    );
    const investmentResult = investment.result || investment.plan.defaultResult;
    broadcastLog(
      cronName,
      `Determined result (${investmentResult}) for AI investment ${investment.id}`
    );

    // Check if end date has passed
    const endDate = calculateEndDate(investment);
    if (isPast(endDate)) {
      broadcastLog(
        cronName,
        `AI investment ${investment.id} is eligible for processing (end date passed)`
      );
      // Attempt to update the investment
      const updatedInvestment = await handleAiInvestmentUpdate(
        investment,
        user,
        roi,
        investmentResult
      );
      if (updatedInvestment) {
        // If updated, do post-processing
        await postProcessAiInvestment(user, investment, updatedInvestment);
      }
      return updatedInvestment;
    } else {
      broadcastLog(
        cronName,
        `AI investment ${investment.id} is not ready (end date not reached)`,
        "info"
      );
      return null;
    }
  } catch (error: any) {
    logError(`processAiInvestment - General`, error, __filename);
    broadcastLog(
      cronName,
      `General error processing AI investment ${investment.id}: ${error.message}`,
      "error"
    );
    throw error;
  }
}

// 4. Helper to compute the end date
function calculateEndDate(investment: any) {
  const createdAt = new Date(investment.createdAt);
  switch (investment.duration.timeframe) {
    case "HOUR":
      return addHours(createdAt, investment.duration.duration);
    case "DAY":
      return addDays(createdAt, investment.duration.duration);
    case "WEEK":
      return addDays(createdAt, investment.duration.duration * 7);
    case "MONTH":
      return addDays(createdAt, investment.duration.duration * 30);
    default:
      return addHours(createdAt, investment.duration.duration);
  }
}

// 5. Single transaction to update wallet, create transaction, mark investment completed
async function handleAiInvestmentUpdate(
  investment: any,
  user: any,
  roi: number,
  investmentResult: string
) {
  const cronName = "processAiInvestments";
  let updatedInvestment;
  const t = await sequelize.transaction();
  try {
    broadcastLog(
      cronName,
      `Starting update for AI investment ${investment.id}`
    );

    // 5a. Ensure transaction record and wallet exist
    const transactionRecord = await getTransactionByRefId(investment.id);
    if (!transactionRecord) {
      broadcastLog(
        cronName,
        `Transaction not found for AI investment ${investment.id}, removing investment`,
        "error"
      );
      await models.aiInvestment.destroy({
        where: { id: investment.id },
        transaction: t,
      });
      await t.commit();
      return null;
    }

    const wallet = await getWalletById(transactionRecord.walletId);
    if (!wallet) {
      broadcastLog(
        cronName,
        `Wallet not found for user ${user.id} (AI investment ${investment.id})`,
        "error"
      );
      await t.rollback();
      return null;
    }

    // 5b. Calculate new wallet balance
    const amount = investment.amount ?? 0;
    let newBalance = wallet.balance;
    if (investmentResult === "WIN") {
      newBalance += amount + roi;
    } else if (investmentResult === "LOSS") {
      newBalance += amount - roi;
    } else {
      // e.g. "DRAW"
      newBalance += amount;
    }
    broadcastLog(
      cronName,
      `Calculated new wallet balance: ${newBalance} for AI investment ${investment.id}`
    );

    // 5c. Update wallet
    await models.wallet.update(
      { balance: newBalance },
      { where: { id: wallet.id }, transaction: t }
    );
    broadcastLog(
      cronName,
      `Wallet updated for AI investment ${investment.id}. New balance: ${newBalance}`
    );

    // 5d. Create transaction record for ROI
    let transactionAmount = 0;
    if (investmentResult === "WIN") {
      transactionAmount = roi;
    } else if (investmentResult === "LOSS") {
      transactionAmount = -roi;
    }
    await models.transaction.create(
      {
        userId: wallet.userId,
        walletId: wallet.id,
        amount: transactionAmount,
        description: `Investment ROI: Plan "${investment.plan.title}" | Duration: ${investment.duration.duration} ${investment.duration.timeframe}`,
        status: "COMPLETED",
        type: "AI_INVESTMENT_ROI",
      },
      { transaction: t }
    );
    broadcastLog(
      cronName,
      `Transaction record created for AI investment ${investment.id} (${investmentResult} case)`
    );

    // 5e. Mark AI investment as completed
    await models.aiInvestment.update(
      {
        status: "COMPLETED",
        result: investmentResult,
        profit: roi,
      },
      { where: { id: investment.id }, transaction: t }
    );
    broadcastLog(
      cronName,
      `AI investment ${investment.id} updated to COMPLETED (${investmentResult})`
    );

    // 5f. Reload the updated record
    updatedInvestment = await models.aiInvestment.findByPk(investment.id, {
      include: [
        { model: models.aiInvestmentPlan, as: "plan" },
        { model: models.aiInvestmentDuration, as: "duration" },
      ],
      transaction: t,
    });

    await t.commit();
    broadcastLog(
      cronName,
      `Transaction committed for AI investment ${investment.id}`,
      "success"
    );
  } catch (error: any) {
    await t.rollback();
    broadcastLog(
      cronName,
      `Error updating AI investment ${investment.id}: ${error.message}`,
      "error"
    );
    logError(`handleAiInvestmentUpdate`, error, __filename);
    return null;
  }
  return updatedInvestment;
}

// 6. Post-processing: email, notification, rewards
async function postProcessAiInvestment(
  user: any,
  investment: any,
  updatedInvestment: any
) {
  const cronName = "processAiInvestments";
  try {
    // 6a. Send AI investment completion email
    broadcastLog(
      cronName,
      `Sending AI investment email for investment ${investment.id}`
    );
    await sendAiInvestmentEmail(
      user,
      investment.plan,
      investment.duration,
      updatedInvestment,
      "AiInvestmentCompleted"
    );
    broadcastLog(
      cronName,
      `AI investment email sent for investment ${investment.id}`,
      "success"
    );

    // 6b. Create completion notification
    broadcastLog(
      cronName,
      `Creating notification for AI investment ${investment.id}`
    );
    await createNotification({
      userId: user.id,
      relatedId: updatedInvestment.id,
      title: "AI Investment Completed",
      message: `Your AI investment of ${investment.amount} ${updatedInvestment?.plan?.currency} has been completed with a status of ${updatedInvestment.result}`,
      type: "system",
      link: `/ai/investments/${updatedInvestment.id}`,
      actions: [
        {
          label: "View Investment",
          link: `/ai/investments/${updatedInvestment.id}`,
          primary: true,
        },
      ],
    });
    broadcastLog(
      cronName,
      `Notification created for AI investment ${investment.id}`,
      "success"
    );

    // 6c. Process affiliate rewards
    broadcastLog(
      cronName,
      `Processing rewards for AI investment ${investment.id}`
    );
    await processRewards(
      user.id,
      investment.amount ?? 0,
      "AI_INVESTMENT",
      updatedInvestment?.plan?.currency
    );
    broadcastLog(
      cronName,
      `Rewards processed for AI investment ${investment.id}`,
      "success"
    );
  } catch (error: any) {
    broadcastLog(
      cronName,
      `Error in postProcessAiInvestment for ${investment.id}: ${error.message}`,
      "error"
    );
    logError(`postProcessAiInvestment`, error, __filename);
  }
}
