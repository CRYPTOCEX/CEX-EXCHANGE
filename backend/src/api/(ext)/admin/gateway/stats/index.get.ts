import { models } from "@b/db";
import { fn, col, Op } from "sequelize";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Get gateway dashboard statistics",
  description: "Retrieves comprehensive overview statistics for the payment gateway admin dashboard including merchant counts, payment statistics (volume, counts by status), refund data, pending payouts, and recent payment activity. Supports filtering by mode (LIVE/TEST).",
  operationId: "getGatewayStats",
  tags: ["Admin", "Gateway", "Stats"],
  parameters: [
    {
      name: "mode",
      in: "query",
      description: "Filter payments by mode (LIVE or TEST)",
      schema: {
        type: "string",
        enum: ["LIVE", "TEST"],
      },
    },
  ],
  responses: {
    200: {
      description: "Gateway dashboard statistics",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              mode: { type: "string", description: "Current mode (LIVE or TEST)" },
              merchants: {
                type: "object",
                properties: {
                  total: { type: "number" },
                  active: { type: "number" },
                  pending: { type: "number" },
                },
              },
              payments: {
                type: "object",
                properties: {
                  total: { type: "number" },
                  completed: { type: "number" },
                  pending: { type: "number" },
                  failed: { type: "number" },
                  refunded: { type: "number" },
                  partiallyRefunded: { type: "number" },
                  totalVolume: { type: "number", description: "Total payment volume" },
                  totalRefunded: { type: "number", description: "Total refunded amount" },
                  netVolume: { type: "number", description: "Net volume (total - refunded)" },
                  totalFees: { type: "number", description: "Total fees collected" },
                },
              },
              payouts: {
                type: "object",
                properties: {
                  pending: { type: "number", description: "Number of pending payouts" },
                  pendingAmount: { type: "number", description: "Total pending payout amount" },
                },
              },
              recentPayments: {
                type: "array",
                items: {
                  type: "object",
                  description: "Recent payment with merchant and customer info",
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "access.gateway.merchant",
  logModule: "ADMIN_GATEWAY",
  logTitle: "Get gateway statistics",
  demoMask: ["recentPayments.customer.email"],
};

export default async (data: Handler) => {
  const { query, ctx } = data;
  const mode = (query?.mode as "LIVE" | "TEST") || "LIVE";
  const isTestMode = mode === "TEST";

  ctx?.step(`Calculating gateway statistics (mode: ${mode})`);

  ctx?.step("Fetching merchant statistics");

  // Get merchant stats (not filtered by mode - merchants are global)
  const [totalMerchants, activeMerchants, pendingMerchants] = await Promise.all([
    models.gatewayMerchant.count(),
    models.gatewayMerchant.count({ where: { status: "ACTIVE" } }),
    models.gatewayMerchant.count({ where: { status: "PENDING" } }),
  ]);

  ctx?.step("Fetching payment statistics");

  // Get payment stats (filtered by mode)
  const paymentWhere = { testMode: isTestMode };
  const [totalPayments, completedPayments, pendingPayments, failedPayments] =
    await Promise.all([
      models.gatewayPayment.count({ where: paymentWhere }),
      models.gatewayPayment.count({ where: { ...paymentWhere, status: "COMPLETED" } }),
      models.gatewayPayment.count({ where: { ...paymentWhere, status: "PENDING" } }),
      models.gatewayPayment.count({ where: { ...paymentWhere, status: "FAILED" } }),
    ]);

  ctx?.step("Calculating volume and refund statistics");

  // Get volume stats (filtered by mode) - only COMPLETED, excluding refunded
  const volumeStats = await models.gatewayPayment.findOne({
    where: {
      status: "COMPLETED",
      testMode: isTestMode
    },
    attributes: [
      [fn("SUM", col("amount")), "totalVolume"],
      [fn("SUM", col("feeAmount")), "totalFees"],
    ],
    raw: true,
  });

  // Get refund stats to subtract from totals
  const refundStats = await models.gatewayRefund.findOne({
    where: {
      status: "COMPLETED",
    },
    attributes: [
      [fn("SUM", col("gatewayRefund.amount")), "totalRefunded"],
    ],
    include: [
      {
        model: models.gatewayPayment,
        as: "payment",
        where: { testMode: isTestMode },
        attributes: [],
      },
    ],
    raw: true,
  });

  // Get refunded/partially refunded payment counts
  const [refundedPayments, partiallyRefundedPayments] = await Promise.all([
    models.gatewayPayment.count({ where: { ...paymentWhere, status: "REFUNDED" } }),
    models.gatewayPayment.count({ where: { ...paymentWhere, status: "PARTIALLY_REFUNDED" } }),
  ]);

  ctx?.step("Fetching payout statistics");

  // Get pending payouts (not filtered - payouts are always live)
  const pendingPayouts = await models.gatewayPayout.findAll({
    where: { status: "PENDING" },
    attributes: [
      [fn("COUNT", col("id")), "count"],
      [fn("SUM", col("amount")), "amount"],
    ],
    raw: true,
  });

  ctx?.step("Fetching recent payments");

  // Get recent payments with merchant info (filtered by mode)
  const recentPayments = await models.gatewayPayment.findAll({
    where: { testMode: isTestMode },
    limit: 10,
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: models.gatewayMerchant,
        as: "merchant",
        attributes: ["id", "name", "logo"],
      },
      {
        model: models.user,
        as: "customer",
        attributes: ["firstName", "lastName", "email", "avatar"],
      },
    ],
  });

  const totalVolume = parseFloat((volumeStats as any)?.totalVolume) || 0;
  const totalFees = parseFloat((volumeStats as any)?.totalFees) || 0;
  const totalRefunded = parseFloat((refundStats as any)?.totalRefunded) || 0;
  const netVolume = totalVolume - totalRefunded;

  ctx?.success(`Gateway statistics calculated: ${totalPayments} payments, ${totalMerchants} merchants`);

  return {
    mode,
    merchants: {
      total: totalMerchants,
      active: activeMerchants,
      pending: pendingMerchants,
    },
    payments: {
      total: totalPayments,
      completed: completedPayments,
      pending: pendingPayments,
      failed: failedPayments,
      refunded: refundedPayments,
      partiallyRefunded: partiallyRefundedPayments,
      totalVolume,
      totalRefunded,
      netVolume,
      totalFees,
    },
    payouts: {
      pending: parseInt((pendingPayouts as any)?.[0]?.count) || 0,
      pendingAmount: parseFloat((pendingPayouts as any)?.[0]?.amount) || 0,
    },
    recentPayments: recentPayments.map((p: any) => ({
      id: p.paymentIntentId,
      amount: p.amount,
      currency: p.currency,
      walletType: p.walletType,
      status: p.status,
      feeAmount: p.feeAmount,
      description: p.description,
      merchantId: p.merchant?.id,
      merchantName: p.merchant?.name || "Unknown",
      merchantLogo: p.merchant?.logo,
      customer: p.customer
        ? {
            name: `${p.customer.firstName || ""} ${p.customer.lastName || ""}`.trim() || p.customer.email,
            email: p.customer.email,
            avatar: p.customer.avatar,
          }
        : null,
      createdAt: p.createdAt,
    })),
  };
};
