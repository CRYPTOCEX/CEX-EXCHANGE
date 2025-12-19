import { models } from "@b/db";
import { Op, fn, col, literal } from "sequelize";

export const metadata: OperationObject = {
  summary: "Get Gateway Landing Page Data",
  description:
    "Retrieves optimized data for the gateway landing page including stats, supported currencies, fee structure, and recent activity.",
  operationId: "getGatewayLandingData",
  tags: ["Gateway", "Landing"],
  requiresAuth: false,
  responses: {
    200: {
      description: "Gateway landing data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              stats: { type: "object" },
              supportedPayments: { type: "object" },
              feeStructure: { type: "object" },
              payoutOptions: { type: "array" },
              recentActivity: { type: "array" },
              integrations: { type: "array" },
            },
          },
        },
      },
    },
  },
};

export default async (data: Handler) => {
  const [
    totalMerchants,
    activeMerchants,
    totalTransactions,
    completedPayments,
    volumeResult,
    currencyStats,
    countryStats,
    processingTimeResult,
    refundCount,
    recentPayments,
  ] = await Promise.all([
    // Total merchants
    models.gatewayMerchant.count(),

    // Active merchants
    models.gatewayMerchant.count({ where: { status: "ACTIVE" } }),

    // Total transactions
    models.gatewayPayment.count(),

    // Completed payments
    models.gatewayPayment.count({ where: { status: "COMPLETED" } }),

    // Total volume and average
    models.gatewayPayment.findOne({
      attributes: [
        [fn("SUM", col("amount")), "totalVolume"],
        [fn("AVG", col("amount")), "avgAmount"],
      ],
      where: { status: "COMPLETED" },
      raw: true,
    }),

    // Distinct currencies used
    models.gatewayPayment.findAll({
      attributes: [[fn("DISTINCT", col("currency")), "currency"]],
      where: { status: "COMPLETED" },
      raw: true,
    }),

    // Distinct countries from merchants
    models.gatewayMerchant.findAll({
      attributes: [[fn("DISTINCT", col("country")), "country"]],
      where: { status: "ACTIVE", country: { [Op.ne]: null } },
      raw: true,
    }),

    // Average processing time (if completedAt exists)
    models.gatewayPayment.findOne({
      attributes: [
        [
          fn(
            "AVG",
            literal("TIMESTAMPDIFF(SECOND, createdAt, completedAt)")
          ),
          "avgSeconds",
        ],
      ],
      where: {
        status: "COMPLETED",
        completedAt: { [Op.ne]: null },
      },
      raw: true,
    }),

    // Refund count
    models.gatewayRefund.count({ where: { status: "COMPLETED" } }),

    // Recent completed payments (non-test)
    models.gatewayPayment.findAll({
      where: { status: "COMPLETED", testMode: false },
      include: [
        {
          model: models.gatewayMerchant,
          as: "merchant",
          attributes: ["name", "country"],
        },
      ],
      order: [["completedAt", "DESC"]],
      limit: 10,
    }),
  ]);

  const totalVolume = parseFloat((volumeResult as any)?.totalVolume) || 0;
  const avgAmount = parseFloat((volumeResult as any)?.avgAmount) || 0;
  const avgSeconds = parseFloat((processingTimeResult as any)?.avgSeconds) || 2;
  const successRate =
    totalTransactions > 0
      ? Math.round((completedPayments / totalTransactions) * 100)
      : 99;
  const refundRate =
    completedPayments > 0
      ? Math.round((refundCount / completedPayments) * 100 * 100) / 100
      : 0;

  // Format currencies
  const allCurrencies = (currencyStats as any[])
    .map((c) => c.currency)
    .filter(Boolean);
  const cryptoCurrencies = allCurrencies.filter((c: string) =>
    ["BTC", "ETH", "USDT", "USDC", "LTC", "XRP", "BNB", "SOL", "DOGE"].includes(c)
  );
  const fiatCurrencies = allCurrencies.filter((c: string) =>
    ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF"].includes(c)
  );

  // Format recent activity
  const recentActivity = recentPayments.slice(0, 8).map((p: any) => ({
    type: "payment_completed" as const,
    amount: p.amount,
    currency: p.currency,
    timeAgo: getTimeAgo(p.completedAt),
    merchantCategory: (p as any).merchant?.country || "Global",
  }));

  // Static integrations data
  const integrations = [
    {
      name: "Node.js SDK",
      type: "SDK",
      languages: ["JavaScript", "TypeScript"],
      icon: "nodejs",
    },
    {
      name: "Python SDK",
      type: "SDK",
      languages: ["Python"],
      icon: "python",
    },
    { name: "PHP SDK", type: "SDK", languages: ["PHP"], icon: "php" },
    { name: "REST API", type: "API", languages: ["Any"], icon: "api" },
    {
      name: "WooCommerce",
      type: "PLUGIN",
      platforms: ["WordPress"],
      icon: "woocommerce",
    },
    {
      name: "Shopify",
      type: "PLUGIN",
      platforms: ["Shopify"],
      icon: "shopify",
    },
  ];

  // Fee structure (platform defaults)
  const feeStructure = {
    type: "BOTH",
    percentage: 2.9,
    fixed: 0.3,
    example: {
      amount: 100,
      fee: 100 * 0.029 + 0.3,
      netAmount: 100 - (100 * 0.029 + 0.3),
    },
  };

  // Payout options
  const payoutOptions = [
    {
      schedule: "INSTANT",
      description: "Get paid immediately after each transaction",
      minThreshold: 0,
      icon: "zap",
    },
    {
      schedule: "DAILY",
      description: "Automatic daily settlements at midnight UTC",
      minThreshold: 100,
      icon: "calendar",
    },
    {
      schedule: "WEEKLY",
      description: "Weekly payouts every Monday",
      minThreshold: 100,
      icon: "calendar-week",
    },
    {
      schedule: "MONTHLY",
      description: "Monthly payouts on the 1st",
      minThreshold: 100,
      icon: "calendar-month",
    },
  ];

  return {
    stats: {
      totalMerchants: activeMerchants || totalMerchants,
      totalTransactions,
      totalVolume: Math.round((totalVolume / 1000000) * 100) / 100,
      successRate,
      avgProcessingTime: Math.max(Math.round(avgSeconds), 1),
      currenciesSupported: allCurrencies.length || 15,
      countriesServed: (countryStats as any[]).length || 50,
      avgTransactionValue: Math.round(avgAmount * 100) / 100,
      refundRate,
      uptime: 99.99,
    },
    supportedPayments: {
      fiat:
        fiatCurrencies.length > 0
          ? fiatCurrencies
          : ["USD", "EUR", "GBP", "CAD", "AUD"],
      crypto:
        cryptoCurrencies.length > 0
          ? cryptoCurrencies
          : ["BTC", "ETH", "USDT", "USDC", "LTC"],
      walletTypes: ["FIAT", "SPOT", "ECO"],
    },
    feeStructure,
    payoutOptions,
    recentActivity,
    integrations,
  };
};

function getTimeAgo(date: Date): string {
  if (!date) return "just now";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
