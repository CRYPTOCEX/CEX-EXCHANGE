"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const gateway_1 = require("@b/utils/gateway");
exports.metadata = {
    summary: "Rotate API key",
    description: "Rotates an API key, generating a new key value.",
    operationId: "rotateApiKey",
    tags: ["Gateway", "Merchant", "API Keys"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "API key rotated",
        },
        404: {
            description: "API key not found",
        },
    },
    requiresAuth: true,
    logModule: "GATEWAY",
    logTitle: "Rotate API Key",
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Find API key to rotate");
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Generate new API key");
    const fullKey = (0, gateway_1.generateApiKey)(apiKey.keyPrefix);
    await apiKey.update({
        keyHash: (0, gateway_1.hashApiKey)(fullKey),
        lastFourChars: (0, gateway_1.getLastFourChars)(fullKey),
        lastUsedAt: null,
        lastUsedIp: null,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("API key rotated successfully");
    return {
        id: apiKey.id,
        name: apiKey.name,
        key: fullKey,
        keyPreview: `${apiKey.keyPrefix}...${apiKey.lastFourChars}`,
        type: apiKey.type,
        mode: apiKey.mode,
        note: "Save this new key securely. The old key is now invalid.",
    };
};
