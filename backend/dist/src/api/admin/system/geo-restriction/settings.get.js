"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const address_parser_1 = require("@b/handler/utils/address-parser");
const query_1 = require("@b/utils/query");
const geo_1 = require("@b/utils/geo");
exports.metadata = {
    summary: "Retrieves the geographic restriction policy",
    operationId: "getGeoRestrictionSettings",
    tags: ["Admin", "Geo Restrictions"],
    responses: {
        200: {
            description: "Geographic restriction policy",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            settings: {
                                type: "object",
                                description: "Policy values keyed by setting key",
                            },
                            defaults: { type: "object" },
                            actions: { type: "array", items: { type: "object" } },
                            summary: { type: "object" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.geo.restriction",
};
exports.default = async (_data) => {
    const policy = await (0, geo_1.loadPolicy)();
    const K = geo_1.GEO_SETTING_KEYS;
    const rules = (0, geo_1.getRules)();
    return {
        settings: {
            [K.enabled]: String(policy.enabled),
            [K.mode]: policy.mode,
            [K.allowAccountExit]: String(policy.allowAccountExit),
            [K.blockUnknownCountry]: String(policy.blockUnknownCountry),
            [K.failOpen]: String(policy.failOpen),
            [K.adminBypass]: String(policy.adminBypass),
            [K.ipAllowlist]: policy.ipAllowlist.join("\n"),
            [K.ipBlocklist]: policy.ipBlocklist.join("\n"),
            [K.lookupProvider]: policy.lookupProvider,
            [K.lookupApiKey]: "",
            [K.lookupCacheTtl]: String(policy.lookupCacheTtl),
            [K.trustCdnHeaders]: String(policy.trustCdnHeaders),
            [K.trustKycCountry]: String(policy.trustKycCountry),
            [K.trustProfileCountry]: String(policy.trustProfileCountry),
            [K.blockAnonymizedIps]: String(policy.blockAnonymizedIps),
            [K.logMode]: policy.logMode,
            [K.logRetentionDays]: String(policy.logRetentionDays),
            [K.logDedupeSeconds]: String(policy.logDedupeSeconds),
            [K.noticeTitle]: policy.noticeTitle,
            [K.noticeMessage]: policy.noticeMessage,
            [K.contactEmail]: policy.contactEmail,
        },
        defaults: geo_1.GEO_POLICY_DEFAULTS,
        actions: geo_1.GEO_ACTIONS.map((value) => ({
            value,
            label: geo_1.GEO_ACTION_LABELS[value],
        })),
        summary: {
            enabled: policy.enabled,
            mode: policy.mode,
            activeRules: rules.length,
            blockRules: rules.filter((r) => r.type === "BLOCK").length,
            allowRules: rules.filter((r) => r.type === "ALLOW").length,
            lookupApiKeySet: Boolean(policy.lookupApiKey),
            trustProxy: (0, address_parser_1.describeProxyTrust)().mode !== "none",
        },
    };
};
