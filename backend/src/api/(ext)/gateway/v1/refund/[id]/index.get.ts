import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { authenticateGatewayApi,
  checkApiPermission,
} from "@b/utils/gateway";
import { refundResponseSchema } from "../../utils";

export const metadata: OperationObject = { summary: "Get refund details",
  description: "Retrieves the details of an existing refund by its ID.",
  operationId: "getRefund",
  tags: ["Gateway", "Refund"],
  parameters: [
    { name: "id",
      in: "path",
      required: true,
      description: "Refund ID (e.g., re_xxx)",
      schema: { type: "string" },
    },
  ],
  responses: { 200: { description: "Refund details",
      content: { "application/json": { schema: refundResponseSchema,
        },
      },
    },
    401: { description: "Invalid or missing API key",
    },
    404: { description: "Refund not found",
    },
  },
  requiresAuth: false,
  logModule: "GATEWAY",
  logTitle: "Get Refund V1",
};

export default async (data: Handler) => { const { params, headers, ctx } = data;
  const { id } = params;

  // Authenticate using API key
  const apiKeyHeader = headers?.["x-api-key"] || headers?.["X-API-Key"];
  const clientIp = headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
                   headers?.["x-real-ip"] ||
                   headers?.["cf-connecting-ip"] ||
                   null;
  const { merchant, apiKey } = await authenticateGatewayApi(apiKeyHeader, clientIp);

  // Check permission
  checkApiPermission(apiKey, "refund.read");

  // Find refund
  const refund = await models.gatewayRefund.findOne({ where: { refundId: id,
      merchantId: merchant.id,
    },
    include: [
      { model: models.gatewayPayment,
        as: "payment",
        attributes: ["paymentIntentId"],
      },
    ],
  });

  if (!refund) { throw createError({ statusCode: 404,
      message: "Refund not found",
    });
  }
  ctx?.success("Request completed successfully");

  return { id: refund.refundId,
    paymentId: refund.payment?.paymentIntentId,
    amount: refund.amount,
    currency: refund.currency,
    status: refund.status,
    reason: refund.reason,
    description: refund.description,
    createdAt: refund.createdAt,
  };
};
