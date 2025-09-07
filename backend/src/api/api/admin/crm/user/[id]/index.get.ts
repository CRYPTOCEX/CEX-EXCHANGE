// /server/api/admin/users/[id].get.ts

import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { userSchema } from "../utils";
import { models } from "@b/db";
import { CacheManager } from "@b/utils/cache";
import { Op, fn, col, literal } from "sequelize";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific user by UUID with extension data",
  operationId: "getUserByUuid",
  tags: ["Admin", "CRM", "User"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the user to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "User details with extension data",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: userSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("User"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.user",
};

// Helper function to get extension-specific data
const getExtensionData = async (userId: string, extensions: Map<string, any>) => {
  const extensionData: any = {};

  try {
    // Binary Trading Data (Core feature - always include)
    const binaryOrders = await models.binaryOrder.findAll({
      where: { userId },
      attributes: ["id", "symbol", "amount", "profit", "side", "status", "isDemo", "createdAt"],
      limit: 10,
      order: [["createdAt", "DESC"]],
    });
    
    const binaryStats = await models.binaryOrder.findOne({
      where: { userId },
      attributes: [
        [fn("COUNT", col("id")), "totalTrades"],
        [fn("SUM", literal("CASE WHEN status = 'WIN' THEN 1 ELSE 0 END")), "winCount"],
        [fn("SUM", literal("CASE WHEN status = 'LOSS' THEN 1 ELSE 0 END")), "lossCount"],
        [fn("SUM", col("profit")), "totalProfit"],
      ],
      raw: true,
    });

    extensionData.binaryData = {
      recentOrders: binaryOrders,
      stats: binaryStats,
    };

    // Spot Trading Data (Core feature - always include)
    const spotOrders = await models.exchangeOrder.findAll({
      where: { userId },
      attributes: ["id", "symbol", "type", "side", "amount", "price", "filled", "status", "createdAt"],
      limit: 10,
      order: [["createdAt", "DESC"]],
    });

    extensionData.spotData = {
      recentOrders: spotOrders,
    };

    // Extension-specific data (only if extensions are enabled)
    
    // Forex Trading (deposits, withdrawals, investments)
    if (extensions.has("forex")) {
      // Get forex-related transactions (deposits and withdrawals)
      const forexTransactions = await models.transaction.findAll({
        where: { 
          userId,
          type: {
            [Op.in]: ["FOREX_DEPOSIT", "FOREX_WITHDRAW"]
          }
        },
        include: [
          {
            model: models.wallet,
            as: "wallet",
            attributes: ["currency", "type"],
          },
        ],
        attributes: ["id", "type", "amount", "status", "description", "createdAt"],
        limit: 20,
        order: [["createdAt", "DESC"]],
      });

      // Get forex investments
      const forexInvestments = await models.forexInvestment?.findAll({
        where: { userId },
        include: [
          {
            model: models.forexPlan,
            as: "plan",
            attributes: ["name", "title", "currency", "walletType"],
          },
          {
            model: models.forexDuration,
            as: "duration", 
            attributes: ["duration", "timeframe"],
          },
        ],
        attributes: ["id", "amount", "profit", "result", "status", "endDate", "createdAt"],
        limit: 10,
        order: [["createdAt", "DESC"]],
      }) || [];

      // Separate transactions by type
      const deposits = forexTransactions.filter(t => t.type === "FOREX_DEPOSIT");
      const withdrawals = forexTransactions.filter(t => t.type === "FOREX_WITHDRAW");

      extensionData.forexData = {
        deposits,
        withdrawals,
        investments: forexInvestments,
      };
    }
    
    // Futures Trading (uses ScyllaDB)
    if (extensions.has("futures")) {
      try {
        // Try to get futures data from ScyllaDB
        const scyllaQueriesPath = "@b/api/(ext)/ecosystem/utils/scylla/queries";
        const { query } = await import(scyllaQueriesPath);
        const scyllaFuturesKeyspace = process.env.SCYLLA_FUTURES_KEYSPACE || "futures";
        
        const futuresOrdersResult = await query(
          `SELECT * FROM ${scyllaFuturesKeyspace}.orders WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT 10`,
          [userId]
        );

        const futuresPositionsResult = await query(
          `SELECT * FROM ${scyllaFuturesKeyspace}.position WHERE "userId" = ? LIMIT 10`,
          [userId]
        );

        extensionData.futuresData = {
          recentOrders: futuresOrdersResult.rows || [],
          positions: futuresPositionsResult.rows || [],
        };
      } catch (error) {
        console.warn("Failed to fetch futures data from ScyllaDB:", error.message);
        extensionData.futuresData = {
          recentOrders: [],
          positions: [],
        };
      }
    }

    // Ecosystem Trading (uses ScyllaDB)
    if (extensions.has("ecosystem")) {
      try {
        // Try to get ecosystem data from ScyllaDB
        const scyllaQueriesPath = "@b/api/(ext)/ecosystem/utils/scylla/queries";
        const { query } = await import(scyllaQueriesPath);
        const scyllaKeyspace = process.env.SCYLLA_KEYSPACE || "trading";
        
        const ecosystemOrdersResult = await query(
          `SELECT * FROM ${scyllaKeyspace}.orders WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT 10`,
          [userId]
        );

        extensionData.ecosystemData = {
          recentOrders: ecosystemOrdersResult.rows || [],
        };
      } catch (error) {
        console.warn("Failed to fetch ecosystem data from ScyllaDB:", error.message);
        extensionData.ecosystemData = {
          recentOrders: [],
        };
      }
    }

    // AI Investment
    if (extensions.has("ai_investment")) {
      const aiInvestments = await models.aiInvestment?.findAll({
        where: { userId },
        include: [
          {
            model: models.aiInvestmentPlan,
            as: "plan",
            attributes: ["name", "title"],
          },
          {
            model: models.aiInvestmentDuration,
            as: "duration",
            attributes: ["duration", "timeframe"],
          },
        ],
        attributes: ["id", "amount", "profit", "result", "status", "createdAt"],
        limit: 10,
        order: [["createdAt", "DESC"]],
      }) || [];

      extensionData.aiData = {
        investments: aiInvestments,
      };
    }

    // ICO
    if (extensions.has("ico")) {
      const icoContributions = await models.icoContribution?.findAll({
        where: { userId },
        include: [
          {
            model: models.icoProject,
            as: "project",
            attributes: ["name", "symbol", "status"],
          },
        ],
        attributes: ["id", "amount", "currency", "status", "createdAt"],
        limit: 10,
        order: [["createdAt", "DESC"]],
      }) || [];

      extensionData.icoData = {
        contributions: icoContributions,
      };
    }

    // P2P Trading
    if (extensions.has("p2p")) {
      const p2pOffers = await models.p2pOffer?.findAll({
        where: { userId },
        attributes: ["id", "type", "currency", "status", "views", "createdAt"],
        limit: 10,
        order: [["createdAt", "DESC"]],
      }) || [];

      const p2pTrades = await models.p2pTrade?.findAll({
        where: { 
          [Op.or]: [
            { sellerId: userId },
            { buyerId: userId }
          ]
        },
        attributes: ["id", "amount", "price", "status", "createdAt"],
        limit: 10,
        order: [["createdAt", "DESC"]],
      }) || [];

      extensionData.p2pData = {
        offers: p2pOffers,
        trades: p2pTrades,
      };
    }

    // Staking
    if (extensions.has("staking")) {
      const stakingLogs = await models.stakingLog?.findAll({
        where: { userId },
        include: [
          {
            model: models.stakingPool,
            as: "pool",
            attributes: ["name", "symbol", "apr"],
          },
        ],
        attributes: ["id", "amount", "reward", "status", "createdAt"],
        limit: 10,
        order: [["createdAt", "DESC"]],
      }) || [];

      extensionData.stakingData = {
        logs: stakingLogs,
      };
    }

  } catch (error) {
    console.error("Error fetching extension data:", error);
    // Don't fail the entire request if extension data fails
  }
  
  return extensionData;
};

export default async (data: Handler) => {
  const { params } = data;

  // Get enabled extensions
  const cacheManager = CacheManager.getInstance();
  const extensions = await cacheManager.getExtensions();

  const user = await getRecord(
    "user",
    params.id,
    [
      {
        model: models.role,
        as: "role",
        attributes: ["id", "name"],
      },
      {
        model: models.kycApplication,
        as: "kyc",
        required: false,
        attributes: ["id", "status", "reviewedAt", "createdAt", "data", "adminNotes"],
      },
      {
        model: models.twoFactor,
        as: "twoFactor",
        required: false,
        attributes: ["id", "enabled", "type", "createdAt"],
      },
      {
        model: models.notification,
        as: "notifications",
        required: false,
        attributes: ["id", "type", "title", "message", "read", "createdAt"],
      },
    ],
    [
      "password", // Never expose password
      "metadata",
    ]
  );

  if (user) {
    // Check if user is a Sequelize Model instance or plain object
    const isSequelizeModel = typeof user.get === 'function';
    const userData = isSequelizeModel ? user.get({ plain: true }) : user;
    
    // Get extension-specific data
    const extensionData = await getExtensionData(userData.id, extensions);
    
    // Merge extension data into user data
    Object.assign(userData, extensionData);

    return userData;
  }

  return null;
};
