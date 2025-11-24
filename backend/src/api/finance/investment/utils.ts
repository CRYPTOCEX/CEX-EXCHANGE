import { makeUuid } from "@b/utils/passwords";
import { models, sequelize } from "@b/db";
import {
  baseBooleanSchema,
  baseIntegerSchema,
  baseNumberSchema,
  baseStringSchema,
} from "@b/utils/schema";

export const baseInvestmentSchema = {
  id: baseStringSchema("ID of the investment"),
  amount: baseNumberSchema("Amount of the investment"),
  roi: baseNumberSchema("Return on investment (ROI) of the investment"),
  duration: baseIntegerSchema("Duration of the investment in days"),
  status: baseStringSchema("Status of the investment"),
};

export const baseInvestmentPlanSchema = {
  id: baseStringSchema("ID of the investment plan"),
  name: baseStringSchema("Name of the investment plan"),
  title: baseStringSchema("Title of the investment plan"),
  image: baseStringSchema("Image of the investment plan"),
  description: baseStringSchema("Description of the investment plan"),
  currency: baseStringSchema("Currency of the investment plan"),
  minAmount: baseNumberSchema(
    "Minimum amount required for the investment plan"
  ),
  maxAmount: baseNumberSchema("Maximum amount allowed for the investment plan"),
  roi: baseNumberSchema("Return on investment (ROI) of the investment plan"),
  duration: baseIntegerSchema("Duration of the investment plan in days"),
  status: baseBooleanSchema("Status of the investment plan"),
};

export const baseUserSchema = {
  id: baseStringSchema("ID of the user"),
  firstName: baseStringSchema("First name of the user"),
  lastName: baseStringSchema("Last name of the user"),
  avatar: baseStringSchema("Avatar of the user"),
};

// Constants for Error Messages
const INVESTMENT_NOT_FOUND = "Investment not found";

export async function findInvestmentById(id: string) {
  const investment = await models.investment.findOne({
    where: { id },
    include: [
      {
        model: models.investmentPlan,
        as: "plan",
      },
      {
        model: models.wallet,
        as: "wallet",
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });
  if (!investment) throw new Error(INVESTMENT_NOT_FOUND);
  return investment.get({ plain: true });
}

export async function deleteInvestments(ids: string[]): Promise<void> {
  await models.investment.destroy({
    where: {
      id: ids,
    },
  });
}

export async function checkInvestments(): Promise<void> {
  const investments = await models.investment.findAll({
    where: { status: "ACTIVE" },
    include: [
      {
        model: models.investmentPlan,
        as: "plan",
      },
      {
        model: models.investmentDuration,
        as: "duration",
      },
    ],
  });

  for (const investment of investments) {
    if (!investment.createdAt) continue;

    let duration;
    switch (investment.duration.timeframe) {
      case "HOUR":
        duration = investment.duration.duration * 60 * 60 * 1000;
        break;
      case "DAY":
        duration = investment.duration.duration * 24 * 60 * 60 * 1000;
        break;
      case "WEEK":
        duration = investment.duration.duration * 7 * 24 * 60 * 60 * 1000;
        break;
      case "MONTH":
        duration = investment.duration.duration * 30 * 24 * 60 * 60 * 1000;
        break;
    }

    const endDate = new Date(investment.createdAt.getTime() + duration);
    const currentDate = new Date();

    if (currentDate.getTime() < endDate.getTime()) continue;

    // Process each investment within its own transaction
    await sequelize.transaction(async (transaction) => {
      const wallet = await models.wallet.findOne({
        where: {
          userId: investment.userId,
          currency: investment.plan.currency,
          type: investment.plan.walletType,
        },
        transaction,
      });
      if (!wallet) throw new Error("Wallet not found");

      if (investment.profit) {
        const profit = investment.amount * (investment.profit / 100);
        const roi = investment.amount + profit;
        const balance = wallet.balance + roi;

        // Update wallet balance
        await wallet.update({ balance }, { transaction });

        // Create a transaction record for ROI
        await models.transaction.create(
          {
            userId: investment.userId,
            walletId: wallet.id,
            amount: roi,
            referenceId: makeUuid(),
            description: `Investment ROI: Plan "${investment.plan.title}" | Duration: ${investment.duration.duration} ${investment.duration.timeframe}`,
            status: "COMPLETED",
            fee: 0,
            type: "INVESTMENT_ROI",
          },
          { transaction }
        );

        // Mark investment as COMPLETED
        await investment.update({ status: "COMPLETED" }, { transaction });
      }
    });
  }
}
