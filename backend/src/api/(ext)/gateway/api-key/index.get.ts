import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = { summary: "List API keys",
  description: "Lists all API keys for the current merchant.",
  operationId: "listApiKeys",
  tags: ["Gateway", "Merchant", "API Keys"],
  parameters: [
    { name: "mode",
      in: "query",
      description: "Filter by mode (LIVE or TEST)",
      schema: { type: "string",
        enum: ["LIVE", "TEST"],
      },
    },
  ],
  responses: { 200: { description: "List of API keys",
    },
    404: { description: "Merchant not found",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Get API Keys",
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

  // Build where clause with mode filter
  const where: any = { merchantId: merchant.id };
  const mode = query?.mode as "LIVE" | "TEST" | undefined;
  if (mode) { where.mode = mode;
  }

  // Get API keys
  const apiKeys = await models.gatewayApiKey.findAll({ where,
    order: [
      ["mode", "ASC"],
      ["type", "ASC"],
      ["createdAt", "DESC"],
    ],
  });
  ctx?.success("Request completed successfully");

  return apiKeys.map((key) => ({ id: key.id,
    name: key.name,
    keyPreview: `${key.keyPrefix}...${key.lastFourChars}`,
    type: key.type,
    mode: key.mode,
    permissions: key.permissions,
    allowedWalletTypes: key.allowedWalletTypes,
    ipWhitelist: key.ipWhitelist,
    successUrl: key.successUrl,
    cancelUrl: key.cancelUrl,
    webhookUrl: key.webhookUrl,
    status: key.status,
    lastUsedAt: key.lastUsedAt,
    lastUsedIp: key.lastUsedIp,
    expiresAt: key.expiresAt,
    createdAt: key.createdAt,
  }));
};
