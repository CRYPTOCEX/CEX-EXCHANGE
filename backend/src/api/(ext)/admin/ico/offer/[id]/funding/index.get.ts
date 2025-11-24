import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, literal, Op } from "sequelize";

export const metadata = {
  summary: "Get Funding Chart Data for an Offering",
  description:
    "Retrieves funding chart data (daily aggregated amounts with cumulative totals) for a specific ICO offering based on the specified time range. The data now includes valid funds (from all non-rejected transactions) and rejected funds.",
  operationId: "getAdminFundingChartData",
  tags: ["ICO", "Admin", "FundingChart"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "The ID of the ICO offering.",
    },
    {
      index: 1,
      name: "range",
      in: "query",
      required: true,
      schema: { type: "string" },
      description:
        "Time range for chart data: '7d' for current week, '30d' for current month, '90d' for three full months, or 'all' for all time (monthly, ensuring at least 12 months).",
    },
  ],
  responses: {
    200: {
      description: "Funding chart data retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                validAmount: { type: "number" },
                validCumulative: { type: "number" },
                rejectedAmount: { type: "number" },
                rejectedCumulative: { type: "number" },
                totalAmount: { type: "number" },
                totalCumulative: { type: "number" },
              },
            },
            description:
              "Array of funding data points including breakdown of valid and rejected funds.",
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    404: { description: "ICO offering not found" },
    500: { description: "Internal Server Error" },
  },
  permission: "view.ico.offer",
};

interface Handler {
  user?: { id: string; [key: string]: any };
  params: { id: string };
  query: { range?: string; [key: string]: any };
}

interface ChartDataPoint {
  date: string;
  validAmount: number;
  validCumulative: number;
  rejectedAmount: number;
  rejectedCumulative: number;
  totalAmount: number;
  totalCumulative: number;
}

/**
 * Helper to get daily aggregated funding data over a given date range.
 * This version calculates valid and rejected funds separately and then computes totals.
 */
async function getDailyChartData(
  offerId: string,
  start: Date,
  end: Date
): Promise<ChartDataPoint[]> {
  // Query valid transactions: now using all non-rejected statuses.
  const validRows: { period: string; raised: string }[] =
    await models.icoTransaction.findAll({
      attributes: [
        [
          literal("DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-%d')"),
          "period",
        ],
        [fn("SUM", literal("amount * price")), "raised"],
      ],
      where: {
        offeringId: offerId,
        createdAt: { [Op.between]: [start, end] },
        status: { [Op.not]: ["REJECTED"] },
      },
      group: [literal("DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-%d')")],
      order: [literal("period")],
      raw: true,
    });

  // Query rejected transactions.
  const rejectedRows: { period: string; raised: string }[] =
    await models.icoTransaction.findAll({
      attributes: [
        [
          literal("DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-%d')"),
          "period",
        ],
        [fn("SUM", literal("amount * price")), "raised"],
      ],
      where: {
        offeringId: offerId,
        createdAt: { [Op.between]: [start, end] },
        status: "REJECTED",
      },
      group: [literal("DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-%d')")],
      order: [literal("period")],
      raw: true,
    });

  // Build lookup maps.
  const validMap: Record<string, number> = validRows.reduce(
    (acc, row) => {
      acc[row.period] = parseFloat(row.raised);
      return acc;
    },
    {} as Record<string, number>
  );

  const rejectedMap: Record<string, number> = rejectedRows.reduce(
    (acc, row) => {
      acc[row.period] = parseFloat(row.raised);
      return acc;
    },
    {} as Record<string, number>
  );

  const chartData: ChartDataPoint[] = [];
  let cumulativeValid = 0;
  let cumulativeRejected = 0;
  let cumulativeTotal = 0;

  // Iterate day-by-day.
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    const valid = validMap[dateStr] || 0;
    const rejected = rejectedMap[dateStr] || 0;
    const total = valid + rejected;
    cumulativeValid += valid;
    cumulativeRejected += rejected;
    cumulativeTotal += total;
    chartData.push({
      date: dateStr,
      validAmount: valid,
      validCumulative: cumulativeValid,
      rejectedAmount: rejected,
      rejectedCumulative: cumulativeRejected,
      totalAmount: total,
      totalCumulative: cumulativeTotal,
    });
  }
  return chartData;
}

/**
 * Helper to get monthly aggregated funding data from a start date to an end date.
 * This version calculates valid and rejected funds separately and ensures at least 12 months.
 */
