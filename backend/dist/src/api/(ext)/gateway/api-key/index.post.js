"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const gateway_1 = require("@b/utils/gateway");
exports.metadata = {
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
                            description: "List of permissions for the key. Use '*' for full access, or specific permissions like 'payment.create', 'payment.read', 'payment.cancel', 'refund.create', 'refund.read'",
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
                            description: "List of IP addresses or CIDR ranges allowed to use this API key. Only applies to secret keys (sk_*). Supports IPv4/IPv6 and CIDR notation (e.g., '192.168.1.0/24'). Use '*' to allow all IPs. Set to null to allow all.",
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
exports.default = async (data) => {
    const { user, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized - no user ID");
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized - no user ID");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Find merchant account");
    const merchant = await db_1.models.gatewayMerchant.findOne({
        where: { userId: user.id },
    });
    if (!merchant) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant account not found");
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant account not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Merchant account not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate merchant status and verification");
    if (merchant.status !== "ACTIVE") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant account is not active");
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant account is not active");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Merchant account is not active. Please wait for approval.",
        });
    }
    if (merchant.verificationStatus !== "VERIFIED") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant account is not verified");
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant account is not verified");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Merchant account must be verified to create API keys. Please complete the verification process first.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate request fields");
    if (!body.name || !body.type) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields");
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing required fields");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required fields: name, type",
        });
    }
    const mode = body.type;
    if (!["LIVE", "TEST"].includes(mode)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid key type");
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid key type");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Type must be LIVE or TEST",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Check API key limit");
    const keyCount = await db_1.models.gatewayApiKey.count({
        where: { merchantId: merchant.id },
    });
    if (keyCount >= 10) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Maximum number of API keys reached");
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Maximum number of API keys reached");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Maximum number of API keys reached (10)",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generate API key pair");
    const publicPrefix = mode === "LIVE" ? "pk_live_" : "pk_test_";
    const secretPrefix = mode === "LIVE" ? "sk_live_" : "sk_test_";
    const publicKey = (0, gateway_1.generateApiKey)(publicPrefix);
    const secretKey = (0, gateway_1.generateApiKey)(secretPrefix);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate and set permissions");
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
    permissions = permissions.filter((p) => validPermissions.includes(p));
    if (permissions.length === 0) {
        permissions = ["*"];
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Process IP whitelist");
    let ipWhitelist = null;
    if (body.ipWhitelist && Array.isArray(body.ipWhitelist)) {
        const sanitized = body.ipWhitelist
            .map((ip) => ip === null || ip === void 0 ? void 0 : ip.trim())
            .filter((ip) => ip && ip.length > 0);
        ipWhitelist = sanitized.length > 0 ? sanitized : null;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Create public and secret API keys");
    const publicApiKey = await db_1.models.gatewayApiKey.create({
        merchantId: merchant.id,
        name: `${body.name} (Public)`,
        keyPrefix: publicPrefix,
        keyHash: (0, gateway_1.hashApiKey)(publicKey),
        lastFourChars: (0, gateway_1.getLastFourChars)(publicKey),
        type: "PUBLIC",
        mode: mode,
        permissions: permissions,
        allowedWalletTypes: body.allowedWalletTypes || null,
        successUrl: body.successUrl || null,
        cancelUrl: body.cancelUrl || null,
        webhookUrl: body.webhookUrl || null,
        status: true,
    });
    const secretApiKey = await db_1.models.gatewayApiKey.create({
        merchantId: merchant.id,
        name: `${body.name} (Secret)`,
        keyPrefix: secretPrefix,
        keyHash: (0, gateway_1.hashApiKey)(secretKey),
        lastFourChars: (0, gateway_1.getLastFourChars)(secretKey),
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
    ctx === null || ctx === void 0 ? void 0 : ctx.success("API key pair created successfully");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("API key pair created successfully");
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
