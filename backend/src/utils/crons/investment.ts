import { models, sequelize } from "@b/db";
import { logError } from "../logger";
import { addDays, addHours, isPast } from "date-fns";
import { sendInvestmentEmail } from "../emails";
import { createNotification } from "../notifications";
import { processRewards } from "../affiliate";
import { broadcastStatus, broadcastProgress, broadcastLog } from "./broadcast";

export async function processGeneralInvestments() {
  const cronName = "processGeneralInvestments";
  const startTime = Date.now();
  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting general investments processing");

    const activeInvestments = await getActiveGeneralInvestments();
    const total = activeInvestments.length;
    broadcastLog(cronName, `Found ${total} active general investments`);

    for (let i = 0; i < total; i++) {
      const investment = activeInvestments[i];
      broadcastLog(
        cronName,
        `Processing general investment id ${investment.id}`
      );
      try {
        await processGeneralInvestment(investment);
        broadcastLog(
          cronName,
          `Processed investment id ${investment.id}`,
          "success"
        );
      } catch (error: any) {
        logError(
          `processGeneralInvestments - investment ${investment.id}`,
          error,
          __filename
        );
        broadcastLog(
          cronName,
          `Error processing investment id ${investment.id}: ${error.message}`,
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
    broadcastLog(
      cronName,
      "General investments processing completed",
      "success"
    );
  } catch (error: any) {
    logError("processGeneralInvestments", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(
      cronName,
      `General investments processing failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}

export async function getActiveGeneralInvestments() {
  try {
    return await models.investment.findAll({
      where: {
        status: "ACTIVE",
      },
      include: [
        {
          model: models.investmentPlan,
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
          model: models.investmentDuration,
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
    logError("getActiveGeneralInvestments", error, __filename);
    throw error;
  }
}

export async function processGeneralInvestment(investment: any) {
  const cronName = "processGeneralInvestments";
  const { id, duration, createdAt, amount, profit, result, plan, userId } =
    investment;

  if (investment.status === "COMPLETED") {
    broadcastLog(
      cronName,
      `Investment ${id} is already COMPLETED; skipping`,
      "info"
    );
    return null;
  }

  // Fetch the user for this investment
  broadcastLog(cronName, `Fetching user for investment ${id}`);
  const user = await models.user.findByPk(userId);
  if (!user) {
    broadcastLog(cronName, `User not found for investment ${id}`, "error");
    logError(
      `processGeneralInvestment`,
      new Error("User not found"),
      __filename
    );
    return null;
  }

  // Calculate ROI and determine result
  const roi = profit || plan.defaultProfit;
  broadcastLog(cronName, `Calculated ROI (${roi}) for investment ${id}`);

  const investmentResult = result || plan.defaultResult;
  broadcastLog(
    cronName,
    `Determined result (${investmentResult}) for investment ${id}`
  );

  // Calculate the end date based on the timeframe
  let endDate;
  switch (duration.timeframe) {
    case "HOUR":
      endDate = addHours(new Date(createdAt), duration.duration);
      break;
    case "DAY":
      endDate = addDays(new Date(createdAt), duration.duration);
      break;
    case "WEEK":
      endDate = addDays(new Date(createdAt), duration.duration * 7);
      break;
    case "MONTH":
      endDate = addDays(new Date(createdAt), duration.duration * 30);
      break;
    default:
      endDate = addHours(new Date(createdAt), duration.duration);
      break;
  }
  broadcastLog(
    cronName,
    `Calculated end date (${endDate.toISOString()}) for investment ${id}`
  );

  if (!isPast(endDate)) {
    broadcastLog(
      cronName,
      `Investment ${id} is not ready for processing (end date not reached)`,
      "info"
    );
    return null;
  }
  broadcastLog(
    cronName,
    `Investment ${id} is eligible for processing (end date passed)`
  );

  // Process investment update within a transaction
  let updatedInvestment;
  try {
    broadcastLog(cronName, `Starting update for investment ${id}`);
    updatedInvestment = await sequelize.transaction(async (transaction) => {
      broadcastLog(cronName, `Fetching wallet for investment ${id}`);
      const wallet = await models.wallet.findOne({
        where: {
          userId: userId,
          currency: plan.currency,
          type: plan.walletType,
        },
        transaction,
      });
      if (!wallet) {
        broadcastLog(
          cronName,
          `Wallet not found for user ${userId} in investment ${id}`,
          "error"
        );
        throw new Error("Wallet not found");
      }
      broadcastLog(
        cronName,
        `Wallet found with balance ${wallet.balance} for investment ${id}`
      );

      const newBalance =
        wallet.balance +
        (investmentResult === "WIN"
          ? roi
          : investmentResult === "LOSS"
            ? -roi
            : 0);

      await models.wallet.update(
        { balance: newBalance },
        { where: { id: wallet.id }, transaction }
      );
      broadcastLog(
        cronName,
        `Wallet updated for investment ${id}. New balance: ${newBalance}`
      );

      await models.investment.update(
        {
          status: "COMPLETED",
          result: investmentResult,
          profit: roi,
        },
        { where: { id }, transaction }
      );
      broadcastLog(
        cronName,
        `Investment ${id} updated to COMPLETED with result ${investmentResult}`
      );

      const foundInvestment = await models.investment.findByPk(id, {
        include: [
          { model: models.investmentPlan, as: "plan" },
          { model: models.investmentDuration, as: "duration" },
        ],
        transaction,
      });
      return foundInvestment;
    });
    broadcastLog(
      cronName,
      `Transaction committed for investment ${id}`,
      "success"
    );
  } catch (error: any) {
    logError(`processGeneralInvestment`, error, __filename);
    broadcastLog(
      cronName,
      `Error updating investment ${id}: ${error.message}`,
      "error"
    );
    return null;
  }

  // Post-processing: email, notification, rewards
  if (updatedInvestment) {
    try {
      broadcastLog(cronName, `Sending investment email for investment ${id}`);
      await sendInvestmentEmail(
        user,
        plan,
        duration,
        updatedInvestment,
        "InvestmentCompleted"
      );
      broadcastLog(
        cronName,
        `Investment email sent for investment ${id}`,
        "success"
      );

      broadcastLog(cronName, `Creating notification for investment ${id}`);
      await createNotification({
        userId: user.id,
        relatedId: updatedInvestment.id,
        title: "General Investment Completed",
        message: `Your general investment of ${amount} ${plan.currency} has been completed with a status of ${investmentResult}.`,
        type: "system",
        link: `/investments/${updatedInvestment.id}`,
        actions: [
          {
            label: "View Investment",
            link: `/investments/${updatedInvestment.id}`,
            primary: true,
          },
        ],
      });
      broadcastLog(
        cronName,
        `Notification created for investment ${id}`,
        "success"
      );
    } catch (error: any) {
      logError(`processGeneralInvestment`, error, __filename);
      broadcastLog(
        cronName,
        `Error sending email/notification for investment ${id}: ${error.message}`,
        "error"
      );
    }

    try {
      broadcastLog(cronName, `Processing rewards for investment ${id}`);
      await processRewards(
        user.id,
        amount,
        "GENERAL_INVESTMENT",
        plan.currency
      );
      broadcastLog(
        cronName,
        `Rewards processed for investment ${id}`,
        "success"
      );
    } catch (error: any) {
      logError(`processGeneralInvestment`, error, __filename);
      broadcastLog(
        cronName,
        `Error processing rewards for investment ${id}: ${error.message}`,
        "error"
      );
    }
  }

  return updatedInvestment;
}
