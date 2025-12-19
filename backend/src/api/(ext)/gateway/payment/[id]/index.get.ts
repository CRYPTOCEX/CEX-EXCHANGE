import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = { summary: "Get payment details",
  description: "Gets detailed payment information for merchants.",
  operationId: "getMerchantPayment",
  tags: ["Gateway", "Merchant", "Payments"],
  parameters: [
    { name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: { 200: { description: "Payment details",
    },
    404: { description: "Payment not found",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Get Payment",
  demoMask: ["customerEmail"],
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

  // Find payment
  const payment = await models.gatewayPayment.findOne({ where: { paymentIntentId: id,
      merchantId: merchant.id,
    },
    include: [
      { model: models.gatewayRefund,
        as: "gatewayRefunds",
        attributes: ["refundId", "amount", "status", "reason", "createdAt"],
      },
    ],
  });

  if (!payment) { throw createError({ statusCode: 404,
      message: "Payment not found",
    });
  }
  ctx?.success("Request completed successfully");

  return { id: payment.paymentIntentId,
    orderId: payment.merchantOrderId,
    amount: payment.amount,
    currency: payment.currency,
    walletType: payment.walletType,
    feeAmount: payment.feeAmount,
    netAmount: payment.netAmount,
    status: payment.status,
    description: payment.description,
    metadata: payment.metadata,
    allocations: payment.allocations,
    lineItems: payment.lineItems,
    customerEmail: payment.customerEmail,
    customerName: payment.customerName,
    billingAddress: payment.billingAddress,
    testMode: payment.testMode,
    expiresAt: payment.expiresAt,
    completedAt: payment.completedAt,
    createdAt: payment.createdAt,
    refunds: payment.gatewayRefunds?.map((r: any) => ({ id: r.refundId,
      amount: r.amount,
      status: r.status,
      reason: r.reason,
      createdAt: r.createdAt,
    })),
  };
};
