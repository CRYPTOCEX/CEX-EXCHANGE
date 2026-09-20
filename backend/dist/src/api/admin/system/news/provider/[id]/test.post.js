"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
const config_1 = require("@b/utils/news/providers/config");
const registry_1 = require("@b/utils/news/providers/registry");
exports.metadata = {
    summary: "Tests a market news provider",
    operationId: "testMarketNewsProvider",
    tags: ["Admin", "System", "News"],
    description: "Makes one read-only call to the provider with the credentials currently in the environment and reports what came back. Writes nothing to the news feed and changes no configuration. " +
        "A candidate `config` or `apiKey` may be supplied to test values BEFORE they are saved — which is the whole point of the button: an operator should find out a key is wrong while it is still in the box, not after committing it. Nothing supplied here is persisted.",
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
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        config: {
                            type: "object",
                            description: "Candidate settings to test instead of the saved ones. Not persisted.",
                        },
                        apiKey: {
                            type: "string",
                            nullable: true,
                            description: "Candidate credential to test instead of the stored one. Not persisted. Null tests what the environment supplies.",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Test completed",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            valid: { type: "boolean" },
                            message: { type: "string" },
                            sampled: { type: "number", nullable: true },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Market News Provider"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.market.news",
    logModule: "ADMIN_NEWS",
    logTitle: "Test market news provider",
    audit: false,
};
exports.default = async (data) => {
    var _a, _b;
    const { params, body, ctx } = data;
    const provider = await db_1.models.marketNewsProvider.findByPk(params.id);
    if (!provider) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Provider not found" });
    }
    const config = (body === null || body === void 0 ? void 0 : body.config) !== undefined
        ? (0, config_1.validateNewsProviderConfig)(provider.name, body.config)
        : (0, config_1.readProviderConfig)(provider.config);
    const candidateKey = (0, config_1.validateProviderApiKey)(body === null || body === void 0 ? void 0 : body.apiKey);
    const storedKey = candidateKey === undefined ? provider.apiKey : candidateKey;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Testing ${provider.title}`);
    const result = await (0, registry_1.testNewsProvider)(provider.name, config, storedKey);
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx[result.valid ? "success" : "step"]) === null || _b === void 0 ? void 0 : _b.call(ctx, result.valid
        ? `${provider.title} answered successfully`
        : `${provider.title} did not answer successfully`);
    return result;
};
