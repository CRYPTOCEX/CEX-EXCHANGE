import { models } from "@b/db";
import { fn, col, Op, literal } from "sequelize";
import { getFiatPriceInUSD, getSpotPriceInUSD, getEcoPriceInUSD } from "@b/api/finance/currency/utils";

export const metadata = {
  summary: "Get Admin Dashboard Analytics",
  description: "Comprehensive admin dashboard analytics including user stats, financial metrics, trading activity, and system overview",
  operationId: "getAdminDashboard",
  tags: ["Admin", "Dashboard", "Analytics"],
  requiresAuth: true,
  permission: "access.admin",
  responses: {
    200: {
      description: "Dashboard analytics retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              overview: {
                type: "object",
                properties: {
                  totalUsers: { type: "number" },
                  activeUsers: { type: "number" },
                  newUsersToday: { type: "number" },
                  totalRevenue: { type: "number" },
                  totalTransactions: { type: "number" },
                  pendingKYC: { type: "number" },
                  systemHealth: { type: "string" }
                }
              },
              userMetrics: {
                type: "object",
                properties: {
                  registrations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        total: { type: "number" },
                        new: { type: "number" }
                      }
                    }
                  },
                  usersByLevel: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        level: { type: "string" },
                        count: { type: "number" },
                        color: { type: "string" }
                      }
                    }
                  }
                }
              },
              financialMetrics: {
                type: "object",
                properties: {
                  dailyRevenue: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        revenue: { type: "number" },
                        profit: { type: "number" }
                      }
                    }
                  },
                  transactionVolume: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        value: { type: "number" },
                        color: { type: "string" }
                      }
                    }
                  }
                }
              },
              tradingActivity: {
                type: "object",
                properties: {
                  dailyTrades: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        count: { type: "number" },
                        volume: { type: "number" }
                      }
                    }
                  },
                  topAssets: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        asset: { type: "string" },
                        volume: { type: "number" },
                        trades: { type: "number" }
                      }
                    }
                  }
                }
              },
              systemStatus: {
                type: "object",
                properties: {
                  services: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        status: { type: "string" },
                        uptime: { type: "number" }
                      }
                    }
                  },
                  performance: {
                    type: "object",
                    properties: {
                      cpu: { type: "number" },
                      memory: { type: "number" },
                      disk: { type: "number" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

// Helper function to convert amount to USD
async function convertToUSD(amount: number, currency: string, type: string): Promise<number> {
  try {
    if (currency === "USD" || currency === "USDT") {
      return amount;
    }

    let priceUSD = 1;
    switch (type) {
      case "FIAT":
        priceUSD = await getFiatPriceInUSD(currency);
        break;
      case "SPOT":
        priceUSD = await getSpotPriceInUSD(currency);
        break;
      case "ECO":
        priceUSD = await getEcoPriceInUSD(currency);
        break;
    }
    
    return amount * priceUSD;
  } catch (error) {
    console.warn(`Failed to convert ${currency} to USD:`, error.message);
    return amount; // Return original amount if conversion fails
  }
}

// Helper function to generate complete date ranges
function generateDateRange(period: 'monthly' | 'weekly' | 'yearly' = 'monthly'): string[] {
  const dates: string[] = [];
  const now = new Date();
  
  if (period === 'yearly') {
    // Generate 12 months for the current year
    const year = now.getFullYear();
    for (let month = 0; month < 12; month++) {
      const date = new Date(year, month, 1);
      dates.push(date.toISOString().split('T')[0]);
    }
  } else if (period === 'weekly') {
    // Generate 7 days for the current week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start from Sunday
    
    for (let day = 0; day < 7; day++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + day);
      dates.push(date.toISOString().split('T')[0]);
    }
  } else {
    // Monthly: Generate 4 weekly points (last 4 weeks)
    for (let week = 3; week >= 0; week--) {
      const date = new Date(now);
      date.setDate(now.getDate() - (week * 7));
      // Set to Monday of that week for consistency
      const dayOfWeek = date.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      date.setDate(date.getDate() + mondayOffset);
      dates.push(date.toISOString().split('T')[0]);
    }
  }
  
  return dates;
}

// Helper function to fill missing dates with zero values
function fillMissingDates<T extends { date: string }>(
  data: T[], 
  period: 'monthly' | 'weekly' | 'yearly' = 'monthly',
  defaultValues: Omit<T, 'date'>
): T[] {
  const dateRange = generateDateRange(period);
  const dataMap = new Map(data.map(item => [item.date, item]));
  
  return dateRange.map(date => {
    const existingData = dataMap.get(date);
    if (existingData) {
      return existingData;
    }
    return { date, ...defaultValues } as T;
  });
}

export default async (data: Handler) => {
  try {
    // Get timeframe from query params (default to monthly)
    const timeframe = data.query?.timeframe || 'monthly';
    const period = timeframe as 'monthly' | 'weekly' | 'yearly';
    
    // Calculate date ranges based on period
    let dateRangeStart: Date;
    const now = new Date();
    
    switch (period) {
      case 'yearly':
        dateRangeStart = new Date(now.getFullYear(), 0, 1); // Start of current year
        break;
      case 'weekly':
        dateRangeStart = new Date(now);
        dateRangeStart.setDate(now.getDate() - now.getDay()); // Start of current week
        break;
      default: // monthly
        dateRangeStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000); // Last 4 weeks (28 days)
        break;
    }

    // Overview metrics
    const overviewPromises = [
      // Total users
      models.user ? models.user.count().catch(() => 0) : Promise.resolve(0),
      
      // Active users (logged in within last 30 days)
      models.user ? models.user.count({
        where: {
          lastLogin: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }).catch(() => 0) : Promise.resolve(0),
      
      // New users today
      models.user ? models.user.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }).catch(() => 0) : Promise.resolve(0),
      
      // Total transactions count
      models.transaction ? models.transaction.count().catch(() => 0) : Promise.resolve(0),
      
      // Pending KYC
      models.kyc ? models.kyc.count({
        where: { status: 'PENDING' }
      }).catch(() => 0) : Promise.resolve(0)
    ];

    const [totalUsers, activeUsers, newUsersToday, totalTransactions, pendingKYC] = await Promise.all(overviewPromises);

    // Calculate total revenue in USD from transactions
    let totalRevenue = 0;
    try {
      if (models.transaction) {
        const transactions = await models.transaction.findAll({
          where: {
            status: 'COMPLETED',
            type: {
              [Op.in]: ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'TRADE']
            }
          },
          attributes: ['amount', 'fee'],
          include: [
            {
              model: models.wallet,
              as: 'wallet',
              attributes: ['type', 'currency'],
              required: true
            }
          ]
        });

        for (const transaction of transactions) {
          const walletType = transaction.wallet?.type || 'SPOT';
          const currency = transaction.wallet?.currency || 'USD';
          const fee = parseFloat(transaction.fee) || 0;
          
          if (fee > 0) {
            const feeUSD = await convertToUSD(fee, currency, walletType);
            totalRevenue += feeUSD;
          }
        }
      }
    } catch (error) {
      console.warn("Failed to calculate total revenue:", error.message);
    }

    // User registration trends with complete date range
    let userRegistrations: Array<{ date: string; total: number; new: number }> = [];
    try {
      if (models.user) {
        const groupByClause = period === 'yearly' 
          ? [fn('YEAR', col('createdAt')), fn('MONTH', col('createdAt'))]
          : period === 'monthly'
          ? [fn('YEARWEEK', col('createdAt'), 1)] // Group by week for monthly view
          : [fn('DATE', col('createdAt'))];
        
        const dateFormatClause = period === 'yearly'
          ? fn('CONCAT', fn('YEAR', col('createdAt')), '-', fn('LPAD', fn('MONTH', col('createdAt')), 2, '0'), '-01')
          : period === 'monthly'
          ? fn('DATE', fn('DATE_SUB', col('createdAt'), literal('INTERVAL WEEKDAY(createdAt) DAY'))) // Monday of the week
          : fn('DATE', col('createdAt'));

        const registrationData = await models.user.findAll({
          attributes: [
            [dateFormatClause, 'date'],
            [fn('COUNT', col('id')), 'count']
          ],
          where: {
            createdAt: {
              [Op.gte]: dateRangeStart
            }
          },
          group: groupByClause,
          order: [[dateFormatClause, 'ASC']]
        });

        const registrationMap = new Map();
        registrationData.forEach(reg => {
          const date = reg.getDataValue('date');
          const count = parseInt(reg.getDataValue('count')) || 0;
          registrationMap.set(date, count);
        });

        // Fill complete date range with proper cumulative totals
        const dateRange = generateDateRange(period);
        let cumulativeTotal = Math.max(0, totalUsers - newUsersToday);
        
        userRegistrations = dateRange.map(date => {
          const newCount = registrationMap.get(date) || 0;
          cumulativeTotal += newCount;
          return {
            date,
            total: cumulativeTotal,
            new: newCount
          };
        });
      }
    } catch (error) {
      console.warn("Failed to fetch user registration data:", error.message);
             // Generate fallback data with complete date range
       userRegistrations = fillMissingDates<{ date: string; total: number; new: number }>([], period, { total: totalUsers, new: 0 });
    }

    // Users by KYC level
    const usersByLevel: Array<{ level: string; count: number; color: string }> = [];
    try {
      if (models.kyc) {
        const kycLevels = await models.kyc.findAll({
          attributes: [
            'level',
            [fn('COUNT', col('userId')), 'count']
          ],
          group: ['level']
        });

        const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
        kycLevels.forEach((level, index) => {
          usersByLevel.push({
            level: level.level || 'Unverified',
            count: parseInt(level.getDataValue('count')) || 0,
            color: colors[index % colors.length]
          });
        });
      }
    } catch (error) {
      console.warn("Failed to fetch KYC level data:", error.message);
      usersByLevel.push({
        level: 'No KYC Data',
        count: totalUsers,
        color: '#8884D8'
      });
    }

    // Daily revenue with complete date range
    let dailyRevenue: Array<{ date: string; revenue: number; profit: number }> = [];
    try {
      if (models.transaction) {
        const groupByClause = period === 'yearly' 
          ? [fn('YEAR', col('createdAt')), fn('MONTH', col('createdAt'))]
          : period === 'monthly'
          ? [fn('YEARWEEK', col('createdAt'), 1)] // Group by week for monthly view
          : [fn('DATE', col('createdAt'))];
        
        const dateFormatClause = period === 'yearly'
          ? fn('CONCAT', fn('YEAR', col('createdAt')), '-', fn('LPAD', fn('MONTH', col('createdAt')), 2, '0'), '-01')
          : period === 'monthly'
          ? fn('DATE', fn('DATE_SUB', col('createdAt'), literal('INTERVAL WEEKDAY(createdAt) DAY'))) // Monday of the week
          : fn('DATE', col('createdAt'));

        const revenueData = await models.transaction.findAll({
          attributes: [
            [dateFormatClause, 'date'],
            [fn('SUM', col('fee')), 'totalFee'],
            [fn('COUNT', col('id')), 'transactionCount']
          ],
          where: {
            createdAt: {
              [Op.gte]: dateRangeStart
            },
            status: 'COMPLETED',
            fee: {
              [Op.gt]: 0
            }
          },
          group: groupByClause,
          order: [[dateFormatClause, 'ASC']]
        });

        const revenueMap = new Map();
        for (const rev of revenueData) {
          const date = rev.getDataValue('date');
          const fee = parseFloat(rev.getDataValue('totalFee')) || 0;
          // Assuming most fees are in USD/USDT for simplicity
          const revenue = fee;
          const profit = revenue * 0.7; // Assuming 70% profit margin
          
          revenueMap.set(date, { revenue, profit });
        }

        // Fill complete date range
        const dateRange = generateDateRange(period);
        dailyRevenue = dateRange.map(date => {
          const data = revenueMap.get(date) || { revenue: 0, profit: 0 };
          return {
            date,
            revenue: data.revenue,
            profit: data.profit
          };
        });
      }
    } catch (error) {
      console.warn("Failed to fetch daily revenue data:", error.message);
             // Generate fallback data with complete date range
       dailyRevenue = fillMissingDates<{ date: string; revenue: number; profit: number }>([], period, { revenue: 0, profit: 0 });
    }

    // Transaction volume by type
    const transactionVolume: Array<{ type: string; value: number; color: string }> = [];
    try {
      if (models.transaction) {
        const volumeData = await models.transaction.findAll({
          attributes: [
            'type',
            [fn('SUM', col('amount')), 'totalAmount'],
            [fn('COUNT', col('id')), 'count']
          ],
          where: {
            status: 'COMPLETED'
          },
          group: ['type']
        });

        // Map transaction types to proper names
        const typeNameMap: { [key: string]: string } = {
          'DEPOSIT': 'Deposit',
          'WITHDRAW': 'Withdrawal', 
          'TRANSFER': 'Transfer',
          'INCOMING_TRANSFER': 'Incoming Transfer',
          'OUTGOING_TRANSFER': 'Outgoing Transfer',
          'BINARY_ORDER': 'Binary Order',
          'FOREX_DEPOSIT': 'Forex Deposit',
          'FOREX_WITHDRAW': 'Forex Withdrawal',
          'REFERRAL_REWARD': 'Referral Reward',
          'STAKING_REWARD': 'Staking Reward',
          'AI_INVESTMENT': 'AI Investment',
          'ICO_CONTRIBUTION': 'ICO Contribution',
          'P2P_TRADE': 'P2P Trade',
          'COMMISSION': 'Commission',
          'BONUS': 'Bonus'
        };

        const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
        volumeData.forEach((vol, index) => {
          const rawType = vol.type || 'Unknown';
          transactionVolume.push({
            type: typeNameMap[rawType] || rawType,
            value: Math.round(parseFloat(vol.getDataValue('totalAmount')) || 0), // Round to remove decimals
            color: colors[index % colors.length]
          });
        });
      }
    } catch (error) {
      console.warn("Failed to fetch transaction volume data:", error.message);
    }

    // Trading activity with complete date range
    let dailyTrades: Array<{ date: string; count: number; volume: number }> = [];
    try {
      if (models.order) {
        const groupByClause = period === 'yearly' 
          ? [fn('YEAR', col('createdAt')), fn('MONTH', col('createdAt'))]
          : period === 'monthly'
          ? [fn('YEARWEEK', col('createdAt'), 1)] // Group by week for monthly view
          : [fn('DATE', col('createdAt'))];
        
        const dateFormatClause = period === 'yearly'
          ? fn('CONCAT', fn('YEAR', col('createdAt')), '-', fn('LPAD', fn('MONTH', col('createdAt')), 2, '0'), '-01')
          : period === 'monthly'
          ? fn('DATE', fn('DATE_SUB', col('createdAt'), literal('INTERVAL WEEKDAY(createdAt) DAY'))) // Monday of the week
          : fn('DATE', col('createdAt'));

        const tradesData = await models.order.findAll({
          attributes: [
            [dateFormatClause, 'date'],
            [fn('COUNT', col('id')), 'count'],
            [fn('SUM', col('amount')), 'volume']
          ],
          where: {
            createdAt: {
              [Op.gte]: dateRangeStart
            },
            status: 'FILLED'
          },
          group: groupByClause,
          order: [[dateFormatClause, 'ASC']]
        });

        const tradesMap = new Map();
        tradesData.forEach(trade => {
          const date = trade.getDataValue('date');
          const count = parseInt(trade.getDataValue('count')) || 0;
          const volume = parseFloat(trade.getDataValue('volume')) || 0;
          tradesMap.set(date, { count, volume });
        });

        // Fill complete date range
        const dateRange = generateDateRange(period);
        dailyTrades = dateRange.map(date => {
          const data = tradesMap.get(date) || { count: 0, volume: 0 };
          return {
            date,
            count: data.count,
            volume: data.volume
          };
        });
      }
    } catch (error) {
      console.warn("Failed to fetch daily trades data:", error.message);
             // Generate fallback data with complete date range
       dailyTrades = fillMissingDates<{ date: string; count: number; volume: number }>([], period, { count: 0, volume: 0 });
    }

    // Top trading assets
    const topAssets: Array<{ asset: string; volume: number; trades: number }> = [];
    try {
      if (models.order) {
        const assetsData = await models.order.findAll({
          attributes: [
            'symbol',
            [fn('SUM', col('amount')), 'volume'],
            [fn('COUNT', col('id')), 'trades']
          ],
          where: {
            status: 'FILLED'
          },
          group: ['symbol'],
          order: [[fn('SUM', col('amount')), 'DESC']],
          limit: 5
        });

        for (const asset of assetsData) {
          topAssets.push({
            asset: asset.symbol || 'Unknown',
            volume: parseFloat(asset.getDataValue('volume')) || 0,
            trades: parseInt(asset.getDataValue('trades')) || 0
          });
        }
      }
    } catch (error) {
      console.warn("Failed to fetch top assets data:", error.message);
    }

    // System status (mock data - replace with real monitoring data)
    const systemStatus = {
      services: [
        { name: "Database", status: "online", uptime: 99.9 },
        { name: "API Server", status: "online", uptime: 99.8 },
        { name: "WebSocket", status: "online", uptime: 99.7 },
        { name: "Cache Server", status: "online", uptime: 99.9 },
        { name: "Background Jobs", status: "warning", uptime: 95.2 }
      ],
      performance: {
        cpu: Math.floor(Math.random() * 30) + 20, // Mock 20-50% CPU
        memory: Math.floor(Math.random() * 40) + 30, // Mock 30-70% Memory
        disk: Math.floor(Math.random() * 20) + 15 // Mock 15-35% Disk
      }
    };

    return {
      overview: {
        totalUsers,
        activeUsers,
        newUsersToday,
        totalRevenue,
        totalTransactions,
        pendingKYC,
        systemHealth: totalRevenue > 1000 ? "healthy" : "warning"
      },
      userMetrics: {
        registrations: userRegistrations.length > 0 ? userRegistrations : 
          fillMissingDates<{ date: string; total: number; new: number }>([], period, { total: totalUsers || 0, new: 0 }),
        usersByLevel: usersByLevel.length > 0 ? usersByLevel : [
          { level: "Unverified", count: totalUsers, color: "#8884D8" }
        ]
      },
      financialMetrics: {
        dailyRevenue: dailyRevenue.length > 0 ? dailyRevenue :
          fillMissingDates<{ date: string; revenue: number; profit: number }>([], period, { revenue: 0, profit: 0 }),
        transactionVolume: transactionVolume.length > 0 ? transactionVolume : [
          { type: "No Data", value: 0, color: "#8884D8" }
        ]
      },
      tradingActivity: {
        dailyTrades: dailyTrades.length > 0 ? dailyTrades :
          fillMissingDates<{ date: string; count: number; volume: number }>([], period, { count: 0, volume: 0 }),
        topAssets: topAssets.length > 0 ? topAssets : [
          { asset: "No Data", volume: 0, trades: 0 }
        ]
      },
      systemStatus
    };

  } catch (error) {
    console.error("Admin dashboard error:", error);
    
    // Return minimal fallback data structure with complete date ranges
    const fallbackPeriod = 'monthly';
    return {
      overview: {
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        totalRevenue: 0,
        totalTransactions: 0,
        pendingKYC: 0,
        systemHealth: "error"
      },
      userMetrics: {
        registrations: fillMissingDates<{ date: string; total: number; new: number }>([], fallbackPeriod, { total: 0, new: 0 }),
        usersByLevel: [{ level: "Error", count: 0, color: "#FF0000" }]
      },
      financialMetrics: {
        dailyRevenue: fillMissingDates<{ date: string; revenue: number; profit: number }>([], fallbackPeriod, { revenue: 0, profit: 0 }),
        transactionVolume: [{ type: "Error", value: 0, color: "#FF0000" }]
      },
      tradingActivity: {
        dailyTrades: fillMissingDates<{ date: string; count: number; volume: number }>([], fallbackPeriod, { count: 0, volume: 0 }),
        topAssets: [{ asset: "Error", volume: 0, trades: 0 }]
      },
      systemStatus: {
        services: [{ name: "System", status: "offline", uptime: 0 }],
        performance: { cpu: 0, memory: 0, disk: 0 }
      }
    };
  }
}; 