import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Update API key settings",
  description: "Updates an API key's settings (URLs, status, etc.).",
  operationId: "updateApiKey",
  tags: ["Gateway", "Merchant", "API Keys"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            successUrl: {
              type: "string",
              format: "uri",
              description: "Success redirect URL",
            },
            cancelUrl: {
              type: "string",
              format: "uri",
              description: "Cancel redirect URL",
            },
            webhookUrl: {
              type: "string",
              format: "uri",
              description: "Webhook URL",
            },
            status: {
              type: "boolean",
              description: "Enable/disable the key",
            },
            permissions: {
              type: "array",
              items: { type: "string" },
              description:
                "List of permissions for the key. Use '*' for full access, or specific permissions like 'payment.create', 'payment.read', 'payment.cancel', 'refund.create', 'refund.read'",
            },
            allowedWalletTypes: {
              type: "object",
              description: "Allowed wallet types and currencies for this API key",
              additionalProperties: {
                type: "object",
                properties: {
                  enabled: { type: "boolean" },
                  currencies: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
            ipWhitelist: {
              type: "array",
              items: { type: "string" },
              nullable: true,
              description:
                "List of IP addresses or CIDR ranges allowed to use this API key. Only applies to secret keys (sk_*). Supports IPv4/IPv6 and CIDR notation (e.g., '192.168.1.0/24'). Use '*' to allow all IPs. Set to null to allow all.",
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "API key updated",
    },
    404: {
      description: "API key not found",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Update API Key Settings",
};

export default async (data: Handler) => {
  const { user, params, body, ctx } = data;
  const { id } = params;

  ctx?.step("Validate user authentication");

  if (!user?.id) {
    ctx?.fail("Unauthorized - no user ID");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Find merchant account");

  // Find merchant
  const merchant = await models.gatewayMerchant.findOne({
    where: { userId: user.id },
  });

  if (!merchant) {
    ctx?.fail("Merchant account not found");
    throw createError({
      statusCode: 404,
      message: "Merchant account not found",
    });
  }

  ctx?.step("Find API key to update");

  // Find API key
  const apiKey = await models.gatewayApiKey.findOne({
    where: {
      id,
      merchantId: merchant.id,
    },
  });

  if (!apiKey) {
    ctx?.fail("API key not found");
    throw createError({
      statusCode: 404,
      message: "API key not found",
    });
  }

  ctx?.step("Build and validate updates");

  // Build updates
  const updates: Record<string, any> = {};

  if (body.successUrl !== undefined) {
    updates.successUrl = body.successUrl || null;
  }
  if (body.cancelUrl !== undefined) {
    updates.cancelUrl = body.cancelUrl || null;
  }
  if (body.webhookUrl !== undefined) {
    updates.webhookUrl = body.webhookUrl || null;
  }
  if (body.status !== undefined) {
    updates.status = body.status;
  }
  if (body.permissions !== undefined) {
    // Validate permissions
    const validPermissions = [
      "*",
      "payment.create",
      "payment.read",
      "payment.cancel",
      "refund.create",
      "refund.read",
    ];
    let permissions = body.permissions;
    if (!Array.isArray(permissions)) {
      permissions = ["*"];
    }
    // Filter to only valid permissions
    permissions = permissions.filter((p: string) => validPermissions.includes(p));
    if (permissions.length === 0) {
      permissions = ["*"];
    }
    updates.permissions = permissions;
  }
  if (body.allowedWalletTypes !== undefined) {
    updates.allowedWalletTypes = body.allowedWalletTypes || null;
  }
  if (body.ipWhitelist !== undefined) {
    // Only allow setting IP whitelist on secret keys
    if (apiKey.type === "SECRET") {
      if (body.ipWhitelist && Array.isArray(body.ipWhitelist)) {
        const sanitized = body.ipWhitelist
          .map((ip: string) => ip?.trim())
          .filter((ip: string) => ip && ip.length > 0);
        updates.ipWhitelist = sanitized.length > 0 ? sanitized : null;
      } else {
        updates.ipWhitelist = null;
      }
    }
    // Silently ignore for public keys (IP whitelist doesn't apply to them)
  }

  ctx?.step("Update API key and its pair");

  // Update the key
  await apiKey.update(updates);

  // Also update the pair key with the same URLs (they share config)
  const baseName = apiKey.name.replace(" (Public)", "").replace(" (Secret)", "");
  const pairType = apiKey.type === "PUBLIC" ? "SECRET" : "PUBLIC";
  const pairSuffix = pairType === "PUBLIC" ? " (Public)" : " (Secret)";

  const pairKey = await models.gatewayApiKey.findOne({
    where: {
      merchantId: merchant.id,
      mode: apiKey.mode,
      type: pairType,
      name: `${baseName}${pairSuffix}`,
    },
  });

  if (pairKey) {
    await pairKey.update(updates);
  }

  ctx?.success("API key updated successfully");

  return {
    message: "API key updated successfully",
    key: {
      id: apiKey.id,
      name: apiKey.name,
      keyPreview: `${apiKey.keyPrefix}...${apiKey.lastFourChars}`,
      type: apiKey.type,
      mode: apiKey.mode,
      permissions: apiKey.permissions,
      allowedWalletTypes: apiKey.allowedWalletTypes,
      ipWhitelist: apiKey.type === "SECRET" ? apiKey.ipWhitelist : undefined,
      successUrl: apiKey.successUrl,
      cancelUrl: apiKey.cancelUrl,
      webhookUrl: apiKey.webhookUrl,
      status: apiKey.status,
    },
  };
};
