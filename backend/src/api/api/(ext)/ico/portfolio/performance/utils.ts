import { Op } from "sequelize";
import { models } from "@b/db";

/**
 * Computes allocation by token at a given date.
 * It aggregates all transactions (completed) for the user up to `date` and then computes the
 * market value per token offering based on the offering's currentPrice (or fallback to tokenPrice).
 */
export async function getAllocationByToken(userId: string, date: Date) {
  // Get all transactions up to the provided date.
  const transactions = await models.icoTransaction.findAll({
    where: {
      userId,
      createdAt: { [Op.lte]: date },
      status: "RELEASED",
    },
    include: [
      {
        model: models.icoTokenOffering,
        as: "offering",
        attributes: ["currentPrice", "tokenPrice", "name"],
      },
    ],
  });
  // Calculate cumulative holdings per offering.
  const holdings: Record<string, number> = {};
  const offeringName: Record<string, string> = {};
  transactions.forEach((tx: any) => {
    const id = tx.offeringId;
    if (tx.offering) {
      offeringName[id] = tx.offering.name;
    }
    if (tx.type === "buy") {
      holdings[id] = (holdings[id] || 0) + tx.amount;
    } else if (tx.type === "sell") {
      holdings[id] = (holdings[id] || 0) - tx.amount;
    }
  });
  let totalValue = 0;
  const allocationMap: Record<string, number> = {};
  // Compute market value per offering.
  for (const offeringId in holdings) {
    // Retrieve price info from the most recent transaction that includes offering info.
    const tx = transactions.find((t: any) => t.offeringId === offeringId);
    if (tx && tx.offering) {
      const price = tx.offering.currentPrice ?? tx.offering.tokenPrice;
      const tokenValue = holdings[offeringId] * price;
      allocationMap[tx.offering.name] =
        (allocationMap[tx.offering.name] || 0) + tokenValue;
      totalValue += tokenValue;
    }
  }
  const allocationByToken = Object.entries(allocationMap).map(
    ([name, value]) => ({
      name,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    })
  );
  return { allocationByToken, totalPortfolioValue: totalValue };
}

/**
 * Computes a daily time series of portfolio market value for a given user between startDate and endDate.
 * It builds the series by “replaying” all completed transactions (buy increases, sell decreases)
 * and then calculates the value using each offering's currentPrice (or tokenPrice as fallback).
 *
 * @param userId The user’s ID.
 * @param startDate The start date (as a Date object).
 * @param endDate The end date (as a Date object).
 * @returns Array of data points in the shape { date: string, value: number }.
 */
export async function getUserPortfolioHistory(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ date: string; value: number }[]> {
  // Fetch all completed transactions up to endDate, including offering data.
  const transactions = await models.icoTransaction.findAll({
    where: {
      userId,
      createdAt: { [Op.lte]: endDate },
      status: "RELEASED",
    },
    order: [["createdAt", "ASC"]],
    include: [
      {
        model: models.icoTokenOffering,
        as: "offering",
        attributes: ["currentPrice", "tokenPrice"],
      },
    ],
  });

  // Initialize holdings and a mapping for price info per offering.
  const holdings: Record<string, number> = {};
  const offeringPrice: Record<string, number> = {};
  let txIndex = 0;

  // Process transactions before startDate to build initial holdings.
  while (
    txIndex < transactions.length &&
    new Date(transactions[txIndex].createdAt) < startDate
  ) {
    const tx = transactions[txIndex];
    const id = tx.offeringId;
    const price =
      tx.offering && (tx.offering.currentPrice ?? tx.offering.tokenPrice);
    if (price != null) {
      offeringPrice[id] = price;
    }
    if (tx.type === "buy") {
      holdings[id] = (holdings[id] || 0) + tx.amount;
    } else if (tx.type === "sell") {
      holdings[id] = (holdings[id] || 0) - tx.amount;
    }
    txIndex++;
  }

  // Helper to compute portfolio market value from current holdings.
  const computePortfolioValue = () => {
    let value = 0;
    for (const id in holdings) {
      const qty = holdings[id];
      const price = offeringPrice[id] ?? 0;
      value += qty * price;
    }
    return parseFloat(value.toFixed(2));
  };

  // Record the initial portfolio value.
  const history: { date: string; value: number }[] = [];
  const msPerDay = 24 * 3600 * 1000;
  const totalDays = Math.floor(
    (endDate.getTime() - startDate.getTime()) / msPerDay
  );

  // Iterate day-by-day and process transactions that occur on each day.
  for (let i = 0; i <= totalDays; i++) {
    const currentDate = new Date(startDate.getTime() + i * msPerDay);
    // Process all transactions for the current day.
    while (
      txIndex < transactions.length &&
      new Date(transactions[txIndex].createdAt) <= currentDate
    ) {
      const tx = transactions[txIndex];
      const id = tx.offeringId;
      // Update the offering price (if available) to the most recent value.
      if (tx.offering) {
        offeringPrice[id] = tx.offering.currentPrice ?? tx.offering.tokenPrice;
      }
      if (tx.type === "buy") {
        holdings[id] = (holdings[id] || 0) + tx.amount;
      } else if (tx.type === "sell") {
        holdings[id] = (holdings[id] || 0) - tx.amount;
      }
      txIndex++;
    }
    history.push({
      date: currentDate.toISOString().split("T")[0],
      value: computePortfolioValue(),
    });
  }
  return history;
}
