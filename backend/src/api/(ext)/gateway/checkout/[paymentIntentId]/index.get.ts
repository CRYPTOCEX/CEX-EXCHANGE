import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = { summary: "Get checkout session",
  description:
    "Retrieves checkout session details for the customer to complete payment.",
  operationId: "getCheckoutSession",
  tags: ["Gateway", "Checkout"],
  parameters: [
    { name: "paymentIntentId",
      in: "path",
      required: true,
      description: "Payment intent ID",
      schema: { type: "string" },
    },
  ],
  responses: { 200: { description: "Checkout session details",
    },
    404: { description: "Payment not found or expired",
    },
  },
  requiresAuth: false,
  logModule: "GATEWAY",
  logTitle: "Get Checkout", // Public endpoint - frontend handles auth check separately
};

export default async (data: Handler) => { const { params, ctx } = data;
  const { paymentIntentId } = params;

  // Find payment with merchant info
  const payment = await models.gatewayPayment.findOne({ where: { paymentIntentId,
    },
    include: [
      { model: models.gatewayMerchant,
        as: "merchant",
        attributes: ["id", "name", "logo", "website", "status"],
      },
    ],
  });

  if (!payment) { throw createError({ statusCode: 404,
      message: "Payment not found",
    });
  }

  // Check if payment is still valid
  if (payment.status !== "PENDING" && payment.status !== "PROCESSING") { throw createError({ statusCode: 400,
      message: `Payment is ${payment.status.toLowerCase()}`,
    });
  }

  // Check if expired
  if (new Date(payment.expiresAt) < new Date()) { await payment.update({ status: "EXPIRED" });
    throw createError({ statusCode: 400,
      message: "Payment session has expired",
    });
  }

  // Check merchant status
  if (payment.merchant?.status !== "ACTIVE") { throw createError({ statusCode: 400,
      message: "Merchant is not active",
    });
  }

  // Transform lineItems to map imageUrl to image for frontend compatibility
  const lineItems = payment.lineItems?.map((item: any) => ({ name: item.name,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    image: item.imageUrl || item.image, // Support both field names
  }));

  // Return session details - frontend will fetch wallet balance separately if user is logged in
  ctx?.success("Request completed successfully");
  return { id: payment.paymentIntentId,
    merchant: { name: payment.merchant?.name,
      logo: payment.merchant?.logo,
      website: payment.merchant?.website,
    },
    amount: payment.amount,
    currency: payment.currency,
    walletType: payment.walletType,
    description: payment.description,
    lineItems,
    expiresAt: payment.expiresAt,
    status: payment.status,
    testMode: payment.testMode,
    cancelUrl: payment.cancelUrl,
    returnUrl: payment.returnUrl,
  };
};
