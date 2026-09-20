"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
const policy_1 = require("@b/utils/news/providers/policy");
const config_1 = require("@b/utils/news/providers/config");
exports.metadata = {
    summary: "Updates a market news provider's settings",
    operationId: "updateMarketNewsProvider",
    tags: ["Admin", "System", "News"],
    description: "Updates what this provider is asked for and how long its stories are kept: categories, per-run fetch limit, retention in days, and any adapter-specific settings (RSS feed list, CryptoPanic filters). " +
        "Optionally sets the vendor credential. A stored credential takes precedence over the provider's environment variable; sending null or an empty string clears it and falls back to the environment. The value is write-only — no endpoint ever returns it. " +
        "Lowering retentionDays does not delete anything immediately; the next sync run prunes to the new age.",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Provider ID",
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        categories: {
                            type: "array",
                            items: { type: "string" },
                            description: "What to ask this provider for. Meaning is per-vendor (Finnhub topics, CryptoCompare coins and sections, CryptoPanic currencies). Empty means everything, except on Finnhub where it falls back to crypto.",
                        },
                        fetchLimit: {
                            type: "number",
                            description: "Stories pulled per run (1-500)",
                        },
                        retentionDays: {
                            type: "number",
                            description: "Age at which this provider's stories are pruned (1-3650). Operator-authored stories are never pruned.",
                        },
                        config: {
                            type: "object",
                            description: "Adapter-specific settings. Unrecognised keys are dropped rather than stored.",
                        },
                        apiKey: {
                            type: "string",
                            nullable: true,
                            description: "Vendor credential. Omit to leave unchanged; null or empty clears it and falls back to the environment variable. Never returned by any endpoint.",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Provider updated",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: { message: { type: "string" } },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Market News Provider"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.market.news",
    logModule: "ADMIN_NEWS",
    logTitle: "Update market news provider",
};
exports.default = async (data) => {
    var _a, _b;
    const { params, body, ctx } = data;
    const provider = await db_1.models.marketNewsProvider.findByPk(params.id);
    if (!provider) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Provider not found" });
    }
    const values = {};
    if (body.categories !== undefined) {
        values.categories = (0, config_1.validateCategories)(body.categories);
    }
    if (body.fetchLimit !== undefined) {
        values.fetchLimit = (0, config_1.validateBoundedInt)(body.fetchLimit, "fetchLimit", 1, 500);
    }
    if (body.retentionDays !== undefined) {
        values.retentionDays = (0, config_1.validateBoundedInt)(body.retentionDays, "retentionDays", 1, 3650);
    }
    if (body.config !== undefined) {
        values.config = (0, config_1.validateNewsProviderConfig)(provider.name, body.config);
    }
    const apiKey = (0, config_1.validateProviderApiKey)(body.apiKey);
    if (apiKey !== undefined) {
        if (apiKey !== null && (0, policy_1.newsProviderCredentials)(provider.name).length === 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `${provider.title} does not use a credential`,
            });
        }
        values.apiKey = apiKey;
    }
    if (Object.keys(values).length === 0) {
        return { message: "Nothing to update" };
    }
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Updating ${provider.title} (${Object.keys(values).join(", ")})`);
    await provider.update(values);
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Updated market news provider ${provider.title}`);
    return { message: `${provider.title} updated` };
};
