"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
const catalog_1 = require("@b/utils/news/providers/catalog");
const seed_1 = require("@b/utils/news/providers/seed");
const config_1 = require("@b/utils/news/providers/config");
const policy_1 = require("@b/utils/news/providers/policy");
const registry_1 = require("@b/utils/news/providers/registry");
exports.metadata = {
    summary: "Lists market news providers",
    operationId: "listMarketNewsProviders",
    tags: ["Admin", "System", "News"],
    description: "Retrieves every market-news provider with its enabled state, whether a credential is configured and which door it came from (stored on the row, or the environment) — NEVER the credential itself, whether its adapter is implemented in this release, the outcome of its last sync, how many stories it currently holds, and the operator-facing comparison used to choose between them. " +
        "MULTI-ACTIVE: unlike the fx market-data providers, any number of these may be enabled at once — news is additive and the feed de-duplicates on a per-provider external id.",
    responses: {
        200: {
            description: "Providers retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            providers: { type: "array", items: { type: "object" } },
                            manualStories: { type: "number" },
                            syncPeriodMinutes: { type: "number" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.market.news",
    logModule: "ADMIN_NEWS",
    logTitle: "List market news providers",
};
const SYNC_PERIOD_MINUTES = 15;
exports.default = async (data) => {
    var _a, _b, _c;
    var _d;
    const { ctx } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Loading the news provider catalogue");
    await (0, seed_1.ensureSeedNewsProviders)();
    const rows = await db_1.models.marketNewsProvider.findAll({
        order: [["name", "ASC"]],
    });
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Counting stored stories");
    const counts = (await db_1.models.marketNews.findAll({
        attributes: ["source", "provider", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "total"]],
        group: ["source", "provider"],
        raw: true,
    }));
    const storedByProvider = new Map();
    let manualStories = 0;
    for (const row of counts) {
        const total = Number(row.total) || 0;
        if (row.source === "MANUAL") {
            manualStories += total;
            continue;
        }
        if (row.provider) {
            storedByProvider.set(row.provider, ((_d = storedByProvider.get(row.provider)) !== null && _d !== void 0 ? _d : 0) + total);
        }
    }
    const providers = rows.map((row) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        const profile = (0, catalog_1.newsProviderProfile)(row.name);
        const config = (0, config_1.readProviderConfig)(row.config);
        const readiness = (0, registry_1.newsProviderReadiness)(row.name, config, row.apiKey);
        return {
            id: row.id,
            name: row.name,
            title: row.title,
            description: row.description,
            status: !!row.status,
            adapterAvailable: readiness.adapterAvailable,
            requiredCredentials: (0, policy_1.newsProviderCredentials)(row.name),
            missingCredentials: readiness.missingCredentials,
            configProblem: readiness.configProblem,
            ready: readiness.ready,
            hasStoredKey: !!String((_a = row.apiKey) !== null && _a !== void 0 ? _a : "").trim(),
            credentialSource: readiness.credentialSource,
            categories: (0, policy_1.normaliseCategories)(row.name, row.categories),
            fetchLimit: Number(row.fetchLimit) || 60,
            retentionDays: Number(row.retentionDays) || 30,
            config,
            lastSyncAt: row.lastSyncAt ? new Date(row.lastSyncAt).getTime() : null,
            lastSyncStatus: (_b = row.lastSyncStatus) !== null && _b !== void 0 ? _b : null,
            lastSyncCount: Number(row.lastSyncCount) || 0,
            lastSyncMessage: (_c = row.lastSyncMessage) !== null && _c !== void 0 ? _c : null,
            storedStories: (_d = storedByProvider.get(row.name)) !== null && _d !== void 0 ? _d : 0,
            categoryOptions: (_e = profile === null || profile === void 0 ? void 0 : profile.categoryOptions) !== null && _e !== void 0 ? _e : [],
            categoryLabel: (_f = profile === null || profile === void 0 ? void 0 : profile.categoryLabel) !== null && _f !== void 0 ? _f : "",
            categoryHelp: (_g = profile === null || profile === void 0 ? void 0 : profile.categoryHelp) !== null && _g !== void 0 ? _g : "",
            assetScope: (_h = profile === null || profile === void 0 ? void 0 : profile.assetScope) !== null && _h !== void 0 ? _h : "",
            tagsSymbols: (_j = profile === null || profile === void 0 ? void 0 : profile.tagsSymbols) !== null && _j !== void 0 ? _j : false,
            cost: (_k = profile === null || profile === void 0 ? void 0 : profile.cost) !== null && _k !== void 0 ? _k : null,
            costDetail: (_l = profile === null || profile === void 0 ? void 0 : profile.costDetail) !== null && _l !== void 0 ? _l : null,
            bestFor: (_m = profile === null || profile === void 0 ? void 0 : profile.bestFor) !== null && _m !== void 0 ? _m : null,
            limitations: (_o = profile === null || profile === void 0 ? void 0 : profile.limitations) !== null && _o !== void 0 ? _o : null,
            redistribution: (_p = profile === null || profile === void 0 ? void 0 : profile.redistribution) !== null && _p !== void 0 ? _p : null,
            setup: (_q = profile === null || profile === void 0 ? void 0 : profile.setup) !== null && _q !== void 0 ? _q : null,
            configFields: (_r = profile === null || profile === void 0 ? void 0 : profile.configFields) !== null && _r !== void 0 ? _r : [],
        };
    });
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Retrieved ${providers.length} market news providers`);
    return {
        providers,
        manualStories,
        syncPeriodMinutes: SYNC_PERIOD_MINUTES,
    };
};
