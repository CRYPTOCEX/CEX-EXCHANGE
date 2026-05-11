"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
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
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized - no user ID");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Find merchant account");
    const merchant = await db_1.models.gatewayMerchant.findOne({
        where: { userId: user.id },
    });
    if (!merchant) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant account not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Merchant account not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Find API key to update");
    const apiKey = await db_1.models.gatewayApiKey.findOne({
        where: {
            id,
            merchantId: merchant.id,
        },
    });
    if (!apiKey) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("API key not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "API key not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Build and validate updates");
    const updates = {};
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
        permissions = permissions.filter((p) => validPermissions.includes(p));
        if (permissions.length === 0) {
            permissions = ["*"];
        }
        updates.permissions = permissions;
    }
    if (body.allowedWalletTypes !== undefined) {
        updates.allowedWalletTypes = body.allowedWalletTypes || null;
    }
    if (body.ipWhitelist !== undefined) {
        if (apiKey.type === "SECRET") {
            if (body.ipWhitelist && Array.isArray(body.ipWhitelist)) {
                const sanitized = body.ipWhitelist
                    .map((ip) => ip === null || ip === void 0 ? void 0 : ip.trim())
                    .filter((ip) => ip && ip.length > 0);
                updates.ipWhitelist = sanitized.length > 0 ? sanitized : null;
            }
            else {
                updates.ipWhitelist = null;
            }
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Update API key and its pair");
    await apiKey.update(updates);
    const baseName = apiKey.name.replace(" (Public)", "").replace(" (Secret)", "");
    const pairType = apiKey.type === "PUBLIC" ? "SECRET" : "PUBLIC";
    const pairSuffix = pairType === "PUBLIC" ? " (Public)" : " (Secret)";
    const pairKey = await db_1.models.gatewayApiKey.findOne({
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
    ctx === null || ctx === void 0 ? void 0 : ctx.success("API key updated successfully");
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
