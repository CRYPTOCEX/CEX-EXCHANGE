import { models } from "@b/db";
import { Op } from "sequelize";
import { add, format } from "date-fns";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { walletSchema } from "@b/api/admin/finance/wallet/utils";
import { createError } from "@b/utils/error";
import { CacheManager } from "@b/utils/cache";
// Safe import for MatchingEngine (only available if extension is installed)
async function getMatchingEngine() {
  try {
    // @ts-ignore - Dynamic import for optional extension
    const module = await import("@b/api/(ext)/ecosystem/utils/matchingEngine");
    return module.MatchingEngine.getInstance();
  } catch (error) {
    // Return a basic stub if extension not available
    return {
      getTickers: async () => ({})
    };
  }
}

type DailyPnlRecord = Record<
  string,
  { FIAT: number; SPOT: number; FUNDING: number }
>;

export const metadata: OperationObject = {
  summary: "Lists all wallets with optional filters",
  operationId: "listWallets",
  tags: ["Finance", "Wallets"],
  parameters: [
    ...crudParameters,
    {
      name: "pnl",
      in: "query",
      description: "Fetch PnL data for the last 28 days",
      schema: {
        type: "boolean",
      },
    },
  ],
  responses: {
    200: {
      description: "List of wallets with pagination metadata",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: walletSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Wallets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { query, user } = data;

  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { walletType, sortOrder, ...rest } = query;

  const { pnl } = query;
  if (pnl) return handlePnl(user);

  // Check if spot wallets are enabled
  const cacheManager = CacheManager.getInstance();
  const spotWalletsEnabled = await cacheManager.getSetting("spotWallets");
  const isSpotEnabled = spotWalletsEnabled === true || spotWalletsEnabled === "true";

  const where = { userId: user.id };
  if (walletType) {
    where["type"] = walletType;
  } else if (!isSpotEnabled) {
    // If spot wallets are disabled and no specific type is requested, exclude SPOT
    where["type"] = { [Op.ne]: "SPOT" };
  }

  const { items, pagination } = (await getFiltered({
    model: models.wallet,
    query: {
      ...rest,
      sortOrder: sortOrder || "asc",
    },
    where,
    sortField: rest.sortField || "currency",
    numericFields: ["balance", "inOrder"],
    paranoid: false,
  })) as any;

  // Extract currencies of ECO type wallets
  const ecoWallets = items.filter((wallet) => wallet.type === "ECO");
  const ecoCurrencies = Array.from(
    new Set(ecoWallets.map((wallet) => wallet.currency))
  ) as string[];

  if (ecoCurrencies.length > 0) {
    const ecosystemTokens = await models.ecosystemToken.findAll({
      where: { currency: ecoCurrencies },
    });

    const tokenMap = new Map(
      ecosystemTokens.map((token) => [token.currency, token.icon])
    );

    ecoWallets.forEach((wallet) => {
      wallet.icon = tokenMap.get(wallet.currency) || null;
    });
  }

  return {
    items,
    pagination,
  };
};
const handlePnl = async (user: any) => {
  const wallets = await models.wallet.findAll({
    where: { userId: user.id },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currencyPrices, exchangePrices] = await Promise.all([
    models.currency.findAll({
      where: { id: Array.from(new Set(wallets.map((w) => w.currency))) },
    }),
    models.exchangeCurrency.findAll({
      where: { currency: Array.from(new Set(wallets.map((w) => w.currency))) },
    }),
  ]);

  const currencyMap = new Map(
    currencyPrices.map((item) => [item.id, item.price])
  );
  const exchangeMap = new Map(
    exchangePrices.map((item) => [item.currency, item.price])
  );

  const engine = await getMatchingEngine();
  const tickers = await engine.getTickers();

  // Modified to include all asset types
  const balances = { FIAT: 0, SPOT: 0, ECO: 0 };
  wallets.forEach((wallet) => {
    let price;
    if (wallet.type === "FIAT") {
      price = currencyMap.get(wallet.currency) || 1; // Assume 1:1 for fiat currencies
    } else if (wallet.type === "SPOT" || wallet.type === "ECO") {
      price =
        exchangeMap.get(wallet.currency) || tickers[wallet.currency]?.last || 0;
    }
    if (price) {
      balances[wallet.type] += price * wallet.balance;
    }
  });

  // Ensure the balances are updated today
  const todayPnl = await models.walletPnl.findOne({
    where: {
      userId: user.id,
      createdAt: {
        [Op.gte]: today,
      },
    },
  });

  if (todayPnl) {
    await todayPnl.update({ balances });
  } else {
    await models.walletPnl.create({
      userId: user.id,
      balances,
      createdAt: today,
    });
  }

  const oneMonthAgo = add(today, { days: -28 });

  const pnlRecords = await models.walletPnl.findAll({
    where: {
      userId: user.id,
      createdAt: {
        [Op.between]: [oneMonthAgo, today],
      },
    },
    attributes: ["balances", "createdAt"],
    order: [["createdAt", "ASC"]],
  });

  const dailyPnl = pnlRecords.reduce((acc: DailyPnlRecord, record) => {
    const dateKey = format(record.createdAt as Date, "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = { FIAT: 0, SPOT: 0, FUNDING: 0 };
    }
    acc[dateKey].FIAT += record.balances.FIAT || 0;
    acc[dateKey].SPOT += record.balances.SPOT || 0;
    acc[dateKey].FUNDING += record.balances.ECO || 0;
    return acc;
  }, {} as DailyPnlRecord);

  // Modified to include all asset types
  type PnlChartItem = {
    date: string;
    FIAT: number;
    SPOT: number;
    FUNDING: number;
  };
  const pnlChart: PnlChartItem[] = [];
  const startOfWeek = add(oneMonthAgo, { days: -oneMonthAgo.getDay() });

  for (
    let weekStart = startOfWeek;
    weekStart < today;
    weekStart = add(weekStart, { weeks: 1 })
  ) {
    const weekEnd = add(weekStart, { days: 6 });
    let weeklyFIAT = 0,
      weeklySPOT = 0,
      weeklyFUNDING = 0;

    for (let date = weekStart; date <= weekEnd; date = add(date, { days: 1 })) {
      const dateKey = format(date, "yyyy-MM-dd");
      if (dailyPnl[dateKey]) {
        weeklyFIAT += dailyPnl[dateKey].FIAT;
        weeklySPOT += dailyPnl[dateKey].SPOT;
        weeklyFUNDING += dailyPnl[dateKey].FUNDING;
      }
    }

    pnlChart.push({
      date: format(weekStart, "yyyy-MM-dd"),
      FIAT: weeklyFIAT,
      SPOT: weeklySPOT,
      FUNDING: weeklyFUNDING,
    });
  }

  const yesterday = add(today, { days: -1 });
  const yesterdayPnlRecord = pnlRecords.find(
    (record) =>
      format(record.createdAt as Date, "yyyy-MM-dd") ===
      format(yesterday, "yyyy-MM-dd")
  );

  // Calculate PnL excluding transfers and withdrawals
  const calculatePnl = (today: number, yesterday: number) => {
    const pnl = today - yesterday;
    // You may need to fetch transfer and withdrawal data here
    const transfers = 0; // Replace with actual transfer amount
    const withdrawals = 0; // Replace with actual withdrawal amount
    return pnl - transfers - withdrawals;
  };

  const todayTotal = sumBalances(balances);
  const yesterdayTotal = yesterdayPnlRecord
    ? sumBalances(yesterdayPnlRecord.balances)
    : 0;

  return {
    today: todayTotal,
    yesterday: yesterdayTotal,
    pnl: calculatePnl(todayTotal, yesterdayTotal),
    chart: pnlChart,
  };
};

const sumBalances = (balances: Record<string, number>) => {
  return Object.values(balances).reduce((acc, balance) => acc + balance, 0);
};
