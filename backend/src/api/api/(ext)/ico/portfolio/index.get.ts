import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get User Portfolio Overview",
  description:
    "Retrieves a summary of the user's ICO portfolio including total invested, pending investment, pending verification investment, received investment, rejected investment, current portfolio value, total profit/loss, and ROI. Pending investments indicate funds invested for tokens not yet received, and rejected investments indicate funds that were refunded.",
  operationId: "getUserPortfolioOverview",
  tags: ["ICO", "Portfolio"],
  requiresAuth: true,
  responses: {
    200: {
      description: "User portfolio overview retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              totalInvested: { type: "number" },
              pendingInvested: { type: "number" },
              pendingVerificationInvested: { type: "number" },
              receivedInvested: { type: "number" },
              rejectedInvested: { type: "number" },
              currentValue: { type: "number" },
              totalProfitLoss: { type: "number" },
              roi: { type: "number" },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { user?: any; params?: any }) => {
  const { user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  try {
    // Fetch pending transactions (status "PENDING")
    const pendingTransactions = await models.icoTransaction.findAll({
      where: { userId: user.id, status: "PENDING" },
      include: [
        {
          model: models.icoTokenOffering,
          as: "offering",
          attributes: ["currentPrice", "tokenPrice"],
        },
      ],
    });

    // Fetch pending verification transactions (status "VERIFICATION")
    const pendingVerificationTransactions = await models.icoTransaction.findAll(
      {
        where: { userId: user.id, status: "VERIFICATION" },
        include: [
          {
            model: models.icoTokenOffering,
            as: "offering",
            attributes: ["currentPrice", "tokenPrice"],
          },
        ],
      }
    );

    // Fetch received transactions (status "RELEASED")
    const receivedTransactions = await models.icoTransaction.findAll({
      where: { userId: user.id, status: "RELEASED" },
      include: [
        {
          model: models.icoTokenOffering,
          as: "offering",
          attributes: ["currentPrice", "tokenPrice"],
        },
      ],
    });

    // Fetch rejected transactions (status "REJECTED")
    const rejectedTransactions = await models.icoTransaction.findAll({
      where: { userId: user.id, status: "REJECTED" },
      include: [
        {
          model: models.icoTokenOffering,
          as: "offering",
          attributes: ["currentPrice", "tokenPrice"],
        },
      ],
    });

    let totalInvested = 0;
    let pendingInvested = 0;
    let pendingVerificationInvested = 0;
    let receivedInvested = 0;
    let rejectedInvested = 0;
    let currentValue = 0;

    // Process pending transactions
    pendingTransactions.forEach((tx: any) => {
      const invested = tx.amount * tx.price;
      totalInvested += invested;
      pendingInvested += invested;
    });

    // Process pending verification transactions
    pendingVerificationTransactions.forEach((tx: any) => {
      const invested = tx.amount * tx.price;
      totalInvested += invested;
      pendingVerificationInvested += invested;
    });

    // Process received transactions
    receivedTransactions.forEach((tx: any) => {
      const invested = tx.amount * tx.price;
      totalInvested += invested;
      receivedInvested += invested;
      const offering = tx.offering;
      const currentTokenPrice =
        offering?.currentPrice != null
          ? offering.currentPrice
          : offering?.tokenPrice;
      // Compute the current value using the most up-to-date token price.
      const offeringValue = currentTokenPrice
        ? tx.amount * currentTokenPrice
        : invested;
      currentValue += offeringValue;
    });

    // Process rejected transactions
    rejectedTransactions.forEach((tx: any) => {
      const invested = tx.amount * tx.price;
      rejectedInvested += invested;
      // Typically, rejected investments are refunded and may not be included in totalInvested.
      // If you wish to include them, uncomment the next line.
      // totalInvested += invested;
    });

    return {
      totalInvested,
      pendingInvested,
      pendingVerificationInvested,
      receivedInvested,
      rejectedInvested,
      currentValue,
    };
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};
