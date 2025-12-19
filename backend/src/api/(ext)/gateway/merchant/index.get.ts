import { models } from "@b/db";
import { Op, fn, col } from "sequelize";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = { summary: "Get merchant dashboard",
  description: "Gets the current user's merchant account details and stats.",
  operationId: "getMerchantDashboard",
  tags: ["Gateway", "Merchant"],
  parameters: [
    { name: "mode",
      in: "query",
      description: "Filter by mode (LIVE or TEST)",
      required: false,
      schema: { type: "string",
        enum: ["LIVE", "TEST"],
      },
    },
  ],
  responses: { 200: { description: "Merchant dashboard data",
    },
    404: { description: "Merchant account not found",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Get Merchant",
  demoMask: [
    "merchant.email",
    "merchant.phone",
    "merchant.webhookSecret",
    "recentPayments.customer.email",
  ],
};

export default async (data: Handler) => {
  const { user, query, ctx } = data;
  const mode = query?.mode as "LIVE" | "TEST" | undefined;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Fetching merchant dashboard data");

  // Find merchant
  const merchant = await models.gatewayMerchant.findOne({ where: { userId: user.id },
  });

  if (!merchant) { throw createError({ statusCode: 404,
      message: "Merchant account not found. Please register first.",
    });
  }

  // Get balances
  const balances = await models.gatewayMerchantBalance.findAll({ where: { merchantId: merchant.id },
  });

  // Get recent payments stats
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Determine testMode filter based on mode parameter
  const isTestMode = mode === "TEST";

  const [paymentStats, recentPayments, refundStats] = await Promise.all([
    // Stats for last 30 days - filtered by selected mode
    models.gatewayPayment.findAll({ where: { merchantId: merchant.id,
        status: "COMPLETED",
        testMode: isTestMode,
        completedAt: { [Op.gte]: thirtyDaysAgo,
        },
      },
      attributes: [
        [fn("COUNT", col("id")), "count"],
        [fn("SUM", col("amount")), "totalAmount"],
        [fn("SUM", col("feeAmount")), "totalFees"],
        [fn("SUM", col("netAmount")), "totalNet"],
      ],
      raw: true,
    }),
    // Recent payments - filtered by selected mode
    models.gatewayPayment.findAll({ where: { merchantId: merchant.id,
        testMode: isTestMode,
      },
      order: [["createdAt", "DESC"]],
      limit: 10,
      attributes: [
        "paymentIntentId",
        "merchantOrderId",
        "amount",
        "currency",
        "walletType",
        "feeAmount",
        "description",
        "status",
        "testMode",
        "createdAt",
        "completedAt",
      ],
      include: [
        { model: models.user,
          as: "customer",
          attributes: ["firstName", "lastName", "email", "avatar"],
        },
      ],
    }),
    // Refund stats for last 30 days
    models.gatewayRefund.findAll({ where: { merchantId: merchant.id,
        status: "COMPLETED",
        createdAt: { [Op.gte]: thirtyDaysAgo,
        },
      },
      attributes: [
        [fn("SUM", col("gatewayRefund.amount")), "totalRefunded"],
      ],
      include: [
        { model: models.gatewayPayment,
          as: "payment",
          where: { testMode: isTestMode },
          attributes: [],
        },
      ],
      raw: true,
    }),
  ]);

  // Get pending refunds count
  const pendingRefundsCount = await models.gatewayRefund.count({ where: { merchantId: merchant.id,
      status: "PENDING",
    },
  });

  const stats = paymentStats[0] || {};
  const refunds = refundStats[0] || {};
  const totalAmount = parseFloat(stats.totalAmount) || 0;
  const totalFees = parseFloat(stats.totalFees) || 0;
  const totalRefunded = parseFloat(refunds.totalRefunded) || 0;
  const totalNet = (parseFloat(stats.totalNet) || 0) - totalRefunded;
  ctx?.success("Request completed successfully");

  return { merchant: { id: merchant.id,
      name: merchant.name,
      slug: merchant.slug,
      email: merchant.email,
      phone: merchant.phone,
      logo: merchant.logo,
      website: merchant.website,
      description: merchant.description,
      businessType: merchant.businessType,
      address: merchant.address,
      city: merchant.city,
      state: merchant.state,
      country: merchant.country,
      postalCode: merchant.postalCode,
      status: merchant.status,
      verificationStatus: merchant.verificationStatus,
      testMode: merchant.testMode,
      webhookUrl: merchant.webhookUrl,
      webhookSecret: merchant.webhookSecret,
      successUrl: merchant.successUrl,
      cancelUrl: merchant.cancelUrl,
      createdAt: merchant.createdAt,
    },
    balances: balances.map((b) => ({ currency: b.currency,
      walletType: b.walletType,
      available: b.available,
      pending: b.pending,
      reserved: b.reserved,
    })),
    stats: { last30Days: { paymentCount: parseInt(stats.count) || 0,
        totalAmount,
        totalRefunded,
        totalFees,
        totalNet,
      },
      pendingRefunds: pendingRefundsCount,
    },
    recentPayments: recentPayments.map((p: any) => ({ id: p.paymentIntentId,
      orderId: p.merchantOrderId,
      amount: p.amount,
      currency: p.currency,
      walletType: p.walletType,
      feeAmount: p.feeAmount,
      description: p.description,
      status: p.status,
      customer: p.customer
        ? { name: `${p.customer.firstName || ""} ${p.customer.lastName || ""}`.trim() || p.customer.email,
            email: p.customer.email,
            avatar: p.customer.avatar,
          }
        : null,
      createdAt: p.createdAt,
      completedAt: p.completedAt,
    })),
    mode: mode || "LIVE",
  };
};
