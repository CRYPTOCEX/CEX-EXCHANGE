"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const registry_1 = require("@b/utils/deposit-gateway/registry");
const health_1 = require("@b/utils/deposit-gateway/health");
exports.metadata = {
    summary: "Lists deposit gateways with their configuration health",
    operationId: "listDepositGatewayConfig",
    tags: ["Admin", "Deposit Gateways"],
    description: "Every deposit gateway row, joined to the integration bundled for it: which environment variables it needs, which are set, the webhook and return URLs it expects, and whether it is running against test or live credentials. Credential VALUES are never returned — only whether each is present, and for prefixed keys the leading test/live marker.",
    responses: {
        200: {
            description: "Gateway configuration retrieved successfully",
            content: { "application/json": { schema: { type: "object" } } },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.deposit.gateway",
    logModule: "ADMIN_FIN",
    logTitle: "List deposit gateway configuration",
};
function toCurrencyArray(value) {
    if (Array.isArray(value))
        return value.map(String);
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed))
                return parsed.map(String);
        }
        catch (_a) {
            return value
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean);
        }
    }
    return [];
}
function feeSummary(fixed, percentage) {
    const isMap = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
    if (isMap(fixed) || isMap(percentage))
        return "Varies by currency";
    const fixedNumber = Number(fixed) || 0;
    const percentNumber = Number(percentage) || 0;
    if (!fixedNumber && !percentNumber)
        return "No platform fee";
    const parts = [];
    if (percentNumber)
        parts.push(`${percentNumber}%`);
    if (fixedNumber)
        parts.push(fixedNumber.toFixed(2));
    return parts.join(" + ");
}
exports.default = async (data) => {
    var _a, _b, _c;
    const { ctx } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Reading deposit gateway rows");
    const rows = await db_1.models.depositGateway.findAll({ order: [["title", "ASC"]] });
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Resolving integration configuration");
    const gateways = rows.map((row) => {
        var _a, _b;
        const plain = row.get({ plain: true });
        const health = (0, health_1.describeGatewayHealth)(plain);
        const profile = health.alias ? registry_1.GATEWAY_PROFILES[health.alias] : null;
        const currencies = toCurrencyArray(plain.currencies);
        return {
            id: plain.id,
            name: plain.name,
            title: plain.title,
            description: plain.description,
            image: plain.image,
            alias: plain.alias,
            type: plain.type,
            status: Boolean(plain.status),
            version: plain.version,
            currencies,
            currencyCount: currencies.length,
            feeSummary: feeSummary(plain.fixedFee, plain.percentageFee),
            supported: health.supported,
            credentialsComplete: health.credentialsComplete,
            missingRequired: health.missingRequired,
            inboundComplete: health.inboundComplete,
            missingInbound: health.missingInbound,
            requiredCount: profile
                ? profile.credentials.filter((c) => c.required).length
                : 0,
            mode: health.mode,
            sandbox: health.sandbox,
            hasWebhook: Boolean(health.webhookUrl),
            summary: (_a = profile === null || profile === void 0 ? void 0 : profile.summary) !== null && _a !== void 0 ? _a : null,
            regions: (_b = profile === null || profile === void 0 ? void 0 : profile.regions) !== null && _b !== void 0 ? _b : null,
        };
    });
    const supported = gateways.filter((gateway) => gateway.supported);
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Deposit gateway configuration retrieved");
    return {
        publicUrl: (0, health_1.resolvePublicUrl)(),
        gateways,
        summary: {
            total: gateways.length,
            active: gateways.filter((gateway) => gateway.status).length,
            ready: gateways.filter((gateway) => gateway.status && gateway.credentialsComplete).length,
            cannotConfirm: gateways.filter((gateway) => gateway.status &&
                gateway.credentialsComplete &&
                gateway.inboundComplete === false).length,
            needsCredentials: supported.filter((gateway) => !gateway.credentialsComplete).length,
            brokenActive: supported.filter((gateway) => gateway.status && !gateway.credentialsComplete).length,
            unsupported: gateways.length - supported.length,
            currencies: new Set(gateways.flatMap((gateway) => gateway.currencies)).size,
        },
    };
};
