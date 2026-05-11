"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const gateway_1 = require("@b/utils/gateway");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
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
exports.default = async (data) => {
    const { user, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized - no user ID");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate gateway settings and requirements");
    const gatewaySettings = await (0, gateway_1.getGatewaySettings)();
    if (!gatewaySettings.gatewayEnabled) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Payment gateway is disabled");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Payment gateway is currently disabled",
        });
    }
    if (gatewaySettings.gatewayRequireKyc) {
        const cacheManager = cache_1.CacheManager.getInstance();
        const kycEnabled = await cacheManager.getSetting("kycStatus");
        if (kycEnabled === true || kycEnabled === "true") {
            const kyc = await db_1.models.kycApplication.findOne({
                where: { userId: user.id, status: "APPROVED" },
            });
            if (!kyc) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("KYC verification required");
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "KYC verification is required to become a merchant. Please complete your KYC verification first.",
                });
            }
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Check for existing merchant account");
    const existingMerchant = await db_1.models.gatewayMerchant.findOne({
        where: { userId: user.id },
    });
    if (existingMerchant) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User already has a merchant account");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "You already have a merchant account",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate required fields");
    if (!body.name || !body.email) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required fields: name, email",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Configure wallet types and currencies");
    const allowedWalletTypes = gatewaySettings.gatewayAllowedWalletTypes || {};
    const enabledWalletTypes = [];
    const defaultCurrencies = [];
    for (const [walletType, config] of Object.entries(allowedWalletTypes)) {
        if (config && typeof config === 'object' && config.enabled) {
            enabledWalletTypes.push(walletType);
            const currencies = config.currencies || [];
            if (currencies.length > 0) {
                defaultCurrencies.push(...currencies.slice(0, 3));
            }
        }
    }
    const merchantWalletTypes = enabledWalletTypes.length > 0 ? enabledWalletTypes : ["FIAT"];
    const merchantCurrencies = defaultCurrencies.length > 0 ? [...new Set(defaultCurrencies)] : ["USD"];
    const defaultCurrency = merchantCurrencies[0] || "USD";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generate API keys and webhook secret");
    const livePublicKey = (0, gateway_1.generateApiKey)("pk_live_");
    const liveSecretKey = (0, gateway_1.generateApiKey)("sk_live_");
    const testPublicKey = (0, gateway_1.generateApiKey)("pk_test_");
    const testSecretKey = (0, gateway_1.generateApiKey)("sk_test_");
    const webhookSecret = (0, gateway_1.generateRandomString)(32);
    const initialStatus = gatewaySettings.gatewayAutoApproveVerified &&
        gatewaySettings.gatewayRequireKyc ? "ACTIVE" : "PENDING";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Create merchant account");
    const merchant = await db_1.models.gatewayMerchant.create({
        userId: user.id,
        slug: "",
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
        testMode: true,
        allowedCurrencies: merchantCurrencies,
        allowedWalletTypes: merchantWalletTypes,
        defaultCurrency,
        feeType: "BOTH",
        feePercentage: gatewaySettings.gatewayFeePercentage || 2.9,
        feeFixed: gatewaySettings.gatewayFeeFixed || 0.30,
        payoutSchedule: (gatewaySettings.gatewayPayoutSchedule || "DAILY"),
        payoutThreshold: gatewaySettings.gatewayMinPayoutAmount || 100,
        status: initialStatus,
        verificationStatus: "PENDING",
        dailyLimit: gatewaySettings.gatewayDailyLimit || 10000,
        monthlyLimit: gatewaySettings.gatewayMonthlyLimit || 100000,
        transactionLimit: gatewaySettings.gatewayMaxPaymentAmount || 5000,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Create API key records");
    const apiKeys = [
        { prefix: "pk_live_", key: livePublicKey, type: "PUBLIC", mode: "LIVE" },
        { prefix: "sk_live_", key: liveSecretKey, type: "SECRET", mode: "LIVE" },
        { prefix: "pk_test_", key: testPublicKey, type: "PUBLIC", mode: "TEST" },
        { prefix: "sk_test_", key: testSecretKey, type: "SECRET", mode: "TEST" },
    ];
    const createdKeys = [];
    for (const keyData of apiKeys) {
        const apiKey = await db_1.models.gatewayApiKey.create({
            merchantId: merchant.id,
            name: `Default ${keyData.mode} ${keyData.type} Key`,
            keyPrefix: keyData.prefix,
            keyHash: (0, gateway_1.hashApiKey)(keyData.key),
            lastFourChars: (0, gateway_1.getLastFourChars)(keyData.key),
            type: keyData.type,
            mode: keyData.mode,
            permissions: ["*"],
            status: true,
        });
        createdKeys.push({
            id: apiKey.id,
            name: apiKey.name,
            type: apiKey.type,
            mode: apiKey.mode,
            key: keyData.key,
            createdAt: apiKey.createdAt,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Merchant account created successfully");
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
