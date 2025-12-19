import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { getFiltered } from "@b/utils/query";

export const metadata: OperationObject = { summary: "List payouts",
  description: "Lists all payouts for the current merchant.",
  operationId: "listMerchantPayouts",
  tags: ["Gateway", "Merchant", "Payouts"],
  parameters: [
    { name: "status",
      in: "query",
      schema: { type: "string" },
    },
    { name: "page",
      in: "query",
      schema: { type: "integer", default: 1 },
    },
    { name: "perPage",
      in: "query",
      schema: { type: "integer", default: 10 },
    },
  ],
  responses: { 200: { description: "List of payouts",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Get Payouts",
};

export default async (data: Handler) => { const { user, query, ctx } = data;

  if (!user?.id) { throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Find merchant
  const merchant = await models.gatewayMerchant.findOne({ where: { userId: user.id },
  });

  if (!merchant) { throw createError({ statusCode: 404,
      message: "Merchant account not found",
    });
  }

  // Build where clause
  const where: any = { merchantId: merchant.id };

  if (query.status) { where.status = query.status;
  }

  // Get payouts
  const result = await getFiltered({ model: models.gatewayPayout,
    query,
    where,
    sortField: "createdAt",
    paranoid: false,
  });
  ctx?.success("Request completed successfully");

  return { items: result.items.map((p: any) => ({ id: p.payoutId,
      amount: p.amount,
      currency: p.currency,
      walletType: p.walletType,
      status: p.status,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      grossAmount: p.grossAmount,
      feeAmount: p.feeAmount,
      netAmount: p.netAmount,
      paymentCount: p.paymentCount,
      refundCount: p.refundCount,
      createdAt: p.createdAt,
    })),
    pagination: result.pagination,
  };
};
