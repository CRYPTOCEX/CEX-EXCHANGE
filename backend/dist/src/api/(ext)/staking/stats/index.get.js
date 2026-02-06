"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = getStakingStats;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Staking Platform Statistics",
    description: "Returns total staked value, active users, and average APR.",
    tags: ["Staking", "Stats"],
    responses: {
        200: {
            description: "Staking stats returned successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            totalStaked: { type: "number" },
                            activeUsers: { type: "number" },
                            avgApr: { type: "number" },
                            totalRewards: { type: "number" },
                        },
                    },
                },
            },
        },
    },
};
async function getStakingStats(req, res) {
    var _a, _b, _c, _d, _e;
    try {
        const [totalStakedRows] = await db_1.sequelize.query(`
      SELECT SUM(sp.\`amount\`) AS total
      FROM staking_positions AS sp
      INNER JOIN staking_pools AS p ON sp.\`poolId\` = p.\`id\`
      WHERE p.\`status\` = 'ACTIVE' AND sp.\`deletedAt\` IS NULL
    `);
        const totalStaked = Number((_b = (_a = totalStakedRows[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0);
        const [activeUsersRows] = await db_1.sequelize.query(`
      SELECT COUNT(DISTINCT sp.\`userId\`) AS count
      FROM staking_positions AS sp
      INNER JOIN staking_pools AS p ON sp.\`poolId\` = p.\`id\`
      WHERE p.\`status\` = 'ACTIVE' AND sp.\`deletedAt\` IS NULL
    `);
        const activeUsers = Number((_d = (_c = activeUsersRows[0]) === null || _c === void 0 ? void 0 : _c.count) !== null && _d !== void 0 ? _d : 0);
        const pools = await db_1.models.stakingPool.findAll({
            where: { status: "ACTIVE" },
            attributes: ["id", "apr"],
        });
        let avgApr = 0;
        let totalWeight = 0;
        for (const pool of pools) {
            const stakedRow = await db_1.models.stakingPosition.findOne({
                attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"]],
                where: {
                    poolId: pool.id,
                    deletedAt: null,
                },
                raw: true,
            });
            const poolStaked = Number((_e = stakedRow === null || stakedRow === void 0 ? void 0 : stakedRow.total) !== null && _e !== void 0 ? _e : 0);
            avgApr += (pool.apr || 0) * poolStaked;
            totalWeight += poolStaked;
        }
        avgApr = totalWeight ? avgApr / totalWeight : 0;
        const totalRewards = await db_1.models.stakingEarningRecord.sum("amount", {});
        return {
            totalStaked,
            activeUsers,
            avgApr: Number(avgApr.toFixed(2)),
            totalRewards: Number(totalRewards || 0),
        };
    }
    catch (e) {
        return (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch staking stats",
        });
    }
}
