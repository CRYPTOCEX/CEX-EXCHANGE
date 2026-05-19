"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const gateway_1 = require("@b/utils/gateway");
exports.metadata = {
    summary: "Validate API key",
    description: "Validates an API key and returns information about the merchant and permissions.",
    operationId: "validateApiKey",
    tags: ["Gateway", "API Key"],
    logModule: "GATEWAY",
    logTitle: "Validate Gateway",
    responses: {
        200: {
            description: "API key is valid",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            valid: { type: "boolean" },
                            merchant: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    status: { type: "string" },
                                    verificationStatus: { type: "string" },
                                },
                            },
                            mode: { type: "string", enum: ["LIVE", "TEST"] },
                            permissions: {
                                type: "array",
                                items: { type: "string" },
                            },
                            keyType: { type: "string", enum: ["PUBLIC", "SECRET"] },
                        },
                    },
                },
            },
        },
        401: {
            description: "Invalid or missing API key",
        },
        403: {
            description: "API key is disabled or merchant is suspended",
        },
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    var _a, _b;
    const { headers, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching validate gateway");
    const apiKeyHeader = (headers === null || headers === void 0 ? void 0 : headers["x-api-key"]) || (headers === null || headers === void 0 ? void 0 : headers["X-API-Key"]);
    if (!apiKeyHeader) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "API key is required",
        });
    }
    const clientIp = ((_b = (_a = headers === null || headers === void 0 ? void 0 : headers["x-forwarded-for"]) === null || _a === void 0 ? void 0 : _a.split(",")[0]) === null || _b === void 0 ? void 0 : _b.trim()) ||
        (headers === null || headers === void 0 ? void 0 : headers["x-real-ip"]) ||
        (headers === null || headers === void 0 ? void 0 : headers["cf-connecting-ip"]) ||
        null;
    const { merchant, apiKey, isTestMode, isSecretKey } = await (0, gateway_1.authenticateGatewayApi)(apiKeyHeader, clientIp);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Validate Gateway retrieved successfully");
    return {
        valid: true,
        merchant: {
            id: merchant.id,
            name: merchant.name,
            status: merchant.status,
            verificationStatus: merchant.verificationStatus,
        },
        mode: isTestMode ? "TEST" : "LIVE",
        permissions: apiKey.permissions || ["*"],
        keyType: isSecretKey ? "SECRET" : "PUBLIC",
    };
};
