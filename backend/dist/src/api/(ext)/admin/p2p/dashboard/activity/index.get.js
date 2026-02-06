"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Monthly Platform Activity (Admin)",
    description: "Retrieves aggregated platform activity data for the current year, grouped by month. Returns data for all 12 months even if no activity exists for some months.",
    operationId: "getAdminP2PMonthlyPlatformActivity",
    tags: ["Admin", "Dashboard", "P2P"],
    logModule: "ADMIN_P2P",
    logTitle: "Get P2P Activities",
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
exports.default = async (data) => {
    try {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
        const [result] = await db_1.sequelize.query(`
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
        const activityData = [];
        for (let month = 0; month < 12; month++) {
            const monthStr = `${currentYear}-${(month + 1).toString().padStart(2, "0")}-01`;
            activityData.push({ date: monthStr, trades: 0, volume: 0, revenue: 0 });
        }
        const rows = result;
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
    }
    catch (err) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
