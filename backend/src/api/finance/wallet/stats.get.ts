import { models } from "@b/db";
import { Op } from "sequelize";
import { subDays } from "date-fns";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import {
  getFiatPriceInUSD,
  getSpotPriceInUSD,
  getEcoPriceInUSD,
} from "@b/api/finance/currency/utils";

// In-memory cache for failed price fetches (1 hour expiration)
const failedPriceCache = new Map<string, number>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

function isCurrencyFailureCached(currency: string, type: string): boolean {
  const key = `${currency}-${type}`;
  const cachedTime = failedPriceCache.get(key);
  
  if (!cachedTime) return false;
  
  const now = Date.now();
  if (now - cachedTime > CACHE_DURATION) {
    // Cache expired, remove it
    failedPriceCache.delete(key);
    return false;
  }
  
  return true;
}

function cacheCurrencyFailure(currency: string, type: string): void {
  const key = `${currency}-${type}`;
  failedPriceCache.set(key, Date.now());
}

export const metadata: OperationObject = {
  summary: "Get wallet statistics including total balance, changes, and counts",
  operationId: "getWalletStats",
  tags: ["Finance", "Wallets", "Statistics"],
  responses: {
    200: {
      description: "Wallet statistics retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              totalBalance: {
                type: "number",
                description: "Total balance across all wallets in USD equivalent"
              },
              totalChange: {
                type: "number", 
                description: "24h change in USD"
              },
              totalChangePercent: {
                type: "number",
                description: "24h change percentage"
              },
              totalWallets: {
                type: "number",
                description: "Total number of wallets"
              },
              activeWallets: {
                type: "number",
                description: "Number of wallets with balance > 0"
              },
              walletsByType: {
                type: "object",
                properties: {
                  FIAT: {
                    type: "object",
                    properties: {
                      count: { type: "number" },
                      balance: { type: "number" },
                      balanceUSD: { type: "number" }
                    }
                  },
                  SPOT: {
                    type: "object", 
                    properties: {
                      count: { type: "number" },
                      balance: { type: "number" },
                      balanceUSD: { type: "number" }
                    }
                  },
                  ECO: {
                    type: "object",
                    properties: {
                      count: { type: "number" },
                      balance: { type: "number" },
                      balanceUSD: { type: "number" }
                    }
                  },
                  FUTURES: {
                    type: "object",
                    properties: {
                      count: { type: "number" },
                      balance: { type: "number" },
                      balanceUSD: { type: "number" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    401: unauthorizedResponse,
    500: serverErrorResponse
  },
  requiresAuth: true
};

export default async (data: Handler) => {
  const { user } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    // Fetch all user wallets
    const wallets = await models.wallet.findAll({
      where: { userId: user.id },
      attributes: ["id", "type", "currency", "balance", "inOrder", "status", "createdAt", "updatedAt"]
    });

    // Calculate current total balance and stats
    let totalBalanceUSD = 0;
    const walletsByType = {
      FIAT: { count: 0, balance: 0, balanceUSD: 0 },
      SPOT: { count: 0, balance: 0, balanceUSD: 0 },
      ECO: { count: 0, balance: 0, balanceUSD: 0 },
      FUTURES: { count: 0, balance: 0, balanceUSD: 0 }
    };

    let activeWallets = 0;

    // Process each wallet with proper price fetching
    for (const wallet of wallets) {
      const balance = parseFloat(wallet.balance) || 0;
      const type = wallet.type || 'SPOT';
      
      // Count active wallets (balance > 0)
      if (balance > 0) {
        activeWallets++;
      }

      // Initialize type if not exists
      if (!walletsByType[type]) {
        walletsByType[type] = { count: 0, balance: 0, balanceUSD: 0 };
      }

      // Count wallets by type
      walletsByType[type].count++;
      walletsByType[type].balance += balance;

      // Get price for USD conversion using existing utility functions
      let price = 0;
      
      // Check if this currency/type combination recently failed
      if (isCurrencyFailureCached(wallet.currency, type)) {
        // Skip price fetch for currencies that recently failed
        price = 0;
      } else {
        try {
          if (type === 'FIAT') {
            price = await getFiatPriceInUSD(wallet.currency);
          } else if (type === 'SPOT' || type === 'FUTURES') {
            price = await getSpotPriceInUSD(wallet.currency);
          } else if (type === 'ECO') {
            price = await getEcoPriceInUSD(wallet.currency);
          }
        } catch (error) {
          // Cache the failure to avoid retrying for 1 hour
          cacheCurrencyFailure(wallet.currency, type);
          console.warn(`Failed to fetch price for ${wallet.currency} (${type}): ${error.message} - Cached failure for 1 hour`);
          price = 0;
        }
      }

      const balanceUSD = balance * price;
      walletsByType[type].balanceUSD += balanceUSD;
      totalBalanceUSD += balanceUSD;
    }

    // Calculate 24h change by comparing with yesterday's PnL data
    const yesterday = subDays(new Date(), 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const yesterdayPnl = await models.walletPnl.findOne({
      where: {
        userId: user.id,
        createdAt: {
          [Op.gte]: yesterday,
          [Op.lt]: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      order: [['createdAt', 'DESC']]
    });

    let totalChange = 0;
    let totalChangePercent = 0;

    if (yesterdayPnl && yesterdayPnl.balances) {
      const yesterdayBalance = Object.values(yesterdayPnl.balances).reduce((sum: number, balance: unknown) => {
        const numBalance = typeof balance === 'number' ? balance : parseFloat(String(balance)) || 0;
        return sum + numBalance;
      }, 0) as number;

      if (yesterdayBalance > 0) {
        totalChange = totalBalanceUSD - yesterdayBalance;
        totalChangePercent = (totalChange / yesterdayBalance) * 100;
      }
    }

    // Update today's PnL record
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayBalances = {
      FIAT: walletsByType.FIAT?.balanceUSD || 0,
      SPOT: walletsByType.SPOT?.balanceUSD || 0, 
      ECO: walletsByType.ECO?.balanceUSD || 0,
      FUTURES: walletsByType.FUTURES?.balanceUSD || 0
    };

    const todayPnl = await models.walletPnl.findOne({
      where: {
        userId: user.id,
        createdAt: {
          [Op.gte]: today
        }
      }
    });

    if (todayPnl) {
      await todayPnl.update({ balances: todayBalances });
    } else {
      await models.walletPnl.create({
        userId: user.id,
        balances: todayBalances,
        createdAt: today
      });
    }

    return {
      totalBalance: parseFloat(totalBalanceUSD.toFixed(2)),
      totalChange: parseFloat(totalChange.toFixed(2)),
      totalChangePercent: parseFloat(totalChangePercent.toFixed(2)),
      totalWallets: wallets.length,
      activeWallets,
      walletsByType: Object.fromEntries(
        Object.entries(walletsByType).map(([type, data]) => [
          type,
          {
            count: data.count,
            balance: parseFloat(data.balance.toFixed(8)),
            balanceUSD: parseFloat(data.balanceUSD.toFixed(2))
          }
        ])
      )
    };

  } catch (error) {
    console.error("Error calculating wallet stats:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to calculate wallet statistics"
    });
  }
}; 