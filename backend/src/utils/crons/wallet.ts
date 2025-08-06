import ExchangeManager from "@b/utils/exchange";
import { models } from "@b/db";
import { logError } from "../logger";
import { Op } from "sequelize";
import { add, format, subDays } from "date-fns";
import { broadcastStatus, broadcastProgress, broadcastLog } from "./broadcast";
import {
  spotVerificationIntervals,
  startSpotVerificationSchedule,
  updateSpotWalletBalance,
} from "@b/api/finance/deposit/spot/index.ws";
import { updateTransaction } from "@b/api/finance/utils";
import { createNotification } from "../notifications";
import { walletPnlTaskQueue } from "./walletTask";

// Safe import for MatchingEngine (only available if extension is installed)
async function getMatchingEngine() {
  try {
    // @ts-ignore - Dynamic import for optional extension
    const matchingEngineModule = await import("../../api/(ext)/ecosystem/utils/matchingEngine");
    return matchingEngineModule.MatchingEngine.getInstance();
  } catch (error) {
    // Return a basic stub if extension not available
    return {
      getTickers: async () => ({})
    };
  }
}

export async function processWalletPnl() {
  const cronName = "processWalletPnl";
  const startTime = Date.now();
  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting wallet PnL processing");

    const users = await models.user.findAll({ attributes: ["id"] });
    broadcastLog(cronName, `Found ${users.length} users to process`);

    for (const user of users) {
      broadcastLog(cronName, `Scheduling PnL task for user ${user.id}`);
      walletPnlTaskQueue.add(() => handlePnl(user));
    }

    broadcastStatus(cronName, "completed", {
      duration: Date.now() - startTime,
    });
    broadcastLog(cronName, "Wallet PnL processing scheduled", "success");
  } catch (error: any) {
    logError("processWalletPnl", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(
      cronName,
      `Wallet PnL processing failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}

const handlePnl = async (user: any) => {
  const cronName = "processWalletPnl";
  try {
    broadcastLog(cronName, `Handling PnL for user ${user.id}`);
    const wallets = await models.wallet.findAll({
      where: { userId: user.id },
      attributes: ["currency", "balance", "type"],
    });
    broadcastLog(cronName, `User ${user.id} has ${wallets.length} wallets`);

    if (!wallets.length) {
      broadcastLog(cronName, `No wallets found for user ${user.id}`, "info");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    broadcastLog(cronName, `Today date set to ${today.toISOString()}`);

    const uniqueCurrencies = Array.from(wallets.map((w) => w.currency));
    broadcastLog(
      cronName,
      `Unique currencies for user ${user.id}: ${uniqueCurrencies.join(", ")}`
    );

    const [todayPnl, currencyPrices, exchangePrices, engine] =
      await Promise.all([
        models.walletPnl.findOne({
          where: {
            userId: user.id,
            createdAt: { [Op.gte]: today },
          },
          attributes: ["id", "balances"],
        }),
        models.currency.findAll({
          where: { id: uniqueCurrencies },
          attributes: ["id", "price"],
        }),
        models.exchangeCurrency.findAll({
          where: { currency: uniqueCurrencies },
          attributes: ["currency", "price"],
        }),
        getMatchingEngine(),
      ]);
    broadcastLog(cronName, `Parallel queries completed for user ${user.id}`);

    const tickers = await engine.getTickers();
    broadcastLog(cronName, "Tickers fetched from MatchingEngine");

    const currencyMap = new Map(
      currencyPrices.map((item) => [item.id, item.price])
    );
    const exchangeMap = new Map(
      exchangePrices.map((item) => [item.currency, item.price])
    );

    const balances = { FIAT: 0, SPOT: 0, ECO: 0 };
    for (const wallet of wallets) {
      let price;
      if (wallet.type === "FIAT") {
        price = currencyMap.get(wallet.currency);
      } else if (wallet.type === "SPOT") {
        price = exchangeMap.get(wallet.currency);
      } else if (wallet.type === "ECO") {
        price = tickers[wallet.currency]?.last || 0;
      }
      if (price) {
        balances[wallet.type] += price * wallet.balance;
      }
    }
    broadcastLog(
      cronName,
      `Calculated balances for user ${user.id}: FIAT=${balances.FIAT}, SPOT=${balances.SPOT}, ECO=${balances.ECO}`
    );

    if (Object.values(balances).some((balance) => balance > 0)) {
      if (todayPnl) {
        await todayPnl.update({ balances });
        broadcastLog(
          cronName,
          `Updated today's PnL record for user ${user.id}`,
          "success"
        );
      } else {
        await models.walletPnl.create({
          userId: user.id,
          balances,
          createdAt: today,
        });
        broadcastLog(
          cronName,
          `Created new PnL record for user ${user.id}`,
          "success"
        );
      }
    } else {
      broadcastLog(
        cronName,
        `No positive balances to record for user ${user.id}`,
        "info"
      );
    }
  } catch (error: any) {
    logError(`handlePnl`, error, __filename);
    broadcastLog(
      "processWalletPnl",
      `Error handling PnL for user ${user.id}: ${error.message}`,
      "error"
    );
    throw error;
  }
};