async function getMonthlyChartData(
  offerId: string,
  start: Date,
  end: Date
): Promise<ChartDataPoint[]> {
  // Query valid transactions for monthly grouping using all non-rejected statuses.
  const validRows: { period: string; raised: string }[] =
    await models.icoTransaction.findAll({
      attributes: [
        [
          literal("DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-01')"),
          "period",
        ],
        [fn("SUM", literal("amount * price")), "raised"],
      ],
      where: {
        offeringId: offerId,
        createdAt: { [Op.gte]: start },
        status: { [Op.not]: ["REJECTED"] },
      },
      group: [literal("DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-01')")],
      order: [literal("period")],
      raw: true,
    });

  // Query rejected transactions for monthly grouping.
  const rejectedRows: { period: string; raised: string }[] =
    await models.icoTransaction.findAll({
      attributes: [
        [
          literal("DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-01')"),
          "period",
        ],
        [fn("SUM", literal("amount * price")), "raised"],
      ],
      where: {
        offeringId: offerId,
        createdAt: { [Op.gte]: start },
        status: "REJECTED",
      },
      group: [literal("DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-01')")],
      order: [literal("period")],
      raw: true,
    });

  // Build lookup maps.
  const validMap: Record<string, number> = validRows.reduce(
    (acc, row) => {
      acc[row.period] = parseFloat(row.raised);
      return acc;
    },
    {} as Record<string, number>
  );

  const rejectedMap: Record<string, number> = rejectedRows.reduce(
    (acc, row) => {
      acc[row.period] = parseFloat(row.raised);
      return acc;
    },
    {} as Record<string, number>
  );

  const chartMonths: ChartDataPoint[] = [];
  let cumulativeValid = 0;
  let cumulativeRejected = 0;
  let cumulativeTotal = 0;

  // Iterate month-by-month.
  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const dateStr = `${year}-${month}-01`;
    const valid = validMap[dateStr] || 0;
    const rejected = rejectedMap[dateStr] || 0;
    const total = valid + rejected;
    cumulativeValid += valid;
    cumulativeRejected += rejected;
    cumulativeTotal += total;
    chartMonths.push({
      date: dateStr,
      validAmount: valid,
      validCumulative: cumulativeValid,
      rejectedAmount: rejected,
      rejectedCumulative: cumulativeRejected,
      totalAmount: total,
      totalCumulative: cumulativeTotal,
    });
  }

  // Ensure at least 12 months of data by prepending missing months if necessary.
  while (chartMonths.length < 12) {
    const first = chartMonths[0];
    const firstDate = new Date(first.date);
    firstDate.setMonth(firstDate.getMonth() - 1);
    const year = firstDate.getFullYear();
    const month = String(firstDate.getMonth() + 1).padStart(2, "0");
    const dateStr = `${year}-${month}-01`;
    // Prepend zero values; cumulative remains as the first entry's cumulative.
    chartMonths.unshift({
      date: dateStr,
      validAmount: 0,
      validCumulative: first.validCumulative,
      rejectedAmount: 0,
      rejectedCumulative: first.rejectedCumulative,
      totalAmount: 0,
      totalCumulative: first.totalCumulative,
    });
  }
  return chartMonths;
}

export default async (data: Handler): Promise<ChartDataPoint[]> => {
  const { user, params, query } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const offerId: string = params.id;
  // Verify that the offering exists.
  const offering = await models.icoTokenOffering.findOne({
    where: { id: offerId },
  });
  if (!offering) {
    throw createError({ statusCode: 404, message: "ICO offering not found." });
  }

  const now = new Date();
  const range: string = (query.range as string) || "30d";
  let chartData: ChartDataPoint[] = [];

  if (range === "7d") {
    // Current week: from Monday to Sunday.
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMonday);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    chartData = await getDailyChartData(offerId, startOfWeek, endOfWeek);
  } else if (range === "30d") {
    // Current month: from the 1st to the last day.
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    chartData = await getDailyChartData(offerId, startOfMonth, endOfMonth);
  } else if (range === "90d") {
    // 90d: From two months before the current month start to the end of the current month.
    const startRange = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endRange = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    chartData = await getDailyChartData(offerId, startRange, endRange);
  } else {
    // "all": Group monthly from the earliest transaction, ensuring at least 12 months.
    const earliestTx: { minDate: string } | null =
      await models.icoTransaction.findOne({
        attributes: [
          [fn("MIN", literal("icoTransaction.createdAt")), "minDate"],
        ],
        where: { offeringId: offerId },
        raw: true,
      });
    let startDateAll: Date;
    if (earliestTx && earliestTx.minDate) {
      startDateAll = new Date(earliestTx.minDate);
    } else {
      startDateAll = new Date();
      startDateAll.setFullYear(startDateAll.getFullYear() - 1);
    }
    // Ensure at least 12 months by comparing to 12 months ago.
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    if (startDateAll > twelveMonthsAgo) {
      startDateAll = twelveMonthsAgo;
    }
    chartData = await getMonthlyChartData(offerId, startDateAll, now);
  }

  return chartData;
};
