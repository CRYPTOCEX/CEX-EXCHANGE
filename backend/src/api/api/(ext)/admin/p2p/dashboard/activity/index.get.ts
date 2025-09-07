import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Monthly Platform Activity (Admin)",
  description:
    "Retrieves aggregated platform activity data for the current year, grouped by month. Returns data for all 12 months even if no activity exists for some months.",
  operationId: "getAdminP2PMonthlyPlatformActivity",
  tags: ["Admin", "Dashboard", "P2P"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Monthly platform activity data retrieved successfully.",
    },
    401: { description: "Unauthorized." },
    500: { description: "Internal Server Error." },
  },
  permission: "view.p2p.activity",
};

export default async (data) => {
  try {
    // Determine the current year
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    // Run a raw SQL query to aggregate trades for the current year by month.
    // Adjust SQL if using PostgreSQL or another DBMS.
    const [result] = await sequelize.query(`
      SELECT DATE_FORMAT(createdAt, '%Y-%m-01') AS month,
             COUNT(*) AS trades,
             IFNULL(SUM(total)/1000, 0) AS volume,
             IFNULL(SUM(
               (SELECT amount FROM p2p_commissions 
                WHERE p2p_commissions.tradeId = p2p_trades.id 
                LIMIT 1)
             )/1000, 0) AS revenue
      FROM p2p_trades
      WHERE createdAt BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
      ORDER BY month ASC
    `);

    // Prepare a full-year array for 12 months with zeros.
    const activityData: Array<{
      date: string;
      trades: number;
      volume: number;
      revenue: number;
    }> = [];
    for (let month = 0; month < 12; month++) {
      const monthStr = `${currentYear}-${(month + 1).toString().padStart(2, "0")}-01`;
      activityData.push({ date: monthStr, trades: 0, volume: 0, revenue: 0 });
    }

    // Type-cast the raw SQL result to an array of expected objects.
    const rows = result as Array<{
      month: string;
      trades: number | string;
      volume: number | string;
      revenue: number | string;
    }>;

    // Merge actual query results into the full-year activity data.
    rows.forEach((row) => {
      const monthNumber = row.month.split("-")[1];
      const index = parseInt(monthNumber, 10) - 1;
      if (index >= 0 && index < 12) {
        activityData[index] = {
          date: row.month,
          trades: Number(row.trades),
          volume: Number(row.volume),
          revenue: Number(row.revenue),
        };
      }
    });

    return activityData;
  } catch (err) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
