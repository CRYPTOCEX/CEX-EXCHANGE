"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const geo_1 = require("@b/utils/geo");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Simulates a geographic access decision",
    description: "Runs the live policy against a hypothetical country, IP and request path and returns the decision that would be made. Nothing is enforced or logged.",
    operationId: "testGeoRestriction",
    tags: ["Admin", "Geo Restrictions"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        countryCode: {
                            type: "string",
                            description: "Country to simulate. Omit to resolve the country from the IP instead.",
                            nullable: true,
                        },
                        ip: {
                            type: "string",
                            description: "IP address to simulate. Used for allow/block list matching and, when no country is given, for country resolution.",
                            nullable: true,
                        },
                        path: {
                            type: "string",
                            description: "Request path to simulate (default /api/exchange/order)",
                            nullable: true,
                        },
                        action: {
                            type: "string",
                            enum: geo_1.GEO_ACTIONS,
                            description: "Force a specific activity instead of deriving it from the path",
                            nullable: true,
                        },
                        isProxy: {
                            type: "boolean",
                            description: "Simulate a VPN/proxy connection",
                            nullable: true,
                        },
                        isTor: {
                            type: "boolean",
                            description: "Simulate a Tor exit node",
                            nullable: true,
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Simulated decision",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            allowed: { type: "boolean" },
                            decision: { type: "string" },
                            reasonCode: { type: "string" },
                            message: { type: "string" },
                            action: { type: "string", nullable: true },
                            location: { type: "object" },
                            matchedRules: { type: "array", items: { type: "object" } },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.geo.restriction",
    logModule: "GEO",
    logTitle: "Test geo restriction",
    audit: false,
};
exports.default = async (data) => {
    const { body, ctx } = data;
    await Promise.all([(0, geo_1.loadPolicy)(), (0, geo_1.loadRules)()]);
    const policy = (0, geo_1.getPolicy)();
    const path = String((body === null || body === void 0 ? void 0 : body.path) || "/api/exchange/order").split("?")[0];
    const ip = String((body === null || body === void 0 ? void 0 : body.ip) || "").trim();
    const action = (geo_1.GEO_ACTIONS.includes(body === null || body === void 0 ? void 0 : body.action) ? body.action : null);
    let location = (0, geo_1.emptyLocation)();
    if (body === null || body === void 0 ? void 0 : body.countryCode) {
        const code = (0, geo_1.toAlpha2)(body.countryCode);
        if (!code) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `"${body.countryCode}" is not a recognised ISO 3166-1 country code`,
            });
        }
        location = {
            ...location,
            countryCode: code,
            countryName: (0, geo_1.getCountryName)(code),
            source: "MANUAL",
        };
    }
    else if (ip) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Resolving ${ip}`);
        if ((0, geo_1.isPrivateIp)(ip)) {
            location = { ...location, source: "NONE" };
        }
        else {
            const resolved = await (0, geo_1.locationFromIp)(ip, policy);
            if (resolved)
                location = resolved;
        }
    }
    if ((body === null || body === void 0 ? void 0 : body.isProxy) !== undefined)
        location.isProxy = Boolean(body.isProxy);
    if ((body === null || body === void 0 ? void 0 : body.isTor) !== undefined)
        location.isTor = Boolean(body.isTor);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Evaluating policy");
    const decision = (0, geo_1.evaluate)({
        path,
        method: "POST",
        ip: ip || "0.0.0.0",
        headers: {},
        userId: null,
        action,
    }, location, policy);
    const matchedRules = location.countryCode
        ? (0, geo_1.rulesForCountry)(location.countryCode).map((rule) => ({
            id: rule.id,
            type: rule.type,
            scope: rule.scope,
            restrictedActions: rule.restrictedActions,
            reason: rule.reason,
            legalReference: rule.legalReference,
        }))
        : [];
    ctx === null || ctx === void 0 ? void 0 : ctx.success(decision.allowed ? "Would be allowed" : "Would be blocked");
    return {
        allowed: decision.allowed,
        decision: decision.decision,
        reasonCode: decision.reasonCode,
        message: decision.message,
        action: decision.action,
        location: decision.location,
        matchedRules,
        policyEnabled: policy.enabled,
        mode: policy.mode,
        notes: buildNotes(policy.lookupProvider, ip, location),
    };
};
function buildNotes(provider, ip, location) {
    const notes = [];
    if (ip && (0, geo_1.isPrivateIp)(ip)) {
        notes.push("The address supplied is private (LAN/loopback), so it carries no country information.");
    }
    if (!location.countryCode && provider === "NONE" && ip && !(0, geo_1.isPrivateIp)(ip)) {
        notes.push("No IP lookup provider is configured, so an IP alone cannot be resolved to a country. Countries still resolve from CDN headers on live traffic.");
    }
    if (location.pending) {
        notes.push("The lookup for this address is still warming up. Re-run the test in a moment for the resolved country.");
    }
    return notes;
}