export async function cleanupOldPnlRecords() {
  const cronName = "cleanupOldPnlRecords";
  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting cleanup of old PnL records");

    const oneMonthAgo = subDays(new Date(), 30);
    const yesterday = subDays(new Date(), 1);
    const zeroBalanceString = '{"FIAT":0,"SPOT":0,"ECO":0}';
    const zeroBalanceObject = { FIAT: 0, SPOT: 0, ECO: 0 };

    broadcastLog(cronName, "Deleting PnL records older than one month");
    await models.walletPnl.destroy({
      where: { createdAt: { [Op.lt]: oneMonthAgo } },
    });
    broadcastLog(
      cronName,
      "Deleted PnL records older than one month",
      "success"
    );

    broadcastLog(
      cronName,
      "Deleting PnL records older than yesterday with zero balance"
    );
    await models.walletPnl.destroy({
      where: {
        createdAt: { [Op.lt]: yesterday },
        [Op.or]: [
          { balances: zeroBalanceString },
          { balances: zeroBalanceObject },
        ],
      },
    });
    broadcastLog(
      cronName,
      "Deleted PnL records older than yesterday with zero balance",
      "success"
    );

    broadcastStatus(cronName, "completed");
    broadcastLog(cronName, "Cleanup of old PnL records completed", "success");
  } catch (error: any) {
    logError("cleanupOldPnlRecords", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(
      cronName,
      `Cleanup of old PnL records failed: ${error.message}`,
      "error"
    );
  }
}

