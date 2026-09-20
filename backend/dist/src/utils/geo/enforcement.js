"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextFromRequest = contextFromRequest;
exports.locationFromIdentity = locationFromIdentity;
exports.evaluateRequest = evaluateRequest;
exports.evaluateRequestSync = evaluateRequestSync;
exports.geoRestrictionGate = geoRestrictionGate;
exports.assertGeoAllowed = assertGeoAllowed;
exports.checkGeoAllowed = checkGeoAllowed;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const countries_1 = require("./countries");
const audit_1 = require("./audit");
const ip_1 = require("./ip");
const lookup_1 = require("./lookup");
const policy_1 = require("./policy");
const health_1 = require("./health");
const settings_1 = require("./settings");
function contextFromRequest(req, overrides = {}) {
    var _a;
    var _b, _c;
    const headers = (req === null || req === void 0 ? void 0 : req.headers) || {};
    const peer = (req === null || req === void 0 ? void 0 : req.remoteAddress) || "127.0.0.1";
    return {
        path: String((req === null || req === void 0 ? void 0 : req.url) || "").split("?")[0],
        method: String((req === null || req === void 0 ? void 0 : req.method) || "get").toUpperCase(),
        ip: (0, ip_1.resolveClientIp)(peer, headers),
        headers,
        userId: (_b = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
        roleName: null,
        userAgent: (_c = headers["user-agent"]) !== null && _c !== void 0 ? _c : null,
        action: null,
        ...overrides,
    };
}
const COUNTRY_KEY_RE = /country|nationality/i;
function kycCountryCandidates(data, depth = 0) {
    if (!data || typeof data !== "object" || depth > 3)
        return [];
    const out = [];
    for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === "object") {
            out.push(...kycCountryCandidates(value, depth + 1));
        }
        else if (COUNTRY_KEY_RE.test(key) && typeof value === "string") {
            out.push(value);
        }
    }
    return out;
}
function locationFromCode(code, source) {
    return {
        ...(0, lookup_1.emptyLocation)(),
        countryCode: code,
        countryName: (0, countries_1.getCountryName)(code),
        source,
    };
}
async function locationFromIdentity(userId, policy) {
    var _a, _b;
    var _c;
    if (!userId)
        return null;
    if (policy.trustKycCountry) {
        try {
            const applications = await ((_b = (_a = db_1.models.kycApplication) === null || _a === void 0 ? void 0 : _a.findAll) === null || _b === void 0 ? void 0 : _b.call(_a, {
                where: { userId, status: "APPROVED" },
            }));
            for (const app of applications || []) {
                let data = app.data;
                if (typeof data === "string") {
                    try {
                        data = JSON.parse(data);
                    }
                    catch (_d) {
                        data = null;
                    }
                }
                for (const candidate of kycCountryCandidates(data)) {
                    const code = (0, countries_1.toAlpha2)(candidate);
                    if (code)
                        return locationFromCode(code, "KYC");
                }
            }
        }
        catch (_e) {
        }
    }
    if (policy.trustProfileCountry) {
        try {
            const user = await db_1.models.user.findByPk(userId);
            let profile = null;
            try {
                profile = (_c = user === null || user === void 0 ? void 0 : user.profile) !== null && _c !== void 0 ? _c : null;
            }
            catch (_f) {
                profile = null;
            }
            if (typeof profile === "string") {
                try {
                    profile = JSON.parse(profile);
                }
                catch (_g) {
                    profile = null;
                }
            }
            const location = profile === null || profile === void 0 ? void 0 : profile.location;
            if (location && typeof location === "object") {
                for (const candidate of [location.countryCode, location.country]) {
                    const code = (0, countries_1.toAlpha2)(candidate);
                    if (code)
                        return locationFromCode(code, "PROFILE");
                }
            }
        }
        catch (_h) {
        }
    }
    return null;
}
async function evaluateRequest(ctx, policy = (0, settings_1.getPolicy)()) {
    var _a, _b;
    try {
        const header = policy.trustCdnHeaders ? (0, lookup_1.locationFromHeaders)(ctx.headers) : null;
        const byIp = await (0, lookup_1.locationFromIp)(ctx.ip, policy);
        const network = (_a = (0, lookup_1.mergeLocation)(header, byIp)) !== null && _a !== void 0 ? _a : (0, lookup_1.emptyLocation)();
        let location = network;
        if (ctx.userId) {
            const identity = await locationFromIdentity(ctx.userId, policy);
            if (identity)
                location = (_b = (0, lookup_1.mergeLocation)(identity, network)) !== null && _b !== void 0 ? _b : network;
        }
        return (0, policy_1.evaluate)(ctx, location, policy);
    }
    catch (error) {
        console_1.logger.warn("GEO", `Geo evaluation failed: ${error === null || error === void 0 ? void 0 : error.message}`);
        return (0, policy_1.failureDecision)(policy);
    }
}
function evaluateRequestSync(ctx, policy = (0, settings_1.getPolicy)()) {
    try {
        return (0, policy_1.evaluate)(ctx, (0, policy_1.resolveNetworkLocation)(ctx, policy), policy);
    }
    catch (error) {
        console_1.logger.warn("GEO", `Geo evaluation failed: ${error === null || error === void 0 ? void 0 : error.message}`);
        return (0, policy_1.failureDecision)(policy);
    }
}
const ADMIN_PATH_PREFIX = "/api/admin";
function sendBlocked(res, req, decision) {
    res.sendResponse(req, 403, {
        message: decision.message,
        statusCode: 403,
        geoRestricted: true,
        countryCode: decision.location.countryCode,
        countryName: decision.location.countryName,
        reasonCode: decision.reasonCode,
    });
}
async function persistBreakerDisarm(reason) {
    try {
        await db_1.models.settings.upsert({
            key: settings_1.GEO_SETTING_KEYS.blockUnknownCountry,
            value: "false",
        });
        const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
        await CacheManager.getInstance().clearCache();
        console_1.logger.warn("GEO", "Persisted the automatic disarm to settings. The platform is reachable again; " +
            "fix country detection before switching this back on.");
    }
    catch (error) {
        console_1.logger.error("GEO", `Could not persist the automatic disarm (${reason}); it is active in memory only ` +
            `and will be lost on restart: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
}
function maybeTripBreaker(policy) {
    const assessment = (0, health_1.assessUnknownBlockBreaker)(policy);
    if (!assessment.shouldTrip)
        return;
    (0, health_1.markBreakerTripped)();
    (0, settings_1.setEmergencyOverride)({ blockUnknownCountry: false }, `automatic disarm: ${assessment.reason}`);
    console_1.logger.error("GEO", `AUTOMATIC DISARM — "block when the country cannot be determined" has been switched ` +
        `off because ${assessment.reason}. Country rules and every other setting are ` +
        `unchanged. Configure an IP lookup provider or a CDN country header, verify with the ` +
        `rule tester, then re-enable it.`);
    void persistBreakerDisarm(assessment.reason);
}
function geoRestrictionGate(res, req, next) {
    try {
        const policy = (0, settings_1.getPolicy)();
        if (!policy.enabled)
            return next();
        if (!(0, policy_1.rulesReady)()) {
            const decision = (0, policy_1.failureDecision)(policy);
            if (decision.allowed)
                return next();
            const ctx = contextFromRequest(req);
            (0, audit_1.recordDecision)(ctx, decision, policy);
            return sendBlocked(res, req, decision);
        }
        const ctx = contextFromRequest(req);
        if (policy.adminBypass && ctx.path.startsWith(ADMIN_PATH_PREFIX)) {
            return next();
        }
        const decision = evaluateRequestSync(ctx, policy);
        (0, audit_1.recordDecision)(ctx, decision, policy);
        (0, health_1.recordDecisionHealth)(ctx, decision);
        if (decision.allowed)
            return next();
        maybeTripBreaker(policy);
        return sendBlocked(res, req, decision);
    }
    catch (error) {
        console_1.logger.error("GEO", "Geo restriction gate error", error);
        try {
            const policy = (0, settings_1.getPolicy)();
            if (!policy.failOpen) {
                return sendBlocked(res, req, (0, policy_1.failureDecision)(policy));
            }
        }
        catch (_a) {
        }
        return next();
    }
}
async function assertGeoAllowed(action, data) {
    var _a;
    var _b, _c;
    const policy = (0, settings_1.getPolicy)();
    if (!policy.enabled)
        return;
    const headers = (data === null || data === void 0 ? void 0 : data.headers) || {};
    const ctx = {
        path: `/action/${action.toLowerCase()}`,
        method: "ACTION",
        ip: (0, ip_1.resolveClientIp)((data === null || data === void 0 ? void 0 : data.remoteAddress) || "127.0.0.1", headers),
        headers,
        userId: (_b = (_a = data === null || data === void 0 ? void 0 : data.user) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
        userAgent: (_c = headers["user-agent"]) !== null && _c !== void 0 ? _c : null,
        action,
    };
    const decision = await evaluateRequest(ctx, policy);
    (0, audit_1.recordDecision)(ctx, decision, policy);
    if (!decision.allowed) {
        throw (0, error_1.createError)({ statusCode: 403, message: decision.message });
    }
}
async function checkGeoAllowed(action, data) {
    var _a;
    var _b, _c;
    const policy = (0, settings_1.getPolicy)();
    const headers = (data === null || data === void 0 ? void 0 : data.headers) || {};
    if (!policy.enabled) {
        return {
            allowed: true,
            decision: "ALLOWED",
            reasonCode: "DISABLED",
            message: "",
            location: (0, lookup_1.emptyLocation)(),
            restrictionId: null,
            action,
        };
    }
    const ctx = {
        path: `/action/${action.toLowerCase()}`,
        method: "ACTION",
        ip: (0, ip_1.resolveClientIp)((data === null || data === void 0 ? void 0 : data.remoteAddress) || "127.0.0.1", headers),
        headers,
        userId: (_b = (_a = data === null || data === void 0 ? void 0 : data.user) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
        userAgent: (_c = headers["user-agent"]) !== null && _c !== void 0 ? _c : null,
        action,
    };
    return evaluateRequest(ctx, policy);
}
