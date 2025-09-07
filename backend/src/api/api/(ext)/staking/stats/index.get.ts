// backend/src/api/(ext)/staking/stats/index.get.ts
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
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

type StakedSumRow = { total: string | number | null };
type UserCountRow = { count: string | number | null };

export default async function getStakingStats(req, res) {
  try {
    // 1. Total staked value (sum of all positions in active pools)
    const [totalStakedRows] = await sequelize.query(`
      SELECT SUM(sp.\`amount\`) AS total
      FROM staking_positions AS sp
      INNER JOIN staking_pools AS p ON sp.\`poolId\` = p.\`id\`
      WHERE p.\`status\` = 'ACTIVE' AND sp.\`deletedAt\` IS NULL
    `);
    const totalStaked = Number(
      (totalStakedRows as StakedSumRow[])[0]?.total ?? 0
    );

    // 2. Active users (unique userId in active positions)
    const [activeUsersRows] = await sequelize.query(`
      SELECT COUNT(DISTINCT sp.\`userId\`) AS count
      FROM staking_positions AS sp
      INNER JOIN staking_pools AS p ON sp.\`poolId\` = p.\`id\`
      WHERE p.\`status\` = 'ACTIVE' AND sp.\`deletedAt\` IS NULL
    `);
    const activeUsers = Number(
      (activeUsersRows as UserCountRow[])[0]?.count ?? 0
    );

    // 3. Average APR (weighted by current staked, only active pools)
    const pools = await models.stakingPool.findAll({
      where: { status: "ACTIVE" },
      attributes: ["id", "apr"],
    });

    let avgApr = 0;
    let totalWeight = 0;
    for (const pool of pools) {
      const stakedRow = await models.stakingPosition.findOne({
        attributes: [[sequelize.fn("SUM", sequelize.col("amount")), "total"]],
        where: {
          poolId: pool.id,
          deletedAt: null,
        },
        raw: true,
      });
      const poolStaked = Number((stakedRow as StakedSumRow)?.total ?? 0);
      avgApr += (pool.apr || 0) * poolStaked;
      totalWeight += poolStaked;
    }
    avgApr = totalWeight ? avgApr / totalWeight : 0;

    // 4. Total rewards distributed
    const totalRewards = await models.stakingEarningRecord.sum("amount", {});

    // Return as JSON
    return {
      totalStaked,
      activeUsers,
      avgApr: Number(avgApr.toFixed(2)),
      totalRewards: Number(totalRewards || 0),
    };
  } catch (e) {
    return createError({
      statusCode: 500,
      message: "Failed to fetch staking stats",
    });
  }
}
