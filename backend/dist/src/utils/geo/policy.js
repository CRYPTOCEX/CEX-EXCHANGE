"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshRules = refreshRules;
exports.getRules = getRules;
exports.rulesReady = rulesReady;
exports.loadRules = loadRules;
exports.invalidateRules = invalidateRules;
exports.isRuleInForce = isRuleInForce;
exports.rulesForCountry = rulesForCountry;
exports.resolveNetworkLocation = resolveNetworkLocation;
exports.buildBlockMessage = buildBlockMessage;
exports.evaluate = evaluate;
exports.failureDecision = failureDecision;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const countries_1 = require("./countries");
const actions_1 = require("./actions");
const ip_1 = require("./ip");
const lookup_1 = require("./lookup");
const settings_1 = require("./settings");
const REFRESH_INTERVAL_MS = 30000;
let rules = [];
let rulesByCountry = new Map();
let lastLoaded = 0;
let loadedOnce = false;
let refreshing = null;
function indexRules(list) {
    const index = new Map();
    for (const rule of list) {
        const bucket = index.get(rule.countryCode);
        if (bucket)
            bucket.push(rule);
        else
            index.set(rule.countryCode, [rule]);
    }
    return index;
}
function toRule(row) {
    const countryCode = (0, countries_1.toAlpha2)(row === null || row === void 0 ? void 0 : row.countryCode);
    if (!countryCode)
        return null;
    return {
        id: String(row.id),
        countryCode,
        countryName: row.countryName || countryCode,
        type: row.type === "ALLOW" ? "ALLOW" : "BLOCK",
        scope: row.scope === "PARTIAL" ? "PARTIAL" : "FULL",
        restrictedActions: (0, actions_1.sanitizeActions)(row.restrictedActions),
        reason: row.reason || "OTHER",
        legalReference: row.legalReference || null,
        effectiveFrom: row.effectiveFrom ? new Date(row.effectiveFrom).getTime() : null,
        effectiveTo: row.effectiveTo ? new Date(row.effectiveTo).getTime() : null,
    };
}
function refreshRules() {
    if (refreshing)
        return refreshing;
    refreshing = (async () => {
        var _a;
        try {
            if (!((_a = db_1.models === null || db_1.models === void 0 ? void 0 : db_1.models.geoRestriction) === null || _a === void 0 ? void 0 : _a.findAll))
                return;
            const rows = await db_1.models.geoRestriction.findAll({
                where: { status: true },
                order: [["countryCode", "ASC"]],
            });
            const parsed = rows
                .map((row) => toRule(row.get ? row.get({ plain: true }) : row))
                .filter((r) => r !== null);
            rules = parsed;
            rulesByCountry = indexRules(parsed);
            lastLoaded = Date.now();
            loadedOnce = true;
        }
        catch (error) {
            console_1.logger.warn("GEO", `Failed to refresh geo restriction rules, keeping previous snapshot: ${error === null || error === void 0 ? void 0 : error.message}`);
        }
        finally {
            refreshing = null;
        }
    })();
    return refreshing;
}
function getRules() {
    if (Date.now() - lastLoaded > REFRESH_INTERVAL_MS) {
        void refreshRules();
    }
    return rules;
}
function rulesReady() {
    return loadedOnce;
}
async function loadRules() {
    await refreshRules();
    return rules;
}
function invalidateRules() {
    lastLoaded = 0;
}
function isRuleInForce(rule, now = Date.now()) {
    if (rule.effectiveFrom !== null && now < rule.effectiveFrom)
        return false;
    if (rule.effectiveTo !== null && now >= rule.effectiveTo)
        return false;
    return true;
}
function rulesForCountry(countryCode, now = Date.now()) {
    if (Date.now() - lastLoaded > REFRESH_INTERVAL_MS)
        void refreshRules();
    const bucket = rulesByCountry.get(countryCode);
    if (!(bucket === null || bucket === void 0 ? void 0 : bucket.length))
        return [];
    return bucket
        .filter((rule) => isRuleInForce(rule, now))
        .sort((a, b) => (a.type === b.type ? 0 : a.type === "ALLOW" ? -1 : 1));
}
function resolveNetworkLocation(ctx, policy) {
    var _a;
    const header = policy.trustCdnHeaders ? (0, lookup_1.locationFromHeaders)(ctx.headers) : null;
    const byIp = (0, lookup_1.locationFromIpSync)(ctx.ip, policy);
    return (_a = (0, lookup_1.mergeLocation)(header, byIp)) !== null && _a !== void 0 ? _a : (0, lookup_1.emptyLocation)();
}
function allow(reasonCode, location, action, message = "") {
    return {
        allowed: true,
        decision: reasonCode === "ADMIN_BYPASS" || reasonCode === "IP_ALLOWLIST"
            ? "BYPASSED"
            : "ALLOWED",
        reasonCode,
        message,
        location,
        restrictionId: null,
        action,
    };
}
function block(reasonCode, location, action, message, restrictionId = null) {
    return {
        allowed: false,
        decision: "BLOCKED",
        reasonCode,
        message,
        location,
        restrictionId,
        action,
    };
}
function buildBlockMessage(policy, location) {
    if (policy.noticeMessage)
        return policy.noticeMessage;
    const where = location.countryName
        ? ` in ${location.countryName}`
        : location.countryCode
            ? ` in ${location.countryCode}`
            : "";
    return `This service is not available${where} due to regulatory restrictions.`;
}
function evaluate(ctx, location, policy = (0, settings_1.getPolicy)(), options = {}) {
    var _a, _b, _c;
    const now = (_a = options.now) !== null && _a !== void 0 ? _a : Date.now();
    const lookupRules = (_b = options.rulesFor) !== null && _b !== void 0 ? _b : rulesForCountry;
    const path = (ctx.path || "").split("?")[0];
    const action = (_c = ctx.action) !== null && _c !== void 0 ? _c : (0, actions_1.actionForPath)(path);
    if (!policy.enabled)
        return allow("DISABLED", location, action);
    if ((0, actions_1.isExemptPath)(path))
        return allow("EXEMPT_PATH", location, action);
    if ((0, ip_1.matchesIpList)(ctx.ip, policy.ipAllowlist)) {
        return allow("IP_ALLOWLIST", location, action);
    }
    if ((0, ip_1.matchesIpList)(ctx.ip, policy.ipBlocklist)) {
        return block("IP_BLOCKLIST", location, action, buildBlockMessage(policy, location));
    }
    if (policy.adminBypass && ctx.roleName) {
        const role = ctx.roleName.toLowerCase();
        if (role === "super admin" || role === "admin") {
            return allow("ADMIN_BYPASS", location, action);
        }
    }
    if (policy.blockAnonymizedIps) {
        const anonymised = location.isTor === true || location.isProxy === true || location.isHosting === true;
        if (anonymised) {
            if (policy.allowAccountExit && (0, actions_1.isAccountExitPath)(path)) {
                return allow("ACCOUNT_EXIT", location, action);
            }
            return block("ANONYMIZED_IP", location, action, policy.noticeMessage ||
                "Access through VPN, proxy or anonymising networks is not permitted. Please disable it and try again.");
        }
    }
    const countryCode = location.countryCode;
    if (!countryCode) {
        if (location.pending && !policy.blockUnknownCountry) {
            return allow("UNKNOWN_COUNTRY_ALLOWED", location, action);
        }
        if (!policy.blockUnknownCountry) {
            return allow("UNKNOWN_COUNTRY_ALLOWED", location, action);
        }
        if (policy.allowAccountExit && (0, actions_1.isAccountExitPath)(path)) {
            return allow("ACCOUNT_EXIT", location, action);
        }
        return block("UNKNOWN_COUNTRY_BLOCKED", location, action, policy.noticeMessage ||
            "We could not verify the country this request came from, so access has been declined.");
    }
    const matched = lookupRules(countryCode, now);
    const allowRule = matched.find((r) => r.type === "ALLOW");
    const blockRule = matched.find((r) => r.type === "BLOCK");
    if (policy.mode === "ALLOWLIST") {
        if (!allowRule) {
            if (policy.allowAccountExit && (0, actions_1.isAccountExitPath)(path)) {
                return allow("ACCOUNT_EXIT", location, action);
            }
            return block("NOT_IN_ALLOWLIST", location, action, buildBlockMessage(policy, location));
        }
        if (!blockRule)
            return allow("COUNTRY_ALLOWED", location, action);
    }
    else {
        if (allowRule)
            return allow("COUNTRY_ALLOWED", location, action);
        if (!blockRule)
            return allow("COUNTRY_ALLOWED", location, action);
    }
    if (blockRule.scope === "PARTIAL") {
        if (!action || !blockRule.restrictedActions.includes(action)) {
            return allow("ACTION_NOT_RESTRICTED", location, action);
        }
        if (policy.allowAccountExit &&
            action !== "WITHDRAW" &&
            (0, actions_1.isCommitmentExit)(path, ctx.method || "")) {
            return allow("COMMITMENT_EXIT", location, action);
        }
    }
    else if (policy.allowAccountExit && (0, actions_1.isAccountExitPath)(path)) {
        return allow("ACCOUNT_EXIT", location, action);
    }
    return block("COUNTRY_BLOCKED", location, action, buildBlockMessage(policy, location), blockRule.id);
}
function failureDecision(policy, location = (0, lookup_1.emptyLocation)(), action = null) {
    if (policy.failOpen) {
        return allow("LOOKUP_FAILED_OPEN", location, action);
    }
    return block("LOOKUP_FAILED_CLOSED", location, action, policy.noticeMessage ||
        "We are unable to verify your location right now. Please try again shortly.");
}
