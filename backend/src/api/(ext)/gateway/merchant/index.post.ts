import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  generateApiKey,
  generateRandomString,
  hashApiKey,
  getLastFourChars,
  getGatewaySettings,
} from "@b/utils/gateway";
import { CacheManager } from "@b/utils/cache";

export const metadata = {
  summary: "Register as merchant",
  description: "Registers the current user as a payment gateway merchant.",
  operationId: "registerMerchant",
  tags: ["Gateway", "Merchant"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Business name",
              minLength: 2,
              maxLength: 191,
            },
            email: {
              type: "string",
              format: "email",
              description: "Business email",
            },
            website: {
              type: "string",
              format: "uri",
              description: "Business website (optional)",
            },
            description: {
              type: "string",
              description: "Business description (optional)",
            },
            phone: {
              type: "string",
              description: "Business phone (optional)",
            },
            address: {
              type: "string",
              description: "Business address (optional)",
            },
            city: {
              type: "string",
              description: "City (optional)",
            },
            state: {
              type: "string",
              description: "State/Province (optional)",
            },
            country: {
              type: "string",
              description: "Country code (optional)",
            },
            postalCode: {
              type: "string",
              description: "Postal/ZIP code (optional)",
            },
          },
          required: ["name", "email"],
        },
      },
    },
  },
  responses: {
    201: {
      description: "Merchant registered successfully",
    },
    400: {
      description: "Invalid request or merchant already exists",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Register Merchant Account",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;

  ctx?.step("Validate user authentication");

  if (!user?.id) {
    ctx?.fail("Unauthorized - no user ID");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Validate gateway settings and requirements");

  // Get gateway settings
  const gatewaySettings = await getGatewaySettings();

  // Check if gateway is enabled
  if (!gatewaySettings.gatewayEnabled) {
    ctx?.fail("Payment gateway is disabled");
    throw createError({
      statusCode: 400,
      message: "Payment gateway is currently disabled",
    });
  }

  // Check KYC requirement
  if (gatewaySettings.gatewayRequireKyc) {
    const cacheManager = CacheManager.getInstance();
    const kycEnabled = await cacheManager.getSetting("kycStatus");

    if (kycEnabled === true || kycEnabled === "true") {
      // Check if user has completed KYC
      const kyc = await models.kycApplication.findOne({
        where: { userId: user.id, status: "APPROVED" },
      });

      if (!kyc) {
        ctx?.fail("KYC verification required");
        throw createError({
          statusCode: 400,
          message: "KYC verification is required to become a merchant. Please complete your KYC verification first.",
        });
      }
    }
  }

  ctx?.step("Check for existing merchant account");

  // Check if user already has a merchant account
  const existingMerchant = await models.gatewayMerchant.findOne({
    where: { userId: user.id },
  });

  if (existingMerchant) {
    ctx?.fail("User already has a merchant account");
    throw createError({
      statusCode: 400,
      message: "You already have a merchant account",
    });
  }

  ctx?.step("Validate required fields");

  // Validate required fields
  if (!body.name || !body.email) {
    ctx?.fail("Missing required fields");
    throw createError({
      statusCode: 400,
      message: "Missing required fields: name, email",
    });
  }

  ctx?.step("Configure wallet types and currencies");

  // Get default allowed currencies and wallet types from settings
  const allowedWalletTypes = gatewaySettings.gatewayAllowedWalletTypes || {};
  const enabledWalletTypes: string[] = [];
  const defaultCurrencies: string[] = [];

  // Extract enabled wallet types and their first currencies as defaults
  for (const [walletType, config] of Object.entries(allowedWalletTypes)) {
    if (config && typeof config === 'object' && (config as any).enabled) {
      enabledWalletTypes.push(walletType);
      const currencies = (config as any).currencies || [];
      if (currencies.length > 0) {
        // Add first few currencies as defaults for merchant
        defaultCurrencies.push(...currencies.slice(0, 3));
      }
    }
  }

  // Fallback defaults if no settings configured
  const merchantWalletTypes = enabledWalletTypes.length > 0 ? enabledWalletTypes : ["FIAT"];
  const merchantCurrencies = defaultCurrencies.length > 0 ? [...new Set(defaultCurrencies)] : ["USD"];
  const defaultCurrency = merchantCurrencies[0] || "USD";

  ctx?.step("Generate API keys and webhook secret");

  // Generate API keys
  const livePublicKey = generateApiKey("pk_live_");
  const liveSecretKey = generateApiKey("sk_live_");
  const testPublicKey = generateApiKey("pk_test_");
  const testSecretKey = generateApiKey("sk_test_");
  const webhookSecret = generateRandomString(32);

  // Determine initial status based on settings
  const initialStatus = gatewaySettings.gatewayAutoApproveVerified &&
    gatewaySettings.gatewayRequireKyc ? "ACTIVE" : "PENDING";

  ctx?.step("Create merchant account");

  // Create merchant with settings from gateway config
  const merchant = await models.gatewayMerchant.create({
    userId: user.id,
    name: body.name,
    email: body.email,
    website: body.website || null,
    description: body.description || null,
    phone: body.phone || null,
    address: body.address || null,
    city: body.city || null,
    state: body.state || null,
    country: body.country || null,
    postalCode: body.postalCode || null,
    apiKey: livePublicKey,
    secretKey: liveSecretKey,
    webhookSecret,
    testMode: true, // Start in test mode
    allowedCurrencies: merchantCurrencies,
    allowedWalletTypes: merchantWalletTypes,
    defaultCurrency,
    feeType: "BOTH",
    feePercentage: gatewaySettings.gatewayFeePercentage || 2.9,
    feeFixed: gatewaySettings.gatewayFeeFixed || 0.30,
    payoutSchedule: gatewaySettings.gatewayPayoutSchedule || "DAILY",
    payoutThreshold: gatewaySettings.gatewayMinPayoutAmount || 100,
    status: initialStatus,
    verificationStatus: "PENDING", // Admin needs to verify business details
    dailyLimit: gatewaySettings.gatewayDailyLimit || 10000,
    monthlyLimit: gatewaySettings.gatewayMonthlyLimit || 100000,
    transactionLimit: gatewaySettings.gatewayMaxPaymentAmount || 5000,
  });

  ctx?.step("Create API key records");

  // Create API keys
  const apiKeys = [
    { prefix: "pk_live_", key: livePublicKey, type: "PUBLIC", mode: "LIVE" },
    { prefix: "sk_live_", key: liveSecretKey, type: "SECRET", mode: "LIVE" },
    { prefix: "pk_test_", key: testPublicKey, type: "PUBLIC", mode: "TEST" },
    { prefix: "sk_test_", key: testSecretKey, type: "SECRET", mode: "TEST" },
  ];

  const createdKeys: Array<{
    id: string;
    name: string;
    type: string;
    mode: string;
    key: string;
    createdAt: Date | undefined;
  }> = [];
  for (const keyData of apiKeys) {
    const apiKey = await models.gatewayApiKey.create({
      merchantId: merchant.id,
      name: `Default ${keyData.mode} ${keyData.type} Key`,
      keyPrefix: keyData.prefix,
      keyHash: hashApiKey(keyData.key),
      lastFourChars: getLastFourChars(keyData.key),
      type: keyData.type as "PUBLIC" | "SECRET",
      mode: keyData.mode as "LIVE" | "TEST",
      permissions: ["*"], // Full permissions
      status: true,
    });

    // Only return full keys on creation
    createdKeys.push({
      id: apiKey.id,
      name: apiKey.name,
      type: apiKey.type,
      mode: apiKey.mode,
      key: keyData.key, // Full key only on creation
      createdAt: apiKey.createdAt,
    });
  }

  ctx?.success("Merchant account created successfully");

  return {
    message: "Merchant account created successfully. Pending approval.",
    merchant: {
      id: merchant.id,
      name: merchant.name,
      slug: merchant.slug,
      email: merchant.email,
      status: merchant.status,
      verificationStatus: merchant.verificationStatus,
      testMode: merchant.testMode,
      createdAt: merchant.createdAt,
    },
    apiKeys: createdKeys,
    webhookSecret,
    note: "Save your API keys and webhook secret securely. Secret keys will not be shown again.",
  };
};
