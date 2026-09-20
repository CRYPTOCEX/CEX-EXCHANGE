"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
const config_1 = require("@b/utils/news/providers/config");
const registry_1 = require("@b/utils/news/providers/registry");
exports.metadata = {
    summary: "Enables or disables a market news provider",
    operationId: "updateMarketNewsProviderStatus",
    tags: ["Admin", "System", "News"],
    description: "Turns one provider on or off. MULTI-ACTIVE — enabling one does not disable the others, because news merges cleanly where prices would not. " +
        "Enabling requires an implemented adapter, its credentials present in the environment, and any adapter-specific settings it needs. " +
        "Disabling stops new stories arriving and leaves the ones already stored in place; they still age out under this provider's retention.",
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
                        status: {
                            type: "boolean",
                            description: "true = enable, false = disable",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Provider status updated",
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
    logTitle: "Update market news provider status",
};
exports.default = async (data) => {
    var _a, _b;
    const { params, body, ctx } = data;
    const status = !!body.status;
    const provider = await db_1.models.marketNewsProvider.findByPk(params.id);
    if (!provider) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Provider not found" });
    }
    if (status) {
        const readiness = (0, registry_1.newsProviderReadiness)(provider.name, (0, config_1.readProviderConfig)(provider.config), provider.apiKey);
        if (!readiness.adapterAvailable) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `The ${provider.title} adapter is not available in this release`,
            });
        }
        if (readiness.missingCredentials.length > 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `${provider.title} has no credential. Paste one into its API key field on this page, ` +
                    `or set ${readiness.missingCredentials.join(", ")} in .env at the project root and restart the backend.`,
            });
        }
        if (readiness.configProblem) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `${provider.title}: ${readiness.configProblem}`,
            });
        }
    }
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `${status ? "Enabling" : "Disabling"} ${provider.title}`);
    await provider.update({ status });
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `${status ? "Enabled" : "Disabled"} market news provider ${provider.title}`);
    return {
        message: status
            ? `${provider.title} is enabled. Its first stories arrive on the next sync, or press Sync now.`
            : `${provider.title} is disabled. Stories already collected stay in the feed until they age out.`,
    };
};
