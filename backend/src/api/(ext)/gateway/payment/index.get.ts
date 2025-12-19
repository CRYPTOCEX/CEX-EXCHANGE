import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { getFiltered } from "@b/utils/query";

export const metadata: OperationObject = { summary: "List payments",
  description: "Lists all payments for the current merchant.",
  operationId: "listMerchantPayments",
  tags: ["Gateway", "Merchant", "Payments"],
  parameters: [
    { name: "mode",
      in: "query",
      description: "Filter by mode (LIVE or TEST)",
      schema: { type: "string",
        enum: ["LIVE", "TEST"],
      },
    },
    { name: "status",
      in: "query",
      schema: { type: "string" },
      description: "Filter by status",
    },
    { name: "page",
      in: "query",
      schema: { type: "integer", default: 1 },
    },
    { name: "perPage",
      in: "query",
      schema: { type: "integer", default: 10 },
    },
    { name: "sortField",
      in: "query",
      schema: { type: "string", default: "createdAt" },
    },
    { name: "sortOrder",
      in: "query",
      schema: { type: "string", default: "desc" },
    },
  ],
  responses: { 200: { description: "List of payments",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Get Payments",
  demoMask: ["items.customerEmail"],
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

  // Filter by mode (default to LIVE)
  const mode = query.mode as "LIVE" | "TEST" | undefined;
  where.testMode = mode === "TEST";

  if (query.status) { where.status = query.status;
  }

  // Get payments
  const result = await getFiltered({ model: models.gatewayPayment,
    query,
    where,
    sortField: query.sortField || "createdAt",
  });

  // Transform response
  ctx?.success("Request completed successfully");
  return { items: result.items.map((p: any) => ({ id: p.paymentIntentId,
      orderId: p.merchantOrderId,
      amount: p.amount,
      currency: p.currency,
      walletType: p.walletType,
      feeAmount: p.feeAmount,
      netAmount: p.netAmount,
      status: p.status,
      customerEmail: p.customerEmail,
      customerName: p.customerName,
      testMode: p.testMode,
      createdAt: p.createdAt,
      completedAt: p.completedAt,
    })),
    pagination: result.pagination,
  };
};
