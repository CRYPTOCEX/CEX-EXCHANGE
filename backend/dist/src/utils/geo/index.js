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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.rulesForCountry = exports.resolveNetworkLocation = exports.refreshRules = exports.loadRules = exports.isRuleInForce = exports.invalidateRules = exports.getRules = exports.failureDecision = exports.evaluate = exports.buildBlockMessage = exports.sanitizeActions = exports.isExemptPath = exports.isAccountExitPath = exports.actionForPath = exports.GEO_EXEMPT_PREFIXES = exports.GEO_ACTIONS = exports.GEO_ACTION_PREFIXES = exports.GEO_ACTION_LABELS = exports.GEO_ACCOUNT_EXIT_PREFIXES = exports.mergeLocation = exports.locationFromIp = exports.locationFromHeaders = exports.emptyLocation = exports.clearIpCache = exports.validateIpEntry = exports.resolveClientIp = exports.matchesIpList = exports.matchesIpEntry = exports.isPrivateIp = exports.GEO_CLIENT_IP_HEADER = exports.setEmergencyOverride = exports.refreshPolicy = exports.parseIpList = exports.loadPolicy = exports.isGeoSettingKey = exports.invalidatePolicy = exports.getPolicy = exports.getEmergencyOverrides = exports.clearEmergencyOverrides = exports.buildPolicy = exports.GEO_SETTING_PREFIX = exports.GEO_SETTING_KEY_LIST = exports.GEO_SETTING_KEYS = exports.GEO_POLICY_DEFAULTS = exports.toAlpha2 = exports.isValidCountry = exports.getCountryName = exports.getCountry = exports.GEO_HEADER_SENTINELS = exports.ALL_COUNTRIES = void 0;
exports.locationFromIdentity = exports.geoRestrictionGate = exports.evaluateRequestSync = exports.evaluateRequest = exports.contextFromRequest = exports.checkGeoAllowed = exports.assertGeoAllowed = exports.preflightPolicy = exports.preflightBlocksSave = exports.formatPreflightRefusal = exports.resetDetectionHealth = exports.resetBreaker = exports.recordDecisionHealth = exports.markBreakerTripped = exports.getDetectionHealth = exports.breakerTripped = exports.assessUnknownBlockBreaker = exports.recordDecision = exports.purgeExpiredAuditRows = exports.flushAuditCounters = exports.rulesReady = void 0;
exports.initializeGeoRestrictions = initializeGeoRestrictions;
exports.reloadGeoRestrictions = reloadGeoRestrictions;
__exportStar(require("./types"), exports);
var countries_1 = require("./countries");
Object.defineProperty(exports, "ALL_COUNTRIES", { enumerable: true, get: function () { return countries_1.ALL_COUNTRIES; } });
Object.defineProperty(exports, "GEO_HEADER_SENTINELS", { enumerable: true, get: function () { return countries_1.GEO_HEADER_SENTINELS; } });
Object.defineProperty(exports, "getCountry", { enumerable: true, get: function () { return countries_1.getCountry; } });
Object.defineProperty(exports, "getCountryName", { enumerable: true, get: function () { return countries_1.getCountryName; } });
Object.defineProperty(exports, "isValidCountry", { enumerable: true, get: function () { return countries_1.isValidCountry; } });
Object.defineProperty(exports, "toAlpha2", { enumerable: true, get: function () { return countries_1.toAlpha2; } });
var settings_1 = require("./settings");
Object.defineProperty(exports, "GEO_POLICY_DEFAULTS", { enumerable: true, get: function () { return settings_1.GEO_POLICY_DEFAULTS; } });
Object.defineProperty(exports, "GEO_SETTING_KEYS", { enumerable: true, get: function () { return settings_1.GEO_SETTING_KEYS; } });
Object.defineProperty(exports, "GEO_SETTING_KEY_LIST", { enumerable: true, get: function () { return settings_1.GEO_SETTING_KEY_LIST; } });
Object.defineProperty(exports, "GEO_SETTING_PREFIX", { enumerable: true, get: function () { return settings_1.GEO_SETTING_PREFIX; } });
Object.defineProperty(exports, "buildPolicy", { enumerable: true, get: function () { return settings_1.buildPolicy; } });
Object.defineProperty(exports, "clearEmergencyOverrides", { enumerable: true, get: function () { return settings_1.clearEmergencyOverrides; } });
Object.defineProperty(exports, "getEmergencyOverrides", { enumerable: true, get: function () { return settings_1.getEmergencyOverrides; } });
Object.defineProperty(exports, "getPolicy", { enumerable: true, get: function () { return settings_1.getPolicy; } });
Object.defineProperty(exports, "invalidatePolicy", { enumerable: true, get: function () { return settings_1.invalidatePolicy; } });
Object.defineProperty(exports, "isGeoSettingKey", { enumerable: true, get: function () { return settings_1.isGeoSettingKey; } });
Object.defineProperty(exports, "loadPolicy", { enumerable: true, get: function () { return settings_1.loadPolicy; } });
Object.defineProperty(exports, "parseIpList", { enumerable: true, get: function () { return settings_1.parseIpList; } });
Object.defineProperty(exports, "refreshPolicy", { enumerable: true, get: function () { return settings_1.refreshPolicy; } });
Object.defineProperty(exports, "setEmergencyOverride", { enumerable: true, get: function () { return settings_1.setEmergencyOverride; } });
var ip_1 = require("./ip");
Object.defineProperty(exports, "GEO_CLIENT_IP_HEADER", { enumerable: true, get: function () { return ip_1.GEO_CLIENT_IP_HEADER; } });
Object.defineProperty(exports, "isPrivateIp", { enumerable: true, get: function () { return ip_1.isPrivateIp; } });
Object.defineProperty(exports, "matchesIpEntry", { enumerable: true, get: function () { return ip_1.matchesIpEntry; } });
Object.defineProperty(exports, "matchesIpList", { enumerable: true, get: function () { return ip_1.matchesIpList; } });
Object.defineProperty(exports, "resolveClientIp", { enumerable: true, get: function () { return ip_1.resolveClientIp; } });
Object.defineProperty(exports, "validateIpEntry", { enumerable: true, get: function () { return ip_1.validateIpEntry; } });
var lookup_1 = require("./lookup");
Object.defineProperty(exports, "clearIpCache", { enumerable: true, get: function () { return lookup_1.clearIpCache; } });
Object.defineProperty(exports, "emptyLocation", { enumerable: true, get: function () { return lookup_1.emptyLocation; } });
Object.defineProperty(exports, "locationFromHeaders", { enumerable: true, get: function () { return lookup_1.locationFromHeaders; } });
Object.defineProperty(exports, "locationFromIp", { enumerable: true, get: function () { return lookup_1.locationFromIp; } });
Object.defineProperty(exports, "mergeLocation", { enumerable: true, get: function () { return lookup_1.mergeLocation; } });
var actions_1 = require("./actions");
Object.defineProperty(exports, "GEO_ACCOUNT_EXIT_PREFIXES", { enumerable: true, get: function () { return actions_1.GEO_ACCOUNT_EXIT_PREFIXES; } });
Object.defineProperty(exports, "GEO_ACTION_LABELS", { enumerable: true, get: function () { return actions_1.GEO_ACTION_LABELS; } });
Object.defineProperty(exports, "GEO_ACTION_PREFIXES", { enumerable: true, get: function () { return actions_1.GEO_ACTION_PREFIXES; } });
Object.defineProperty(exports, "GEO_ACTIONS", { enumerable: true, get: function () { return actions_1.GEO_ACTIONS; } });
Object.defineProperty(exports, "GEO_EXEMPT_PREFIXES", { enumerable: true, get: function () { return actions_1.GEO_EXEMPT_PREFIXES; } });
Object.defineProperty(exports, "actionForPath", { enumerable: true, get: function () { return actions_1.actionForPath; } });
Object.defineProperty(exports, "isAccountExitPath", { enumerable: true, get: function () { return actions_1.isAccountExitPath; } });
Object.defineProperty(exports, "isExemptPath", { enumerable: true, get: function () { return actions_1.isExemptPath; } });
Object.defineProperty(exports, "sanitizeActions", { enumerable: true, get: function () { return actions_1.sanitizeActions; } });
var policy_1 = require("./policy");
Object.defineProperty(exports, "buildBlockMessage", { enumerable: true, get: function () { return policy_1.buildBlockMessage; } });
Object.defineProperty(exports, "evaluate", { enumerable: true, get: function () { return policy_1.evaluate; } });
Object.defineProperty(exports, "failureDecision", { enumerable: true, get: function () { return policy_1.failureDecision; } });
Object.defineProperty(exports, "getRules", { enumerable: true, get: function () { return policy_1.getRules; } });
Object.defineProperty(exports, "invalidateRules", { enumerable: true, get: function () { return policy_1.invalidateRules; } });
Object.defineProperty(exports, "isRuleInForce", { enumerable: true, get: function () { return policy_1.isRuleInForce; } });
Object.defineProperty(exports, "loadRules", { enumerable: true, get: function () { return policy_1.loadRules; } });
Object.defineProperty(exports, "refreshRules", { enumerable: true, get: function () { return policy_1.refreshRules; } });
Object.defineProperty(exports, "resolveNetworkLocation", { enumerable: true, get: function () { return policy_1.resolveNetworkLocation; } });
Object.defineProperty(exports, "rulesForCountry", { enumerable: true, get: function () { return policy_1.rulesForCountry; } });
Object.defineProperty(exports, "rulesReady", { enumerable: true, get: function () { return policy_1.rulesReady; } });
var audit_1 = require("./audit");
Object.defineProperty(exports, "flushAuditCounters", { enumerable: true, get: function () { return audit_1.flushAuditCounters; } });
Object.defineProperty(exports, "purgeExpiredAuditRows", { enumerable: true, get: function () { return audit_1.purgeExpiredAuditRows; } });
Object.defineProperty(exports, "recordDecision", { enumerable: true, get: function () { return audit_1.recordDecision; } });
var health_1 = require("./health");
Object.defineProperty(exports, "assessUnknownBlockBreaker", { enumerable: true, get: function () { return health_1.assessUnknownBlockBreaker; } });
Object.defineProperty(exports, "breakerTripped", { enumerable: true, get: function () { return health_1.breakerTripped; } });
Object.defineProperty(exports, "getDetectionHealth", { enumerable: true, get: function () { return health_1.getDetectionHealth; } });
Object.defineProperty(exports, "markBreakerTripped", { enumerable: true, get: function () { return health_1.markBreakerTripped; } });
Object.defineProperty(exports, "recordDecisionHealth", { enumerable: true, get: function () { return health_1.recordDecisionHealth; } });
Object.defineProperty(exports, "resetBreaker", { enumerable: true, get: function () { return health_1.resetBreaker; } });
Object.defineProperty(exports, "resetDetectionHealth", { enumerable: true, get: function () { return health_1.resetDetectionHealth; } });
var preflight_1 = require("./preflight");
Object.defineProperty(exports, "formatPreflightRefusal", { enumerable: true, get: function () { return preflight_1.formatPreflightRefusal; } });
Object.defineProperty(exports, "preflightBlocksSave", { enumerable: true, get: function () { return preflight_1.preflightBlocksSave; } });
Object.defineProperty(exports, "preflightPolicy", { enumerable: true, get: function () { return preflight_1.preflightPolicy; } });
var enforcement_1 = require("./enforcement");
Object.defineProperty(exports, "assertGeoAllowed", { enumerable: true, get: function () { return enforcement_1.assertGeoAllowed; } });
Object.defineProperty(exports, "checkGeoAllowed", { enumerable: true, get: function () { return enforcement_1.checkGeoAllowed; } });
Object.defineProperty(exports, "contextFromRequest", { enumerable: true, get: function () { return enforcement_1.contextFromRequest; } });
Object.defineProperty(exports, "evaluateRequest", { enumerable: true, get: function () { return enforcement_1.evaluateRequest; } });
Object.defineProperty(exports, "evaluateRequestSync", { enumerable: true, get: function () { return enforcement_1.evaluateRequestSync; } });
Object.defineProperty(exports, "geoRestrictionGate", { enumerable: true, get: function () { return enforcement_1.geoRestrictionGate; } });
Object.defineProperty(exports, "locationFromIdentity", { enumerable: true, get: function () { return enforcement_1.locationFromIdentity; } });
const settings_2 = require("./settings");
const policy_2 = require("./policy");
async function initializeGeoRestrictions() {
    await Promise.all([(0, settings_2.loadPolicy)(), (0, policy_2.loadRules)()]);
}
async function reloadGeoRestrictions() {
    const { invalidatePolicy } = await Promise.resolve().then(() => __importStar(require("./settings")));
    const { invalidateRules } = await Promise.resolve().then(() => __importStar(require("./policy")));
    invalidatePolicy();
    invalidateRules();
    await Promise.all([(0, settings_2.loadPolicy)(), (0, policy_2.loadRules)()]);
}
