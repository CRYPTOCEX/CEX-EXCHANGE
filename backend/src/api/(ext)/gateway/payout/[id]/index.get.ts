import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = { summary: "Get payout details",
  description: "Gets detailed information about a specific payout for the current merchant.",
  operationId: "getMerchantPayoutDetails",
  tags: ["Gateway", "Merchant", "Payouts"],
  parameters: [
    { name: "id",
      in: "path",
      required: true,
      description: "Payout ID",
      schema: { type: "string" },
    },
  ],
  responses: { 200: { description: "Payout details",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Get Payout",
};

export default async (data: Handler) => { const { user, params, ctx } = data;
  const { id } = params;

  if (!user?.id) { throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Find merchant
  const merchant = await models.gatewayMerchant.findOne({ where: { userId: user.id },
  });

  if (!merchant) { throw createError({ statusCode: 404,
      message: "Merchant account not found",
    });
  }

  // Find payout - try both payoutId and id
  const payout = await models.gatewayPayout.findOne({ where: { [models.Sequelize.Op.or]: [
        { payoutId: id },
        { id: id },
      ],
      merchantId: merchant.id,
    },
  });

  if (!payout) { throw createError({ statusCode: 404,
      message: "Payout not found",
    });
  }

  // Get related payments for this payout period
  const payments = await models.gatewayPayment.findAll({ where: { merchantId: merchant.id,
      status: "COMPLETED",
      createdAt: { [models.Sequelize.Op.between]: [payout.periodStart, payout.periodEnd],
      },
    },
    attributes: ["id", "paymentIntentId", "amount", "currency", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: 50,
  });

  // Get related refunds for this payout period
  const refunds = await models.gatewayRefund.findAll({ where: { merchantId: merchant.id,
      status: "COMPLETED",
      createdAt: { [models.Sequelize.Op.between]: [payout.periodStart, payout.periodEnd],
      },
    },
    attributes: ["id", "refundId", "amount", "currency", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: 50,
  });
  ctx?.success("Request completed successfully");

  return { id: payout.payoutId,
    amount: payout.amount,
    currency: payout.currency,
    walletType: payout.walletType,
    status: payout.status,
    periodStart: payout.periodStart,
    periodEnd: payout.periodEnd,
    grossAmount: payout.grossAmount,
    feeAmount: payout.feeAmount,
    netAmount: payout.netAmount,
    paymentCount: payout.paymentCount,
    refundCount: payout.refundCount,
    metadata: payout.metadata,
    createdAt: payout.createdAt,
    updatedAt: payout.updatedAt,
    payments: payments.map((p: any) => ({ id: p.paymentIntentId,
      amount: p.amount,
      currency: p.currency,
      createdAt: p.createdAt,
    })),
    refunds: refunds.map((r: any) => ({ id: r.refundId,
      amount: r.amount,
      currency: r.currency,
      createdAt: r.createdAt,
    })),
  };
};
