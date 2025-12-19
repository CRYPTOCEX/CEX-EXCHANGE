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
import { logger } from "@b/utils/console";

// In-memory cache for prices (5 minute expiration)
const priceCache = new Map<string, { price: number; timestamp: number }>();
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// In-memory cache for failed price fetches (1 hour expiration)
const failedPriceCache = new Map<string, number>();
const FAILURE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

function getCachedPrice(currency: string, type: string): number | null {
  const key = `${currency}-${type}`;
  const cached = priceCache.get(key);

  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > PRICE_CACHE_DURATION) {
    priceCache.delete(key);
    return null;
  }

  return cached.price;
}

function setCachedPrice(currency: string, type: string, price: number): void {
  const key = `${currency}-${type}`;
  priceCache.set(key, { price, timestamp: Date.now() });
}

function isCurrencyFailureCached(currency: string, type: string): boolean {
  const key = `${currency}-${type}`;
  const cachedTime = failedPriceCache.get(key);

  if (!cachedTime) return false;

  const now = Date.now();
  if (now - cachedTime > FAILURE_CACHE_DURATION) {
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

async function fetchPriceWithCache(currency: string, type: string): Promise<number> {
  // Check success cache first
  const cachedPrice = getCachedPrice(currency, type);
  if (cachedPrice !== null) {
    return cachedPrice;
  }

  // Check failure cache
  if (isCurrencyFailureCached(currency, type)) {
    return 0;
  }

  try {
    let price = 0;
    if (type === 'FIAT') {
      price = await getFiatPriceInUSD(currency);
    } else if (type === 'SPOT' || type === 'FUTURES') {
      price = await getSpotPriceInUSD(currency);
    } else if (type === 'ECO') {
      price = await getEcoPriceInUSD(currency);
    }

    // Cache successful price
    setCachedPrice(currency, type, price);
    return price;
  } catch (error: any) {
    // Cache the failure to avoid retrying for 1 hour
    cacheCurrencyFailure(currency, type);
    // Only log at debug level - this is expected for currencies without USDT pairs
    logger.debug("WALLET", `Price unavailable for ${currency}/${type} - using $0 (cached 1h)`);
    return 0;
  }
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
  const { user, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    ctx?.step("Calculating wallet statistics");

    // Fetch wallets and pending deposits in parallel
    const [wallets, pendingDeposits] = await Promise.all([
      models.wallet.findAll({
        where: { userId: user.id },
        attributes: ["id", "type", "currency", "balance", "inOrder", "status", "createdAt", "updatedAt"]
      }),
      models.transaction.findAll({
        where: {
          userId: user.id,
          type: "DEPOSIT",
          status: "PENDING"
        },
        attributes: ["walletId", "amount", "fee"]
      })
    ]);

    // Calculate current total balance and stats
    let totalBalanceUSD = 0;
    const walletsByType = {
      FIAT: { count: 0, balance: 0, balanceUSD: 0 },
      SPOT: { count: 0, balance: 0, balanceUSD: 0 },
      ECO: { count: 0, balance: 0, balanceUSD: 0 },
      FUTURES: { count: 0, balance: 0, balanceUSD: 0 }
    };

    let activeWallets = 0;

    // Create a map of walletId -> pending deposit amount
    const pendingDepositMap = new Map<string, number>();
    for (const deposit of pendingDeposits) {
      const netAmount = (parseFloat(deposit.amount) || 0) - (parseFloat(deposit.fee) || 0);
      const currentPending = pendingDepositMap.get(deposit.walletId) || 0;
      pendingDepositMap.set(deposit.walletId, currentPending + netAmount);
    }

    // Collect unique currency/type combinations for parallel price fetching
    const uniqueCurrencies = new Map<string, { currency: string; type: string }>();
    for (const wallet of wallets) {
      const type = wallet.type || 'SPOT';
      const key = `${wallet.currency}-${type}`;
      if (!uniqueCurrencies.has(key)) {
        uniqueCurrencies.set(key, { currency: wallet.currency, type });
      }
    }

    // Fetch all prices in parallel
    const pricePromises = Array.from(uniqueCurrencies.values()).map(async ({ currency, type }) => {
      const price = await fetchPriceWithCache(currency, type);
      return { key: `${currency}-${type}`, price };
    });

    const priceResults = await Promise.all(pricePromises);
    const priceMap = new Map<string, number>();
    for (const { key, price } of priceResults) {
      priceMap.set(key, price);
    }

    // Process each wallet using cached prices
    for (const wallet of wallets) {
      const balance = parseFloat(wallet.balance) || 0;
      const inOrder = parseFloat(wallet.inOrder) || 0;
      const totalWalletBalance = balance + inOrder; // Total = available balance + locked in orders
      const pendingDeposit = pendingDepositMap.get(wallet.id) || 0;
      const estimatedBalance = totalWalletBalance + pendingDeposit; // Include pending deposits in estimated balance
      const type = wallet.type || 'SPOT';

      // Count active wallets (balance > 0 or has pending deposits)
      if (estimatedBalance > 0) {
        activeWallets++;
      }

      // Initialize type if not exists
      if (!walletsByType[type]) {
        walletsByType[type] = { count: 0, balance: 0, balanceUSD: 0 };
      }

      // Count wallets by type
      walletsByType[type].count++;
      walletsByType[type].balance += estimatedBalance; // Use estimated balance (includes pending deposits)

      // Get price from pre-fetched map
      const price = priceMap.get(`${wallet.currency}-${type}`) || 0;

      const balanceUSD = estimatedBalance * price; // Use estimated balance for USD calculation
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

    ctx?.success("Wallet statistics calculated successfully");
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
    logger.error("WALLET", "Error calculating wallet stats", error);
    throw createError({
      statusCode: 500,
      message: "Failed to calculate wallet statistics"
    });
  }
}; 