export async function processSpotPendingDeposits() {
  const cronName = "processSpotPendingDeposits";
  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting processing of pending spot deposits");

    const transactions = await getPendingSpotTransactionsQuery("DEPOSIT");
    broadcastLog(
      cronName,
      `Found ${transactions.length} pending deposit transactions`
    );

    for (const transaction of transactions) {
      const transactionId = transaction.id;
      const userId = transaction.userId;
      const trx = transaction.referenceId;
      if (!trx) {
        broadcastLog(
          cronName,
          `Transaction ${transactionId} has no referenceId; skipping`,
          "info"
        );
        continue;
      }

      if (!spotVerificationIntervals.has(transactionId)) {
        startSpotVerificationSchedule(transactionId, userId, trx);
        broadcastLog(
          cronName,
          `Started verification for transaction ${transactionId}`,
          "info"
        );
      } else {
        broadcastLog(
          cronName,
          `Verification already scheduled for transaction ${transactionId}`,
          "info"
        );
      }
    }

    broadcastStatus(cronName, "completed");
    broadcastLog(
      cronName,
      "Processing pending spot deposits completed",
      "success"
    );
  } catch (error: any) {
    logError("processSpotPendingDeposits", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(
      cronName,
      `Processing pending spot deposits failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}

export async function getPendingSpotTransactionsQuery(type: string) {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const transactions = await models.transaction.findAll({
      where: {
        status: "PENDING",
        type,
        createdAt: {
          [Op.between]: [oneHourAgo, new Date()],
        },
        [Op.and]: [
          { referenceId: { [Op.ne]: null } },
          { referenceId: { [Op.ne]: "" } },
        ],
      },
      include: [
        {
          model: models.wallet,
          as: "wallet",
          attributes: ["id", "currency"],
        },
      ],
    });
    return transactions;
  } catch (error) {
    logError("getPendingSpotTransactionsQuery", error, __filename);
    throw error;
  }
}

export async function processPendingWithdrawals() {
  const cronName = "processPendingWithdrawals";
  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting processing pending withdrawals");

    const transactions = await getPendingSpotTransactionsQuery("WITHDRAW");
    broadcastLog(
      cronName,
      `Found ${transactions.length} pending withdrawal transactions`
    );

    for (const transaction of transactions) {
      broadcastLog(
        cronName,
        `Processing withdrawal transaction ${transaction.id}`
      );
      const userId = transaction.userId;
      const trx = transaction.referenceId;
      if (!trx) {
        broadcastLog(
          cronName,
          `Transaction ${transaction.id} has no referenceId; skipping`,
          "info"
        );
        continue;
      }

      const exchange = await ExchangeManager.startExchange();
      broadcastLog(
        cronName,
        `Exchange started for processing transaction ${transaction.id}`
      );
      try {
        const { wallet } = transaction as { wallet: { currency: string } };
        broadcastLog(
          cronName,
          `Fetching withdrawals for currency ${wallet?.currency} for transaction ${transaction.id}`
        );
        const withdrawals = await exchange.fetchWithdrawals(wallet?.currency);
        const withdrawData = withdrawals.find((w) => w.id === trx);
        let withdrawStatus: any = "PENDING";
        if (withdrawData) {
          switch (withdrawData.status) {
            case "completed":
            case "ok":
              withdrawStatus = "COMPLETED";
              break;
            case "cancelled":
            case "canceled":
              withdrawStatus = "CANCELLED";
              break;
            case "failed":
              withdrawStatus = "FAILED";
              break;
          }
          broadcastLog(
            cronName,
            `Withdrawal data for transaction ${transaction.id} returned status ${withdrawData.status}`
          );
        } else {
          broadcastLog(
            cronName,
            `No withdrawal data found for transaction ${transaction.id}`,
            "info"
          );
        }
        if (!withdrawStatus) continue;
        if (transaction.status === withdrawStatus) {
          broadcastLog(
            cronName,
            `Transaction ${transaction.id} already has status ${withdrawStatus}; skipping update`,
            "info"
          );
          continue;
        }
        await updateTransaction(transaction.id, { status: withdrawStatus });
        broadcastLog(
          cronName,
          `Transaction ${transaction.id} status updated to ${withdrawStatus}`,
          "success"
        );
        if (withdrawStatus === "FAILED" || withdrawStatus === "CANCELLED") {
          await updateSpotWalletBalance(
            userId,
            wallet?.currency,
            Number(transaction.amount),
            Number(transaction.fee),
            "REFUND_WITHDRAWAL"
          );
          await createNotification({
            userId,
            relatedId: transaction.id,
            title: "Withdrawal Failed",
            message: `Your withdrawal of ${transaction.amount} ${wallet?.currency} has failed.`,
            type: "system",
            link: `/finance/wallet/withdrawals/${transaction.id}`,
            actions: [
              {
                label: "View Withdrawal",
                link: `/finance/wallet/withdrawals/${transaction.id}`,
                primary: true,
              },
            ],
          });
          broadcastLog(
            cronName,
            `Processed failed withdrawal ${transaction.id}`,
            "info"
          );
        }
      } catch (error: any) {
        logError(
          `processPendingWithdrawals - transaction ${transaction.id}`,
          error,
          __filename
        );
        broadcastLog(
          cronName,
          `Error processing withdrawal ${transaction.id}: ${error.message}`,
          "error"
        );
        continue;
      }
    }

    broadcastStatus(cronName, "completed");
    broadcastLog(
      cronName,
      "Processing pending withdrawals completed",
      "success"
    );
  } catch (error: any) {
    logError("processPendingWithdrawals", error, __filename);
    broadcastStatus(cronName, "failed");
    broadcastLog(
      cronName,
      `Processing pending withdrawals failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}
