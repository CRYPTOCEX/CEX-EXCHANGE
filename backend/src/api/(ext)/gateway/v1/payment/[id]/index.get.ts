import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { authenticateGatewayApi,
  checkApiPermission,
} from "@b/utils/gateway";
import { paymentResponseSchema } from "../../utils";

export const metadata: OperationObject = { summary: "Get payment details",
  description: "Retrieves the details of an existing payment by its ID.",
  operationId: "getPayment",
  tags: ["Gateway", "Payment"],
  parameters: [
    { name: "id",
      in: "path",
      required: true,
      description: "Payment intent ID (e.g., pi_xxx)",
      schema: { type: "string" },
    },
  ],
  responses: { 200: { description: "Payment details",
      content: { "application/json": { schema: paymentResponseSchema,
        },
      },
    },
    401: { description: "Invalid or missing API key",
    },
    404: { description: "Payment not found",
    },
  },
  requiresAuth: false,
  logModule: "GATEWAY",
  logTitle: "Get Payment V1",
};

export default async (data: Handler) => { const { params, headers, ctx } = data;
  const { id } = params;

  // Authenticate using API key
  const apiKeyHeader = headers?.["x-api-key"] || headers?.["X-API-Key"];
  const clientIp = headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
                   headers?.["x-real-ip"] ||
                   headers?.["cf-connecting-ip"] ||
                   null;
  const { merchant, apiKey, isTestMode } =
    await authenticateGatewayApi(apiKeyHeader, clientIp);

  // Check permission
  checkApiPermission(apiKey, "payment.read");

  // Find payment
  const payment = await models.gatewayPayment.findOne({ where: { paymentIntentId: id,
      merchantId: merchant.id,
    },
  });

  if (!payment) { throw createError({ statusCode: 404,
      message: "Payment not found",
    });
  }

  // Check test mode consistency
  if (payment.testMode !== isTestMode) { throw createError({ statusCode: 404,
      message: "Payment not found",
    });
  }
  ctx?.success("Request completed successfully");

  return { id: payment.paymentIntentId,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    walletType: payment.walletType,
    merchantOrderId: payment.merchantOrderId,
    description: payment.description,
    feeAmount: payment.feeAmount,
    netAmount: payment.netAmount,
    checkoutUrl: payment.checkoutUrl,
    customerEmail: payment.customerEmail,
    customerName: payment.customerName,
    metadata: payment.metadata,
    expiresAt: payment.expiresAt,
    completedAt: payment.completedAt,
    createdAt: payment.createdAt,
  };
};
