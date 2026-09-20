"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Delete API key pair",
    description: "Deletes an API key and its corresponding pair (public + secret).",
    operationId: "deleteApiKey",
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
            description: "API key pair deleted",
        },
        404: {
            description: "API key not found",
        },
    },
    requiresAuth: true,
    logModule: "GATEWAY",
    logTitle: "Delete API Key Pair",
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Find API key to delete");
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Find and delete API key pair");
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
    await apiKey.destroy();
    if (pairKey) {
        await pairKey.destroy();
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("API key pair deleted successfully");
    return {
        message: "API key pair deleted successfully",
        deletedCount: pairKey ? 2 : 1,
    };
};
