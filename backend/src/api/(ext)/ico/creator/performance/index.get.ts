import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, literal, Op } from "sequelize";

export const metadata = {
  summary: "Get Creator Chart Data",
  description:
    "Retrieves chart data (daily, weekly, or monthly performance) for the authenticated creator's ICO offerings based on a specified time range.",
  operationId: "getCreatorStatsChart",
  tags: ["ICO", "Creator", "Stats"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "range",
      in: "query",
      description:
        "Time range for chart data: '7d' for current week (Monday–Sunday), '30d' for current month (daily), '90d' for 3 full months (from start of two months before current month till end of current month), or 'all' for all time (monthly, extended to at least 12 months).",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Creator chart data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                amount: { type: "number", description: "Amount raised for that period" }
              }
            }
          }
        }
      }
    },
    401: {
      description: "Unauthorized"
    },
    500: {
      description: "Internal server error"
    }
  }
};

interface Handler {
  user?: { id: string; [key: string]: any };
  query: { range?: string; [key: string]: any };
}

interface ChartDataPoint {
  date: string;
  amount: number;
}

/**
 * Helper function to format a Date object as 'YYYY-MM-DD'
 */
const formatDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Helper function to format a Date object as 'YYYY-MM-01'
 */
const formatMonth = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
};

/**
 * Get daily aggregated chart data for a creator over a given date range.
 * Note: The status filter remains unchanged as [Op.in]: ["PENDING", "RELEASED"].
 */
async function getCreatorDailyChartData(
  userId: string,
  start: Date,
  end: Date
): Promise<ChartDataPoint[]> {
  const dailyFormat = "DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-%d')";
  const rows: { period: string; raised: string }[] =
    await models.icoTransaction.findAll({
      attributes: [
        [literal(dailyFormat), "period"],
        [fn("SUM", literal("amount * price")), "raised"],
      ],
      include: [
        {
          model: models.icoTokenOffering,
          as: "offering",
          attributes: [],
          where: { userId },
        },
      ],
      where: {
        createdAt: { [Op.between]: [start, end] },
        status: { [Op.in]: ["PENDING", "RELEASED"] },
      },
      group: [literal(dailyFormat)],
      order: [literal("period")],
      raw: true,
    });

  const data: ChartDataPoint[] = [];
  for (
    let current = new Date(start);
    current <= end;
    current.setDate(current.getDate() + 1)
  ) {
    const dateStr = formatDate(current);
    const row = rows.find((r) => r.period === dateStr);
    data.push({ date: dateStr, amount: row ? parseFloat(row.raised) : 0 });
  }
  return data;
}

/**
 * Get monthly aggregated chart data for a creator from a start date until an end date.
 * Ensures at least 12 months by prepending missing months with zero values.
 * Note: The status filter remains unchanged as [Op.in]: ["PENDING", "RELEASED"].
 */
async function getCreatorMonthlyChartData(
  userId: string,
  start: Date,
  end: Date
): Promise<ChartDataPoint[]> {
  const monthFormat = "DATE_FORMAT(icoTransaction.createdAt, '%Y-%m-01')";
  const rows: { period: string; raised: string }[] =
    await models.icoTransaction.findAll({
      attributes: [
        [literal(monthFormat), "period"],
        [fn("SUM", literal("amount * price")), "raised"],
      ],
      include: [
        {
          model: models.icoTokenOffering,
          as: "offering",
          attributes: [],
          where: { userId },
        },
      ],
      where: {
        createdAt: { [Op.gte]: start },
        status: { [Op.not]: ["REJECTED"] },
      },
      group: [literal(monthFormat)],
      order: [literal("period")],
      raw: true,
    });

  const data: ChartDataPoint[] = [];
  const current = new Date(start);
  while (current <= end) {
    const dateStr = formatMonth(current);
    const row = rows.find((r) => r.period === dateStr);
    data.push({ date: dateStr, amount: row ? parseFloat(row.raised) : 0 });
    current.setMonth(current.getMonth() + 1);
  }
  // Prepend missing months until at least 12 months are available.
  while (data.length < 12) {
    const firstDate = new Date(data[0].date);
    firstDate.setMonth(firstDate.getMonth() - 1);
    data.unshift({ date: formatMonth(firstDate), amount: 0 });
  }
  return data;
}

export default async (data: Handler): Promise<ChartDataPoint[]> => {
  const { user, query } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const userId = user.id;
  const now = new Date();
  const range: string = (query?.range as string) || "30d";
  let chartData: ChartDataPoint[] = [];

  if (range === "7d") {
    // Calculate the current week (Monday to Sunday)
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMonday);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    chartData = await getCreatorDailyChartData(userId, startOfWeek, endOfWeek);
  } else if (range === "30d") {
    // Use the current month (from the 1st to the last day)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    chartData = await getCreatorDailyChartData(
      userId,
      startOfMonth,
      endOfMonth
    );
  } else if (range === "90d") {
    // Cover from two months before the current month start to the end of the current month.
    const startRange = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endRange = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    chartData = await getCreatorDailyChartData(userId, startRange, endRange);
  } else if (range === "all") {
    // Group monthly from the earliest transaction date, ensuring at least 12 months.
    const earliestTx: { minDate: string } | null =
      await models.icoTransaction.findOne({
        include: [
          {
            model: models.icoTokenOffering,
            as: "offering",
            attributes: [],
            where: { userId },
          },
        ],
        attributes: [
          [fn("MIN", literal("icoTransaction.createdAt")), "minDate"],
        ],
        raw: true,
      });
    let startDate: Date;
    if (earliestTx && earliestTx.minDate) {
      startDate = new Date(earliestTx.minDate);
    } else {
      // Fallback to one year ago if no transaction is found.
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
    }
    // Ensure startDate is at least 12 months ago.
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    if (startDate > twelveMonthsAgo) {
      startDate = twelveMonthsAgo;
    }
    chartData = await getCreatorMonthlyChartData(userId, startDate, now);
  } else {
    throw createError({ statusCode: 400, message: "Invalid range parameter" });
  }

  return chartData;
};
