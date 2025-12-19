import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  generateApiKey,
  hashApiKey,
  getLastFourChars,
} from "@b/utils/gateway";

export const metadata: OperationObject = {
  summary: "Create API key pair",
  description: "Creates a new API key pair (public + secret) for the merchant.",
  operationId: "createApiKey",
  tags: ["Gateway", "Merchant", "API Keys"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Key name/label",
            },
            type: {
              type: "string",
              enum: ["LIVE", "TEST"],
              description: "Key mode (LIVE or TEST)",
            },
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
              description: "Webhook URL for notifications",
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
          required: ["name", "type"],
        },
      },
    },
  },
  responses: {
    201: {
      description: "API key pair created",
    },
    400: {
      description: "Invalid request",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Create API key pair",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;

  ctx?.step("Validate user authentication");

  if (!user?.id) {
    ctx?.fail("Unauthorized - no user ID");
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
    ctx?.fail("Merchant account not found");
    throw createError({
      statusCode: 404,
      message: "Merchant account not found",
    });
  }

  ctx?.step("Validate merchant status and verification");

  // Check merchant status
  if (merchant.status !== "ACTIVE") {
    ctx?.fail("Merchant account is not active");
    ctx?.fail("Merchant account is not active");
    throw createError({
      statusCode: 403,
      message: "Merchant account is not active. Please wait for approval.",
    });
  }

  // Check verification status - must be verified to create keys
  if (merchant.verificationStatus !== "VERIFIED") {
    ctx?.fail("Merchant account is not verified");
    ctx?.fail("Merchant account is not verified");
    throw createError({
      statusCode: 403,
      message:
        "Merchant account must be verified to create API keys. Please complete the verification process first.",
    });
  }

  ctx?.step("Validate request fields");

  // Validate required fields
  if (!body.name || !body.type) {
    ctx?.fail("Missing required fields");
    ctx?.fail("Missing required fields");
    throw createError({
      statusCode: 400,
      message: "Missing required fields: name, type",
    });
  }

  // Validate type (which is actually mode: LIVE/TEST)
  const mode = body.type;
  if (!["LIVE", "TEST"].includes(mode)) {
    ctx?.fail("Invalid key type");
    ctx?.fail("Invalid key type");
    throw createError({
      statusCode: 400,
      message: "Type must be LIVE or TEST",
    });
  }

  ctx?.step("Check API key limit");

  // Check key limit (max 10 keys per merchant)
  const keyCount = await models.gatewayApiKey.count({
    where: { merchantId: merchant.id },
  });

  if (keyCount >= 10) {
    ctx?.fail("Maximum number of API keys reached");
    ctx?.fail("Maximum number of API keys reached");
    throw createError({
      statusCode: 400,
      message: "Maximum number of API keys reached (10)",
    });
  }

  ctx?.step("Generate API key pair");

  // Generate both public and secret keys
  const publicPrefix = mode === "LIVE" ? "pk_live_" : "pk_test_";
  const secretPrefix = mode === "LIVE" ? "sk_live_" : "sk_test_";

  const publicKey = generateApiKey(publicPrefix);
  const secretKey = generateApiKey(secretPrefix);

  ctx?.step("Validate and set permissions");

  // Validate and set permissions
  const validPermissions = [
    "*",
    "payment.create",
    "payment.read",
    "payment.cancel",
    "refund.create",
    "refund.read",
  ];
  let permissions = body.permissions || ["*"];
  if (!Array.isArray(permissions)) {
    permissions = ["*"];
  }
  // Filter to only valid permissions
  permissions = permissions.filter((p: string) => validPermissions.includes(p));
  if (permissions.length === 0) {
    permissions = ["*"];
  }

  ctx?.step("Process IP whitelist");

  // Validate and sanitize IP whitelist (only meaningful for secret keys)
  let ipWhitelist: string[] | null = null;
  if (body.ipWhitelist && Array.isArray(body.ipWhitelist)) {
    const sanitized = body.ipWhitelist
      .map((ip: string) => ip?.trim())
      .filter((ip: string) => ip && ip.length > 0);
    ipWhitelist = sanitized.length > 0 ? sanitized : null;
  }

  ctx?.step("Create public and secret API keys");

  // Create public API key (IP whitelist not stored on public keys as it's not enforced)
  const publicApiKey = await models.gatewayApiKey.create({
    merchantId: merchant.id,
    name: `${body.name} (Public)`,
    keyPrefix: publicPrefix,
    keyHash: hashApiKey(publicKey),
    lastFourChars: getLastFourChars(publicKey),
    type: "PUBLIC",
    mode: mode,
    permissions: permissions,
    allowedWalletTypes: body.allowedWalletTypes || null,
    successUrl: body.successUrl || null,
    cancelUrl: body.cancelUrl || null,
    webhookUrl: body.webhookUrl || null,
    status: true,
  });

  // Create secret API key (IP whitelist applied here)
  const secretApiKey = await models.gatewayApiKey.create({
    merchantId: merchant.id,
    name: `${body.name} (Secret)`,
    keyPrefix: secretPrefix,
    keyHash: hashApiKey(secretKey),
    lastFourChars: getLastFourChars(secretKey),
    type: "SECRET",
    mode: mode,
    permissions: permissions,
    allowedWalletTypes: body.allowedWalletTypes || null,
    ipWhitelist: ipWhitelist,
    successUrl: body.successUrl || null,
    cancelUrl: body.cancelUrl || null,
    webhookUrl: body.webhookUrl || null,
    status: true,
  });

  ctx?.success("API key pair created successfully");

  ctx?.success("API key pair created successfully");

  return {
    publicKey: publicKey,
    secretKey: secretKey,
    keys: [
      {
        id: publicApiKey.id,
        name: publicApiKey.name,
        keyPreview: `${publicPrefix}...${publicApiKey.lastFourChars}`,
        type: publicApiKey.type,
        mode: publicApiKey.mode,
      },
      {
        id: secretApiKey.id,
        name: secretApiKey.name,
        keyPreview: `${secretPrefix}...${secretApiKey.lastFourChars}`,
        type: secretApiKey.type,
        mode: secretApiKey.mode,
      },
    ],
    note: "Save these keys securely. They will not be shown again.",
  };
};
