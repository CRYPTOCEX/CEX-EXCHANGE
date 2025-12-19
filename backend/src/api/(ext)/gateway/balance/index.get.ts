import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = { summary: "Get merchant balance",
  description: "Gets the merchant's balance across all currencies.",
  operationId: "getMerchantBalance",
  tags: ["Gateway", "Merchant", "Balance"],
  responses: { 200: { description: "Balance information",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Get Gateway Balance",
};

export default async (data: Handler) => { const { user, ctx } = data;

  if (!user?.id) { throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Find merchant
  const merchant = await models.gatewayMerchant.findOne({ where: { userId: user.id },
  });

  if (!merchant) { throw createError({ statusCode: 404,
      message: "Merchant account not found",
    });
  }

  // Get all balances
  const balances = await models.gatewayMerchantBalance.findAll({ where: { merchantId: merchant.id },
    order: [["currency", "ASC"]],
  });

  // Calculate totals
  let totalAvailable = 0;
  let totalPending = 0;
  let totalReserved = 0;

  const balanceList = balances.map((b) => { totalAvailable += parseFloat(b.available);
    totalPending += parseFloat(b.pending);
    totalReserved += parseFloat(b.reserved);

    return { currency: b.currency,
      walletType: b.walletType,
      available: b.available,
      pending: b.pending,
      reserved: b.reserved,
      totalReceived: b.totalReceived,
      totalRefunded: b.totalRefunded,
      totalFees: b.totalFees,
      totalPaidOut: b.totalPaidOut,
    };
  });
  ctx?.success("Request completed successfully");

  return { balances: balanceList,
    summary: { totalAvailable,
      totalPending,
      totalReserved,
    },
    payoutSettings: { schedule: merchant.payoutSchedule,
      threshold: merchant.payoutThreshold,
      defaultCurrency: merchant.defaultCurrency,
    },
  };
};
